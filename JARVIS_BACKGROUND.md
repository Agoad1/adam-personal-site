# JarvisBackground Component Spec

## What This Is NOT
- NOT a neural network web with connecting lines
- NOT random floating panels scattered everywhere
- NOT lightning bolts or electric arcs
- NOT a space scene

## What This IS
A dark room with a curved desk at the bottom of the screen. Holographic panels sit ON the desk in a row from left to right. The top of the screen is almost pure black. The light in the scene comes FROM the panels themselves — glowing upward into the darkness like monitors in a dark room at night. This is Tony Stark's lab. JARVIS is already running. You just walked in.

---

## Scene Composition (Critical — Read This First)

Think of the canvas in three horizontal zones:

**Top 40% of canvas:** Near pure black. Maybe 2-3 very faint, very small distant panels barely visible — like screens in a far back room. Barely there. Just enough to suggest depth.

**Middle 30% of canvas:** Transition zone. Darkness fading slightly. 2-3 mid-size panels here, more visible than the top ones but still somewhat transparent. These float slightly above the desk level.

**Bottom 30% of canvas:** The desk. This is where the main action is. A subtle curved desk surface is implied by a very faint horizontal arc/gradient — dark charcoal, barely visible, just enough to ground the scene. 5-6 MAIN panels sit here in a horizontal row stretching from the left edge to the right edge of the screen. These are the brightest, most detailed elements in the entire scene. They cast a soft blue glow downward onto the desk surface beneath them.

The overall lighting: bottom is slightly lighter (from panel glow), top is darkest. Like a room lit only by monitors.

---

## The Panels (Most Important Element)

Each panel is a rectangle. Not all the same size — vary them. Roughly 180-280px wide, 120-180px tall for the main bottom row. Smaller for the mid and background panels.

Each panel contains ALL of the following interior elements:

### 1. Panel Frame
- Thin 1px border: `rgba(59, 130, 246, 0.6)` electric blue
- Corner accent marks: small L-shaped lines at all 4 corners (like a targeting reticle / HUD frame). About 12px long each leg.
- Fill: `rgba(4, 12, 35, 0.7)` — very dark blue interior, not black

### 2. Scrolling Code / Data Lines
- 4-6 lines of text inside the panel
- Monospace font, very small (8-10px)
- Color: `rgba(6, 182, 212, 0.5)` cyan
- Content: random hex strings, binary snippets, fake coordinates — things like "0x4F3A > PROC", "SYS: 0.923ms", "NODE [14] OK", "DATA 0011 1101"
- These lines scroll UPWARD slowly and continuously — like a terminal feed
- New lines generate at the bottom as old ones exit the top

### 3. Holographic Wheel / HUD Circle
- In the center or corner of SOME panels (not all — maybe 60% of panels have this)
- Concentric circles: 3 rings, each slightly different radius
- Outer ring rotates clockwise slowly
- Inner ring rotates counter-clockwise slowly  
- Middle ring pulses opacity (0.3 to 0.7) slowly
- Color: `rgba(59, 130, 246, 0.5)` blue
- Small tick marks around the outer ring like a compass or gauge

### 4. Progress/Status Bar
- 1-2 thin horizontal bars at the bottom of each panel
- Partially filled, like a loading or progress indicator
- Animated — the fill slowly increases then resets
- Color: `rgba(6, 182, 212, 0.6)` cyan

### 5. Panel Glow
- Each panel emits a soft outer glow — `box-shadow` equivalent on canvas using a radial gradient behind the panel
- Color: `rgba(59, 130, 246, 0.08)` — very subtle blue bloom spreading outward
- Bottom panels also cast a downward glow onto the implied desk surface below them

---

## Mouse Interaction (The Signature Feature)

Track mouse X/Y position continuously.

**When cursor is within 220px of any panel:**
- Panel border opacity increases from 0.6 → 1.0 smoothly
- Panel fill brightens slightly
- Interior scroll speed doubles
- HUD wheel rotation speeds up
- A single expanding ring pulse emits from panel center — starts at panel size, expands outward to 1.5x size, fades from `rgba(59,130,246,0.4)` to transparent over 600ms
- The panel scales up very slightly (1.04x) using transform — smooth transition

**When cursor moves away:**
- Everything smoothly returns to idle state over 400ms

**Particles:**
- 60-80 tiny particles (1-1.5px) float slowly across the whole canvas
- Color: `rgba(59, 130, 246, 0.4)`
- Within 160px of cursor: gently drift toward cursor position
- Otherwise: random slow drift, wrap around edges

---

## Desk Surface
- Implied, not literal. Don't draw a detailed desk.
- A very subtle horizontal gradient at the bottom 15% of the canvas: `rgba(10, 20, 50, 0.15)` fading to transparent upward
- Where panel glow hits this area, it should look like light reflecting off a dark surface

---

## Animation Loop
- `requestAnimationFrame` at 60fps
- On each frame: clear with `rgba(3, 6, 15, 0.2)` (slight trail, not full clear)
- Draw order: desk glow → background panels → mid panels → particles → main desk panels → pulse rings → mouse effects (always on top)

---

## Colors (Never Deviate)
- Canvas background: `#03060f`
- Electric blue: `#3b82f6` / `rgb(59, 130, 246)`
- Cyan: `#06b6d4` / `rgb(6, 182, 212)`
- Panel interior: `rgba(4, 12, 35, 0.7)`
- No warm colors. No green. No white. No red.

---

## File
`components/JarvisBackground.tsx` — client component, `"use client"` at top.
Mount as fullscreen canvas: `position: fixed`, `top: 0`, `left: 0`, `width: 100vw`, `height: 100vh`, `z-index: -1`, `pointer-events: none`.

Import and render in `app/layout.tsx` before all other content.

---

## What Success Looks Like
Someone opens the site. The first thing they see is a dark room with a row of glowing blue holographic screens stretching across the bottom of the page. Data is scrolling on the screens. Wheels are turning. It's quiet but alive. They move their mouse near a panel and it lights up and responds. They think: "whoever built this knows what they're doing."
