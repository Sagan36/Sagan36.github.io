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

  SPEED_EASY:   120,
  SPEED_NORMAL: 80,
  SPEED_HARD:   50,

  SCORE_PER_LEVEL: 5,
  SPEED_INCREMENT: 8,
  SPEED_MIN: 30,

  POINTS_PER_BERRY: 10,
  INITIAL_LENGTH: 4,
  MULTIPLAYER_DURATION: 3 * 60 * 1000,

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

  eatAnimTimer:  0,
  levelUpTimer:  0,
  deathAnimDone: false,
  matchEndsAt:   0,
  countdownEndsAt: 0,
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
    this.timeRemaining = CONFIG.MULTIPLAYER_DURATION;
    this.matchEndsAt   = 0;
    this.countdownEndsAt = 0;
    this.pausedAt      = 0;
    this.winner        = null;
    this.resultReason  = '';
    this.losingPlayers = [];

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
    document.getElementById('player-one-color').textContent = selectedTheme.toUpperCase();

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
    } while (this.isOnSnake(pos) && attempts < 200);

    GameState.berry = pos;
  },

  isOnSnake(pos) {
    return this.occupies(GameState.snake, pos) ||
      this.occupies(GameState.snakeTwo, pos);
  },

  tick() {
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
    if (
      newHead.x < 0 ||
      newHead.x >= CONFIG.GRID_COLS ||
      newHead.y < 0 ||
      newHead.y >= CONFIG.GRID_ROWS
    ) {
      this.triggerGameOver();
      return;
    }

    // Self collision (exclude tail — it will move out)
    const bodyToCheck = GameState.snake.slice(0, GameState.snake.length - 1);
    const hitSelf     = bodyToCheck.some(seg => seg.x === newHead.x && seg.y === newHead.y);
    if (hitSelf) {
      this.triggerGameOver();
      return;
    }

    // Berry eaten
    const berry   = GameState.berry;
    const ateBerry = (newHead.x === berry.x && newHead.y === berry.y);

    GameState.snake.unshift(newHead);

    if (ateBerry) {
      GameState.score        += CONFIG.POINTS_PER_BERRY;
      GameState.berriesEaten += 1;
      GameState.eatAnimTimer  = 8;

      // Level up check
      const newLevel = Math.floor(GameState.score / (CONFIG.SCORE_PER_LEVEL * CONFIG.POINTS_PER_BERRY)) + 1;
      if (newLevel > GameState.level) {
        GameState.level        = newLevel;
        GameState.levelUpTimer = 60;

        const newSpeed         = GameState.tickInterval - CONFIG.SPEED_INCREMENT;
        GameState.tickInterval = Math.max(newSpeed, CONFIG.SPEED_MIN);
      }

      if (GameState.score > GameState.highScore) {
        GameState.highScore = GameState.score;
      }

      this.spawnBerry();
      Renderer.animateScore();
      SoundManager.play('eat');

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
      this.occupies(bodyOne, headOne) ||
      this.occupies(bodyTwo, headOne) ||
      headsCollide;
    const playerTwoLost = this.hitsWall(headTwo) ||
      this.occupies(bodyTwo, headTwo) ||
      this.occupies(bodyOne, headTwo) ||
      headsCollide;

    if (playerOneLost || playerTwoLost) {
      this.finishMultiplayer('collision', playerOneLost, playerTwoLost);
      return;
    }

    this.advanceSnake(GameState.snake, headOne, ateOne);
    this.advanceSnake(GameState.snakeTwo, headTwo, ateTwo);

    if (ateOne) {
      GameState.score += CONFIG.POINTS_PER_BERRY;
      GameState.berriesEaten += 1;
      Renderer.animateScore('hud-score');
    }

    if (ateTwo) {
      GameState.scoreTwo += CONFIG.POINTS_PER_BERRY;
      GameState.berriesEatenTwo += 1;
      Renderer.animateScore('hud-level');
    }

    if (ateOne || ateTwo) {
      GameState.eatAnimTimer = 8;
      this.spawnBerry();
      SoundManager.play('eat');
    }
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
      SoundManager.play('death');
    }

    setTimeout(() => {
      UIManager.showGameOver();
    }, reason === 'collision' ? 600 : 0);
  },

  triggerGameOver() {
    GameState.isRunning  = false;
    GameState.isGameOver = true;
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

    // Clear with current theme's BG color
    ctx.fillStyle = CONFIG.COLOR.BG;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawGrid(ctx);
    this.drawBerry(ctx, timestamp);
    const playerOneLost = GameState.losingPlayers.includes(1);
    this.drawSnake(ctx, timestamp, GameState.snake, GameState.direction, CONFIG.COLOR,
      GameState.mode === 'single' ? GameState.isGameOver : playerOneLost);
    if (GameState.mode === 'multiplayer') {
      this.drawSnake(ctx, timestamp, GameState.snakeTwo, GameState.directionTwo,
        CONFIG.COLOR_PLAYER_TWO, GameState.losingPlayers.includes(2));
    }
    this.drawHUDElements(ctx);
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

    const pulse  = Math.sin(timestamp / 300) * 0.06 + 1;
    const radius = (cs / 2 - 3) * pulse;

    ctx.save();
    ctx.translate(cx, cy);

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = CONFIG.COLOR.BERRY;
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
      if (elapsed >= GameState.tickInterval) {
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
  },

  showGameOver() {
    GameLoop.stop();
    if (GameState.mode === 'multiplayer') {
      const title = GameState.winner ? `PLAYER ${GameState.winner}<br/>WINS!` : 'DRAW!';
      const reason = GameState.resultReason === 'time' ? 'TIME IS UP' : 'COLLISION';
      document.getElementById('result-title').innerHTML = title;
      document.getElementById('final-score-label').textContent = 'PLAYER 1 SCORE';
      document.getElementById('final-score').textContent = GameState.score;
      document.getElementById('final-highscore-label').textContent = 'PLAYER 2 SCORE';
      document.getElementById('final-highscore').textContent = GameState.scoreTwo;
      document.getElementById('final-level-label').textContent = 'RESULT';
      document.getElementById('final-level').textContent = reason;
      document.getElementById('final-berries-label').textContent = 'BERRIES P1 / P2';
      document.getElementById('final-berries').textContent =
        `${GameState.berriesEaten} / ${GameState.berriesEatenTwo}`;
    } else {
      document.getElementById('result-title').innerHTML = 'YOUR POKEMON<br/>FAINTED!';
      document.getElementById('final-score-label').textContent = 'SCORE';
      document.getElementById('final-score').textContent = GameState.score;
      document.getElementById('final-highscore-label').textContent = 'HIGH SCORE';
      document.getElementById('final-highscore').textContent = GameState.highScore;
      document.getElementById('final-level-label').textContent = 'LEVEL REACHED';
      document.getElementById('final-level').textContent = GameState.level;
      document.getElementById('final-berries-label').textContent = 'BERRIES ATE';
      document.getElementById('final-berries').textContent = GameState.berriesEaten;
    }
    ScreenManager.show('gameover');
  },

  updateCountdown(timestamp) {
    const remaining = GameState.countdownEndsAt - timestamp;
    const number = document.getElementById('countdown-number');

    if (remaining > 0) {
      number.textContent = Math.ceil(remaining / 1000);
      return;
    }

    GameState.isCountdown = false;
    GameState.isRunning = true;
    GameState.matchEndsAt = timestamp + CONFIG.MULTIPLAYER_DURATION;
    GameLoop.lastTickTime = timestamp;
    number.textContent = 'GO!';
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
  volume: 0.65,
  currentMusic: null,
  music: {},
  effects: {},

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
    if (slider) {
      slider.value = Math.round(this.volume * 100);
      slider.addEventListener('input', event => {
        this.setVolume(Number(event.target.value) / 100);
      });
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
  },

  applyVolume() {
    Object.values(this.music).forEach(audio => {
      audio.volume = this.volume;
    });
    Object.values(this.effects).forEach(audio => {
      audio.volume = this.volume;
    });
  },

  unlock() {
    this.getCtx();
    if (ScreenManager.current === 'menu' || ScreenManager.current === 'multiplayer') {
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

    if (name === 'menu' || name === 'multiplayer') {
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
    if (!track || this.currentMusic === track) {
      return;
    }

    this.stopMusic();
    this.currentMusic = track;
    track.currentTime = 0;
    track.volume = this.volume;
    track.play().catch(() => {});
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

  playTone(frequency, duration, type = 'square', volume = 0.1) {
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
    gainNode.gain.setValueAtTime(volume * this.volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  },

  play(soundName) {
    switch (soundName) {
      case 'eat':
        this.playTone(440, 0.05);
        setTimeout(() => this.playTone(660, 0.05), 60);
        break;

      case 'levelup':
        this.playTone(440, 0.08);
        setTimeout(() => this.playTone(554, 0.08), 80);
        setTimeout(() => this.playTone(659, 0.08), 160);
        setTimeout(() => this.playTone(880, 0.15), 240);
        break;

      case 'death':
        this.playTone(330, 0.1, 'sawtooth');
        setTimeout(() => this.playTone(220, 0.1, 'sawtooth'), 120);
        setTimeout(() => this.playTone(110, 0.2, 'sawtooth'), 240);
        break;

      case 'pause':
        this.playTone(300, 0.05, 'sine', 0.05);
        break;

      default:
        break;
    }
  }
};

/* ==============================================
   SECTION 11: DIFFICULTY SELECTOR
============================================== */
const DifficultySelector = {
  selectedSpeed: CONFIG.SPEED_NORMAL,

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
    this.loadRandom();
  },

  // Pick a random Pokémon ID and fetch its data
  async loadRandom() {
    const id = Math.floor(Math.random() * this.POKEMON_COUNT) + 1;


    try {
      // Fetch species data — contains Pokédex flavour text and name
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
      
      if (!response.ok) {
        throw new Error('API error');
      }

      const data = await response.json();
      console.log(data)
      console.log(data.name)
      console.log(data.sprites.other.showdown.front_default)
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
  GameState.reset(speed, mode);
  GameState.isRunning = mode === 'single';

  GameLogic.spawnBerry();

  ScreenManager.show('game');
  document.getElementById('overlay-pause').classList.add('hidden');
  document.getElementById('overlay-countdown').classList.add('hidden');

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
  DifficultySelector.init();
  ThemeManager.init();
  PokedexManager.init();   // ← fetch random Pokémon on every load

  document.getElementById('btn-start').addEventListener('click', () => {
    startGame('single');
  });

  document.getElementById('btn-multiplayer').addEventListener('click', () => {
    showMultiplayerSetup();
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
