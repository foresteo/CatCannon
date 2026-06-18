# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Game

No build step, no server required. Open `index.html` directly in any browser:

```
# Windows
start index.html

# Or via Python if available
python -m http.server 3333
```

There are no tests, no linter, and no package manager. The entire game is vanilla JS + HTML5 Canvas with no dependencies.

## Architecture

Scripts are loaded in order by `index.html` and depend on each other via globals:

```
game-state.js  →  defines window.Game
audio.js       →  defines window.Audio  (called by Game)
renderer.js    →  defines window.Renderer  (reads Game state)
main.js        →  wires input events, drives rAF loop
```

**The key architectural rule:** `game-state.js` has zero DOM/Canvas references. All physics, state transitions, obstacle effects, upgrade math, and persistence live there. `renderer.js` is the only file that touches `ctx`. This separation exists so the game logic can be ported to a different engine without rewriting physics.

### Game loop (main.js)
`dt` is frame-normalized (~1.0 per frame at 60 fps). Physics constants are tuned for dt≈1, so don't switch to seconds-based dt without retuning GRAVITY, BOUNCE_COEFF, etc.

### State machine (Game.state)
`MENU → AIMING → FLYING → RESULTS → SHOP → AIMING`

State transitions happen inside `Game.handleInput()` and `Game.onCatStopped()`. The renderer reads `game.state` to decide which overlay to draw.

### Hit-testing UI buttons
`renderer.js` returns pixel rects from `drawResults()` and `drawShop()` into `Renderer.lastResultsLayout` and `Renderer.lastShopLayout`. `main.js` hit-tests mouse clicks against these each frame. There is no DOM UI — everything is drawn on canvas.

### Adding a new obstacle type
1. Add a size entry to `sizes` in `makeObstacle()` (game-state.js)
2. Add it to the appropriate zone array in `OBSTACLE_ZONES`
3. Add a `case` in `applyObstacle()` — obstacles trigger **once** (checked before call in `checkObstacleCollisions`)
4. Add drawing logic as a `case` in `drawObstacle()` (renderer.js)
5. Add a color entry to `OBS_COLORS` (renderer.js)

### Adding a new upgrade
1. Add a definition object to `UPGRADE_DEFS` (game-state.js) with `id`, `label`, `desc`, `costs[5]`, and `apply(level, base)`
2. Add the id to the `upgradeLevels` default in `Game` and in the localStorage schema
3. Add the label/desc/id to the inline arrays in `drawShop()` (renderer.js) — these are kept separate from game logic intentionally

### Physics constants
All live in `BASE` (game-state.js). `Game.recomputeStats()` applies upgrade deltas on top of BASE each time an upgrade is purchased. Never mutate BASE directly.

### Audio
`Audio.play(sound, speed)` — `speed` is used to pitch-shift meows. All sounds are synthesized via Web Audio oscillators; no audio files. The context is created on first user gesture to comply with browser autoplay policy.

## Reference
`GAME_DESIGN.md` is the platform-agnostic design document — obstacle specs, physics constant roles, upgrade balance rationale, and the full state machine. Read it before making gameplay changes.
