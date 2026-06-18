# Cat Cannon — Game Design Document

Platform-agnostic. This document describes rules, constants, and intent so the game can be reimplemented in Unity, Godot, or any other engine without reading the source.

---

## Concept

A single-screen distance game. The player fires a ragdoll cat from a cannon. The cat bounces and tumbles across an infinitely scrolling world full of escalating absurd obstacles. Each run ends when the cat stops. Coins collected mid-air are spent on upgrades between runs.

Genre: flash game, 2009. Tone: slapstick, noisy, endearing.

---

## State Machine

```
MENU → AIMING → FLYING → RESULTS → SHOP → AIMING
```

| State | Entry | Exit |
|-------|-------|------|
| MENU | game start | any click |
| AIMING | after MENU or SHOP | mouseup (launches) |
| FLYING | after launch | cat velocity < threshold AND on ground |
| RESULTS | 0.8s after cat stops | click "Try Again" or "Shop" |
| SHOP | from RESULTS | click "Launch Again" |

---

## Physics Constants (base values, all upgradeable)

| Constant | Value | Role |
|----------|-------|------|
| GRAVITY | 0.4 px/frame² | Downward acceleration every frame |
| BOUNCE_COEFF | 0.55 | `vy_new = -vy * BOUNCE_COEFF` on ground hit |
| SLIDE_COEFF | 0.92 | `vx *= SLIDE_COEFF` per frame while on ground (< 1 = friction) |
| MAX_SPEED | 22 px/frame | Maximum launch speed at full charge |

World coordinates: ground at y=370 in an 800×450 viewport.

### Cat stops when:
- `abs(vx) < 0.3` AND on ground AND `abs(vy) < 0.5`

### Angular velocity (visual rotation):
- On bounce: `angularVel += sign(vx) * abs(vy) * 0.04`
- Decays: `angularVel *= 0.95` per frame

### Squash-and-stretch (jello physics):
- Ground impact: `scaleX = 1 + abs(vy)*0.025`, `scaleY = 1/scaleX`
- Launch/trampoline: `scaleY = 1 + abs(vy)*0.03`, `scaleX = 1/scaleY`
- Spring back: `scale += (1 - scale) * 0.18` per axis per frame

---

## Controls

| Input | Action |
|-------|--------|
| Mouse move (AIMING) | Rotate cannon barrel toward mouse, clamped to -80°…-10° |
| Mouse hold (AIMING) | Charge power bar 0→1 over 1.5 seconds |
| Mouse release (AIMING) | Launch: `vx = cos(angle)*charge*MAX_SPEED`, `vy = sin(angle)*charge*MAX_SPEED` |

---

## Scoring

- **Distance**: `floor(cat.x / 60)` = "cat-lengths"
- Best distance persisted across sessions
- No time component; pure distance

---

## Camera

- `cameraX = max(0, cat.x - 150)`
- Cat stays ~150px from left edge while flying
- Background: sky static, hills at 0.15× parallax, ground 1:1

---

## Obstacle System

### Generation
- Obstacles spawn procedurally ahead of the camera (`cameraX + 1200`)
- Minimum gap: 120px between obstacles
- Culled when `obstacleX < cameraX - 300`
- Each obstacle spawns 1–3 coins nearby

### Zones (by world X)

| Zone | Start X | Available obstacles |
|------|---------|-------------------|
| 1 | 300 | box, trampoline |
| 2 | 600 | + leafblower, yarnball |
| 3 | 2000 | + dog, roomba, bucket |
| 4 | 5000 | + rocket, catnip, splashpad |

### Obstacle Specs

| Type | Trigger | Effect | Sound | Popup |
|------|---------|--------|-------|-------|
| **Box** | first contact | Shatters; `vy = -4, vx *= 0.8` | thud | BONK! |
| **Trampoline** | first contact | `vy = -max(abs(vy)*1.8, 12)` + stretch | boing | BOING! |
| **Leaf Blower** | first contact | Sets 30-frame push: `vx += dir*0.4/frame` | whoosh | WHOOSH!/SWOOSH! |
| **Yarn Ball** | first contact | `vx *= 0.55`, paws extend | thud | GRAB! |
| **Dog** | first contact | `vx = -abs(vx)*0.7, vy = -6` (reversal) | bark | WOOF! |
| **Roomba** | first contact | Locks cat to ground, `vx = 5` for 60 frames, then `vy = -8` | whoosh | VRRRM! |
| **Bucket** | first contact | Freezes cat 50 frames, then `vy = -11` | thud | CLONK! |
| **Rocket** | first contact | 90 frames: `vx += 0.7/frame`, then explosion | rocket | 🚀 ZOOM! |
| **Catnip** | first contact | 120 frames: `vx *= 1.004/frame` (speed frenzy) | meow | CATNIP!!! |
| **Splash Pad** | first contact | Cat hates water: `vy = -16, vx += sign(vx)*5` | splash | HISSSS! |

All obstacles trigger only once (first collision). Multi-frame effects use timers updated in the physics step.

---

## Coin Collection

- Coins pulled toward cat within `MAGNET_RADIUS`
- Collected on overlap (< 20px)
- `sessionCoins` counted during run; added to `totalCoins` on stop
- Coin display in HUD top-left

---

## Upgrade Shop

Five upgrades, five levels each. Costs double per level.

| ID | Label | Effect per level | Base cost |
|----|-------|-----------------|-----------|
| power | Cannon Power | `MAX_SPEED *= 1.15` | 10 |
| bounce | Bouncy Paws | `BOUNCE_COEFF += 0.06` (cap 0.88) | 15 |
| slide | Slippery Paws | `SLIDE_COEFF += 0.02` (cap 0.99) | 10 |
| magnet | Coin Magnet | `MAGNET_RADIUS += 35px` | 20 |
| lucky | Lucky Paws | +level bonus coins per ground bounce | 25 |

> **Slide note**: higher SLIDE_COEFF = less braking per frame = cat slides further. The upgrade reduces grip, not adds it.

---

## Audio Design

All sounds synthesized (no audio files). Reference implementation uses Web Audio API oscillators.

| Event | Type | Freq | Notes |
|-------|------|------|-------|
| Ground bounce / meow | Triangle | `200 + abs(vy)*8` Hz | Pitch rises with speed |
| Trampoline boing | Sine | 180 → 420 Hz ramp | |
| Box hit / thud | Noise + sawtooth | 80 → 40 Hz | |
| Dog bark | Sawtooth | 120 → 80 Hz × 2 pulses | |
| Leaf blower / whoosh | White noise | — | |
| Rocket | Noise + sawtooth ramp | 60 → 200 Hz | |
| Water splash | Noise + triangle | 600 → 200 Hz | |
| Coin collect | Sine | 880 → 1200 Hz | Short |

---

## Visual Design

### Cat Sprite
Single rigid boxy shape — head and body are one rounded square (~40×40px).
- **Body**: rounded square, orange/amber fill, dark stroke
- **Ears**: two filled triangles from top corners; pink inner triangle
- **Eyes**: oval (normal), slits (squash impact), ×× (fast collision), closed arcs (stopped/sleeping)
- **Nose**: pink/salmon small triangle
- **Whiskers**: 3 lines each side from nose
- **Tail**: bezier curve, oscillates `sin(time*0.08)*0.5` while airborne; limp when stopped
- **Paws**: 4 small rounded rects, extend from bottom on obstacle contact, fade over 18 frames
- Entire cat rotates as one rigid body via angular velocity

### Screen Shake
- On launch: magnitude 8
- On ground bounce: `magnitude = min(5, abs(vy)*0.3)`
- On dog hit: magnitude 6
- On rocket explode: magnitude 5
- Decays: `magnitude *= 0.75` per frame

### Particles

| Type | Trigger | Count | Color | Behavior |
|------|---------|-------|-------|----------|
| Dust | Ground bounce | 6 | Gray | Float up, fade 20-30 frames |
| Debris | Box break | 8 | Brown | Random scatter |
| Coin sparkle | Coin collect | 4 | Gold | Float up |
| Splash | Splash pad | 10 | Light blue | Scatter |
| Explosion | Rocket end | 12 | Orange/yellow | Scatter |

Pool cap: 80 particles; evict oldest.

---

## Persistence (localStorage key: `catcannon_save`)

```json
{
  "bestDistance": 0,
  "totalCoins": 0,
  "upgrades": {
    "power": 0,
    "bounce": 0,
    "slide": 0,
    "magnet": 0,
    "lucky": 0
  }
}
```

Save on: run ends (RESULTS), any shop purchase.

---

## Win / Lose

There is no win or lose state. The game is endless. The only goal is beating your best distance. The cat always lands eventually.
