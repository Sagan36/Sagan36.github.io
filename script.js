/* =============================================
   EKANS SNAKE GAME — SCRIPT.JS
   
   Architecture:
   ┌─────────────────────────────────────────┐
   │  GameState   — single source of truth   │
   │  InputHandler — keyboard / UI events    │
   │  Renderer    — all canvas drawing       │
   │  GameLogic   — movement, collisions     │
   │  GameLoop    — requestAnimationFrame    │
   │  ScreenManager — show/hide screens      │
   │  ThemeManager — color theme selector    │
   └─────────────────────────────────────────┘
============================================= */

'use strict';

/* ==============================================
   SECTION 1: CONFIGURATION
============================================== */
const CONFIG = {
  GRID_COLS: 25,
  GRID_ROWS: 20,
  CELL_SIZE: 40,

  SPEED_EASY:   210,
  SPEED_NORMAL: 165,
  SPEED_HARD:   130,

  SCORE_PER_LEVEL: 5,
  SPEED_INCREMENT: 4,
  SPEED_MIN: 85,

  POINTS_PER_BERRY: 10,
  INITIAL_LENGTH: 4,
  MULTIPLAYER_DURATION: 3 * 60 * 1000,
  COMBO_WINDOW: 2800,
  POWERUP_DURATION: 7000,
  POWERUP_CHANCE: 0.22,

  POKEMON: {
    ekans: { id: 23, name: 'EKANS' },
    seviper: { id: 336, name: 'SEVIPER' },
    serperior: { id: 497, name: 'SERPERIOR' },
    dragonair: { id: 148, name: 'DRAGONAIR' },
  },

  POKEMON_COLORS: {
    ekans: {
      EKANS_HEAD: '#7b4aa0',
      EKANS_BODY: '#563070',
      EKANS_EYE: '#f4e9ff',
      EKANS_TONGUE: '#ef4444',
      EKANS_OUTLINE: '#24112f',
    },
    seviper: {
      EKANS_HEAD: '#1f2937',
      EKANS_BODY: '#374151',
      EKANS_EYE: '#f8fafc',
      EKANS_TONGUE: '#dc2626',
      EKANS_OUTLINE: '#050608',
    },
    serperior: {
      EKANS_HEAD: '#4ade80',
      EKANS_BODY: '#15803d',
      EKANS_EYE: '#ecfccb',
      EKANS_TONGUE: '#facc15',
      EKANS_OUTLINE: '#052e16',
    },
    dragonair: {
      EKANS_HEAD: '#93c5fd',
      EKANS_BODY: '#3b82f6',
      EKANS_EYE: '#eff6ff',
      EKANS_TONGUE: '#f472b6',
      EKANS_OUTLINE: '#0f1f45',
    },
  },

  // Purple theme colors — formerly the dark theme
  // 282631 / 302B46 / 2F213A / 613D69 / 7C7880 / 9C9B9D / 9B9B9B
  COLOR_PURPLE: {
    BG:             '#282631',
    GRID_LINE:      '#2F213A',
    EKANS_HEAD:     '#613D69',
    EKANS_BODY:     '#4a2e52',
    EKANS_EYE:      '#9C9B9D',
    EKANS_TONGUE:   '#ef4444',
    EKANS_OUTLINE:  '#1e1824',
    BERRY:          '#ef4444',
    BERRY_SHINE:    '#fca5a5',
    BERRY_LEAF:     '#22c55e',
    BERRY_STEM:     '#15803d',
    SCORE_TEXT:     '#9B9B9B',
    LEVEL_UP_TEXT:  '#9C9B9D',
  },

  COLOR_BLUE: {
    BG:             '#09192d',
    GRID_LINE:      '#183e61',
    EKANS_HEAD:     '#5aa9ea',
    EKANS_BODY:     '#2875b4',
    EKANS_EYE:      '#d9f2ff',
    EKANS_TONGUE:   '#ff6482',
    EKANS_OUTLINE:  '#071524',
    BERRY:          '#ef4444',
    BERRY_SHINE:    '#fca5a5',
    BERRY_LEAF:     '#22c55e',
    BERRY_STEM:     '#15803d',
    SCORE_TEXT:     '#74d5ff',
    LEVEL_UP_TEXT:  '#d9f2ff',
  },

  COLOR_PINK: {
    BG:             '#331624',
    GRID_LINE:      '#653049',
    EKANS_HEAD:     '#ed79ac',
    EKANS_BODY:     '#c04479',
    EKANS_EYE:      '#ffe8f2',
    EKANS_TONGUE:   '#fef08a',
    EKANS_OUTLINE:  '#28101c',
    BERRY:          '#ef4444',
    BERRY_SHINE:    '#fca5a5',
    BERRY_LEAF:     '#22c55e',
    BERRY_STEM:     '#15803d',
    SCORE_TEXT:     '#ff9fc7',
    LEVEL_UP_TEXT:  '#ffe5ef',
  },

  COLOR_GREEN: {
    BG:             '#10271d',
    GRID_LINE:      '#205239',
    EKANS_HEAD:     '#54c986',
    EKANS_BODY:     '#278651',
    EKANS_EYE:      '#e3ffe9',
    EKANS_TONGUE:   '#ff708d',
    EKANS_OUTLINE:  '#091c12',
    BERRY:          '#ef4444',
    BERRY_SHINE:    '#fca5a5',
    BERRY_LEAF:     '#86efac',
    BERRY_STEM:     '#15803d',
    SCORE_TEXT:     '#75df9a',
    LEVEL_UP_TEXT:  '#ddf8e6',
  },

  COLOR_YELLOW: {
    BG:             '#322508',
    GRID_LINE:      '#66501b',
    EKANS_HEAD:     '#f1c84d',
    EKANS_BODY:     '#c08c20',
    EKANS_EYE:      '#fff6ce',
    EKANS_TONGUE:   '#ef4444',
    EKANS_OUTLINE:  '#251904',
    BERRY:          '#ef4444',
    BERRY_SHINE:    '#fca5a5',
    BERRY_LEAF:     '#22c55e',
    BERRY_STEM:     '#15803d',
    SCORE_TEXT:     '#ffd65a',
    LEVEL_UP_TEXT:  '#fff2c3',
  },

  // Active color palette — swapped by ThemeManager
  COLOR: {},

  COLOR_PLAYER_TWO: {
    EKANS_HEAD:    '#f97316',
    EKANS_BODY:    '#c2410c',
    EKANS_TONGUE:  '#fde68a',
    EKANS_OUTLINE: '#431407',
  }
};

// Initialize with purple theme colors
Object.assign(CONFIG.COLOR, CONFIG.COLOR_PURPLE);

/* ==============================================
   SECTION 2: GAME STATE
============================================== */
const GameState = {
  mode:          'single',
  score:         0,
  scoreTwo:      0,
  highScore:     0,
  level:         1,
  berriesEaten:  0,
  berriesEatenTwo: 0,
  isRunning:     false,
  isPaused:      false,
  isGameOver:    false,
  isCountdown:   false,

  tickInterval:  CONFIG.SPEED_NORMAL,

  snake: [],
  snakeTwo: [],

  direction:     { x: 1, y: 0 },
  nextDirection: { x: 1, y: 0 },
  directionTwo:     { x: -1, y: 0 },
  nextDirectionTwo: { x: -1, y: 0 },

  berry: { x: 0, y: 0 },
  berryType: 'normal',
  particles: [],
  combo: 1,
  comboEndsAt: 0,
  activePowerUp: null,
  powerUpEndsAt: 0,
  cameraPulse: 0,
  selectedPokemon: 'ekans',
  playerNames: ['PLAYER 1', 'PLAYER 2'],

  eatAnimTimer:  0,
  levelUpTimer:  0,
  deathAnimDone: false,
  deathImpactStartedAt: 0,
  matchEndsAt:   0,
  countdownEndsAt: 0,
  countdownLastNumber: 0,
  pausedAt:      0,
  timeRemaining: CONFIG.MULTIPLAYER_DURATION,
  winner:        null,
  resultReason:  '',
  losingPlayers: [],

  reset(startSpeed, mode = 'single') {
    this.mode         = mode;
    this.score        = 0;
    this.scoreTwo     = 0;
    this.level        = 1;
    this.berriesEaten = 0;
    this.berriesEatenTwo = 0;
    this.isRunning    = false;
    this.isPaused     = false;
    this.isGameOver   = false;
    this.isCountdown  = false;
    this.tickInterval = startSpeed || CONFIG.SPEED_NORMAL;
    this.direction    = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.directionTwo = { x: -1, y: 0 };
    this.nextDirectionTwo = { x: -1, y: 0 };
    this.eatAnimTimer  = 0;
    this.levelUpTimer  = 0;
    this.deathAnimDone = false;
    this.deathImpactStartedAt = 0;
    this.timeRemaining = CONFIG.MULTIPLAYER_DURATION;
    this.matchEndsAt   = 0;
    this.countdownEndsAt = 0;
    this.countdownLastNumber = 0;
    this.pausedAt      = 0;
    this.winner        = null;
    this.resultReason  = '';
    this.losingPlayers = [];
    this.berry         = { x: -1, y: -1 };
    this.berryType     = 'normal';
    this.particles     = [];
    this.combo         = 1;
    this.comboEndsAt   = 0;
    this.activePowerUp = null;
    this.powerUpEndsAt = 0;
    this.cameraPulse   = 0;

    this.snake = [];
    const startX = Math.floor(CONFIG.GRID_COLS / 4);
    const startY = mode === 'multiplayer' ?
      Math.floor(CONFIG.GRID_ROWS / 3) :
      Math.floor(CONFIG.GRID_ROWS / 2);
    for (let i = 0; i < CONFIG.INITIAL_LENGTH; i++) {
      this.snake.push({ x: startX - i, y: startY });
    }

    this.snakeTwo = [];
    if (mode === 'multiplayer') {
      const startXTwo = Math.floor(CONFIG.GRID_COLS * 3 / 4);
      const startYTwo = Math.floor(CONFIG.GRID_ROWS * 2 / 3);
      for (let i = 0; i < CONFIG.INITIAL_LENGTH; i++) {
        this.snakeTwo.push({ x: startXTwo + i, y: startYTwo });
      }
    }
  }
};

/* ==============================================
   SECTION 3: SCREEN MANAGER
============================================== */
const ScreenManager = {
  screens: {},
  current: null,

  init() {
    this.screens.menu     = document.getElementById('screen-menu');
    this.screens.multiplayer = document.getElementById('screen-multiplayer');
    this.screens.game     = document.getElementById('screen-game');
    this.screens.gameover = document.getElementById('screen-gameover');
    this.screens.achievements = document.getElementById('screen-achievements');
  },

  show(name) {
    const previous = this.current;
    Object.values(this.screens).forEach(s => s.classList.remove('active'));
    if (this.screens[name]) {
      this.screens[name].classList.add('active');
      this.current = name;
      if (typeof SoundManager !== 'undefined') {
        SoundManager.onScreenChange(name, previous);
      }
    }
  }
};

/* ==============================================
   SECTION 4: THEME MANAGER
   Selects one of the available color themes.
   - Applies [data-theme] on <body>
   - Swaps CONFIG.COLOR so the canvas uses
     the correct palette automatically
   - Persists preference via localStorage
============================================== */
const ThemeManager = {
  themes: {
    purple: CONFIG.COLOR_PURPLE,
    blue:   CONFIG.COLOR_BLUE,
    pink:   CONFIG.COLOR_PINK,
    green:  CONFIG.COLOR_GREEN,
    yellow: CONFIG.COLOR_YELLOW,
  },

  init() {
    const saved = localStorage.getItem('ekans-theme');
    const theme = ['dark', 'light'].includes(saved) ? 'purple' : saved;
    this.setTheme(this.themes[theme] ? theme : 'purple');

    document.getElementById('theme-select').addEventListener('change', event => {
      this.setTheme(event.target.value);
    });
  },

  setTheme(theme) {
    const selectedTheme = this.themes[theme] ? theme : 'purple';
    const select = document.getElementById('theme-select');

    document.body.setAttribute('data-theme', selectedTheme);
    Object.assign(CONFIG.COLOR, this.themes[selectedTheme]);
    select.value = selectedTheme;
    if (typeof MenuOptions !== 'undefined') {
      MenuOptions.syncPokemonColor();
    }

    // Save preference
    localStorage.setItem('ekans-theme', selectedTheme);

    // Redraw canvas immediately if a game is active
    if (Renderer.canvas) {
      Renderer.canvas.style.background = CONFIG.COLOR.BG;
    }
  }
};

/* ==============================================
   SECTION 5: INPUT HANDLER
============================================== */
const InputHandler = {
  init() {
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.querySelectorAll('#mobile-controls button').forEach(button => {
      const directions = {
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 },
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 },
      };
      button.addEventListener('pointerdown', event => {
        event.preventDefault();
        this.setPlayerDirection(directions[button.dataset.dir]);
      });
    });
  },

  onKeyDown(event) {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(event.key)) {
      event.preventDefault();
    }

    if ((event.key === 'p' || event.key === 'P' || event.key === 'Escape') && GameState.isRunning) {
      GameLoop.togglePause();
      return;
    }

    if (!GameState.isRunning || GameState.isPaused || GameState.isGameOver) {
      return;
    }

    const arrowDirections = {
      'ArrowUp':    { x: 0,  y: -1 },
      'ArrowDown':  { x: 0,  y:  1 },
      'ArrowLeft':  { x: -1, y:  0 },
      'ArrowRight': { x: 1,  y:  0 },
    };
    const wasdDirections = {
      'w': { x: 0,  y: -1 },
      's': { x: 0,  y:  1 },
      'a': { x: -1, y:  0 },
      'd': { x: 1,  y:  0 },
    };

    const arrowDir = arrowDirections[event.key];
    const wasdDir  = wasdDirections[event.key.toLowerCase()];

    if (GameState.mode === 'multiplayer') {
      if (wasdDir) {
        this.setDirection('direction', 'nextDirection', wasdDir);
      } else if (arrowDir) {
        this.setDirection('directionTwo', 'nextDirectionTwo', arrowDir);
      }
      return;
    }

    const newDir = arrowDir || wasdDir;
    if (!newDir) {
      return;
    }

    this.setDirection('direction', 'nextDirection', newDir);
  },

  setPlayerDirection(newDir) {
    if (!newDir || !GameState.isRunning || GameState.isPaused || GameState.isGameOver) {
      return;
    }
    this.setDirection('direction', 'nextDirection', newDir);
  },

  setDirection(directionKey, nextDirectionKey, newDir) {
    const current    = GameState[directionKey];
    const isOpposite = (newDir.x === -current.x && newDir.y === -current.y);
    if (!isOpposite) {
      GameState[nextDirectionKey] = newDir;
    }
  }
};

/* ==============================================
   SECTION 6: GAME LOGIC
============================================== */
const GameLogic = {

  spawnBerry() {
    let pos;
    let attempts = 0;

    do {
      pos = {
        x: Math.floor(Math.random() * CONFIG.GRID_COLS),
        y: Math.floor(Math.random() * CONFIG.GRID_ROWS)
      };
      attempts++;
    } while (!this.isFreeCell(pos) && attempts < 200);

    GameState.berry = pos;
    GameState.berryType = Math.random() < CONFIG.POWERUP_CHANCE ? this.randomPowerUp() : 'normal';
  },

  randomPowerUp() {
    const powerUps = ['slow', 'double', 'shrink', 'ghost'];
    return powerUps[Math.floor(Math.random() * powerUps.length)];
  },

  isFreeCell(pos) {
    return !this.isOnSnake(pos) &&
      !this.samePosition(GameState.berry, pos);
  },

  isOnSnake(pos) {
    return this.occupies(GameState.snake, pos) ||
      this.occupies(GameState.snakeTwo, pos);
  },

  tick() {
    this.updateTimedEffects();

    if (GameState.mode === 'multiplayer') {
      this.tickMultiplayer();
      return;
    }

    this.tickSinglePlayer();
  },

  tickSinglePlayer() {
    GameState.direction = { ...GameState.nextDirection };

    const head    = GameState.snake[0];
    const newHead = {
      x: head.x + GameState.direction.x,
      y: head.y + GameState.direction.y
    };

    // Wall collision
    if (this.hitsWall(newHead)) {
      this.triggerGameOver();
      return;
    }

    // Self collision (exclude tail — it will move out)
    const bodyToCheck = GameState.snake.slice(0, GameState.snake.length - 1);
    const hitSelf     = bodyToCheck.some(seg => seg.x === newHead.x && seg.y === newHead.y);
    if (hitSelf && GameState.activePowerUp !== 'ghost') {
      this.triggerGameOver();
      return;
    }

    // Berry eaten
    const berry   = GameState.berry;
    const ateBerry = (newHead.x === berry.x && newHead.y === berry.y);

    GameState.snake.unshift(newHead);

    if (ateBerry) {
      this.collectBerry(newHead, 1);
      GameState.berriesEaten += 1;

      // Level up check
      const newLevel = Math.floor(GameState.score / (CONFIG.SCORE_PER_LEVEL * CONFIG.POINTS_PER_BERRY)) + 1;
      if (newLevel > GameState.level) {
        GameState.level        = newLevel;
        GameState.levelUpTimer = 60;

        const newSpeed         = GameState.tickInterval - this.getDynamicSpeedIncrement();
        GameState.tickInterval = Math.max(newSpeed, CONFIG.SPEED_MIN);
        SoundManager.play('levelup');
      }

      if (GameState.score > GameState.highScore) {
        GameState.highScore = GameState.score;
      }

      if (GameState.activePowerUp === 'shrink' && GameState.snake.length > CONFIG.INITIAL_LENGTH + 1) {
        GameState.snake.pop();
        GameState.snake.pop();
      }

      this.spawnBerry();
      Renderer.animateScore();

    } else {
      GameState.snake.pop();
    }
  },

  tickMultiplayer() {
    GameState.direction = { ...GameState.nextDirection };
    GameState.directionTwo = { ...GameState.nextDirectionTwo };

    const headOne = this.nextHead(GameState.snake, GameState.direction);
    const headTwo = this.nextHead(GameState.snakeTwo, GameState.directionTwo);
    const ateOne = this.samePosition(headOne, GameState.berry);
    const ateTwo = this.samePosition(headTwo, GameState.berry);
    const bodyOne = this.collisionBody(GameState.snake, ateOne);
    const bodyTwo = this.collisionBody(GameState.snakeTwo, ateTwo);
    const headsCollide = this.samePosition(headOne, headTwo);
    const playerOneLost = this.hitsWall(headOne) ||
      ((this.occupies(bodyOne, headOne) ||
      this.occupies(bodyTwo, headOne)) && GameState.activePowerUp !== 'ghost') ||
      headsCollide;
    const playerTwoLost = this.hitsWall(headTwo) ||
      ((this.occupies(bodyTwo, headTwo) ||
      this.occupies(bodyOne, headTwo)) && GameState.activePowerUp !== 'ghost') ||
      headsCollide;

    if (playerOneLost || playerTwoLost) {
      this.finishMultiplayer('collision', playerOneLost, playerTwoLost);
      return;
    }

    this.advanceSnake(GameState.snake, headOne, ateOne);
    this.advanceSnake(GameState.snakeTwo, headTwo, ateTwo);

    if (ateOne) {
      this.collectBerry(headOne, 1);
      GameState.berriesEaten += 1;
      Renderer.animateScore('hud-score');
    }

    if (ateTwo) {
      this.collectBerry(headTwo, 2);
      GameState.berriesEatenTwo += 1;
      Renderer.animateScore('hud-level');
    }

    if (ateOne || ateTwo) {
      this.spawnBerry();
    }
  },

  updateTimedEffects() {
    const now = performance.now();
    if (GameState.comboEndsAt && now > GameState.comboEndsAt) {
      GameState.combo = 1;
      GameState.comboEndsAt = 0;
    }
    if (GameState.powerUpEndsAt && now > GameState.powerUpEndsAt) {
      GameState.activePowerUp = null;
      GameState.powerUpEndsAt = 0;
    }
  },

  collectBerry(pos, player) {
    const now = performance.now();
    GameState.combo = GameState.comboEndsAt && now <= GameState.comboEndsAt ?
      Math.min(GameState.combo + 1, 9) :
      1;
    GameState.comboEndsAt = now + CONFIG.COMBO_WINDOW;

    const doublePoints = GameState.activePowerUp === 'double' ? 2 : 1;
    const points = CONFIG.POINTS_PER_BERRY * GameState.combo * doublePoints;
    if (player === 2) {
      GameState.scoreTwo += points;
    } else {
      GameState.score += points;
    }

    if (GameState.berryType !== 'normal') {
      GameState.activePowerUp = GameState.berryType;
      GameState.powerUpEndsAt = now + CONFIG.POWERUP_DURATION;
      SoundManager.play('powerup');
    } else {
      SoundManager.play('eat');
    }

    GameState.eatAnimTimer = 8;
    GameState.cameraPulse = 10;
    Renderer.spawnParticles(pos, GameState.berryType);
    AchievementManager.recordBerry();
  },

  getDynamicSpeedIncrement() {
    const base = CONFIG.SPEED_INCREMENT + Math.min(GameState.level, 6);
    return GameState.activePowerUp === 'slow' ? Math.max(3, Math.floor(base / 2)) : base;
  },

  nextHead(snake, direction) {
    return {
      x: snake[0].x + direction.x,
      y: snake[0].y + direction.y
    };
  },

  collisionBody(snake, grows) {
    return snake.slice(0, snake.length - (grows ? 0 : 1));
  },

  advanceSnake(snake, newHead, grows) {
    snake.unshift(newHead);
    if (!grows) {
      snake.pop();
    }
  },

  samePosition(first, second) {
    return first.x === second.x && first.y === second.y;
  },

  occupies(snake, pos) {
    return snake.some(seg => this.samePosition(seg, pos));
  },

  hitsWall(pos) {
    return pos.x < 0 ||
      pos.x >= CONFIG.GRID_COLS ||
      pos.y < 0 ||
      pos.y >= CONFIG.GRID_ROWS;
  },

  finishMultiplayer(reason, playerOneLost = false, playerTwoLost = false) {
    GameState.isRunning  = false;
    GameState.isGameOver = true;
    GameState.resultReason = reason;
    GameState.losingPlayers = [];

    if (playerOneLost) {
      GameState.losingPlayers.push(1);
    }
    if (playerTwoLost) {
      GameState.losingPlayers.push(2);
    }

    if (reason === 'collision' && playerOneLost !== playerTwoLost) {
      GameState.winner = playerOneLost ? 2 : 1;
    } else if (reason === 'time' && GameState.score !== GameState.scoreTwo) {
      GameState.winner = GameState.score > GameState.scoreTwo ? 1 : 2;
    } else {
      GameState.winner = null;
    }

    if (reason === 'collision') {
      GameState.deathImpactStartedAt = performance.now();
      SoundManager.play('death');
    }

    setTimeout(() => {
      UIManager.showGameOver();
    }, reason === 'collision' ? 600 : 0);
  },

  triggerGameOver() {
    GameState.isRunning  = false;
    GameState.isGameOver = true;
    GameState.deathImpactStartedAt = performance.now();
    SoundManager.play('death');

    setTimeout(() => {
      UIManager.showGameOver();
    }, 600);
  }
};

/* ==============================================
   SECTION 7: RENDERER
============================================== */
const Renderer = {
  canvas: null,
  ctx:    null,

  init() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx    = this.canvas.getContext('2d');
    this.resize();
  },

  resize() {
    this.canvas.width  = CONFIG.GRID_COLS * CONFIG.CELL_SIZE;
    this.canvas.height = CONFIG.GRID_ROWS * CONFIG.CELL_SIZE;
  },

  draw(timestamp) {
    const ctx = this.ctx;
    const impactElapsed = GameState.deathImpactStartedAt ? timestamp - GameState.deathImpactStartedAt : -1;
    const isImpactActive = impactElapsed >= 0 && impactElapsed < 620;
    const shake = isImpactActive ? this.getImpactShake(impactElapsed) : { x: 0, y: 0 };
    const pulse = GameState.cameraPulse > 0 ? GameState.cameraPulse / 400 : 0;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.save();
    ctx.translate(this.canvas.width / 2 + shake.x, this.canvas.height / 2 + shake.y);
    ctx.scale(1 + pulse, 1 + pulse);
    ctx.translate(-this.canvas.width / 2, -this.canvas.height / 2);
    // Clear with current theme's BG color
    ctx.fillStyle = CONFIG.COLOR.BG;
    ctx.fillRect(-20, -20, this.canvas.width + 40, this.canvas.height + 40);

    this.drawGrid(ctx);
    this.drawBerry(ctx, timestamp);
    const playerOneLost = GameState.losingPlayers.includes(1);
    this.drawSnake(ctx, timestamp, GameState.snake, GameState.direction, this.getPlayerOneColors(),
      GameState.mode === 'single' ? GameState.isGameOver : playerOneLost);
    if (GameState.mode === 'multiplayer') {
      this.drawSnake(ctx, timestamp, GameState.snakeTwo, GameState.directionTwo,
        CONFIG.COLOR_PLAYER_TWO, GameState.losingPlayers.includes(2));
    }
    this.drawHUDElements(ctx);
    this.updateAndDrawParticles(ctx);
    ctx.restore();

    if (isImpactActive) {
      this.drawImpactFrames(ctx, impactElapsed);
    }

    if (GameState.cameraPulse > 0) {
      GameState.cameraPulse--;
    }
  },

  getImpactShake(elapsed) {
    const strength = Math.max(0, 1 - elapsed / 620) * 10;
    const step = Math.floor(elapsed / 34);
    const x = ((step % 3) - 1) * strength;
    const y = (step % 2 === 0 ? 1 : -1) * strength * 0.7;
    return { x, y };
  },

  drawImpactFrames(ctx, elapsed) {
    ctx.save();

    if (elapsed < 55 || (elapsed > 120 && elapsed < 165)) {
      ctx.fillStyle = elapsed < 55 ? '#ffffff' : '#111111';
      ctx.globalAlpha = elapsed < 55 ? 0.72 : 0.55;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    if (elapsed < 420) {
      const alpha = Math.max(0, 1 - elapsed / 420);
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      ctx.globalAlpha = alpha * 0.85;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;

      for (let i = 0; i < 18; i++) {
        const angle = (Math.PI * 2 / 18) * i + elapsed / 80;
        const inner = 80 + Math.sin(elapsed / 35 + i) * 18;
        const outer = 620;
        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(angle) * inner, centerY + Math.sin(angle) * inner);
        ctx.lineTo(centerX + Math.cos(angle) * outer, centerY + Math.sin(angle) * outer);
        ctx.stroke();
      }

      ctx.globalAlpha = alpha * 0.34;
      ctx.fillStyle = CONFIG.COLOR.BERRY;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    ctx.restore();
  },

  getPlayerOneColors() {
    return CONFIG.POKEMON_COLORS[GameState.selectedPokemon] || CONFIG.POKEMON_COLORS.ekans;
  },

  drawGrid(ctx) {
    ctx.strokeStyle = CONFIG.COLOR.GRID_LINE;
    ctx.lineWidth   = 0.5;

    for (let x = 0; x <= CONFIG.GRID_COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CONFIG.CELL_SIZE, 0);
      ctx.lineTo(x * CONFIG.CELL_SIZE, CONFIG.GRID_ROWS * CONFIG.CELL_SIZE);
      ctx.stroke();
    }

    for (let y = 0; y <= CONFIG.GRID_ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CONFIG.CELL_SIZE);
      ctx.lineTo(CONFIG.GRID_COLS * CONFIG.CELL_SIZE, y * CONFIG.CELL_SIZE);
      ctx.stroke();
    }
  },

  drawBerry(ctx, timestamp) {
    const b   = GameState.berry;
    const cs  = CONFIG.CELL_SIZE;
    const cx  = b.x * cs + cs / 2;
    const cy  = b.y * cs + cs / 2;
    const berryColors = {
      normal: CONFIG.COLOR.BERRY,
      slow: '#38bdf8',
      double: '#facc15',
      shrink: '#a78bfa',
      ghost: '#f8fafc',
    };

    const pulse  = Math.sin(timestamp / 300) * 0.06 + 1;
    const radius = (cs / 2 - 3) * pulse;

    ctx.save();
    ctx.translate(cx, cy);

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = berryColors[GameState.berryType] || CONFIG.COLOR.BERRY;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(-radius * 0.3, -radius * 0.3, radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle   = CONFIG.COLOR.BERRY_SHINE;
    ctx.globalAlpha = 0.6;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = CONFIG.COLOR.BERRY_STEM;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.lineTo(0, -radius - 4);
    ctx.stroke();

    ctx.fillStyle = CONFIG.COLOR.BERRY_LEAF;
    ctx.beginPath();
    ctx.ellipse(3, -radius - 3, 4, 2, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    if (GameState.eatAnimTimer > 0) {
      const alpha     = GameState.eatAnimTimer / 8 * 0.3;
      ctx.fillStyle   = `rgba(139, 92, 246, ${alpha})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      GameState.eatAnimTimer--;
    }
  },

  drawSnake(ctx, timestamp, snake, direction, colors, isDefeated) {
    const cs    = CONFIG.CELL_SIZE;

    // Draw tail to head so head renders on top
    for (let i = snake.length - 1; i >= 0; i--) {
      const seg = snake[i];
      const x   = seg.x * cs;
      const y   = seg.y * cs;

      if (i === 0) {
        this.drawHead(ctx, seg, timestamp, direction, colors, isDefeated);
      } else {
        this.drawBodySegment(ctx, x, y, cs, colors);
      }
    }
  },

  drawBodySegment(ctx, x, y, cs, colors) {
    const padding = 2;
    const radius  = 4;

    ctx.fillStyle   = colors.EKANS_BODY;
    ctx.strokeStyle = colors.EKANS_OUTLINE;
    ctx.lineWidth   = 1;

    this.roundRect(ctx, x + padding, y + padding, cs - padding * 2, cs - padding * 2, radius);
    ctx.fill();
    ctx.stroke();

    // Scale pattern
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = colors.EKANS_OUTLINE;
    ctx.lineWidth   = 0.8;
    ctx.beginPath();
    ctx.moveTo(x + padding + 3, y + padding);
    ctx.lineTo(x + cs - padding, y + cs - padding - 3);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },

  drawHead(ctx, seg, timestamp, dir, colors, isDefeated) {
    const cs      = CONFIG.CELL_SIZE;
    const x       = seg.x * cs;
    const y       = seg.y * cs;
    const padding = 1;
    const radius  = 6;
    ctx.save();

    ctx.fillStyle   = colors.EKANS_HEAD;
    ctx.strokeStyle = colors.EKANS_OUTLINE;
    ctx.lineWidth   = 1.5;
    this.roundRect(ctx, x + padding, y + padding, cs - padding * 2, cs - padding * 2, radius);
    ctx.fill();
    ctx.stroke();

    const centerX = x + cs / 2;
    const centerY = y + cs / 2;

    let eye1, eye2;
    if (dir.x !== 0) {
      const eyeOffset = dir.x > 0 ? 4 : -4;
      eye1 = { x: centerX + eyeOffset, y: centerY - 4 };
      eye2 = { x: centerX + eyeOffset, y: centerY + 4 };
    } else {
      const eyeOffset = dir.y > 0 ? 4 : -4;
      eye1 = { x: centerX - 4, y: centerY + eyeOffset };
      eye2 = { x: centerX + 4, y: centerY + eyeOffset };
    }

    [eye1, eye2].forEach(eye => {
      ctx.beginPath();
      ctx.arc(eye.x, eye.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(eye.x, eye.y, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1a2e';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(eye.x + 0.6, eye.y - 0.6, 0.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    });

    // Tongue flicker
    const tongueOut = Math.sin(timestamp / 150) > 0.3;
    if (tongueOut) {
      ctx.strokeStyle = colors.EKANS_TONGUE;
      ctx.lineWidth   = 1;
      ctx.lineCap     = 'round';

      const tongueLength = 6;
      const tipX  = centerX + dir.x * (cs / 2 + tongueLength);
      const tipY  = centerY + dir.y * (cs / 2 + tongueLength);
      const baseX = centerX + dir.x * (cs / 2);
      const baseY = centerY + dir.y * (cs / 2);

      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      const forkLen = 3;
      const perpX   = -dir.y;
      const perpY   =  dir.x;

      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX + dir.x * forkLen + perpX * forkLen * 0.6, tipY + dir.y * forkLen + perpY * forkLen * 0.6);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX + dir.x * forkLen - perpX * forkLen * 0.6, tipY + dir.y * forkLen - perpY * forkLen * 0.6);
      ctx.stroke();
    }

    ctx.restore();

    // Death flash
    if (isDefeated) {
      const alpha   = Math.sin(Date.now() / 80) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(239, 68, 68, ${alpha * 0.6})`;
      this.roundRect(ctx, x + padding, y + padding, cs - padding * 2, cs - padding * 2, radius);
      ctx.fill();
    }
  },

  drawHUDElements(ctx) {
    if (GameState.mode === 'single' && GameState.levelUpTimer > 0) {
      const alpha     = Math.min(1, GameState.levelUpTimer / 20);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = CONFIG.COLOR.LEVEL_UP_TEXT;
      ctx.font        = '10px "Press Start 2P", monospace';
      ctx.textAlign   = 'center';
      ctx.fillText(
        `LEVEL ${GameState.level}!`,
        this.canvas.width / 2,
        this.canvas.height / 2
      );
      ctx.restore();
      GameState.levelUpTimer--;
    }
  },

  spawnParticles(pos, type = 'normal') {
    const cs = CONFIG.CELL_SIZE;
    const color = {
      normal: CONFIG.COLOR.BERRY_SHINE,
      slow: '#7dd3fc',
      double: '#fde047',
      shrink: '#c4b5fd',
      ghost: '#ffffff',
    }[type] || CONFIG.COLOR.BERRY_SHINE;

    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 / 16) * i;
      const speed = 1.2 + Math.random() * 2.4;
      GameState.particles.push({
        x: pos.x * cs + cs / 2,
        y: pos.y * cs + cs / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 28,
        color,
      });
    }
  },

  updateAndDrawParticles(ctx) {
    GameState.particles = GameState.particles.filter(particle => particle.life > 0);
    GameState.particles.forEach(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.03;
      particle.life--;

      ctx.save();
      ctx.globalAlpha = particle.life / 28;
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
      ctx.restore();
    });
  },

  animateScore(elementId = 'hud-score') {
    const el = document.getElementById(elementId);
    el.classList.remove('score-pop');
    void el.offsetWidth;
    el.classList.add('score-pop');
  },

  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
  }
};

/* ==============================================
   SECTION 8: GAME LOOP
============================================== */
const GameLoop = {
  rafId:        null,
  lastTickTime: 0,
  countdownHideTimer: null,

  start() {
    this.lastTickTime = performance.now();
    this.rafId = requestAnimationFrame(this.frame.bind(this));
  },

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.countdownHideTimer) {
      clearTimeout(this.countdownHideTimer);
      this.countdownHideTimer = null;
    }
  },

  frame(timestamp) {
    if (!GameState.isRunning && !GameState.isGameOver && !GameState.isCountdown) {
      return;
    }

    if (GameState.isCountdown) {
      UIManager.updateCountdown(timestamp);
    }

    if (GameState.mode === 'multiplayer' && GameState.isRunning && !GameState.isPaused) {
      GameState.timeRemaining = Math.max(0, GameState.matchEndsAt - timestamp);
      if (GameState.timeRemaining === 0) {
        GameLogic.finishMultiplayer('time');
        UIManager.updateHUD();
      }
    }

    Renderer.draw(timestamp);

    if (!GameState.isPaused && GameState.isRunning) {
      const elapsed = timestamp - this.lastTickTime;
      const interval = GameState.activePowerUp === 'slow' ?
        GameState.tickInterval * 1.55 :
        GameState.tickInterval;
      if (elapsed >= interval) {
        this.lastTickTime = timestamp;
        GameLogic.tick();
        UIManager.updateHUD();
      }
    }

    this.rafId = requestAnimationFrame(this.frame.bind(this));
  },

  togglePause() {
    GameState.isPaused = !GameState.isPaused;
    const overlay      = document.getElementById('overlay-pause');
    if (GameState.isPaused) {
      GameState.pausedAt = performance.now();
      MenuOptions.syncPauseControls();
      overlay.classList.remove('hidden');
      SoundManager.play('pause');
    } else {
      if (GameState.mode === 'multiplayer') {
        GameState.matchEndsAt += performance.now() - GameState.pausedAt;
      }
      overlay.classList.add('hidden');
    }
  }
};

/* ==============================================
   SECTION 9: UI MANAGER
============================================== */
const UIManager = {

  updateHUD() {
    const isMultiplayer = GameState.mode === 'multiplayer';
    const screen = document.getElementById('screen-game');
    screen.classList.toggle('multiplayer', isMultiplayer);
    document.getElementById('hud-score-label').textContent = isMultiplayer ? 'P1 SCORE / WASD' : 'SCORE';
    document.getElementById('hud-level-label').textContent = isMultiplayer ? 'P2 SCORE / ARROWS' : 'LEVEL';
    document.getElementById('hud-center-label').textContent = isMultiplayer ? 'TIME' : 'POKEMON';
    document.getElementById('hud-score').textContent = GameState.score;
    document.getElementById('hud-level').textContent  = isMultiplayer ? GameState.scoreTwo : GameState.level;

    const timer = document.getElementById('hud-timer');
    timer.classList.toggle('hidden', !isMultiplayer);
    timer.textContent = isMultiplayer ? this.formatTime(GameState.timeRemaining) : '';

    const combo = document.getElementById('hud-combo');
    const powerLabel = GameState.activePowerUp ? ` ${GameState.activePowerUp.toUpperCase()}` : '';
    combo.textContent = GameState.combo > 1 ? `COMBO x${GameState.combo}${powerLabel}` : powerLabel.trim();
    combo.classList.toggle('hidden', GameState.combo <= 1 && !GameState.activePowerUp);
  },

  showGameOver() {
    GameLoop.stop();
    if (GameState.mode === 'multiplayer') {
      const title = GameState.winner ? `${GameState.playerNames[GameState.winner - 1]}<br/>WINS!` : 'DRAW!';
      const reason = GameState.resultReason === 'time' ? 'TIME IS UP' : 'COLLISION';
      document.getElementById('result-title').innerHTML = title;
      document.getElementById('final-score-label').textContent = `${GameState.playerNames[0]} SCORE`;
      document.getElementById('final-score').textContent = GameState.score;
      document.getElementById('final-highscore-label').textContent = `${GameState.playerNames[1]} SCORE`;
      document.getElementById('final-highscore').textContent = GameState.scoreTwo;
      document.getElementById('final-level-label').textContent = 'RESULT';
      document.getElementById('final-level').textContent = reason;
      document.getElementById('final-berries-label').textContent = 'BERRIES P1 / P2';
      document.getElementById('final-berries').textContent =
        `${GameState.berriesEaten} / ${GameState.berriesEatenTwo}`;
      if (GameState.resultReason === 'time') {
        AchievementManager.unlock('survivor');
      }
    } else {
      const pokemon = CONFIG.POKEMON[GameState.selectedPokemon] || CONFIG.POKEMON.ekans;
      document.getElementById('result-title').innerHTML = `${pokemon.name}<br/>FAINTED!`;
      document.getElementById('final-score-label').textContent = 'SCORE';
      document.getElementById('final-score').textContent = GameState.score;
      document.getElementById('final-highscore-label').textContent = 'HIGH SCORE';
      document.getElementById('final-highscore').textContent = GameState.highScore;
      document.getElementById('final-level-label').textContent = 'LEVEL REACHED';
      document.getElementById('final-level').textContent = GameState.level;
      document.getElementById('final-berries-label').textContent = 'BERRIES ATE';
      document.getElementById('final-berries').textContent = GameState.berriesEaten;
      if (GameState.level >= 5) {
        AchievementManager.unlock('level_5');
      }
    }
    document.getElementById('rank-badge').textContent = `RANK ${this.getRank()}`;
    ScreenManager.show('gameover');
  },

  getRank() {
    const score = Math.max(GameState.score, GameState.scoreTwo);
    if (score >= 900) return 'S';
    if (score >= 600) return 'A';
    if (score >= 300) return 'B';
    return 'C';
  },

  showBattleTransition() {
    const overlay = document.getElementById('overlay-battle');
    overlay.classList.remove('hidden');
    SoundManager.play('button');
    setTimeout(() => {
      overlay.classList.add('hidden');
    }, 520);
  },

  updateCountdown(timestamp) {
    const remaining = GameState.countdownEndsAt - timestamp;
    const number = document.getElementById('countdown-number');

    if (remaining > 0) {
      const nextNumber = Math.ceil(remaining / 1000);
      number.textContent = nextNumber;
      if (GameState.countdownLastNumber !== nextNumber) {
        GameState.countdownLastNumber = nextNumber;
        number.classList.remove('countdown-pop');
        void number.offsetWidth;
        number.classList.add('countdown-pop');
        SoundManager.play('button');
      }
      return;
    }

    GameState.isCountdown = false;
    GameState.isRunning = true;
    GameState.matchEndsAt = timestamp + CONFIG.MULTIPLAYER_DURATION;
    GameLoop.lastTickTime = timestamp;
    number.textContent = 'GO!';
    SoundManager.play('levelup');
    UIManager.updateHUD();
    SoundManager.playMusic('battle');

    GameLoop.countdownHideTimer = setTimeout(() => {
      document.getElementById('overlay-countdown').classList.add('hidden');
      GameLoop.countdownHideTimer = null;
    }, 450);
  },

  formatTime(milliseconds) {
    const seconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const remainingSeconds = (seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainingSeconds}`;
  }
};

/* ==============================================
   SECTION 10: SOUND MANAGER
============================================== */
const SoundManager = {
  ctx:     null,
  enabled: true,
  volume: 0.45,
  musicVolumeScale: 0.55,
  currentMusic: null,
  music: {},
  effects: {},
  playToken: 0,

  init() {
    const savedVolume = Number(localStorage.getItem('ekans-volume'));
    this.volume = Number.isFinite(savedVolume) ? savedVolume : this.volume;

    this.music = {
      menu: this.createAudio('sons/1-04. Aspertia City.mp3', true),
      battle: this.createAudio('sons/2-04. Battle! (Gym Leader—Kanto Version).mp3', true),
      award: this.createAudio('sons/1-65. Award Ceremony - Last_.mp3', false),
    };

    this.effects = {
      transition: this.createAudio('sons/Turn Off.mp3', false),
    };

    const slider = document.getElementById('volume-slider');
    const pauseSlider = document.getElementById('pause-volume-slider');
    if (slider) {
      slider.value = Math.round(this.volume * 100);
      slider.addEventListener('input', event => {
        this.setVolume(Number(event.target.value) / 100);
      });
    }
    if (pauseSlider) {
      pauseSlider.value = Math.round(this.volume * 100);
    }

    document.addEventListener('pointerdown', () => this.unlock(), { once: true });
    document.addEventListener('keydown', () => this.unlock(), { once: true });
    this.applyVolume();
  },

  createAudio(src, loop) {
    const audio = new Audio(src);
    audio.loop = loop;
    audio.preload = 'auto';
    return audio;
  },

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, value));
    localStorage.setItem('ekans-volume', String(this.volume));
    this.applyVolume();
    document.querySelectorAll('#volume-slider, #pause-volume-slider').forEach(slider => {
      slider.value = Math.round(this.volume * 100);
    });
  },

  applyVolume() {
    Object.values(this.music).forEach(audio => {
      audio.volume = this.getMusicVolume();
    });
    Object.values(this.effects).forEach(audio => {
      audio.volume = this.volume;
    });
  },

  getMusicVolume() {
    return this.volume * this.musicVolumeScale;
  },

  unlock() {
    this.getCtx();
    if (ScreenManager.current === 'menu' || ScreenManager.current === 'multiplayer' || ScreenManager.current === 'achievements') {
      this.playMusic('menu');
    } else if (ScreenManager.current === 'game' && GameState.isRunning) {
      this.playMusic('battle');
    }
  },

  onScreenChange(name, previous) {
    const changedScreen = previous && previous !== name;
    if (changedScreen) {
      this.playEffect('transition');
    }

    if (name === 'menu' || name === 'multiplayer' || name === 'achievements') {
      this.playMusic('menu');
      return;
    }

    if (name === 'gameover') {
      setTimeout(() => {
        if (ScreenManager.current === 'gameover') {
          this.playMusic('award');
        }
      }, changedScreen ? 450 : 0);
      return;
    }

    if (name === 'game') {
      this.stopMusic();
    }
  },

  playMusic(name) {
    const track = this.music[name];
    if (!track) {
      return;
    }

    if (this.currentMusic === track && !track.paused) {
      return;
    }

    if (this.currentMusic && this.currentMusic !== track) {
      this.stopMusic();
    }

    const shouldRestart = this.currentMusic !== track;
    this.currentMusic = track;
    if (shouldRestart) {
      track.currentTime = 0;
    }
    track.volume = this.getMusicVolume();

    const token = ++this.playToken;
    track.play().catch(() => {
      if (this.currentMusic === track && this.playToken === token) {
        this.currentMusic = null;
      }
    });
  },

  stopMusic() {
    if (!this.currentMusic) {
      return;
    }
    this.currentMusic.pause();
    this.currentMusic.currentTime = 0;
    this.currentMusic = null;
  },

  playEffect(name) {
    const effect = this.effects[name];
    if (!effect) {
      return;
    }
    effect.pause();
    effect.currentTime = 0;
    effect.volume = this.volume;
    effect.play().catch(() => {});
  },

  getCtx() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        this.enabled = false;
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  },

  playTone(frequency, duration, type = 'sine', volume = 0.045) {
    if (!this.enabled) {
      return;
    }
    const ctx = this.getCtx();
    if (!ctx) {
      return;
    }

    const oscillator = ctx.createOscillator();
    const gainNode   = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    const start = ctx.currentTime;
    const gain = volume * this.volume;
    gainNode.gain.setValueAtTime(0.001, start);
    gainNode.gain.linearRampToValueAtTime(gain, start + 0.012);
    gainNode.gain.exponentialRampToValueAtTime(0.001, start + duration);

    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  },

  play(soundName) {
    switch (soundName) {
      case 'eat':
        this.playTone(523, 0.055, 'sine', 0.028);
        setTimeout(() => this.playTone(659, 0.06, 'sine', 0.024), 48);
        break;

      case 'levelup':
        this.playTone(392, 0.09, 'triangle', 0.034);
        setTimeout(() => this.playTone(494, 0.09, 'triangle', 0.032), 82);
        setTimeout(() => this.playTone(659, 0.12, 'triangle', 0.03), 164);
        break;

      case 'death':
        this.playTone(220, 0.12, 'triangle', 0.045);
        setTimeout(() => this.playTone(165, 0.16, 'sine', 0.035), 95);
        setTimeout(() => this.playTone(110, 0.2, 'sine', 0.026), 210);
        break;

      case 'pause':
        this.playTone(294, 0.06, 'sine', 0.024);
        break;

      case 'powerup':
        this.playTone(740, 0.08, 'triangle', 0.035);
        setTimeout(() => this.playTone(988, 0.1, 'sine', 0.028), 72);
        break;

      case 'button':
        this.playTone(440, 0.035, 'sine', 0.012);
        break;

      default:
        break;
    }
  }
};

/* ==============================================
   SECTION 11: MENU OPTIONS
============================================== */
const MenuOptions = {
  init() {
    const pokemonSelect = document.getElementById('pokemon-select');
    const pauseTheme = document.getElementById('pause-theme-select');
    const pauseVolume = document.getElementById('pause-volume-slider');

    if (pokemonSelect) {
      pokemonSelect.value = GameState.selectedPokemon;
      pokemonSelect.addEventListener('change', event => {
        GameState.selectedPokemon = event.target.value;
        PokedexManager.loadPokemon(CONFIG.POKEMON[event.target.value].id);
        this.syncPokemonColor();
        SoundManager.play('button');
      });
    }

    if (pauseTheme) {
      pauseTheme.addEventListener('change', event => {
        ThemeManager.setTheme(event.target.value);
      });
    }

    if (pauseVolume) {
      pauseVolume.value = Math.round(SoundManager.volume * 100);
      pauseVolume.addEventListener('input', event => {
        SoundManager.setVolume(Number(event.target.value) / 100);
      });
    }

    this.syncPokemonColor();
  },

  syncPokemonColor() {
    const colors = CONFIG.POKEMON_COLORS[GameState.selectedPokemon] || CONFIG.POKEMON_COLORS.ekans;
    const swatch = document.querySelector('.player-one .snake-swatch');
    const label = document.getElementById('player-one-color');
    const pokemon = CONFIG.POKEMON[GameState.selectedPokemon] || CONFIG.POKEMON.ekans;
    if (swatch) {
      swatch.style.background = colors.EKANS_HEAD;
    }
    if (label) {
      label.textContent = pokemon.name;
      label.style.color = colors.EKANS_HEAD;
    }
  },

  syncPauseControls() {
    const pauseTheme = document.getElementById('pause-theme-select');
    const pauseVolume = document.getElementById('pause-volume-slider');
    const theme = document.body.getAttribute('data-theme') || 'purple';
    if (pauseTheme) {
      pauseTheme.value = theme;
    }
    if (pauseVolume) {
      pauseVolume.value = Math.round(SoundManager.volume * 100);
    }
  },

  updatePlayerNames() {
    const one = document.getElementById('player-one-name');
    const two = document.getElementById('player-two-name');
    GameState.playerNames = [
      one && one.value.trim() ? one.value.trim().toUpperCase() : 'PLAYER 1',
      two && two.value.trim() ? two.value.trim().toUpperCase() : 'PLAYER 2',
    ];
  }
};

const AchievementManager = {
  achievements: [
    { id: 'first_berry', label: 'FIRST BERRY', description: 'Eat your first berry.' },
    { id: 'combo_5', label: 'COMBO x5', description: 'Reach a combo of five.' },
    { id: 'level_5', label: 'LEVEL 5', description: 'Reach level five.' },
    { id: 'survivor', label: 'SURVIVOR', description: 'Survive three minutes in versus.' },
    { id: 'power_user', label: 'POWER USER', description: 'Collect a special berry.' },
  ],
  unlocked: {},

  init() {
    try {
      this.unlocked = JSON.parse(localStorage.getItem('ekans-achievements')) || {};
    } catch (e) {
      this.unlocked = {};
    }
    this.render();
  },

  unlock(id) {
    if (this.unlocked[id]) {
      return;
    }
    this.unlocked[id] = true;
    localStorage.setItem('ekans-achievements', JSON.stringify(this.unlocked));
    this.render();
  },

  recordBerry() {
    this.unlock('first_berry');
    if (GameState.combo >= 5) {
      this.unlock('combo_5');
    }
    if (GameState.berryType !== 'normal') {
      this.unlock('power_user');
    }
  },

  render() {
    const list = document.getElementById('achievements-list');
    if (!list) {
      return;
    }
    list.innerHTML = this.achievements.map(item => `
      <div class="achievement ${this.unlocked[item.id] ? 'unlocked' : ''}">
        <strong>${item.label}</strong>
        <span>${item.description}</span>
      </div>
    `).join('');
  }
};

const TutorialManager = {
  init() {
    const overlay = document.getElementById('tutorial-overlay');
    const button = document.getElementById('btn-tutorial-ok');
    if (!localStorage.getItem('ekans-tutorial-seen')) {
      overlay.classList.remove('hidden');
    }
    button.addEventListener('click', () => {
      localStorage.setItem('ekans-tutorial-seen', 'true');
      overlay.classList.add('hidden');
      SoundManager.play('button');
    });
  }
};

/* ==============================================
   SECTION 12: DIFFICULTY SELECTOR
============================================== */
const DifficultySelector = {
  selectedSpeed: CONFIG.SPEED_EASY,

  init() {
    const buttons = document.querySelectorAll('.diff-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedSpeed = parseInt(btn.dataset.speed, 10);
        SoundManager.playEffect('transition');
      });
    });
  },

  getSpeed() {
    return this.selectedSpeed;
  }
};

/* ==============================================
   SECTION 12: POKÉDEX MANAGER
   Fetches a random Pokémon from PokéAPI on load.
   Displays: Pokédex number, name, and flavour text.
   Falls back to Ekans if the request fails.
============================================== */
const PokedexManager = {

  // Total number of Pokémon to pick from (Gen 1–9)
  POKEMON_COUNT: 1025,

  // The element to update
  el: null,

  init() {
    this.el = document.getElementById('dex-entry');
    this.gif = document.getElementById('gif')
    const selected = CONFIG.POKEMON[GameState.selectedPokemon] || CONFIG.POKEMON.ekans;
    this.loadPokemon(selected.id);
  },

  // Pick a random Pokémon ID and fetch its data
  async loadRandom() {
    const id = Math.floor(Math.random() * this.POKEMON_COUNT) + 1;
    this.loadPokemon(id);
  },


  async loadPokemon(id) {
    try {
      // Fetch species data — contains Pokédex flavour text and name
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
      
      if (!response.ok) {
        throw new Error('API error');
      }

      const data = await response.json();
      // Update the DOM element
      this.el.innerHTML = `No. ${id} — ${data.name}<br />`;
      this.gif.src = data.sprites.other.showdown.front_default;
    } catch (error) {
      // Fallback: show Ekans if fetch fails (offline, API down, etc.)
    }
  }
};

/* ==============================================
   SECTION 13: ENTRY POINTS
============================================== */
function showMultiplayerSetup() {
  GameLoop.stop();
  GameState.isRunning = false;
  GameState.isPaused = false;
  GameState.isCountdown = false;
  ScreenManager.show('multiplayer');
}

function startGame(mode = 'single') {
  const speed = DifficultySelector.getSpeed();
  MenuOptions.updatePlayerNames();
  GameState.reset(speed, mode);
  GameState.isRunning = mode === 'single';

  GameLogic.spawnBerry();

  ScreenManager.show('game');
  document.getElementById('overlay-pause').classList.add('hidden');
  document.getElementById('overlay-countdown').classList.add('hidden');
  UIManager.showBattleTransition();

  if (mode === 'multiplayer') {
    GameState.isCountdown = true;
    GameState.countdownEndsAt = performance.now() + 3000;
    document.getElementById('countdown-number').textContent = '3';
    document.getElementById('overlay-countdown').classList.remove('hidden');
  } else {
    setTimeout(() => {
      if (ScreenManager.current === 'game' && GameState.isRunning) {
        SoundManager.playMusic('battle');
      }
    }, 450);
  }

  UIManager.updateHUD();

  GameLoop.stop();
  GameLoop.start();
}

function quitToMenu() {
  GameState.isRunning = false;
  GameState.isPaused  = false;
  GameState.isCountdown = false;
  GameLoop.stop();
  document.getElementById('overlay-countdown').classList.add('hidden');
  document.getElementById('overlay-battle').classList.add('hidden');
  ScreenManager.show('menu');
}

/* ==============================================
   SECTION 13: INITIALIZATION
============================================== */
function init() {
  ScreenManager.init();
  InputHandler.init();
  Renderer.init();
  SoundManager.init();
  MenuOptions.init();
  DifficultySelector.init();
  ThemeManager.init();
  AchievementManager.init();
  PokedexManager.init();   // ← fetch random Pokémon on every load
  TutorialManager.init();

  document.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => SoundManager.play('button'));
  });

  document.getElementById('btn-start').addEventListener('click', () => {
    startGame('single');
  });

  document.getElementById('btn-multiplayer').addEventListener('click', () => {
    showMultiplayerSetup();
  });

  document.getElementById('btn-achievements').addEventListener('click', () => {
    AchievementManager.render();
    ScreenManager.show('achievements');
  });

  document.getElementById('btn-achievements-back').addEventListener('click', () => {
    ScreenManager.show('menu');
  });

  document.getElementById('btn-confirm-multiplayer').addEventListener('click', () => {
    startGame('multiplayer');
  });

  document.getElementById('btn-cancel-multiplayer').addEventListener('click', () => {
    quitToMenu();
  });

  document.getElementById('btn-resume').addEventListener('click', () => {
    GameLoop.togglePause();
  });

  document.getElementById('btn-restart-pause').addEventListener('click', () => {
    const mode = GameState.mode;
    GameLoop.togglePause();
    startGame(mode);
  });

  document.getElementById('btn-quit-pause').addEventListener('click', () => {
    quitToMenu();
  });

  document.getElementById('btn-retry').addEventListener('click', () => {
    if (GameState.mode === 'multiplayer') {
      showMultiplayerSetup();
    } else {
      startGame('single');
    }
  });

  document.getElementById('btn-menu').addEventListener('click', () => {
    quitToMenu();
  });

  ScreenManager.show('menu');
}

document.addEventListener('DOMContentLoaded', init);
