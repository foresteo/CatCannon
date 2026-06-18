// main.js — game loop + input wiring

const canvas = document.getElementById('gameCanvas');

function canvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = 800 / rect.width;
  const scaleY = 450 / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

function hitTest(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

canvas.addEventListener('mousemove', e => {
  const pos = canvasCoords(e);
  Game.handleInput('mousemove', pos);
});

canvas.addEventListener('mousedown', e => {
  const pos = canvasCoords(e);

  if (Game.state === 'RESULTS' && Renderer.lastResultsLayout) {
    const layout = Renderer.lastResultsLayout;
    if (hitTest(pos.x, pos.y, layout.shopBtn)) {
      Game.handleInput('mousedown', { shopBtn: true });
      return;
    }
    if (hitTest(pos.x, pos.y, layout.tryBtn)) {
      Game.handleInput('mousedown', {});
      return;
    }
    return;
  }

  if (Game.state === 'SHOP' && Renderer.lastShopLayout) {
    const layout = Renderer.lastShopLayout;
    for (const [key, rect] of Object.entries(layout)) {
      if (hitTest(pos.x, pos.y, rect)) {
        if (key === '__launch__') {
          Game.handleInput('mousedown', { launchBtn: true });
        } else {
          Game.handleInput('mousedown', { upgradeId: key });
        }
        return;
      }
    }
    return;
  }

  Game.handleInput('mousedown', pos);
});

canvas.addEventListener('mouseup', e => {
  Game.handleInput('mouseup', canvasCoords(e));
});

// Prevent context menu on right-click
canvas.addEventListener('contextmenu', e => e.preventDefault());

Game.init();

let last = 0;
function loop(ts) {
  const dt = Math.min((ts - last) / (1000 / 60), 3); // clamp to avoid spiral of death
  last = ts;
  Game.update(dt);
  Renderer.draw(Game);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
