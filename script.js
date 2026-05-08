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
   │  ThemeManager — light/dark mode toggle  │
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

  // Dark mode colors — Coolors palette
  // 282631 / 302B46 / 2F213A / 613D69 / 7C7880 / 9C9B9D / 9B9B9B
  COLOR_DARK: {
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

  // Light mode colors — warm parchment palette
  COLOR_LIGHT: {
    BG:             '#f0ede3',
    GRID_LINE:      '#ddd8cc',
    EKANS_HEAD:     '#6d28d9',
    EKANS_BODY:     '#5b21b6',
    EKANS_EYE:      '#d97706',
    EKANS_TONGUE:   '#dc2626',
    EKANS_OUTLINE:  '#3b0764',
    BERRY:          '#dc2626',
    BERRY_SHINE:    '#fca5a5',
    BERRY_LEAF:     '#16a34a',
    BERRY_STEM:     '#15803d',
    SCORE_TEXT:     '#b45309',
    LEVEL_UP_TEXT:  '#6d28d9',
  },

  // Active color palette — swapped by ThemeManager
  COLOR: {}
};

// Initialize with dark mode colors
Object.assign(CONFIG.COLOR, CONFIG.COLOR_DARK);

/* ==============================================
   SECTION 2: GAME STATE
============================================== */
const GameState = {
  score:         0,
  highScore:     0,
  level:         1,
  berriesEaten:  0,
  isRunning:     false,
  isPaused:      false,
  isGameOver:    false,

  tickInterval:  CONFIG.SPEED_NORMAL,

  snake: [],

  direction:     { x: 1, y: 0 },
  nextDirection: { x: 1, y: 0 },

  berry: { x: 0, y: 0 },

  eatAnimTimer:  0,
  levelUpTimer:  0,
  deathAnimDone: false,

  reset(startSpeed) {
    this.score        = 0;
    this.level        = 1;
    this.berriesEaten = 0;
    this.isRunning    = false;
    this.isPaused     = false;
    this.isGameOver   = false;
    this.tickInterval = startSpeed || CONFIG.SPEED_NORMAL;
    this.direction    = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.eatAnimTimer  = 0;
    this.levelUpTimer  = 0;
    this.deathAnimDone = false;

    this.snake = [];
    const startX = Math.floor(CONFIG.GRID_COLS / 4);
    const startY = Math.floor(CONFIG.GRID_ROWS / 2);
    for (let i = 0; i < CONFIG.INITIAL_LENGTH; i++) {
      this.snake.push({ x: startX - i, y: startY });
    }
  }
};

/* ==============================================
   SECTION 3: SCREEN MANAGER
============================================== */
const ScreenManager = {
  screens: {},

  init() {
    this.screens.menu     = document.getElementById('screen-menu');
    this.screens.game     = document.getElementById('screen-game');
    this.screens.gameover = document.getElementById('screen-gameover');
  },

  show(name) {
    Object.values(this.screens).forEach(s => s.classList.remove('active'));
    if (this.screens[name]) {
      this.screens[name].classList.add('active');
    }
  }
};

/* ==============================================
   SECTION 4: THEME MANAGER
   Toggles between light and dark mode.
   - Applies [data-theme="light"] on <body>
   - Swaps CONFIG.COLOR so the canvas uses
     the correct palette automatically
   - Persists preference via localStorage
============================================== */
const ThemeManager = {
  isDark: true,

  init() {
    // Load saved preference
    const saved = localStorage.getItem('ekans-theme');
    if (saved === 'light') {
      this.setTheme('light');
    } else {
      this.setTheme('dark');
    }

    document.getElementById('btn-theme').addEventListener('click', () => {
      this.toggle();
    });
  },

  toggle() {
    this.setTheme(this.isDark ? 'light' : 'dark');
  },

  setTheme(theme) {
    const btn        = document.getElementById('btn-theme');
    const icon       = btn.querySelector('.toggle-icon');
    const label      = btn.querySelector('.toggle-label');

    if (theme === 'light') {
      // Apply light mode
      document.body.setAttribute('data-theme', 'light');
      Object.assign(CONFIG.COLOR, CONFIG.COLOR_LIGHT);
      icon.textContent  = '🌙';
      label.textContent = ' DARK';
      this.isDark = false;

    } else {
      // Apply dark mode
      document.body.removeAttribute('data-theme');
      Object.assign(CONFIG.COLOR, CONFIG.COLOR_DARK);
      icon.textContent  = '☀️';
      label.textContent = ' LIGHT';
      this.isDark = true;
    }

    // Save preference
    localStorage.setItem('ekans-theme', theme);

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

    const directionMap = {
      'ArrowUp':    { x: 0,  y: -1 },
      'ArrowDown':  { x: 0,  y:  1 },
      'ArrowLeft':  { x: -1, y:  0 },
      'ArrowRight': { x: 1,  y:  0 },
      'w': { x: 0,  y: -1 },
      's': { x: 0,  y:  1 },
      'a': { x: -1, y:  0 },
      'd': { x: 1,  y:  0 },
      'W': { x: 0,  y: -1 },
      'S': { x: 0,  y:  1 },
      'A': { x: -1, y:  0 },
      'D': { x: 1,  y:  0 },
    };

    const newDir = directionMap[event.key];
    if (!newDir) {
      return;
    }

    const current    = GameState.direction;
    const isOpposite = (newDir.x === -current.x && newDir.y === -current.y);
    if (!isOpposite) {
      GameState.nextDirection = newDir;
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
    return GameState.snake.some(seg => seg.x === pos.x && seg.y === pos.y);
  },

  tick() {
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

    } else {
      GameState.snake.pop();
    }
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
    this.drawSnake(ctx, timestamp);
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

  drawSnake(ctx, timestamp) {
    const snake = GameState.snake;
    const cs    = CONFIG.CELL_SIZE;

    // Draw tail to head so head renders on top
    for (let i = snake.length - 1; i >= 0; i--) {
      const seg = snake[i];
      const x   = seg.x * cs;
      const y   = seg.y * cs;

      if (i === 0) {
        this.drawHead(ctx, seg, timestamp);
      } else {
        this.drawBodySegment(ctx, x, y, cs, i, snake.length);
      }
    }
  },

  drawBodySegment(ctx, x, y, cs, index, totalLength) {
    const padding = 2;
    const radius  = 4;

    ctx.fillStyle   = CONFIG.COLOR.EKANS_BODY;
    ctx.strokeStyle = CONFIG.COLOR.EKANS_OUTLINE;
    ctx.lineWidth   = 1;

    this.roundRect(ctx, x + padding, y + padding, cs - padding * 2, cs - padding * 2, radius);
    ctx.fill();
    ctx.stroke();

    // Scale pattern
    ctx.strokeStyle = `rgba(76, 29, 149, 0.4)`;
    ctx.lineWidth   = 0.8;
    ctx.beginPath();
    ctx.moveTo(x + padding + 3, y + padding);
    ctx.lineTo(x + cs - padding, y + cs - padding - 3);
    ctx.stroke();
  },

  drawHead(ctx, seg, timestamp) {
    const cs      = CONFIG.CELL_SIZE;
    const x       = seg.x * cs;
    const y       = seg.y * cs;
    const padding = 1;
    const radius  = 6;
    const dir     = GameState.direction;

    ctx.save();

    ctx.fillStyle   = CONFIG.COLOR.EKANS_HEAD;
    ctx.strokeStyle = CONFIG.COLOR.EKANS_OUTLINE;
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
      ctx.strokeStyle = CONFIG.COLOR.EKANS_TONGUE;
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
    if (GameState.isGameOver) {
      const alpha   = Math.sin(Date.now() / 80) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(239, 68, 68, ${alpha * 0.6})`;
      this.roundRect(ctx, x + padding, y + padding, cs - padding * 2, cs - padding * 2, radius);
      ctx.fill();
    }
  },

  drawHUDElements(ctx) {
    if (GameState.levelUpTimer > 0) {
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

  animateScore() {
    const el = document.getElementById('hud-score');
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

  start() {
    this.lastTickTime = performance.now();
    this.rafId = requestAnimationFrame(this.frame.bind(this));
  },

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  },

  frame(timestamp) {
    if (!GameState.isRunning && !GameState.isGameOver) {
      return;
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
      overlay.classList.remove('hidden');
      SoundManager.play('pause');
    } else {
      overlay.classList.add('hidden');
    }
  }
};

/* ==============================================
   SECTION 9: UI MANAGER
============================================== */
const UIManager = {

  updateHUD() {
    document.getElementById('hud-score').textContent = GameState.score;
    document.getElementById('hud-level').textContent  = GameState.level;
  },

  showGameOver() {
    document.getElementById('final-score').textContent     = GameState.score;
    document.getElementById('final-highscore').textContent = GameState.highScore;
    document.getElementById('final-level').textContent     = GameState.level;
    document.getElementById('final-berries').textContent   = GameState.berriesEaten;
    ScreenManager.show('gameover');
  }
};

/* ==============================================
   SECTION 10: SOUND MANAGER
============================================== */
const SoundManager = {
  ctx:     null,
  enabled: true,

  init() {},

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
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
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
function startGame() {
  const speed     = DifficultySelector.getSpeed();
  GameState.reset(speed);
  GameState.isRunning = true;

  GameLogic.spawnBerry();

  ScreenManager.show('game');
  document.getElementById('overlay-pause').classList.add('hidden');
  UIManager.updateHUD();

  GameLoop.stop();
  GameLoop.start();
}

function quitToMenu() {
  GameState.isRunning = false;
  GameState.isPaused  = false;
  GameLoop.stop();
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
    SoundManager.play('eat');
    startGame();
  });

  document.getElementById('btn-resume').addEventListener('click', () => {
    GameLoop.togglePause();
  });

  document.getElementById('btn-quit-pause').addEventListener('click', () => {
    quitToMenu();
  });

  document.getElementById('btn-retry').addEventListener('click', () => {
    startGame();
  });

  document.getElementById('btn-menu').addEventListener('click', () => {
    quitToMenu();
  });

  ScreenManager.show('menu');
}

document.addEventListener('DOMContentLoaded', init);