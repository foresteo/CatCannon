// game-state.js — pure game logic, no DOM or canvas references

const CANVAS_W = 800;
const CANVAS_H = 450;
const GROUND_Y = 370;

const BASE = {
  GRAVITY: 0.10,
  BOUNCE_COEFF: 0.72,
  SLIDE_COEFF: 0.94,
  MAX_SPEED: 10,
  MAGNET_RADIUS: 30,
};

const UPGRADE_DEFS = [
  {
    id: 'power',
    label: 'Cannon Power',
    desc: 'Launch velocity +15% per level',
    costs: [10, 20, 40, 80, 160],
    apply(level, base) { return { ...base, MAX_SPEED: BASE.MAX_SPEED * Math.pow(1.15, level) }; },
  },
  {
    id: 'bounce',
    label: 'Bouncy Paws',
    desc: 'Bounce higher per level',
    costs: [15, 30, 60, 120, 240],
    apply(level, base) { return { ...base, BOUNCE_COEFF: Math.min(0.88, BASE.BOUNCE_COEFF + level * 0.06) }; },
  },
  {
    id: 'slide',
    label: 'Slippery Paws',
    desc: 'Slide further on ground per level',
    costs: [10, 20, 40, 80, 160],
    apply(level, base) { return { ...base, SLIDE_COEFF: Math.min(0.99, BASE.SLIDE_COEFF + level * 0.02) }; },
  },
  {
    id: 'magnet',
    label: 'Coin Magnet',
    desc: 'Attract coins from farther away',
    costs: [20, 40, 80, 160, 320],
    apply(level, base) { return { ...base, MAGNET_RADIUS: BASE.MAGNET_RADIUS + level * 35 }; },
  },
  {
    id: 'lucky',
    label: 'Lucky Paws',
    desc: 'Bonus coin per bounce',
    costs: [25, 50, 100, 200, 400],
    apply(level, base) { return base; }, // handled separately in bounce logic
  },
];

function makeCat() {
  return {
    x: 100, y: GROUND_Y,
    vx: 0, vy: 0,
    rotation: 0, angularVel: 0,
    scaleX: 1, scaleY: 1,
    onGround: true,
    bounceCount: 0,
    pawExtend: 0,
    catnipTimer: 0,
    rocketTimer: 0,
    roombaTimer: 0,
    bucketTimer: 0,
    leafBlowTimer: 0, leafBlowDir: 1,
    impactFlash: 0,
    stopped: false,
  };
}

function makeObstacle(type, x, y) {
  const sizes = {
    box:        { w: 32, h: 32 },
    trampoline: { w: 60, h: 16 },
    leafblower: { w: 28, h: 44 },
    yarnball:   { w: 30, h: 30 },
    dog:        { w: 44, h: 44 },
    roomba:     { w: 48, h: 14 },
    bucket:     { w: 30, h: 36 },
    rocket:     { w: 20, h: 48 },
    catnip:     { w: 24, h: 24 },
    splashpad:  { w: 70, h: 12 },
  };
  const s = sizes[type] || { w: 32, h: 32 };
  return {
    type, x, y,
    w: s.w, h: s.h,
    triggered: false,
    animFrame: 0,
    direction: Math.random() < 0.5 ? 1 : -1,
    coins: [],
  };
}

function spawnCoinsNear(obs) {
  const count = 1 + Math.floor(Math.random() * 3);
  const coins = [];
  for (let i = 0; i < count; i++) {
    coins.push({
      x: obs.x + (Math.random() - 0.5) * 80,
      y: obs.y - 20 - Math.random() * 60,
      collected: false,
    });
  }
  return coins;
}

const OBSTACLE_ZONES = [
  { minX: 80,    types: ['box', 'trampoline'] },
  { minX: 1500,  types: ['box', 'trampoline', 'leafblower', 'yarnball'] },
  { minX: 5000,  types: ['box', 'trampoline', 'leafblower', 'yarnball', 'dog', 'roomba', 'bucket'] },
  { minX: 10000, types: ['box', 'trampoline', 'leafblower', 'yarnball', 'dog', 'roomba', 'bucket', 'rocket', 'catnip', 'splashpad'] },
];

function pickObstacleType(worldX) {
  let pool = OBSTACLE_ZONES[0].types;
  for (const zone of OBSTACLE_ZONES) {
    if (worldX >= zone.minX) pool = zone.types;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Game object ──────────────────────────────────────────────────────────────

const Game = {
  state: 'MENU', // MENU | AIMING | FLYING | RESULTS | SHOP
  time: 0,
  cat: makeCat(),
  cameraX: 0,
  obstacles: [],
  allCoins: [],
  particles: [],
  popups: [],
  sessionCoins: 0,
  totalCoins: 0,
  bestDistance: 0,
  upgradeLevels: { power: 0, bounce: 0, slide: 0, magnet: 0, lucky: 0 },
  stats: {},        // computed each run from upgrade levels
  cannonAngle: -0.6,
  powerCharge: 0,
  charging: false,
  lastObstacleX: 0,
  comboCount: 0,
  comboTimer: 0,
  shakeRequest: 0,  // renderer reads and resets

  init() {
    this.load();
    this.recomputeStats();
  },

  load() {
    try {
      const raw = localStorage.getItem('catcannon_save');
      if (raw) {
        const data = JSON.parse(raw);
        this.bestDistance = data.bestDistance || 0;
        this.totalCoins = data.totalCoins || 0;
        this.upgradeLevels = { ...{ power:0, bounce:0, slide:0, magnet:0, lucky:0 }, ...data.upgrades };
      }
    } catch (e) { /* ignore */ }
  },

  save() {
    localStorage.setItem('catcannon_save', JSON.stringify({
      bestDistance: this.bestDistance,
      totalCoins: this.totalCoins,
      upgrades: this.upgradeLevels,
    }));
  },

  recomputeStats() {
    let s = { ...BASE };
    for (const def of UPGRADE_DEFS) {
      const level = this.upgradeLevels[def.id] || 0;
      if (level > 0) s = def.apply(level, s);
    }
    this.stats = s;
  },

  startRun() {
    this.cat = makeCat();
    this.cameraX = 0;
    this.obstacles = [];
    this.allCoins = [];
    this.particles = [];
    this.popups = [];
    this.sessionCoins = 0;
    this.lastObstacleX = 80;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.powerCharge = 0;
    this.charging = false;
    this.state = 'AIMING';
  },

  handleInput(type, data) {
    if (this.state === 'MENU') {
      if (type === 'mousedown') { Audio.init(); this.startRun(); }
      return;
    }
    if (this.state === 'RESULTS') {
      if (type === 'mousedown') {
        if (data.shopBtn) { this.state = 'SHOP'; }
        else { this.startRun(); }
      }
      return;
    }
    if (this.state === 'SHOP') {
      if (type === 'mousedown') {
        if (data.upgradeId !== undefined) this.buyUpgrade(data.upgradeId);
        if (data.launchBtn) this.startRun();
      }
      return;
    }
    if (this.state === 'AIMING') {
      if (type === 'mousemove') {
        // angle from cannon tip to mouse; cannon at screen ~(90, GROUND_Y-20)
        const dx = data.x - 90;
        const dy = data.y - (GROUND_Y - 20);
        let angle = Math.atan2(dy, dx);
        angle = Math.max(-Math.PI * 0.88, Math.min(-Math.PI * 0.06, angle));
        this.cannonAngle = angle;
      }
      if (type === 'mousedown') { this.charging = true; this.powerCharge = 0; Audio.play('launch', 0); }
      if (type === 'mouseup' && this.charging) {
        this.charging = false;
        this.launch();
      }
      return;
    }
  },

  launch() {
    const charge = this.powerCharge;
    const speed = charge * this.stats.MAX_SPEED;
    this.cat.vx = Math.cos(this.cannonAngle) * speed;
    this.cat.vy = Math.sin(this.cannonAngle) * speed;
    this.cat.x = 90;
    this.cat.y = GROUND_Y - 20;
    this.cat.onGround = false;
    this.cat.stopped = false;
    this.cat.angularVel = -0.15;
    this.shakeRequest = 8;
    this.state = 'FLYING';
  },

  buyUpgrade(id) {
    const def = UPGRADE_DEFS.find(d => d.id === id);
    if (!def) return;
    const level = this.upgradeLevels[id];
    if (level >= 5) return;
    const cost = def.costs[level];
    if (this.totalCoins < cost) return;
    this.totalCoins -= cost;
    this.upgradeLevels[id]++;
    this.recomputeStats();
    this.save();
  },

  getUpgradeCost(id) {
    const def = UPGRADE_DEFS.find(d => d.id === id);
    const level = this.upgradeLevels[id] || 0;
    if (level >= 5) return null;
    return def.costs[level];
  },

  update(dt) {
    this.time++;
    if (this.state === 'AIMING') {
      if (this.charging) {
        this.powerCharge = Math.min(1, this.powerCharge + dt / 90); // fills over ~1.5s at 60fps
      }
    }
    if (this.state === 'FLYING') {
      this.updateCat();
      this.updateCamera();
      this.generateObstacles();
      this.checkObstacleCollisions();
      this.checkCoinCollection();
      this.updateParticles();
      this.updatePopups();
      if (this.comboTimer > 0) this.comboTimer--;
    }
    if (this.state !== 'FLYING') {
      this.updateParticles();
      this.updatePopups();
    }
    // animate obstacle frames always
    for (const obs of this.obstacles) obs.animFrame++;
  },

  updateCat() {
    const cat = this.cat;
    if (cat.stopped) return;

    // Catnip boost
    if (cat.catnipTimer > 0) {
      cat.vx *= 1.0008;
      cat.vy *= 0.99;
      cat.catnipTimer--;
    }

    // Rocket
    if (cat.rocketTimer > 0) {
      cat.vx += 0.20;
      cat.rocketTimer--;
      if (cat.rocketTimer === 0) {
        this.spawnParticles('explosion', cat.x, cat.y, 12);
        this.shakeRequest = 5;
      }
    }

    // Roomba
    if (cat.roombaTimer > 0) {
      cat.vx = 4;
      cat.vy = 0;
      cat.y = GROUND_Y;
      cat.roombaTimer--;
      if (cat.roombaTimer === 0) { cat.vy = -6; }
    } else {
      // Leaf blower
      if (cat.leafBlowTimer > 0) {
        cat.vx += cat.leafBlowDir * 0.06;
        cat.leafBlowTimer--;
      }
      // Gravity
      cat.vy += this.stats.GRAVITY;
      cat.x += cat.vx;
      cat.y += cat.vy;
    }

    // Bucket stuck
    if (cat.bucketTimer > 0) {
      cat.bucketTimer--;
      cat.vx = 0;
      if (cat.bucketTimer === 0) cat.vy = -8;
    }

    // Impact flash decay
    if (cat.impactFlash > 0) cat.impactFlash--;

    // Ground collision
    if (cat.y >= GROUND_Y) {
      cat.y = GROUND_Y;
      const impactSpeed = Math.abs(cat.vy);
      if (impactSpeed > 1) {
        // Squash
        const squash = Math.min(3.0, 1 + impactSpeed * 0.25);
        cat.scaleX = squash;
        cat.scaleY = 1 / squash;
        cat.angularVel += (cat.vx > 0 ? 1 : -1) * impactSpeed * 0.04;
        cat.vy = -cat.vy * this.stats.BOUNCE_COEFF;
        cat.onGround = true;
        cat.bounceCount++;
        cat.pawExtend = 18;
        this.shakeRequest = Math.min(5, impactSpeed * 0.3);

        // Bonus coin for lucky paws
        const luckyLevel = this.upgradeLevels.lucky || 0;
        if (luckyLevel > 0) this.sessionCoins += luckyLevel;

        // Combo
        if (this.comboTimer > 0) {
          this.comboCount++;
          if (this.comboCount >= 3) {
            this.popups.push({ text: `×${this.comboCount} MEOW COMBO!`, x: CANVAS_W / 2, y: CANVAS_H / 2, life: 60, type: 'combo' });
          }
        } else {
          this.comboCount = 1;
        }
        this.comboTimer = 120;

        this.popups.push({ text: 'MEOW!', x: cat.x, y: cat.y - 50, life: 35, speed: impactSpeed, type: 'meow' });
        this.spawnParticles('dust', cat.x, GROUND_Y, 6);
        Audio.play('meow', impactSpeed);
      } else {
        cat.vy = 0;
        cat.onGround = true;
      }
      if (Math.abs(cat.vy) < 0.5 && cat.onGround) {
        cat.vx *= this.stats.SLIDE_COEFF;
      }
    } else {
      cat.onGround = false;
    }

    // Ground friction when sliding
    if (cat.onGround && cat.y >= GROUND_Y) {
      cat.vx *= this.stats.SLIDE_COEFF;
    }

    // Stop condition
    if (cat.onGround && Math.abs(cat.vx) < 0.3 && Math.abs(cat.vy) < 0.5) {
      cat.stopped = true;
      cat.vx = 0; cat.vy = 0;
      this.onCatStopped();
    }

    // Angular velocity & rotation
    cat.angularVel *= 0.95;
    cat.rotation += cat.angularVel;

    // Scale spring back
    cat.scaleX += (1 - cat.scaleX) * 0.04;
    cat.scaleY += (1 - cat.scaleY) * 0.04;

    // Paw extend decay
    if (cat.pawExtend > 0) cat.pawExtend--;
  },

  onCatStopped() {
    const dist = Math.round(this.cat.x / 60);
    if (dist > this.bestDistance) this.bestDistance = dist;
    this.totalCoins += this.sessionCoins;
    this.save();
    // Tired landing meow, then a second one
    Audio.play('meow', 0);
    setTimeout(() => Audio.play('meow', 0), 350);
    setTimeout(() => { if (this.state === 'FLYING') this.state = 'RESULTS'; }, 900);
  },

  updateCamera() {
    this.cameraX = Math.max(0, this.cat.x - 150);
  },

  generateObstacles() {
    const genAhead = this.cameraX + 1200;
    while (this.lastObstacleX < genAhead) {
      const gap = 120 + Math.random() * 180;
      this.lastObstacleX += gap;
      const type = pickObstacleType(this.lastObstacleX);
      const yVariants = { box: 0, trampoline: 0, leafblower: 0, yarnball: -60, dog: 0, roomba: 0, bucket: -40, rocket: -80, catnip: -100, splashpad: 0 };
      const baseY = GROUND_Y + (yVariants[type] || 0);
      const obs = makeObstacle(type, this.lastObstacleX, baseY);
      obs.coins = spawnCoinsNear(obs);
      this.obstacles.push(obs);
      for (const c of obs.coins) this.allCoins.push(c);
    }
    // Cull old obstacles
    const cullX = this.cameraX - 300;
    this.obstacles = this.obstacles.filter(o => o.x > cullX);
    this.allCoins = this.allCoins.filter(c => c.x > cullX || !c.collected);
  },

  checkObstacleCollisions() {
    const cat = this.cat;
    const catR = 20;
    for (const obs of this.obstacles) {
      if (obs.triggered) continue;
      const cx = obs.x + obs.w / 2;
      const cy = obs.y - obs.h / 2;
      const dx = cat.x - cx;
      const dy = cat.y - cy;
      if (Math.abs(dx) > obs.w / 2 + catR || Math.abs(dy) > obs.h / 2 + catR) continue;

      this.applyObstacle(obs); // apply BEFORE marking triggered
      obs.triggered = true;
      cat.pawExtend = 18;
    }
  },

  applyObstacle(obs) {
    const cat = this.cat;
    const impactSpd = Math.sqrt(cat.vx * cat.vx + cat.vy * cat.vy);
    switch (obs.type) {
      case 'box':
        this.spawnParticles('debris', obs.x + obs.w / 2, obs.y - obs.h / 2, 8);
        cat.vy = -3;
        cat.vx *= 0.8;
        Audio.play('thud', 5);
        Audio.play('meow', impactSpd);
        this.popups.push({ text: 'BONK!', x: obs.x, y: obs.y - obs.h - 20, life: 30, type: 'meow' });
        break;
      case 'trampoline': {
        const boost = Math.max(Math.abs(cat.vy) * 1.8, 6);
        cat.vy = -boost;
        const stretch = Math.min(3.0, 1 + boost * 0.20);
        cat.scaleY = stretch;
        cat.scaleX = 1 / stretch;
        Audio.play('boing', boost);
        Audio.play('meow', boost * 4);
        this.popups.push({ text: 'BOING!', x: obs.x, y: obs.y - 30, life: 35, type: 'meow' });
        break;
      }
      case 'leafblower':
        cat.leafBlowDir = obs.direction;
        cat.leafBlowTimer = 50;
        Audio.play('whoosh', 5);
        Audio.play('meow', impactSpd);
        this.popups.push({ text: obs.direction > 0 ? 'WHOOSH!' : 'SWOOSH!', x: obs.x, y: obs.y - 50, life: 30, type: 'meow' });
        break;
      case 'yarnball':
        cat.vx *= 0.55;
        Audio.play('thud', 3);
        Audio.play('meow', impactSpd);
        this.popups.push({ text: 'GRAB!', x: obs.x, y: obs.y - 40, life: 30, type: 'meow' });
        break;
      case 'dog':
        cat.vx = -Math.abs(cat.vx) * 0.7;
        cat.vy = -5;
        cat.angularVel += -0.3;
        cat.impactFlash = 40;
        Audio.play('bark', 8);
        Audio.play('meow', 12);
        this.popups.push({ text: 'WOOF!', x: obs.x, y: obs.y - 50, life: 40, type: 'meow' });
        this.shakeRequest = 5;
        break;
      case 'roomba':
        cat.roombaTimer = 60;
        cat.y = GROUND_Y;
        Audio.play('whoosh', 3);
        Audio.play('meow', impactSpd);
        this.popups.push({ text: 'VRRRM!', x: obs.x, y: obs.y - 30, life: 30, type: 'meow' });
        break;
      case 'bucket':
        cat.bucketTimer = 50;
        cat.vx = 0;
        cat.impactFlash = 50;
        Audio.play('thud', 6);
        Audio.play('meow', 8);
        this.popups.push({ text: 'CLONK!', x: obs.x, y: obs.y - 50, life: 35, type: 'meow' });
        break;
      case 'rocket':
        cat.rocketTimer = 90;
        cat.impactFlash = 30;
        Audio.play('rocket', 10);
        Audio.play('meow', 14);
        this.popups.push({ text: '🚀 ZOOM!', x: cat.x, y: cat.y - 50, life: 50, type: 'combo' });
        break;
      case 'catnip':
        cat.catnipTimer = 120;
        Audio.play('meow', 15);
        setTimeout(() => Audio.play('meow', 18), 200);
        this.popups.push({ text: 'CATNIP!!!', x: obs.x, y: obs.y - 50, life: 50, type: 'combo' });
        break;
      case 'splashpad':
        cat.vy = -10;
        cat.vx += Math.sign(cat.vx || 1) * 2.5;
        Audio.play('splash', 8);
        Audio.play('meow', 10);
        this.popups.push({ text: 'HISSSS!', x: obs.x + obs.w / 2, y: obs.y - 30, life: 40, type: 'meow' });
        this.spawnParticles('splash', obs.x + obs.w / 2, obs.y - obs.h, 10);
        break;
    }
  },

  checkCoinCollection() {
    const cat = this.cat;
    const r2 = this.stats.MAGNET_RADIUS * this.stats.MAGNET_RADIUS;
    for (const coin of this.allCoins) {
      if (coin.collected) continue;
      const dx = cat.x - coin.x;
      const dy = cat.y - coin.y;
      const dist2 = dx * dx + dy * dy;
      if (dist2 < r2) {
        // Pull toward cat
        const dist = Math.sqrt(dist2);
        coin.x += (dx / dist) * Math.min(8, dist);
        coin.y += (dy / dist) * Math.min(8, dist);
      }
      if (dist2 < 20 * 20) {
        coin.collected = true;
        this.sessionCoins++;
        this.spawnParticles('coinsparkle', coin.x, coin.y, 4);
        this.popups.push({ text: '+1', x: coin.x, y: coin.y - 10, life: 25, type: 'coin' });
      }
    }
  },

  spawnParticles(type, x, y, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
      this.particles.push({
        type, x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (type === 'dust' ? 2 : 0),
        life: 20 + Math.random() * 10,
        maxLife: 30,
        size: type === 'debris' ? 5 : type === 'coinsparkle' ? 4 : 4,
      });
      this.particles[this.particles.length - 1].maxLife = this.particles[this.particles.length - 1].life;
    }
    if (this.particles.length > 80) this.particles.splice(0, this.particles.length - 80);
  },

  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.life--;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  },

  updatePopups() {
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.y -= 0.8;
      p.life--;
      if (p.life <= 0) this.popups.splice(i, 1);
    }
  },

  getDistance() {
    return Math.round(this.cat.x / 60);
  },
};
