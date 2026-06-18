// renderer.js — all canvas drawing, reads from Game state

const Renderer = (() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const W = 800, H = 450;
  const GROUND_Y = 370;

  let shakeX = 0, shakeY = 0, shakeMag = 0;

  // ── Utilities ──────────────────────────────────────────────────────────────

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  // ── Background ─────────────────────────────────────────────────────────────

  function drawBackground(cameraX) {
    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    grad.addColorStop(0, '#5ba3d9');
    grad.addColorStop(1, '#a8d8f0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, GROUND_Y);

    // Distant hills (parallax 0.15x)
    const hOff = -(cameraX * 0.15) % W;
    ctx.fillStyle = '#7ab648';
    for (let i = -1; i <= 2; i++) {
      const hx = hOff + i * W;
      ctx.beginPath();
      ctx.ellipse(hx + 160, GROUND_Y, 160, 60, 0, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(hx + 420, GROUND_Y, 120, 45, 0, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(hx + 650, GROUND_Y, 180, 55, 0, Math.PI, 0);
      ctx.fill();
    }

    // Clouds (parallax 0.05x)
    const cOff = -(cameraX * 0.05) % (W * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    const clouds = [[80, 60, 50, 18], [300, 40, 70, 22], [560, 70, 55, 16], [750, 50, 65, 20],
                    [980, 45, 45, 15], [1200, 65, 80, 25]];
    for (const [cx, cy, cw, ch] of clouds) {
      const x = ((cx + cOff) % (W * 2 + 200)) - 200;
      ctx.beginPath();
      ctx.ellipse(x, cy, cw, ch, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x - cw * 0.4, cy + 4, cw * 0.6, ch * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + cw * 0.4, cy + 5, cw * 0.55, ch * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ground
    ctx.fillStyle = '#6ab04c';
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.fillStyle = '#5a9e3c';
    ctx.fillRect(0, GROUND_Y, W, 6);

    // Ground detail lines (moving)
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    const lineOff = cameraX % 80;
    for (let lx = -lineOff; lx < W; lx += 80) {
      ctx.beginPath();
      ctx.moveTo(lx, GROUND_Y + 10);
      ctx.lineTo(lx + 40, GROUND_Y + 6);
      ctx.stroke();
    }
  }

  // ── Cat ────────────────────────────────────────────────────────────────────

  function drawCat(cat, cameraX, time) {
    const sx = cat.x - cameraX;
    const sy = cat.y;
    const size = 38;
    const half = size / 2;

    ctx.save();
    ctx.translate(sx, sy - half);
    ctx.rotate(cat.rotation);
    ctx.scale(cat.scaleX, cat.scaleY);

    // Tail
    const tailAngle = cat.stopped ? 0.4 : Math.sin(time * 0.08) * 0.5 + 0.3;
    ctx.save();
    ctx.strokeStyle = '#c0622a';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-half + 4, half - 4);
    ctx.bezierCurveTo(
      -half - 14, half + 10,
      -half - 20 + Math.cos(tailAngle) * 16, half - 8 + Math.sin(tailAngle) * 20,
      -half - 8 + Math.cos(tailAngle + 0.8) * 22, half - 24 + Math.sin(tailAngle + 0.8) * 18
    );
    ctx.stroke();
    ctx.restore();

    // Body (the box)
    ctx.fillStyle = '#e8854a';
    ctx.strokeStyle = '#7a3a10';
    ctx.lineWidth = 2.5;
    roundRect(-half, -half, size, size, 8);
    ctx.fill();
    ctx.stroke();

    // Ears
    ctx.fillStyle = '#e8854a';
    ctx.strokeStyle = '#7a3a10';
    ctx.lineWidth = 2;
    // Left ear
    ctx.beginPath();
    ctx.moveTo(-half + 4, -half + 2);
    ctx.lineTo(-half - 6, -half - 14);
    ctx.lineTo(-half + 16, -half - 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Right ear
    ctx.beginPath();
    ctx.moveTo(half - 4, -half + 2);
    ctx.lineTo(half + 6, -half - 14);
    ctx.lineTo(half - 16, -half - 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Inner ear
    ctx.fillStyle = '#f5a080';
    ctx.strokeStyle = 'none';
    ctx.beginPath();
    ctx.moveTo(-half + 5, -half + 1);
    ctx.lineTo(-half - 3, -half - 9);
    ctx.lineTo(-half + 13, -half - 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(half - 5, -half + 1);
    ctx.lineTo(half + 3, -half - 9);
    ctx.lineTo(half - 13, -half - 2);
    ctx.closePath();
    ctx.fill();

    // Eyes
    const speed = Math.sqrt(cat.vx * cat.vx + cat.vy * cat.vy);
    const isFast = speed > 14;
    const isImpact = cat.impactFlash > 0;
    const isSleeping = cat.stopped;

    const eyeLY = -4, eyeRY = -4;
    const eyeLX = -10, eyeRX = 10;

    if (isSleeping) {
      // Closed eyes (sleeping lines)
      ctx.strokeStyle = '#3a1a00';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(eyeLX, eyeLY, 5, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(eyeRX, eyeRY, 5, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
    } else if (isFast || isImpact) {
      // ×× eyes
      ctx.strokeStyle = '#3a1a00';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      for (const [ex, ey] of [[eyeLX, eyeLY], [eyeRX, eyeRY]]) {
        ctx.beginPath(); ctx.moveTo(ex - 5, ey - 5); ctx.lineTo(ex + 5, ey + 5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ex + 5, ey - 5); ctx.lineTo(ex - 5, ey + 5); ctx.stroke();
      }
    } else {
      // Normal oval eyes
      const eyeH = cat.scaleY < 0.8 ? 3 : 7; // squish eyes on squash
      ctx.fillStyle = '#f5d020';
      ctx.beginPath();
      ctx.ellipse(eyeLX, eyeLY, 5, eyeH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(eyeRX, eyeRY, 5, eyeH, 0, 0, Math.PI * 2);
      ctx.fill();
      // Pupils
      ctx.fillStyle = '#1a0a00';
      ctx.beginPath();
      ctx.ellipse(eyeLX, eyeLY, 2.5, eyeH * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(eyeRX, eyeRY, 2.5, eyeH * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Nose
    ctx.fillStyle = '#f08080';
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(-4, 9);
    ctx.lineTo(4, 9);
    ctx.closePath();
    ctx.fill();

    // Whiskers
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    const whiskerPairs = [[-2, 7, -half - 6, 4], [-2, 8, -half - 6, 9], [-2, 9, -half - 6, 14],
                          [ 2, 7,  half + 6, 4], [ 2, 8,  half + 6, 9], [ 2, 9,  half + 6, 14]];
    for (const [x1, y1, x2, y2] of whiskerPairs) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Paws (extend from bottom on contact)
    if (cat.pawExtend > 0) {
      const pawAlpha = cat.pawExtend / 18;
      const pawOut = (1 - cat.pawExtend / 18) * 6; // extend outward as timer runs
      ctx.globalAlpha = Math.min(1, pawAlpha * 2);
      ctx.fillStyle = '#e8854a';
      ctx.strokeStyle = '#7a3a10';
      ctx.lineWidth = 1.5;
      const pawY = half + 2 + pawOut;
      for (const px of [-12, -4, 4, 12]) {
        roundRect(px - 5, pawY, 10, 7, 3);
        ctx.fill();
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  // ── Cannon ─────────────────────────────────────────────────────────────────

  function drawCannon(angle, charge, state) {
    const bx = 80, by = GROUND_Y;

    ctx.save();
    ctx.translate(bx, by);

    // Wheels
    ctx.fillStyle = '#444';
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(-14, 4, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(14, 4, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
      ctx.beginPath(); ctx.moveTo(-14, 4); ctx.lineTo(-14 + Math.cos(a) * 8, 4 + Math.sin(a) * 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(14, 4); ctx.lineTo(14 + Math.cos(a) * 8, 4 + Math.sin(a) * 8); ctx.stroke();
    }

    // Base
    ctx.fillStyle = '#555';
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    roundRect(-18, -24, 36, 24, 4);
    ctx.fill(); ctx.stroke();

    // Barrel (rotates)
    ctx.rotate(angle);
    ctx.fillStyle = '#444';
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2.5;
    roundRect(0, -8, 48, 16, 6);
    ctx.fill(); ctx.stroke();
    // Muzzle ring
    ctx.fillStyle = '#333';
    roundRect(44, -9, 8, 18, 3);
    ctx.fill(); ctx.stroke();

    ctx.restore();

    // Power bar
    if (state === 'AIMING' && charge > 0) {
      const bw = 100, bh = 12;
      const bpx = bx - bw / 2, bpy = by - 60;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      roundRect(bpx - 2, bpy - 2, bw + 4, bh + 4, 4);
      ctx.fill();
      const r = Math.round(lerp(0, 255, charge));
      const g = Math.round(lerp(200, 50, charge));
      ctx.fillStyle = `rgb(${r},${g},0)`;
      roundRect(bpx, bpy, bw * charge, bh, 3);
      ctx.fill();
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 1;
      roundRect(bpx, bpy, bw, bh, 3);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('POWER', bx, bpy - 4);
    }
  }

  // ── Obstacles ──────────────────────────────────────────────────────────────

  const OBS_COLORS = {
    box:        ['#c8a87a', '#8b6b3d'],
    trampoline: ['#ff6b35', '#aa3300'],
    leafblower: ['#aaa', '#555'],
    yarnball:   ['#cc44cc', '#882288'],
    dog:        ['#c8a060', '#7a5030'],
    roomba:     ['#555', '#222'],
    bucket:     ['#5588cc', '#224488'],
    rocket:     ['#cc2222', '#881111'],
    catnip:     ['#44bb44', '#226622'],
    splashpad:  ['#3399ff', '#1166cc'],
  };

  function drawObstacle(obs, cameraX, time) {
    const sx = obs.x - cameraX;
    const sy = obs.y - obs.h;
    const [fill, stroke] = OBS_COLORS[obs.type] || ['#888', '#444'];
    const t = obs.animFrame;

    ctx.save();
    ctx.translate(sx + obs.w / 2, sy + obs.h / 2);

    switch (obs.type) {
      case 'box':
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        roundRect(-obs.w / 2, -obs.h / 2, obs.w, obs.h, 3);
        ctx.fill(); ctx.stroke();
        // Box cross lines
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-obs.w / 2, -obs.h / 2);
        ctx.lineTo(obs.w / 2, obs.h / 2);
        ctx.moveTo(obs.w / 2, -obs.h / 2);
        ctx.lineTo(-obs.w / 2, obs.h / 2);
        ctx.stroke();
        break;

      case 'trampoline':
        ctx.fillStyle = stroke;
        ctx.fillRect(-obs.w / 2, -4, obs.w, 8);
        // Springs
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const sx2 = -obs.w / 2 + 8 + i * (obs.w - 16) / 3;
          ctx.beginPath();
          ctx.moveTo(sx2, 4);
          ctx.lineTo(sx2, obs.h / 2);
          ctx.stroke();
        }
        // Mat
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.ellipse(0, -4, obs.w / 2, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.stroke();
        break;

      case 'leafblower': {
        const dir = obs.direction;
        ctx.scale(dir, 1);
        // Body
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        roundRect(-10, -obs.h / 2, 20, obs.h, 4);
        ctx.fill(); ctx.stroke();
        // Nozzle
        ctx.fillStyle = '#888';
        ctx.fillRect(10, -4, 14, 8);
        // Wind lines
        ctx.strokeStyle = 'rgba(200,200,255,0.6)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        for (let i = -12; i <= 12; i += 8) {
          const wobble = Math.sin(t * 0.2 + i * 0.3) * 4;
          ctx.beginPath();
          ctx.moveTo(24, i);
          ctx.lineTo(24 + 20 + wobble, i + Math.sin(t * 0.15) * 5);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        break;
      }

      case 'yarnball': {
        const r = obs.w / 2;
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        // Yarn strands
        ctx.strokeStyle = '#aa22aa';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + t * 0.03;
          ctx.beginPath();
          ctx.arc(0, 0, r - 3, a, a + Math.PI * 0.6);
          ctx.stroke();
        }
        break;
      }

      case 'dog': {
        // Simple dog silhouette
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        // Body
        roundRect(-obs.w / 2 + 4, -obs.h / 4, obs.w - 8, obs.h / 2, 6);
        ctx.fill(); ctx.stroke();
        // Head
        roundRect(obs.w / 4 - 4, -obs.h / 2, obs.w / 3, obs.w / 3, 5);
        ctx.fill(); ctx.stroke();
        // Ear
        ctx.fillStyle = '#a07040';
        ctx.beginPath();
        ctx.ellipse(obs.w / 4 + 5, -obs.h / 2 + 2, 5, 10, -0.3, 0, Math.PI * 2);
        ctx.fill();
        // Legs
        ctx.fillStyle = fill;
        for (const lx of [-obs.w / 2 + 8, -obs.w / 4, obs.w / 4 - 4]) {
          ctx.fillRect(lx, obs.h / 4, 8, obs.h / 4 + 4);
        }
        // Mouth open if triggered
        if (obs.triggered) {
          ctx.fillStyle = '#cc4444';
          ctx.beginPath();
          ctx.arc(obs.w / 4 + 12, -obs.h / 2 + 14, 5, 0, Math.PI);
          ctx.fill();
        }
        // Tail wag
        const waggle = Math.sin(t * 0.15) * 0.4;
        ctx.save();
        ctx.translate(-obs.w / 2 + 2, 0);
        ctx.rotate(waggle);
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.fillRect(-3, -12, 6, 12);
        ctx.strokeRect(-3, -12, 6, 12);
        ctx.restore();
        break;
      }

      case 'roomba': {
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, obs.w / 2, obs.h / 2, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        // Spinning brush indicator
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, obs.w / 2 - 6, t * 0.08, t * 0.08 + Math.PI * 1.5);
        ctx.stroke();
        // Bumper
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, obs.w / 2 - 2, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.stroke();
        break;
      }

      case 'bucket': {
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        // Trapezoid bucket
        ctx.beginPath();
        ctx.moveTo(-obs.w / 2 + 4, -obs.h / 2);
        ctx.lineTo(obs.w / 2 - 4, -obs.h / 2);
        ctx.lineTo(obs.w / 2, obs.h / 2);
        ctx.lineTo(-obs.w / 2, obs.h / 2);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        // Handle arc
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -obs.h / 2, obs.w / 3, Math.PI, 0);
        ctx.stroke();
        break;
      }

      case 'rocket': {
        // Rocket pointing up
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        // Body
        roundRect(-obs.w / 2, -obs.h / 2, obs.w, obs.h * 0.7, 4);
        ctx.fill(); ctx.stroke();
        // Nose cone
        ctx.fillStyle = '#ff8888';
        ctx.beginPath();
        ctx.moveTo(-obs.w / 2, -obs.h / 2);
        ctx.lineTo(0, -obs.h / 2 - 14);
        ctx.lineTo(obs.w / 2, -obs.h / 2);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        // Fins
        ctx.fillStyle = '#881111';
        for (const fx of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(fx * obs.w / 2, obs.h / 4);
          ctx.lineTo(fx * (obs.w / 2 + 8), obs.h / 2);
          ctx.lineTo(fx * obs.w / 2, obs.h / 2 - 8);
          ctx.closePath();
          ctx.fill();
        }
        // Flame flicker
        const flameH = 8 + Math.sin(t * 0.25) * 5;
        const grad = ctx.createLinearGradient(0, obs.h / 4, 0, obs.h / 4 + flameH);
        grad.addColorStop(0, '#ffdd00');
        grad.addColorStop(1, 'rgba(255,80,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, obs.h / 4 + flameH / 2, obs.w / 4, flameH / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'catnip': {
        const r = obs.w / 2;
        const bounce2 = Math.abs(Math.sin(t * 0.1)) * 3;
        // Leaf shape
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.save();
        ctx.translate(0, -bounce2);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.5, r, -0.3, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.restore();
        // Sparkles
        ctx.fillStyle = '#aaff44';
        for (let i = 0; i < 3; i++) {
          const sa = t * 0.1 + i * Math.PI * 0.66;
          ctx.beginPath();
          ctx.arc(Math.cos(sa) * (r + 6), Math.sin(sa) * (r + 4) - bounce2, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'splashpad': {
        // Flat blue pad
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        roundRect(-obs.w / 2, -obs.h / 2, obs.w, obs.h, 4);
        ctx.fill(); ctx.stroke();
        // Wave lines
        ctx.strokeStyle = '#88ccff';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
          const wx = -obs.w / 2 + 8 + i * (obs.w - 16) / 2;
          const wave = Math.sin(t * 0.12 + i * 1.2) * 2;
          ctx.beginPath();
          ctx.arc(wx, wave, 6, Math.PI, 0);
          ctx.stroke();
        }
        break;
      }
    }

    ctx.restore();
  }

  // ── Coins ──────────────────────────────────────────────────────────────────

  function drawCoins(coins, cameraX, time) {
    for (const coin of coins) {
      if (coin.collected) continue;
      const sx = coin.x - cameraX;
      const sy = coin.y + Math.sin(time * 0.08 + coin.x * 0.01) * 3;
      const r = 6;
      ctx.save();
      ctx.translate(sx, sy);
      // Coin body
      ctx.fillStyle = '#FFD700';
      ctx.strokeStyle = '#cc9900';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // $ symbol
      ctx.fillStyle = '#cc9900';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 0);
      ctx.restore();
    }
  }

  // ── Particles ──────────────────────────────────────────────────────────────

  function drawParticles(particles, cameraX) {
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      const sx = p.x - cameraX;
      ctx.save();
      ctx.globalAlpha = alpha;
      switch (p.type) {
        case 'dust':
          ctx.fillStyle = '#b09060';
          ctx.beginPath();
          ctx.arc(sx, p.y, p.size * (0.5 + alpha * 0.5), 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'debris':
          ctx.fillStyle = '#c8a87a';
          ctx.fillRect(sx - p.size / 2, p.y - p.size / 2, p.size, p.size);
          break;
        case 'coinsparkle':
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(sx, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'splash':
          ctx.fillStyle = '#88ccff';
          ctx.beginPath();
          ctx.arc(sx, p.y, p.size * alpha, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'explosion':
          ctx.fillStyle = `hsl(${30 + alpha * 30}, 100%, 50%)`;
          ctx.beginPath();
          ctx.arc(sx, p.y, p.size * (2 - alpha), 0, Math.PI * 2);
          ctx.fill();
          break;
      }
      ctx.restore();
    }
  }

  // ── HUD ────────────────────────────────────────────────────────────────────

  function drawHUD(game) {
    ctx.save();

    // Distance counter
    const dist = game.getDistance();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(W - 150, 8, 142, 46, 6);
    ctx.fill();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 26px Impact, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(dist, W - 12, 38);
    ctx.fillStyle = '#aaa';
    ctx.font = '10px monospace';
    ctx.fillText('CAT-LENGTHS', W - 12, 50);

    // Best
    if (game.bestDistance > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '9px monospace';
      ctx.fillText(`BEST: ${game.bestDistance}`, W - 12, 62);
    }

    // Coins HUD
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(8, 8, 90, 34, 6);
    ctx.fill();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`$ ${game.sessionCoins}`, 14, 30);

    ctx.restore();
  }

  // ── Popups ────────────────────────────────────────────────────────────────

  function drawPopups(popups, cameraX) {
    for (const p of popups) {
      const alpha = Math.min(1, p.life / 20);
      const sx = p.type === 'combo' ? p.x : p.x - cameraX;
      ctx.save();
      ctx.globalAlpha = alpha;

      if (p.type === 'combo') {
        ctx.font = 'bold 28px Impact, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff4444';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.strokeText(p.text, sx, p.y);
        ctx.fillText(p.text, sx, p.y);
      } else if (p.type === 'coin') {
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(p.text, sx, p.y);
      } else {
        // meow / bonk etc
        const speed = p.speed || 5;
        const hue = Math.max(0, 60 - speed * 2.5);
        ctx.font = `bold ${14 + Math.min(speed, 10)}px Impact, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = `hsl(${hue}, 100%, 55%)`;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(p.text, sx, p.y);
        ctx.fillText(p.text, sx, p.y);
      }
      ctx.restore();
    }
  }

  // ── Overlay screens ────────────────────────────────────────────────────────

  function drawMenu() {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.textAlign = 'center';

    ctx.font = 'bold 64px Impact, sans-serif';
    ctx.fillStyle = '#ff6b35';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 5;
    ctx.strokeText('CAT CANNON', W / 2, 160);
    ctx.fillText('CAT CANNON', W / 2, 160);

    ctx.font = 'bold 18px Impact, sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText('🐱  LAUNCH THE CAT  🐱', W / 2, 210);
    ctx.fillText('🐱  LAUNCH THE CAT  🐱', W / 2, 210);

    // Pulsing click prompt
    const pulse = 0.7 + Math.sin(Date.now() * 0.004) * 0.3;
    ctx.globalAlpha = pulse;
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeText('CLICK TO FIRE', W / 2, 270);
    ctx.fillText('CLICK TO FIRE', W / 2, 270);
    ctx.globalAlpha = 1;

    ctx.font = '11px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('aim with mouse · hold to charge · release to launch', W / 2, 310);
    ctx.restore();
  }

  function drawResults(game) {
    ctx.fillStyle = 'rgba(0,0,20,0.75)';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.textAlign = 'center';

    const dist = game.getDistance();
    const isRecord = dist >= game.bestDistance && dist > 0;

    ctx.font = 'bold 42px Impact, sans-serif';
    ctx.fillStyle = isRecord ? '#FFD700' : '#ff6b35';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    const title = isRecord ? '★ NEW RECORD! ★' : 'CAT HAS LANDED';
    ctx.strokeText(title, W / 2, 130);
    ctx.fillText(title, W / 2, 130);

    ctx.font = 'bold 28px Impact, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(`${dist} CAT-LENGTHS`, W / 2, 180);
    ctx.fillText(`${dist} CAT-LENGTHS`, W / 2, 180);

    ctx.font = '14px monospace';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`+${game.sessionCoins} coins collected  ·  total: ${game.totalCoins}`, W / 2, 215);

    if (game.bestDistance > 0 && !isRecord) {
      ctx.fillStyle = '#888';
      ctx.font = '12px monospace';
      ctx.fillText(`best: ${game.bestDistance} cat-lengths`, W / 2, 240);
    }

    // Buttons
    const btnW = 160, btnH = 40;
    const shopBtnX = W / 2 - btnW - 10, shopBtnY = 270;
    const tryBtnX = W / 2 + 10, tryBtnY = 270;

    ctx.fillStyle = '#2a6abb';
    roundRect(shopBtnX, shopBtnY, btnW, btnH, 6);
    ctx.fill();
    ctx.strokeStyle = '#88bbff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px Impact, sans-serif';
    ctx.fillText('UPGRADE SHOP', shopBtnX + btnW / 2, shopBtnY + 26);

    ctx.fillStyle = '#2a9a2a';
    roundRect(tryBtnX, tryBtnY, btnW, btnH, 6);
    ctx.fill();
    ctx.strokeStyle = '#88ff88';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fillText('TRY AGAIN', tryBtnX + btnW / 2, tryBtnY + 26);

    ctx.restore();

    // Return hit areas for input
    return { shopBtn: { x: shopBtnX, y: shopBtnY, w: btnW, h: btnH }, tryBtn: { x: tryBtnX, y: tryBtnY, w: btnW, h: btnH } };
  }

  // Upgrade panel layout stored so main.js can hit-test it
  let shopLayout = {};

  function drawShop(game) {
    ctx.fillStyle = 'rgba(0,0,20,0.85)';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px Impact, sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText('UPGRADE SHOP', W / 2, 44);
    ctx.fillText('UPGRADE SHOP', W / 2, 44);

    ctx.font = '12px monospace';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`COINS: ${game.totalCoins}`, W / 2, 65);

    shopLayout = {};
    const UPGRADE_DEFS_LABELS = ['Cannon Power', 'Bouncy Paws', 'Slippery Paws', 'Coin Magnet', 'Lucky Paws'];
    const UPGRADE_IDS = ['power', 'bounce', 'slide', 'magnet', 'lucky'];
    const UPGRADE_DESC = [
      'Launch velocity +15%',
      'Bounce height +10%',
      'Slides further on ground',
      'Coin pickup radius +35px',
      'Bonus coin per bounce',
    ];

    const startY = 85;
    const rowH = 60;

    for (let i = 0; i < UPGRADE_IDS.length; i++) {
      const id = UPGRADE_IDS[i];
      const level = game.upgradeLevels[id] || 0;
      const cost = game.getUpgradeCost(id);
      const ry = startY + i * rowH;

      // Row bg
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      roundRect(20, ry, W - 40, rowH - 6, 6);
      ctx.fill();

      // Label
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Impact, sans-serif';
      ctx.fillText(UPGRADE_DEFS_LABELS[i], 32, ry + 20);
      ctx.fillStyle = '#aaa';
      ctx.font = '10px monospace';
      ctx.fillText(UPGRADE_DESC[i], 32, ry + 36);

      // Level pips
      for (let l = 0; l < 5; l++) {
        ctx.fillStyle = l < level ? '#FFD700' : '#444';
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(350 + l * 18, ry + 24, 6, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      }

      // Buy button
      const btnX = W - 140, btnY = ry + 6, btnW2 = 110, btnH2 = rowH - 16;
      if (level < 5) {
        const canAfford = game.totalCoins >= cost;
        ctx.fillStyle = canAfford ? '#2a7a2a' : '#444';
        roundRect(btnX, btnY, btnW2, btnH2, 5);
        ctx.fill();
        ctx.strokeStyle = canAfford ? '#88ff88' : '#666';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.textAlign = 'center';
        ctx.fillStyle = canAfford ? '#fff' : '#888';
        ctx.font = 'bold 13px Impact, sans-serif';
        ctx.fillText(`BUY  $${cost}`, btnX + btnW2 / 2, btnY + btnH2 / 2 + 5);
        shopLayout[id] = { x: btnX, y: btnY, w: btnW2, h: btnH2 };
      } else {
        ctx.fillStyle = '#333';
        roundRect(btnX, btnY, btnW2, btnH2, 5);
        ctx.fill();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 13px Impact, sans-serif';
        ctx.fillText('MAX!', btnX + btnW2 / 2, btnY + btnH2 / 2 + 5);
      }
    }

    // Launch button
    const lbtnX = W / 2 - 90, lbtnY = H - 54, lbtnW = 180, lbtnH = 40;
    ctx.fillStyle = '#cc4400';
    roundRect(lbtnX, lbtnY, lbtnW, lbtnH, 6);
    ctx.fill();
    ctx.strokeStyle = '#ff8844';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Impact, sans-serif';
    ctx.fillText('LAUNCH AGAIN!', lbtnX + lbtnW / 2, lbtnY + 27);
    shopLayout['__launch__'] = { x: lbtnX, y: lbtnY, w: lbtnW, h: lbtnH };

    ctx.restore();
    return shopLayout;
  }

  // ── Main draw ──────────────────────────────────────────────────────────────

  function draw(game) {
    // Apply screen shake
    if (game.shakeRequest > 0) {
      shakeMag = game.shakeRequest;
      game.shakeRequest = 0;
    }
    shakeX = (Math.random() - 0.5) * shakeMag;
    shakeY = (Math.random() - 0.5) * shakeMag;
    shakeMag *= 0.75;
    if (shakeMag < 0.1) shakeMag = 0;

    ctx.save();
    ctx.translate(Math.round(shakeX), Math.round(shakeY));

    const cx = game.cameraX;

    drawBackground(cx);
    drawCoins(game.allCoins, cx, game.time);
    drawParticles(game.particles, cx);

    for (const obs of game.obstacles) drawObstacle(obs, cx, game.time);

    drawCat(game.cat, cx, game.time);
    drawCannon(game.cannonAngle, game.powerCharge, game.state);
    drawPopups(game.popups, cx);
    drawHUD(game);

    ctx.restore();

    // Overlays (no shake)
    if (game.state === 'MENU') drawMenu();
    if (game.state === 'RESULTS') Renderer.lastResultsLayout = drawResults(game);
    if (game.state === 'SHOP') Renderer.lastShopLayout = drawShop(game);
  }

  return { draw, shopLayout, lastResultsLayout: null, lastShopLayout: null };
})();
