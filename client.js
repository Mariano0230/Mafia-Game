const socket = io();

let gameCode = null;
let myRole = null;
let isHost = false;

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
