const socket = io();

const roomScreen = document.getElementById('room-screen');
const gameScreen = document.getElementById('game-screen');
const playerNameInput = document.getElementById('player-name');
const characterSelect = document.getElementById('character-select');
const roomIdInput = document.getElementById('room-id');
const createRoomButton = document.getElementById('create-room');
const joinRoomButton = document.getElementById('join-room');
const startGameButton = document.getElementById('start-game');
const endTurnButton = document.getElementById('end-turn');
const targetSelection = document.getElementById('target-selection');
const roomMessage = document.getElementById('room-message');
const playerList = document.getElementById('players');
const playerListPanel = document.getElementById('player-list');
const myPlayerBox = document.getElementById('my-player');
const enemyArea = document.getElementById('enemy-area');
const infoArea = document.getElementById('info-area');
const handArea = document.getElementById('hand-area');
const logArea = document.getElementById('log-area');

const HAND_SIZE = 3;
let roomId = '';
let myPlayerId = '';
let isHost = false;
let players = [];
let gameState = null;
let myCharacter = '剣士';
let pendingCardIndex = null;


const characterList = ['剣士', '魔法使い', '僧侶'];
const cardDefinitions = {
  剣士: [
    { id: 'kick', name: '蹴り', cost: 0, text: '単体に5ダメージ', type: 'damage', value: 5 },
    { id: 'slash', name: '斬撃', cost: 1, text: '単体に7ダメージ', type: 'damage', value: 7 },
    { id: 'spin', name: '回転切り', cost: 2, text: '敵全体に6ダメージ', type: 'damageAll', value: 6 },
    { id: 'double', name: '二連撃', cost: 3, text: '単体に15ダメージ', type: 'damage', value: 15 },
    { id: 'power', name: '強攻撃', cost: 4, text: '単体に20ダメージ', type: 'damage', value: 20 }
  ],
  魔法使い: [
    { id: 'buff', name: '単体強化', cost: 1, text: '味方1人の攻撃力を3ターン+5', type: 'buff', value: 5, turns: 3 },
    { id: 'all-buff', name: '全体強化', cost: 2, text: '味方全員の攻撃力を3ターン+5', type: 'buffAll', value: 5, turns: 3 },
    { id: 'fire', name: 'ファイアボール', cost: 2, text: '単体に10ダメージ', type: 'damage', value: 10 },
    { id: 'double-cast', name: '二重詠唱', cost: 3, text: '味方1人の攻撃力を1ターン倍化', type: 'doubleAttack', turns: 1 },
    { id: 'shield', name: 'シールド', cost: 3, text: '味方1人に防御シールド7', type: 'shield', value: 7 }
  ],
  僧侶: [
    { id: 'heal', name: '回復', cost: 2, text: '味方1人を7回復', type: 'heal', value: 7 },
    { id: 'sanctuary', name: '聖域設置', cost: 2, text: '毎ターン2回復するバフ', type: 'regen', value: 2 },
    { id: 'group-heal', name: '全体回復', cost: 3, text: '全員を4回復', type: 'healAll', value: 4 },
    { id: 'overheal', name: 'オーバーヒール', cost: 4, text: '上限を無視して7回復', type: 'overheal', value: 7 },
    { id: 'mega-overheal', name: 'オーバーヒール＋', cost: 5, text: '全員を上限無視で8回復', type: 'overhealAll', value: 8 }
  ]
};

const enemyStages = [
  { id: 'slime', name: 'スライム', baseHp: 70, attack: 5, special: 'なし' },
  { id: 'goblin', name: 'ゴブリン', baseHp: 90, attack: 7, special: 'HPの少ないプレイヤー優先攻撃' },
  { id: 'orc', name: 'オーク', baseHp: 100, attack: 9, special: '攻撃力を2低下' },
  {
    id: 'fugin', name: 'フギン', baseHp: 60, attack: 6,
    special: '3ターンに1度味方を回復、HPの少ないプレイヤー優先攻撃'
  },
  {
    id: 'munin', name: 'ムニン', baseHp: 60, attack: 6,
    special: '3ターンに1度味方を回復、HPの多いプレイヤー優先攻撃'
  },
  { id: 'demon', name: '魔王', baseHp: 120, attack: 10, special: '3ターンごとに分身発生' }
];

const stageEnemies = [
  [enemyStages[0]],
  [enemyStages[1]],
  [enemyStages[2]],
  [enemyStages[3], enemyStages[4]],
  [enemyStages[5]]
];

createRoomButton.addEventListener('click', () => {
  roomId = roomIdInput.value.trim() || randomRoomId();
  myCharacter = characterSelect.value;
  startRoom('create-room');
});

joinRoomButton.addEventListener('click', () => {
  roomId = roomIdInput.value.trim();
  if (!roomId) {
    showRoomMessage('ルームコードを入力してください。');
    return;
  }
  myCharacter = characterSelect.value;
  startRoom('join-room');
});

startGameButton.addEventListener('click', () => {
  if (!isHost) return;
  socket.emit('start-game', { roomId });
});

endTurnButton.addEventListener('click', () => {
  if (!gameState) return;
  const me = gameState.players.find(p => p.id === socket.id);
  if (!me || gameState.currentPlayer !== me.id) return;
  socket.emit('player-action', { roomId, playerId: socket.id, actionType: 'end-turn' });
});

socket.on('room-created', data => {
  roomId = data.roomId;
  roomIdInput.value = roomId;
  showRoomMessage(`ルームを作成しました: ${roomId}`);
});

socket.on('room-state', data => {
  players = data.players;
  isHost = data.hostId === socket.id;
  renderRoom();
});

socket.on('room-error', data => {
  showRoomMessage(data.message || 'ルームの参加に失敗しました。');
});

socket.on('host-changed', data => {
  isHost = data.hostId === socket.id;
  renderRoom();
});

socket.on('start-game', () => {
  if (!gameState) {
    initializeGameState();
  }
  showGameScreen();
  renderGame();
});

socket.on('player-action', data => {
  if (!gameState) return;
  if (socket.id === data.playerId && !isHost) return;
  if (!isHost) return;
  applyAction(data);
});

socket.on('game-state', state => {
  if (!state) return;
  gameState = state;
  renderGame();
});

function startRoom(eventName) {
  const name = playerNameInput.value.trim() || 'Player';
  socket.emit(eventName, { roomId, name, char: characterSelect.value });
  showRoomMessage('参加中… 少しお待ちください。');
}

function randomRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function showRoomMessage(text) {
  roomMessage.textContent = text;
}

function renderRoom() {
  playerListPanel.classList.remove('hidden');
  playerList.innerHTML = '';
  players.forEach(player => {
    const item = document.createElement('li');
    item.textContent = `${player.name} (${player.char || '剣士'})${player.isHost ? ' - ホスト' : ''}`;
    playerList.appendChild(item);
  });
  startGameButton.classList.toggle('hidden', !isHost);
  showRoomMessage(isHost ? 'ホストです。ゲームを開始できます。' : 'ホストの開始を待っています。');
}

function initializeGameState() {
  myPlayerId = socket.id;
  const roomPlayers = players.map(p => {
    const char = p.char || '剣士';
    const maxHp = char === '剣士' ? 50 : char === '魔法使い' ? 40 : 30;
    return {
      id: p.id,
      name: p.name,
      char,
      hp: maxHp,
      maxHp,
      ap: 7,
      shield: 0,
      buffAttack: 0,
      buffTurn: 0,
      doubleAttackTurns: 0,
      regen: 0,
      selected: p.id === socket.id
    };
  });

  const enemies = createStageEnemies(1, roomPlayers.length);

  gameState = {
    roomId,
    stage: 1,
    currentPlayer: roomPlayers[0].id,
    round: 1,
    players: roomPlayers,
    enemies,
    phase: 'player-turn',
    hands: {},
    decks: {},
    log: ['ゲーム開始！']
  };

  roomPlayers.forEach(player => {
    const deck = createDeck(player.char);
    gameState.decks[player.id] = deck;
    gameState.hands[player.id] = drawHand(deck);
  });

  if (isHost) {
    sendGameState();
  }
}

function createEnemy(enemyDef, playerCount) {
  return {
    id: enemyDef.id,
    name: enemyDef.name,
    hp: enemyDef.baseHp + playerCount * 30,
    maxHp: enemyDef.baseHp + playerCount * 30,
    attack: enemyDef.attack,
    special: enemyDef.special
  };
}

function createStageEnemies(stage, playerCount) {
  return stageEnemies[stage - 1].map(def => createEnemy(def, playerCount));
}

function createDeck(character) {
  const cards = cardDefinitions[character] || cardDefinitions['剣士'];
  const deck = [];
  cards.forEach(card => {
    for (let i = 0; i < 3; i += 1) {
      deck.push({ ...card });
    }
  });
  return deck;
}

function drawHand(deck) {
  const hand = [];
  const available = [...deck];
  while (hand.length < HAND_SIZE && available.length > 0) {
    const index = Math.floor(Math.random() * available.length);
    hand.push(available.splice(index, 1)[0]);
  }
  return hand;
}

function showGameScreen() {
  roomScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
}

function renderGame() {
  if (!gameState) return;

  const me = gameState.players.find(p => p.id === socket.id) || gameState.players[0];

  myPlayerBox.innerHTML = `
    <div class="player-info">
      <strong>${me.name} (${me.char})</strong>
      HP: ${me.hp} / ${me.maxHp}<br />
      AP: ${me.ap} / 7<br />
      シールド: ${me.shield}<br />
      攻撃バフ: ${me.buffAttack} (${me.buffTurn}ターン)
    </div>
  `;

  enemyArea.innerHTML = gameState.enemies.map(enemy => `
    <div class="enemy">
      <strong>${enemy.name}</strong><br />
      HP: ${enemy.hp} / ${enemy.maxHp}<br />
      攻撃: ${enemy.attack}<br />
      特殊: ${enemy.special}
    </div>
  `).join('');

  infoArea.innerHTML = `
    <p>ステージ: ${gameState.stage}</p>
    <p>現在のターン: ${gameState.currentPlayer === socket.id ? 'あなた' : '他のプレイヤー'}</p>
    <p>フェーズ: ${gameState.phase}</p>
    <p>ログ最新: ${gameState.log.slice(-3).join(' / ')}</p>
  `;

  const hand = gameState.hands[me.id] || [];
  handArea.innerHTML = hand.map((card, index) => `
    <div class="card">
      <strong>${card.name}</strong>
      <p>${card.text}</p>
      <p>コスト: ${card.cost}</p>
      <button ${canUseCard(me, card) ? '' : 'disabled'} data-index="${index}">使用</button>
    </div>
  `).join('');

  handArea.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.index);
      playCard(index);
    });
  });

  renderTargetSelection();
  renderEndTurnButton(me);
  renderLog();
}

function renderTargetSelection() {
  targetSelection.innerHTML = '';
  if (pendingCardIndex === null) return;

  const alive = getAliveEnemies();
  if (alive.length <= 1) {
    pendingCardIndex = null;
    return;
  }

  const label = document.createElement('div');
  label.textContent = '攻撃対象を選んでください。';
  targetSelection.appendChild(label);

  alive.forEach(enemy => {
    const button = document.createElement('button');
    button.textContent = enemy.name;
    button.addEventListener('click', () => selectTargetEnemy(enemy.id));
    targetSelection.appendChild(button);
  });
}

function renderEndTurnButton(me) {
  endTurnButton.disabled = gameState.phase !== 'player-turn' || gameState.currentPlayer !== me.id || me.hp <= 0;
}

function getAliveEnemies() {
  return (gameState.enemies || []).filter(enemy => enemy.hp > 0);
}

function hasPlayableCards(player) {
  if (player.hp <= 0) return false;
  const hand = gameState.hands[player.id] || [];
  return hand.some(card => card.cost <= player.ap);
}

function canUseCard(player, card) {
  return player.hp > 0 && player.ap >= card.cost && gameState.phase === 'player-turn' && gameState.currentPlayer === player.id;
}

function playCard(index) {
  if (!gameState || gameState.phase !== 'player-turn') return;
  const me = gameState.players.find(p => p.id === socket.id);
  if (!me || gameState.currentPlayer !== me.id || me.hp <= 0) return;
  const card = gameState.hands[me.id][index];
  if (!card || me.ap < card.cost) return;

  if (card.type === 'damage' && getAliveEnemies().length > 1) {
    pendingCardIndex = index;
    renderTargetSelection();
    return;
  }

  const action = {
    roomId,
    playerId: socket.id,
    actionType: 'play-card',
    cardIndex: index,
    cardId: card.id
  };
  socket.emit('player-action', action);
}

function selectTargetEnemy(enemyId) {
  if (pendingCardIndex === null) return;
  const me = gameState.players.find(p => p.id === socket.id);
  if (!me) return;

  const action = {
    roomId,
    playerId: socket.id,
    actionType: 'play-card',
    cardIndex: pendingCardIndex,
    cardId: gameState.hands[me.id][pendingCardIndex].id,
    targetId: enemyId
  };
  pendingCardIndex = null;
  targetSelection.innerHTML = '';
  socket.emit('player-action', action);
}

function applyAction(data) {
  if (data.actionType === 'end-turn') {
    nextPlayer();
    if (isHost) sendGameState();
    return;
  }

  if (data.actionType !== 'play-card') return;

  const player = gameState.players.find(p => p.id === data.playerId);
  if (!player) return;
  const card = gameState.hands[player.id][data.cardIndex];
  if (!card) return;

  if (player.ap < card.cost) return;

  player.ap -= card.cost;
  gameState.hands[player.id].splice(data.cardIndex, 1);

  const targetEnemy = data.targetId ? gameState.enemies.find(e => e.id === data.targetId) : gameState.enemies.find(e => e.hp > 0);

  if (card.type === 'damage') {
    if (targetEnemy) {
      let amount = card.value + player.buffAttack;
      if (player.doubleAttackTurns && player.doubleAttackTurns > 0) {
        amount = amount * 2;
      }
      targetEnemy.hp = Math.max(0, targetEnemy.hp - amount);
      addLog(`${player.name}の${card.name}！ ${targetEnemy.name}に${amount}ダメージ`);
      // 分身は一度攻撃を受けたら消える
      if (targetEnemy.isClone) {
        targetEnemy.hp = 0;
        addLog(`${targetEnemy.name}は消えた！`);
      }
    }
  }

  if (card.type === 'damageAll') {
    gameState.enemies.forEach(enemy => {
      enemy.hp = Math.max(0, enemy.hp - card.value - player.buffAttack);
    });
    addLog(`${player.name}の${card.name}！ 敵全体に${card.value + player.buffAttack}ダメージ`);
  }

  if (card.type === 'buff') {
    player.buffAttack += card.value;
    player.buffTurn = card.turns;
    addLog(`${player.name}に攻撃力バフ +${card.value}`);
  }

  if (card.type === 'buffAll') {
    gameState.players.forEach(target => {
      target.buffAttack += card.value;
      target.buffTurn = card.turns;
    });
    addLog(`全員の攻撃力が +${card.value}`);
  }

  if (card.type === 'doubleAttack') {
    player.doubleAttackTurns = card.turns || 1;
    addLog(`${player.name}の攻撃力が${card.turns || 1}ターン倍化！`);
  }

  if (card.type === 'shield') {
    player.shield += card.value;
    addLog(`${player.name}にシールド +${card.value}`);
  }

  if (card.type === 'heal') {
    player.hp = Math.min(player.maxHp, player.hp + card.value);
    addLog(`${player.name}を${card.value}回復`);
  }

  if (card.type === 'regen') {
    player.regen = card.value;
    addLog(`${player.name}に聖域：毎ターン${card.value}回復`);
  }

  if (card.type === 'healAll') {
    gameState.players.forEach(target => {
      target.hp = Math.min(target.maxHp, target.hp + card.value);
    });
    addLog(`全員を${card.value}回復`);
  }

  if (card.type === 'overheal') {
    player.hp = Math.min(player.maxHp + card.value, player.hp + card.value);
    addLog(`${player.name}を${card.value}回復（上限無視）`);
  }

  if (card.type === 'overhealAll') {
    gameState.players.forEach(target => {
      target.hp = Math.min(target.maxHp + card.value, target.hp + card.value);
    });
    addLog(`全員を${card.value}回復（上限無視）`);
  }

  if (gameState.enemies.every(e => e.hp <= 0)) {
    stageClear();
  } else {
    if (player.ap <= 0 || !hasPlayableCards(player)) {
      nextPlayer();
    }
  }

  pendingCardIndex = null;
  targetSelection.innerHTML = '';

  if (isHost) {
    sendGameState();
  }
}

function addLog(text) {
  gameState.log.push(text);
  if (gameState.log.length > 50) gameState.log.shift();
}

function renderLog() {
  logArea.innerHTML = gameState.log.map(entry => `<div class="log-item">${entry}</div>`).join('');
  logArea.scrollTop = logArea.scrollHeight;
}

function nextPlayer() {
  const startIndex = gameState.players.findIndex(p => p.id === gameState.currentPlayer);
  const playerCount = gameState.players.length;
  for (let i = 1; i <= playerCount; i += 1) {
    const nextIndex = (startIndex + i) % playerCount;
    const nextPlayer = gameState.players[nextIndex];
    if (nextPlayer.hp > 0) {
      gameState.currentPlayer = nextPlayer.id;
      // ラップ（ラウンド終了）を検知: 次のプレイヤーのインデックスが開始インデックス以下なら一周した
      if (nextIndex <= startIndex) {
        applyEnemyTurn();
      }
      return;
    }
  }
  gameState.phase = 'finished';
  addLog('全員が倒れました。ゲームオーバー。');
}

function applyEnemyTurn() {
  const enemies = gameState.enemies.filter(e => e.hp > 0);
  enemies.forEach(enemy => {
    const target = gameState.players.reduce((min, player) => {
      if (!min || player.hp < min.hp) return player;
      return min;
    }, null);

    if (target) {
      const damage = Math.max(0, enemy.attack - target.shield);
      target.shield = Math.max(0, target.shield - enemy.attack);
      target.hp = Math.max(0, target.hp - damage);
      addLog(`${enemy.name}が${target.name}を攻撃！ ${damage}ダメージ`);
    }
  });

  gameState.players.forEach(player => {
    if (player.regen > 0) {
      player.hp = Math.min(player.maxHp, player.hp + player.regen);
      addLog(`${player.name}が聖域で${player.regen}回復`);
    }
    if (player.buffTurn > 0) {
      player.buffTurn -= 1;
      if (player.buffTurn === 0) {
        player.buffAttack = 0;
      }
    }
    if (player.doubleAttackTurns > 0) {
      player.doubleAttackTurns -= 1;
    }
  });

  // 3ターンごとの敵特殊行動
  if (gameState.round % 3 === 0) {
    // フギギン/ムニンの相互回復
    const fugin = gameState.enemies.find(e => e.id === 'fugin' && e.hp > 0);
    const munin = gameState.enemies.find(e => e.id === 'munin' && e.hp > 0);
    if (fugin && munin) {
      // fugin -> munin 回復
      munin.hp = Math.min(munin.maxHp, munin.hp + 10);
      addLog(`${fugin.name}が${munin.name}を回復！ +10`);
      // munin -> fugin 回復
      fugin.hp = Math.min(fugin.maxHp, fugin.hp + 10);
      addLog(`${munin.name}が${fugin.name}を回復！ +10`);
    }

    // 魔王の分身生成（既に分身がいない場合のみ）
    const demon = gameState.enemies.find(e => e.id === 'demon' && e.hp > 0);
    const existingClones = gameState.enemies.filter(e => e.isClone && e.hp > 0);
    if (demon && existingClones.length === 0) {
      for (let i = 1; i <= 2; i += 1) {
        const cloneId = `${demon.id}-clone-${Date.now()}-${i}`;
        gameState.enemies.push({ id: cloneId, name: '魔王の分身', hp: 10, maxHp: 10, attack: 0, special: '分身', isClone: true });
      }
      addLog(`${demon.name}が分身を2体呼び出した！`);
    }
  }

  // 次ラウンドへ
  gameState.round = (gameState.round || 1) + 1;

  gameState.players.forEach(player => {
    player.ap = 7;
  });

  gameState.hands = {};
  gameState.players.forEach(player => {
    gameState.hands[player.id] = drawHand(gameState.decks[player.id]);
  });
  gameState.currentPlayer = gameState.players[0].id;
  addLog('敵のターン終了。次のラウンド開始。');
  if (isHost) sendGameState();
}

function stageClear() {
  addLog(`ステージ${gameState.stage}クリア！`);
  gameState.players.forEach(player => {
    player.hp = Math.min(player.maxHp, player.hp + 10);
  });

  gameState.stage += 1;
  if (gameState.stage > 5) {
    gameState.phase = 'finished';
    addLog('勝利！全てのステージをクリアしました。');
    return;
  }

  gameState.enemies = createStageEnemies(gameState.stage, gameState.players.length);
  gameState.players.forEach(player => {
    player.ap = 7;
    gameState.hands[player.id] = drawHand(gameState.decks[player.id]);
  });
  gameState.currentPlayer = gameState.players[0].id;
  gameState.phase = 'player-turn';
  addLog(`ステージ${gameState.stage}開始！`);
}

function sendGameState() {
  socket.emit('send-game-state', { roomId, gameState });
}
