const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Servir archivos estáticos
app.use(express.static('public'));

// Estado del juego
const games = new Map();

class Game {
    constructor(gameId, hostId) {
        this.id = gameId;
        this.hostId = hostId;
        this.players = new Map();
        this.phase = 'lobby'; // lobby, night, results, vote, end
        this.round = 1;
        this.nightActions = {
            mafiaVotes: {},
            mafiaTarget: null,
            policeTarget: null,
            healerTarget: null
        };
    }

    addPlayer(socketId, name) {
        this.players.set(socketId, {
            id: socketId,
            name: name,
            role: null,
            alive: true,
            ready: false
        });
    }

    removePlayer(socketId) {
        this.players.delete(socketId);
    }

    assignRoles() {
        const playerArray = Array.from(this.players.values());
        const playerCount = playerArray.length;
        const mafiaCount = Math.floor(playerCount / 3);

        const roles = [];
        for (let i = 0; i < mafiaCount; i++) roles.push('MAFIA');
        roles.push('POLICE');
        roles.push('HEALER');
        while (roles.length < playerCount) roles.push('TOWN');

        // Mezclar
        for (let i = roles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [roles[i], roles[j]] = [roles[j], roles[i]];
        }

        playerArray.forEach((player, index) => {
            player.role = roles[index];
        });
    }

    getPublicPlayerData() {
        return Array.from(this.players.values()).map(p => ({
            id: p.id,
            name: p.name,
            alive: p.alive,
            ready: p.ready
        }));
    }

    getMafiaMembers() {
        return Array.from(this.players.values())
            .filter(p => p.role === 'MAFIA')
            .map(p => ({ id: p.id, name: p.name }));
    }
}

// Generar código de sala único
function generateGameCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    // Crear nueva sala
    socket.on('create-game', (playerName) => {
        const gameCode = generateGameCode();
        const game = new Game(gameCode, socket.id);
        game.addPlayer(socket.id, playerName);
        games.set(gameCode, game);

        socket.join(gameCode);
        socket.emit('game-created', {
            gameCode: gameCode,
            hostId: socket.id
        });

        io.to(gameCode).emit('players-update', {
            players: game.getPublicPlayerData()
        });
    });

    // Unirse a sala
    socket.on('join-game', (data) => {
        const { gameCode, playerName } = data;
        const game = games.get(gameCode);

        if (!game) {
            socket.emit('error', 'Sala no encontrada');
            return;
        }

        if (game.phase !== 'lobby') {
            socket.emit('error', 'El juego ya comenzó');
            return;
        }

        game.addPlayer(socket.id, playerName);
        socket.join(gameCode);

        socket.emit('game-joined', {
            gameCode: gameCode,
            hostId: game.hostId
        });

        io.to(gameCode).emit('players-update', {
            players: game.getPublicPlayerData()
        });
    });

    // Iniciar juego
    socket.on('start-game', (gameCode) => {
        const game = games.get(gameCode);
        if (!game || game.hostId !== socket.id) return;

        if (game.players.size < 6) {
            socket.emit('error', 'Se necesitan al menos 6 jugadores');
            return;
        }

        game.assignRoles();
        game.phase = 'reveal';

        // Enviar rol a cada jugador
        game.players.forEach((player, socketId) => {
            const mafiaMembers = player.role === 'MAFIA' 
                ? game.getMafiaMembers().filter(m => m.id !== socketId)
                : [];

            io.to(socketId).emit('role-assigned', {
                role: player.role,
                mafiaMembers: mafiaMembers
            });
        });

        io.to(gameCode).emit('game-started');
    });

    // Jugador confirma que vio su rol
    socket.on('ready', (gameCode) => {
        const game = games.get(gameCode);
        if (!game) return;

        const player = game.players.get(socket.id);
        if (player) {
            player.ready = true;
        }

        // Verificar si todos están listos
        const allReady = Array.from(game.players.values()).every(p => p.ready);
        
        io.to(gameCode).emit('players-update', {
            players: game.getPublicPlayerData()
        });

        if (allReady) {
            startNightPhase(game);
        }
    });

    // Voto de mafia
    socket.on('mafia-vote', (data) => {
        const { gameCode, targetId } = data;
        const game = games.get(gameCode);
        if (!game) return;

        game.nightActions.mafiaVotes[socket.id] = targetId;

        // Calcular objetivo más votado
        const votes = Object.values(game.nightActions.mafiaVotes);
        const voteCount = {};
        votes.forEach(vote => {
            voteCount[vote] = (voteCount[vote] || 0) + 1;
        });

        let maxVotes = 0;
        for (const [playerId, count] of Object.entries(voteCount)) {
            if (count > maxVotes) {
                maxVotes = count;
                game.nightActions.mafiaTarget = playerId;
            }
        }

        // Verificar si todas las mafias votaron
        const mafiaCount = Array.from(game.players.values()).filter(p => p.role === 'MAFIA' && p.alive).length;
        if (Object.keys(game.nightActions.mafiaVotes).length === mafiaCount) {
            io.to(gameCode).emit('mafia-voted');
        }
    });

    // Voto de policía
    socket.on('police-vote', (data) => {
        const { gameCode, targetId } = data;
        const game = games.get(gameCode);
        if (!game) return;

        game.nightActions.policeTarget = targetId;
        io.to(gameCode).emit('police-voted');
    });

    // Voto de curandero
    socket.on('healer-vote', (data) => {
        const { gameCode, targetId } = data;
        const game = games.get(gameCode);
        if (!game) return;

        game.nightActions.healerTarget = targetId;
        processNightResults(game, gameCode);
    });

    // Voto de expulsión
    socket.on('expel-vote', (data) => {
        const { gameCode, targetId } = data;
        const game = games.get(gameCode);
        if (!game) return;

        if (!game.nightActions.expelVotes) {
            game.nightActions.expelVotes = {};
        }

        game.nightActions.expelVotes[socket.id] = targetId;

        const aliveCount = Array.from(game.players.values()).filter(p => p.alive).length;
        if (Object.keys(game.nightActions.expelVotes).length === aliveCount) {
            processExpelVote(game, gameCode);
        }
    });

    // Saltear votación
    socket.on('skip-vote', (gameCode) => {
        const game = games.get(gameCode);
        if (!game) return;

        game.round++;
        resetNightActions(game);
        startNightPhase(game);
    });

    // Desconexión
    socket.on('disconnect', () => {
        console.log('Usuario desconectado:', socket.id);
        
        // Buscar y eliminar jugador de su sala
        for (const [gameCode, game] of games.entries()) {
            if (game.players.has(socket.id)) {
                game.removePlayer(socket.id);
                
                if (game.players.size === 0) {
                    games.delete(gameCode);
                } else {
                    io.to(gameCode).emit('players-update', {
                        players: game.getPublicPlayerData()
                    });
                }
                break;
            }
        }
    });
});

function startNightPhase(game) {
    game.phase = 'night';
    resetNightActions(game);

    game.players.forEach((player) => {
        player.ready = false;
    });

    io.to(game.id).emit('night-phase', {
        round: game.round,
        players: game.getPublicPlayerData()
    });
}

function resetNightActions(game) {
    game.nightActions = {
        mafiaVotes: {},
        mafiaTarget: null,
        policeTarget: null,
        healerTarget: null,
        expelVotes: null
    };
}

function processNightResults(game, gameCode) {
    const results = [];
    let needsVote = false;

    // Procesar asesinato de mafia
    if (game.nightActions.mafiaTarget) {
        const victim = game.players.get(game.nightActions.mafiaTarget);
        
        if (game.nightActions.healerTarget === game.nightActions.mafiaTarget) {
            results.push({
                type: 'save',
                text: `💚 ¡El curandero salvó a ${victim.name}! La mafia intentó asesinarlos pero fueron protegidos.`
            });
        } else {
            victim.alive = false;
            results.push({
                type: 'death',
                text: `💀 ${victim.name} fue asesinado por la mafia. Era ${getRoleName(victim.role)}.`
            });
        }
    }

    // Procesar investigación del policía
    if (game.nightActions.policeTarget) {
        const suspect = game.players.get(game.nightActions.policeTarget);
        
        if (suspect.role === 'MAFIA') {
            suspect.alive = false;
            results.push({
                type: 'capture',
                text: `🚨 ¡El policía capturó a ${suspect.name}! Era un mafioso.`
            });
        } else {
            results.push({
                type: 'miss',
                text: `🔍 El policía investigó a ${suspect.name}, pero no es un mafioso.`
            });
            needsVote = true;
        }
    }

    game.phase = 'results';

    io.to(gameCode).emit('night-results', {
        results: results,
        needsVote: needsVote,
        players: game.getPublicPlayerData()
    });

    if (!needsVote) {
        const winner = checkWinConditions(game);
        if (winner) {
            endGame(game, gameCode, winner);
        }
    }
}

function processExpelVote(game, gameCode) {
    const voteCount = {};
    
    Object.values(game.nightActions.expelVotes).forEach(vote => {
        voteCount[vote] = (voteCount[vote] || 0) + 1;
    });

    let maxVotes = 0;
    let expelled = null;

    for (const [playerId, votes] of Object.entries(voteCount)) {
        if (votes > maxVotes) {
            maxVotes = votes;
            expelled = playerId;
        }
    }

    if (expelled) {
        const player = game.players.get(expelled);
        player.alive = false;

        const results = [{
            type: 'expel',
            text: `🗳️ ${player.name} fue expulsado por votación. Era ${getRoleName(player.role)}.`
        }];

        io.to(gameCode).emit('vote-results', {
            results: results,
            players: game.getPublicPlayerData()
        });

        const winner = checkWinConditions(game);
        if (winner) {
            endGame(game, gameCode, winner);
        } else {
            game.round++;
            setTimeout(() => {
                resetNightActions(game);
                startNightPhase(game);
            }, 5000);
        }
    }
}

function checkWinConditions(game) {
    const alivePlayers = Array.from(game.players.values()).filter(p => p.alive);
    const aliveMafia = alivePlayers.filter(p => p.role === 'MAFIA');
    const aliveTown = alivePlayers.filter(p => p.role !== 'MAFIA');

    if (aliveMafia.length === 0) {
        return 'town';
    } else if (aliveMafia.length >= aliveTown.length) {
        return 'mafia';
    }
    return null;
}

function endGame(game, gameCode, winner) {
    game.phase = 'end';

    const allPlayers = Array.from(game.players.values()).map(p => ({
        name: p.name,
        role: p.role,
        alive: p.alive
    }));

    io.to(gameCode).emit('game-end', {
        winner: winner,
        players: allPlayers
    });
}

function getRoleName(role) {
    const roles = {
        'MAFIA': '🔫 Mafia',
        'POLICE': '👮 Policía',
        'HEALER': '⚕️ Curandero',
        'TOWN': '👤 Pueblo'
    };
    return roles[role] || role;
}

const PORT = process.env.PORT || 3000;

http.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
