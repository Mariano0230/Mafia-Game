const socket = io();

let gameCode = null;
let myRole = null;
let isHost = false;
let isSinglePlayer = false;
let singlePlayerGame = null;

// Definición de roles
const ROLES = {
    MAFIA: {
        name: 'Mafia',
        emoji: '🔫',
        description: 'Eres parte de la mafia. Debes eliminar a los demás jugadores. Conoces a tus compañeros mafiosos.'
    },
    POLICE: {
        name: 'Policía',
        emoji: '👮',
        description: 'Puedes investigar a un jugador cada noche. Si es mafia, lo capturas.'
    },
    HEALER: {
        name: 'Curandero',
        emoji: '⚕️',
        description: 'Puedes proteger a un jugador cada noche (incluso a ti mismo) de ser asesinado.'
    },
    TOWN: {
        name: 'Pueblo',
        emoji: '👤',
        description: 'Eres un ciudadano común. Debes ayudar a identificar a la mafia.'
    }
};

// Event Listeners - Home Screen
document.getElementById('single-player-btn').addEventListener('click', selectSinglePlayer);
document.getElementById('multiplayer-btn').addEventListener('click', selectMultiplayer);
document.getElementById('start-single-player-btn').addEventListener('click', startSinglePlayerGame);
document.getElementById('create-game-btn').addEventListener('click', createGame);
document.getElementById('join-game-btn').addEventListener('click', joinGame);
document.getElementById('leave-lobby-btn').addEventListener('click', leaveLobby);
document.getElementById('start-game-btn').addEventListener('click', startGame);
document.getElementById('ready-btn').addEventListener('click', markReady);
document.getElementById('skip-vote-btn').addEventListener('click', skipVote);
document.getElementById('new-game-btn').addEventListener('click', () => location.reload());

// Socket Event Listeners
socket.on('game-created', (data) => {
    gameCode = data.gameCode;
    isHost = true;
    showLobby();
});

socket.on('game-joined', (data) => {
    gameCode = data.gameCode;
    isHost = (socket.id === data.hostId);
    showLobby();
});

socket.on('players-update', (data) => {
    updateLobbyPlayers(data.players);
    updateReadyList(data.players);
});

socket.on('game-started', () => {
    // Esperando asignación de rol
});

socket.on('role-assigned', (data) => {
    myRole = data.role;
    showRole(data);
});

socket.on('night-phase', (data) => {
    showNightPhase(data);
});

socket.on('mafia-voted', () => {
    if (myRole === 'MAFIA') {
        showWaitingTurn();
    }
});

socket.on('police-voted', () => {
    if (myRole === 'POLICE') {
        showWaitingTurn();
    }
});

socket.on('night-results', (data) => {
    showResults(data);
});

socket.on('vote-results', (data) => {
    showVoteResults(data);
});

socket.on('game-end', (data) => {
    showEndScreen(data);
});

socket.on('error', (message) => {
    showError(message);
});

// Functions
function createGame() {
    const playerName = document.getElementById('player-name').value.trim();
    if (!playerName) {
        showError('Por favor ingresa tu nombre');
        return;
    }
    socket.emit('create-game', playerName);
}

function joinGame() {
    const playerName = document.getElementById('player-name').value.trim();
    const code = document.getElementById('game-code-input').value.trim().toUpperCase();
    
    if (!playerName) {
        showError('Por favor ingresa tu nombre');
        return;
    }
    
    if (!code) {
        showError('Por favor ingresa el código de sala');
        return;
    }
    
    socket.emit('join-game', { gameCode: code, playerName: playerName });
}

function leaveLobby() {
    location.reload();
}

function startGame() {
    socket.emit('start-game', gameCode);
}

function markReady() {
    socket.emit('ready', gameCode);
    document.getElementById('ready-btn').disabled = true;
    document.getElementById('waiting-players').classList.remove('hidden');
}

function skipVote() {
    socket.emit('skip-vote', gameCode);
}

function showLobby() {
    showScreen('lobby-screen');
    document.getElementById('room-code').textContent = gameCode;
    
    if (isHost) {
        document.getElementById('host-controls').classList.remove('hidden');
    }
}

function updateLobbyPlayers(players) {
    const container = document.getElementById('lobby-players');
    container.innerHTML = '';
    
    players.forEach(player => {
        const div = document.createElement('div');
        div.className = 'lobby-player' + (player.ready ? ' ready' : '');
        div.innerHTML = `
            <div class="lobby-player-name">${player.name}</div>
            <div class="lobby-player-status">${player.ready ? '✅ Listo' : '⏳ Esperando'}</div>
        `;
        container.appendChild(div);
    });
    
    // Actualizar botón de inicio
    const startBtn = document.getElementById('start-game-btn');
    if (isHost && players.length >= 6) {
        startBtn.disabled = false;
    } else {
        startBtn.disabled = true;
    }
}

function showRole(data) {
    showScreen('role-screen');
    
    const role = ROLES[data.role];
    document.getElementById('role-title').textContent = `${role.emoji} ${role.name}`;
    document.getElementById('role-description').textContent = role.description;
    
    if (data.role === 'MAFIA' && data.mafiaMembers.length > 0) {
        document.getElementById('mafia-members').classList.remove('hidden');
        const list = document.getElementById('mafia-list');
        list.innerHTML = '';
        data.mafiaMembers.forEach(member => {
            const li = document.createElement('li');
            li.textContent = member.name;
            list.appendChild(li);
        });
    }
}

function updateReadyList(players) {
    const readyPlayers = players.filter(p => p.ready);
    const container = document.getElementById('ready-list');
    container.innerHTML = '';
    
    readyPlayers.forEach(player => {
        const span = document.createElement('span');
        span.className = 'ready-player';
        span.textContent = player.name;
        container.appendChild(span);
    });
}

function showNightPhase(data) {
    showScreen('night-screen');
    document.getElementById('round-number').textContent = data.round;
    
    const alivePlayers = data.players.filter(p => p.alive && p.id !== socket.id);
    const allAlivePlayers = data.players.filter(p => p.alive);
    
    if (myRole === 'MAFIA') {
        showMafiaTurn(alivePlayers.filter(p => p.id !== socket.id));
    } else if (myRole === 'POLICE') {
        showPoliceTurn(alivePlayers);
    } else if (myRole === 'HEALER') {
        showHealerTurn(allAlivePlayers);
    } else {
        showWaitingTurn();
    }
}

function showMafiaTurn(targets) {
    document.getElementById('your-turn').classList.remove('hidden');
    document.getElementById('waiting-turn').classList.add('hidden');
    
    document.getElementById('turn-instruction').innerHTML = `
        <h3>🔫 Turno de la Mafia</h3>
        <p>Selecciona a tu víctima:</p>
    `;
    
    renderPlayerCards(targets, (targetId) => {
        socket.emit('mafia-vote', { gameCode, targetId });
    });
}

function showPoliceTurn(targets) {
    document.getElementById('your-turn').classList.remove('hidden');
    document.getElementById('waiting-turn').classList.add('hidden');
    
    document.getElementById('turn-instruction').innerHTML = `
        <h3>👮 Turno del Policía</h3>
        <p>Selecciona a un sospechoso para investigar:</p>
    `;
    
    renderPlayerCards(targets, (targetId) => {
        socket.emit('police-vote', { gameCode, targetId });
    });
}

function showHealerTurn(targets) {
    document.getElementById('your-turn').classList.remove('hidden');
    document.getElementById('waiting-turn').classList.add('hidden');
    
    document.getElementById('turn-instruction').innerHTML = `
        <h3>⚕️ Turno del Curandero</h3>
        <p>Selecciona a quién proteger (puedes protegerte a ti mismo):</p>
    `;
    
    renderPlayerCards(targets, (targetId) => {
        socket.emit('healer-vote', { gameCode, targetId });
    });
}

function showWaitingTurn() {
    document.getElementById('your-turn').classList.add('hidden');
    document.getElementById('waiting-turn').classList.remove('hidden');
}

function renderPlayerCards(players, onSelect) {
    const container = document.getElementById('target-players');
    container.innerHTML = '';
    
    players.forEach(player => {
        const card = document.createElement('div');
        card.className = 'player-card';
        card.innerHTML = `<div class="player-name">${player.name}</div>`;
        card.addEventListener('click', () => {
            document.querySelectorAll('.player-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            setTimeout(() => onSelect(player.id), 300);
        });
        container.appendChild(card);
    });
}

function showResults(data) {
    showScreen('results-screen');
    
    const container = document.getElementById('results-content');
    container.innerHTML = '';
    
    data.results.forEach(result => {
        const div = document.createElement('div');
        div.className = `result-item ${result.type}`;
        div.innerHTML = `<p>${result.text}</p>`;
        container.appendChild(div);
    });
    
    // Mostrar jugadores vivos
    const aliveContainer = document.getElementById('alive-players');
    aliveContainer.innerHTML = '';
    data.players.filter(p => p.alive).forEach(player => {
        const span = document.createElement('span');
        span.className = 'alive-player';
        span.textContent = player.name;
        aliveContainer.appendChild(span);
    });
    
    if (data.needsVote) {
        setTimeout(() => {
            showVoteScreen(data.players);
        }, 5000);
    } else {
        setTimeout(() => {
            // Esperar siguiente ronda
        }, 5000);
    }
}

function showVoteScreen(players) {
    showScreen('vote-screen');
    
    const alivePlayers = players.filter(p => p.alive);
    const container = document.getElementById('vote-players');
    container.innerHTML = '';
    
    alivePlayers.forEach(player => {
        const card = document.createElement('div');
        card.className = 'player-card';
        card.innerHTML = `<div class="player-name">${player.name}</div>`;
        card.addEventListener('click', () => {
            document.querySelectorAll('.player-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            setTimeout(() => {
                socket.emit('expel-vote', { gameCode, targetId: player.id });
                showWaitingScreen();
            }, 300);
        });
        container.appendChild(card);
    });
}

function showVoteResults(data) {
    showScreen('results-screen');
    
    const container = document.getElementById('results-content');
    container.innerHTML = '';
    
    data.results.forEach(result => {
        const div = document.createElement('div');
        div.className = 'result-item expel';
        div.innerHTML = `<p>${result.text}</p>`;
        container.appendChild(div);
    });
    
    // Mostrar jugadores vivos
    const aliveContainer = document.getElementById('alive-players');
    aliveContainer.innerHTML = '';
    data.players.filter(p => p.alive).forEach(player => {
        const span = document.createElement('span');
        span.className = 'alive-player';
        span.textContent = player.name;
        aliveContainer.appendChild(span);
    });
}

function showWaitingScreen() {
    showScreen('results-screen');
    document.getElementById('results-content').innerHTML = '<p style="text-align:center; padding: 40px;">Esperando resultados de la votación...</p>';
}

function showEndScreen(data) {
    showScreen('end-screen');
    
    const title = document.getElementById('winner-title');
    if (data.winner === 'town') {
        title.textContent = '🎉 ¡EL PUEBLO GANA! 🎉';
        title.style.color = '#28a745';
    } else {
        title.textContent = '🔫 ¡LA MAFIA GANA! 🔫';
        title.style.color = '#dc3545';
    }
    
    const container = document.getElementById('final-roles');
    container.innerHTML = '';
    
    data.players.forEach(player => {
        const role = ROLES[player.role];
        const div = document.createElement('div');
        div.className = 'final-role-item';
        div.innerHTML = `
            <span class="final-role-name">${player.name}</span>
            <span class="final-role-status">
                <span>${role.emoji} ${role.name}</span>
                <span>${player.alive ? '✅' : '💀'}</span>
            </span>
        `;
        container.appendChild(div);
    });
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function showError(message) {
    const errorEl = document.getElementById('error-message');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    
    setTimeout(() => {
        errorEl.classList.add('hidden');
    }, 3000);
}

// ============================================
// MODO UN JUGADOR CON BOTS
// ============================================

function selectSinglePlayer() {
    isSinglePlayer = true;
    document.getElementById('single-player-btn').classList.add('active');
    document.getElementById('multiplayer-btn').classList.remove('active');
    document.getElementById('multiplayer-options').classList.add('hidden');
    document.getElementById('single-player-options').classList.remove('hidden');
}

function selectMultiplayer() {
    isSinglePlayer = false;
    document.getElementById('multiplayer-btn').classList.add('active');
    document.getElementById('single-player-btn').classList.remove('active');
    document.getElementById('single-player-options').classList.add('hidden');
    document.getElementById('multiplayer-options').classList.remove('hidden');
}

function startSinglePlayerGame() {
    const playerName = document.getElementById('player-name').value.trim() || 'Jugador';
    const botCount = parseInt(document.getElementById('bot-count').value);
    
    if (botCount < 5 || botCount > 19) {
        showError('El número de bots debe estar entre 5 y 19');
        return;
    }
    
    // Crear juego local con bots
    singlePlayerGame = new SinglePlayerGame(playerName, botCount);
    singlePlayerGame.start();
}

class SinglePlayerGame {
    constructor(playerName, botCount) {
        this.players = [];
        this.round = 1;
        this.nightActions = {};
        this.playerName = playerName;
        
        // Crear jugador humano
        this.players.push({
            id: 'human',
            name: playerName,
            role: null,
            alive: true,
            isBot: false
        });
        
        // Crear bots
        const botNames = [
            'Bot Alpha', 'Bot Beta', 'Bot Gamma', 'Bot Delta', 'Bot Epsilon',
            'Bot Zeta', 'Bot Eta', 'Bot Theta', 'Bot Iota', 'Bot Kappa',
            'Bot Lambda', 'Bot Mu', 'Bot Nu', 'Bot Xi', 'Bot Omicron',
            'Bot Pi', 'Bot Rho', 'Bot Sigma', 'Bot Tau'
        ];
        
        for (let i = 0; i < botCount; i++) {
            this.players.push({
                id: `bot-${i}`,
                name: botNames[i],
                role: null,
                alive: true,
                isBot: true
            });
        }
        
        this.assignRoles();
    }
    
    assignRoles() {
        const playerCount = this.players.length;
        const mafiaCount = Math.floor(playerCount / 3);
        
        const roles = [];
        for (let i = 0; i < mafiaCount; i++) roles.push('MAFIA');
        roles.push('POLICE');
        roles.push('HEALER');
        while (roles.length < playerCount) roles.push('TOWN');
        
        // Mezclar roles
        for (let i = roles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [roles[i], roles[j]] = [roles[j], roles[i]];
        }
        
        this.players.forEach((player, index) => {
            player.role = roles[index];
        });
    }
    
    start() {
        const humanPlayer = this.players.find(p => !p.isBot);
        myRole = humanPlayer.role;
        
        // Mostrar rol del jugador
        showScreen('role-screen');
        const role = ROLES[myRole];
        document.getElementById('role-title').textContent = `${role.emoji} ${role.name}`;
        document.getElementById('role-description').textContent = role.description;
        
        if (myRole === 'MAFIA') {
            const mafiaMembers = this.players.filter(p => p.role === 'MAFIA' && p.isBot);
            if (mafiaMembers.length > 0) {
                document.getElementById('mafia-members').classList.remove('hidden');
                const list = document.getElementById('mafia-list');
                list.innerHTML = '';
                mafiaMembers.forEach(member => {
                    const li = document.createElement('li');
                    li.textContent = member.name;
                    list.appendChild(li);
                });
            }
        }
        
        // Cambiar el botón de "Estoy listo" para iniciar la noche
        document.getElementById('ready-btn').textContent = 'Comenzar Noche';
        document.getElementById('ready-btn').onclick = () => this.startNight();
        document.getElementById('waiting-players').classList.add('hidden');
    }
    
    startNight() {
        this.nightActions = {
            mafiaTarget: null,
            policeTarget: null,
            healerTarget: null
        };
        
        showScreen('night-screen');
        document.getElementById('round-number').textContent = this.round;
        
        // Los bots toman decisiones automáticamente
        this.botsMakeDecisions();
        
        // Mostrar turno del jugador humano
        const alivePlayers = this.players.filter(p => p.alive && p.id !== 'human');
        const allAlivePlayers = this.players.filter(p => p.alive);
        
        if (myRole === 'MAFIA' && this.players.find(p => p.id === 'human').alive) {
            this.showMafiaTurn(alivePlayers);
        } else if (myRole === 'POLICE' && this.players.find(p => p.id === 'human').alive) {
            this.showPoliceTurn(alivePlayers);
        } else if (myRole === 'HEALER' && this.players.find(p => p.id === 'human').alive) {
            this.showHealerTurn(allAlivePlayers);
        } else {
            document.getElementById('your-turn').classList.add('hidden');
            document.getElementById('waiting-turn').classList.remove('hidden');
            setTimeout(() => this.processNight(), 2000);
        }
    }
    
    botsMakeDecisions() {
        const alivePlayers = this.players.filter(p => p.alive);
        
        // Bots mafia eligen objetivo
        const mafias = this.players.filter(p => p.role === 'MAFIA' && p.isBot && p.alive);
        if (mafias.length > 0) {
            const targets = alivePlayers.filter(p => p.role !== 'MAFIA');
            if (targets.length > 0) {
                // Bots intentan eliminar primero al policía o curandero si los conocen (simulación inteligente)
                const priority = targets.find(p => p.role === 'POLICE' || p.role === 'HEALER');
                this.nightActions.mafiaTarget = priority ? priority.id : targets[Math.floor(Math.random() * targets.length)].id;
            }
        }
        
        // Bot policía elige objetivo
        const police = this.players.find(p => p.role === 'POLICE' && p.isBot && p.alive);
        if (police) {
            const suspects = alivePlayers.filter(p => p.id !== police.id);
            if (suspects.length > 0) {
                this.nightActions.policeTarget = suspects[Math.floor(Math.random() * suspects.length)].id;
            }
        }
        
        // Bot curandero elige objetivo (puede protegerse a sí mismo)
        const healer = this.players.find(p => p.role === 'HEALER' && p.isBot && p.alive);
        if (healer) {
            // 40% de probabilidad de protegerse a sí mismo
            if (Math.random() < 0.4) {
                this.nightActions.healerTarget = healer.id;
            } else {
                const targets = alivePlayers.filter(p => p.id !== healer.id);
                if (targets.length > 0) {
                    this.nightActions.healerTarget = targets[Math.floor(Math.random() * targets.length)].id;
                }
            }
        }
    }
    
    showMafiaTurn(targets) {
        document.getElementById('your-turn').classList.remove('hidden');
        document.getElementById('waiting-turn').classList.add('hidden');
        
        document.getElementById('turn-instruction').innerHTML = `
            <h3>🔫 Turno de la Mafia</h3>
            <p>Selecciona a tu víctima:</p>
        `;
        
        this.renderPlayerCards(targets, (targetId) => {
            this.nightActions.mafiaTarget = targetId;
            this.processNight();
        });
    }
    
    showPoliceTurn(targets) {
        document.getElementById('your-turn').classList.remove('hidden');
        document.getElementById('waiting-turn').classList.add('hidden');
        
        document.getElementById('turn-instruction').innerHTML = `
            <h3>👮 Turno del Policía</h3>
            <p>Selecciona a un sospechoso para investigar:</p>
        `;
        
        this.renderPlayerCards(targets, (targetId) => {
            this.nightActions.policeTarget = targetId;
            this.processNight();
        });
    }
    
    showHealerTurn(targets) {
        document.getElementById('your-turn').classList.remove('hidden');
        document.getElementById('waiting-turn').classList.add('hidden');
        
        document.getElementById('turn-instruction').innerHTML = `
            <h3>⚕️ Turno del Curandero</h3>
            <p>Selecciona a quién proteger (puedes protegerte a ti mismo):</p>
        `;
        
        this.renderPlayerCards(targets, (targetId) => {
            this.nightActions.healerTarget = targetId;
            this.processNight();
        });
    }
    
    renderPlayerCards(players, onSelect) {
        const container = document.getElementById('target-players');
        container.innerHTML = '';
        
        players.forEach(player => {
            const card = document.createElement('div');
            card.className = 'player-card';
            card.innerHTML = `<div class="player-name">${player.name}</div>`;
            card.addEventListener('click', () => {
                document.querySelectorAll('.player-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                setTimeout(() => onSelect(player.id), 300);
            });
            container.appendChild(card);
        });
    }
    
    processNight() {
        const results = [];
        let needsVote = false;
        
        // Procesar asesinato de mafia
        if (this.nightActions.mafiaTarget) {
            const victim = this.players.find(p => p.id === this.nightActions.mafiaTarget);
            
            if (this.nightActions.healerTarget === this.nightActions.mafiaTarget) {
                results.push({
                    type: 'save',
                    text: `💚 ¡El curandero salvó a ${victim.name}! La mafia intentó asesinarlos pero fueron protegidos.`
                });
            } else {
                victim.alive = false;
                results.push({
                    type: 'death',
                    text: `💀 ${victim.name} fue asesinado por la mafia. Era ${ROLES[victim.role].emoji} ${ROLES[victim.role].name}.`
                });
            }
        }
        
        // Procesar investigación del policía
        if (this.nightActions.policeTarget) {
            const suspect = this.players.find(p => p.id === this.nightActions.policeTarget);
            
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
        
        this.showResults(results, needsVote);
    }
    
    showResults(results, needsVote) {
        showScreen('results-screen');
        
        const container = document.getElementById('results-content');
        container.innerHTML = '';
        
        results.forEach(result => {
            const div = document.createElement('div');
            div.className = `result-item ${result.type}`;
            div.innerHTML = `<p>${result.text}</p>`;
            container.appendChild(div);
        });
        
        // Mostrar jugadores vivos
        const aliveContainer = document.getElementById('alive-players');
        aliveContainer.innerHTML = '';
        this.players.filter(p => p.alive).forEach(player => {
            const span = document.createElement('span');
            span.className = 'alive-player';
            span.textContent = player.name;
            aliveContainer.appendChild(span);
        });
        
        // Verificar condiciones de victoria
        const winner = this.checkWinConditions();
        if (winner) {
            setTimeout(() => this.endGame(winner), 3000);
            return;
        }
        
        if (needsVote) {
            setTimeout(() => this.showVoting(), 3000);
        } else {
            setTimeout(() => {
                this.round++;
                this.startNight();
            }, 3000);
        }
    }
    
    showVoting() {
        showScreen('vote-screen');
        
        const alivePlayers = this.players.filter(p => p.alive);
        const container = document.getElementById('vote-players');
        container.innerHTML = '';
        
        // Los bots votan aleatoriamente
        const botVotes = {};
        const bots = alivePlayers.filter(p => p.isBot);
        bots.forEach(bot => {
            const targets = alivePlayers.filter(p => p.id !== bot.id);
            if (targets.length > 0) {
                const target = targets[Math.floor(Math.random() * targets.length)];
                botVotes[target.id] = (botVotes[target.id] || 0) + 1;
            }
        });
        
        alivePlayers.forEach(player => {
            const card = document.createElement('div');
            card.className = 'player-card';
            card.innerHTML = `<div class="player-name">${player.name}</div>`;
            card.addEventListener('click', () => {
                document.querySelectorAll('.player-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                setTimeout(() => {
                    // Agregar voto del jugador humano
                    botVotes[player.id] = (botVotes[player.id] || 0) + 1;
                    this.processVoting(botVotes);
                }, 300);
            });
            container.appendChild(card);
        });
        
        document.getElementById('skip-vote-btn').onclick = () => {
            this.round++;
            this.startNight();
        };
    }
    
    processVoting(votes) {
        let maxVotes = 0;
        let expelled = null;
        
        for (const [playerId, count] of Object.entries(votes)) {
            if (count > maxVotes) {
                maxVotes = count;
                expelled = playerId;
            }
        }
        
        if (expelled) {
            const player = this.players.find(p => p.id === expelled);
            player.alive = false;
            
            const results = [{
                type: 'expel',
                text: `🗳️ ${player.name} fue expulsado por votación. Era ${ROLES[player.role].emoji} ${ROLES[player.role].name}.`
            }];
            
            this.showResults(results, false);
        }
    }
    
    checkWinConditions() {
        const alivePlayers = this.players.filter(p => p.alive);
        const aliveMafia = alivePlayers.filter(p => p.role === 'MAFIA');
        const aliveTown = alivePlayers.filter(p => p.role !== 'MAFIA');
        
        if (aliveMafia.length === 0) {
            return 'town';
        } else if (aliveMafia.length >= aliveTown.length) {
            return 'mafia';
        }
        return null;
    }
    
    endGame(winner) {
        showScreen('end-screen');
        
        const title = document.getElementById('winner-title');
        if (winner === 'town') {
            title.textContent = '🎉 ¡EL PUEBLO GANA! 🎉';
            title.style.color = '#28a745';
        } else {
            title.textContent = '🔫 ¡LA MAFIA GANA! 🔫';
            title.style.color = '#dc3545';
        }
        
        const container = document.getElementById('final-roles');
        container.innerHTML = '';
        
        this.players.forEach(player => {
            const role = ROLES[player.role];
            const div = document.createElement('div');
            div.className = 'final-role-item';
            div.innerHTML = `
                <span class="final-role-name">${player.name}</span>
                <span class="final-role-status">
                    <span>${role.emoji} ${role.name}</span>
                    <span>${player.alive ? '✅' : '💀'}</span>
                </span>
            `;
            container.appendChild(div);
        });
    }
}
