"use client";

import { useEffect, useRef } from "react";

// ─── Utilities ────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function dist2(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

// ─── Game constants ───────────────────────────────────────────────────────────

const SNAKE_COLS  = 14;
const SNAKE_ROWS  = 8;
const BREAK_COLS  = 7;
const BREAK_ROWS  = 4;

// ─── Shared types ─────────────────────────────────────────────────────────────

interface PulseRing { age: number; startR: number; maxR: number; }
interface BreakParticle { x: number; y: number; vx: number; vy: number; life: number; }

// Galaga alien
interface GalaAlien {
  x: number; y: number;
  type: number;           // 0=triangle, 1=diamond, 2=crab
  phase: "enter" | "patrol" | "dive";
  t: number;              // bezier progress (enter)
  sx: number; sy: number; // bezier start
  cpX: number; cpY: number; // bezier control point
  homeX: number; homeY: number;
  diveVX: number; diveVY: number;
}

interface Missile {
  sx: number; sy: number;
  tx: number; ty: number;
  x: number; y: number;
  progress: number; speed: number;
}
interface Interceptor {
  lx: number; ly: number;
  tx: number; ty: number;
  x: number; y: number;
  progress: number;
  exploding: boolean;
  explodeRadius: number;
  maxExplodeRadius: number;
  lingerTimer: number;   // frames to linger at max radius (90 = 1.5s)
}

// ─── Panel state ──────────────────────────────────────────────────────────────

interface PanelState {
  cx: number; cy: number; w: number; h: number;
  isActive: boolean; wasActive: boolean;
  activePct: number;
  pulseRings: PulseRing[];
  angle: number; angle2: number; pulsePhase: number;
  progFill: number; progFill2: number;
  skewY: number; scaleX: number;
  bootAge: number;
  flickerMult: number;
  flickerTimer: number;

  // Panel 0 — Galaga
  galaAliens: GalaAlien[];
  galaSpawnTimer: number;
  galaPatrolOffX: number;
  galaPatrolDir: number;
  galaDiveTimer: number;
  galaBullets: { x: number; y: number }[];
  galaBombs: { x: number; y: number }[];
  galaCannonX: number;
  galaScore: number;
  galaFireTimer: number;

  // Panel 1 — Snake
  snakeBody: { x: number; y: number }[];
  snakeDir: { x: number; y: number };
  snakeNextDir: { x: number; y: number };
  snakeFood: { x: number; y: number };
  snakeScore: number;
  snakeMoveTimer: number;
  snakeDead: boolean;
  snakeDeadTimer: number;

  // Panel 2 — Breakout
  breakBricks: boolean[][];
  breakBallX: number; breakBallY: number;
  breakBallVX: number; breakBallVY: number;
  breakPaddleX: number;
  breakScore: number;
  breakLives: number;
  breakBallLaunched: boolean;
  breakLaunchTimer: number;
  breakResetTimer: number;
  breakParticles: BreakParticle[];

  // Panel 3 — Missile Command
  mcMissiles: Missile[];
  mcInterceptors: Interceptor[];
  mcCities: boolean[];
  mcScore: number;
  mcWave: number;
  mcSpawnTimer: number;
  mcAutoFireTimer: number;
  mcGameOverTimer: number;

  // Panel 4 — Pong
  pongBallX: number; pongBallY: number;
  pongBallVX: number; pongBallVY: number;
  pongPaddleL: number; pongPaddleR: number;
  pongScoreL: number; pongScoreR: number;
  pongSpeed: number;
}

// ─── State factories ──────────────────────────────────────────────────────────

function makeSnakeInit(): { body: { x: number; y: number }[]; food: { x: number; y: number } } {
  const mx = Math.floor(SNAKE_COLS / 2), my = Math.floor(SNAKE_ROWS / 2);
  const body = [{ x: mx, y: my }, { x: mx - 1, y: my }, { x: mx - 2, y: my }];
  // Food spawns 1 cell inside the walls
  let fx: number, fy: number;
  do {
    fx = 1 + Math.floor(Math.random() * (SNAKE_COLS - 2));
    fy = 1 + Math.floor(Math.random() * (SNAKE_ROWS - 2));
  } while (body.some(s => s.x === fx && s.y === fy));
  return { body, food: { x: fx, y: fy } };
}

function makeBreakGrid(): boolean[][] {
  return Array.from({ length: BREAK_ROWS }, () =>
    Array.from({ length: BREAK_COLS }, () => true)
  );
}

function makePanelState(cx: number, cy: number, w: number, h: number, skewY: number, scaleX: number): PanelState {
  const snk = makeSnakeInit();
  return {
    cx, cy, w, h,
    isActive: false, wasActive: false, activePct: 0,
    pulseRings: [],
    angle: Math.random() * Math.PI * 2,
    angle2: Math.random() * Math.PI * 2,
    pulsePhase: Math.random() * Math.PI * 2,
    progFill: Math.random() * 0.6,
    progFill2: Math.random() * 0.5,
    skewY, scaleX,
    bootAge: 0,
    flickerMult: 1,
    flickerTimer: Math.floor(600 + Math.random() * 540),
    // Galaga
    galaAliens: [],
    galaSpawnTimer: 20,
    galaPatrolOffX: 0,
    galaPatrolDir: 1,
    galaDiveTimer: 200,
    galaBullets: [], galaBombs: [],
    galaCannonX: 0, galaScore: 0,
    galaFireTimer: 55,
    // Snake
    snakeBody: snk.body,
    snakeDir: { x: 1, y: 0 }, snakeNextDir: { x: 1, y: 0 },
    snakeFood: snk.food,
    snakeScore: 0, snakeMoveTimer: 18,
    snakeDead: false, snakeDeadTimer: 0,
    // Breakout
    breakBricks: makeBreakGrid(),
    breakBallX: 0, breakBallY: 0,
    breakBallVX: 1.8 * (Math.random() > 0.5 ? 1 : -1), breakBallVY: -1.8,
    breakPaddleX: 0,
    breakScore: 0, breakLives: 3,
    breakBallLaunched: false, breakLaunchTimer: 80, breakResetTimer: 0,
    breakParticles: [],
    // Missile Command
    mcMissiles: [], mcInterceptors: [],
    mcCities: [true, true, true],
    mcScore: 0, mcWave: 1,
    mcSpawnTimer: 150, mcAutoFireTimer: 100, mcGameOverTimer: 0,
    // Pong
    pongBallX: 0, pongBallY: 0,
    pongBallVX: 1.3 * (Math.random() > 0.5 ? 1 : -1),
    pongBallVY: 0.8 * (Math.random() > 0.5 ? 1 : -1),
    pongPaddleL: 0, pongPaddleR: 0,
    pongScoreL: 0, pongScoreR: 0,
    pongSpeed: 1.0,
  };
}

// ─── Galaga helpers ───────────────────────────────────────────────────────────

// 10 formation slots: 2 rows × 5 cols
function galaSlots(hw: number, hh: number): { x: number; y: number; type: number }[] {
  const ct = -hh + 14;
  const out: { x: number; y: number; type: number }[] = [];
  for (let col = 0; col < 5; col++) {
    const xPos = lerp(-hw * 0.70, hw * 0.70, col / 4);
    out.push({ x: xPos, y: ct + 18, type: 0 });         // row 0: triangles
    out.push({ x: xPos, y: ct + 34, type: 1 + col % 2 }); // row 1: diamond/crab alternating
  }
  return out;
}

// ─── Snake helpers ────────────────────────────────────────────────────────────

function snakeAIDir(
  body: { x: number; y: number }[],
  dir: { x: number; y: number },
  food: { x: number; y: number }
): { x: number; y: number } {
  const head = body[0];
  const candidates = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
  const safe = candidates.filter(d => {
    if (d.x === -dir.x && d.y === -dir.y) return false;
    const nx = head.x + d.x, ny = head.y + d.y;
    if (nx < 0 || nx >= SNAKE_COLS || ny < 0 || ny >= SNAKE_ROWS) return false;
    return !body.slice(0, -1).some(s => s.x === nx && s.y === ny);
  });
  if (safe.length === 0) return dir;
  safe.sort((a, b) => {
    const da = (head.x + a.x - food.x) ** 2 + (head.y + a.y - food.y) ** 2;
    const db = (head.x + b.x - food.x) ** 2 + (head.y + b.y - food.y) ** 2;
    return da - db;
  });
  return safe[0];
}

// Returns cell width and height to fill the content area edge-to-edge
function snakeCellDims(w: number, h: number): { cw: number; ch: number } {
  return {
    cw: (w - 8) / SNAKE_COLS,   // 4px margin each side
    ch: (h - 36) / SNAKE_ROWS,  // title 14 + 2 pad top, 18+2 pad bottom
  };
}

// ─── Particle ─────────────────────────────────────────────────────────────────

interface Particle { x: number; y: number; vx: number; vy: number; size: number; }

function makeParticle(W: number, H: number): Particle {
  return {
    x: Math.random() * W, y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    size: 1 + Math.random() * 0.5,
  };
}

// ─── Panel layout ─────────────────────────────────────────────────────────────

function computePanelGeometry(W: number, H: number) {
  const xPcts   = [0.180, 0.340, 0.500, 0.660, 0.820];
  const yPcts   = [0.460, 0.420, 0.400, 0.420, 0.460];
  const wPcts   = [0.150, 0.150, 0.150, 0.150, 0.150];
  const wPx     = wPcts.map(f => clamp(f * W, 150, 310));
  const hPx     = wPx.map(w => w * 0.70);
  const skewYs  = [-0.10, -0.04, 0, 0.04, 0.10];
  const scaleXs = [0.86, 0.95, 1, 0.95, 0.86];
  return xPcts.map((xf, i) => ({
    cx: xf * W, cy: yPcts[i] * H,
    w: wPx[i], h: hPx[i],
    skewY: skewYs[i], scaleX: scaleXs[i],
  }));
}

// ─── Draw: amber glow overlay ─────────────────────────────────────────────────

function drawAmberGlowOverlay(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const stripY = H * 0.57;
  const cx = W / 2;
  const warmGrad = ctx.createRadialGradient(cx, stripY + 10, 0, cx, stripY + 10, W * 0.48);
  warmGrad.addColorStop(0, "rgba(255, 160, 40, 0.07)");
  warmGrad.addColorStop(0.5, "rgba(255, 140, 20, 0.03)");
  warmGrad.addColorStop(1, "rgba(255, 140, 20, 0)");
  ctx.fillStyle = warmGrad;
  ctx.fillRect(0, stripY - 20, W, H - stripY + 40);
}

// ─── Draw: panel desk glow ────────────────────────────────────────────────────

function drawPanelDeskGlow(ctx: CanvasRenderingContext2D, p: PanelState, H: number) {
  const bottom = p.cy + p.h / 2;
  const glowH = H * 0.28;
  const alpha = lerp(0.04, 0.09, p.activePct);
  const grad = ctx.createLinearGradient(0, bottom, 0, bottom + glowH);
  grad.addColorStop(0, `rgba(6, 182, 212, ${alpha})`);
  grad.addColorStop(1, "rgba(6, 182, 212, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(p.cx - p.w * 0.65, bottom, p.w * 1.3, glowH);

  const bR = Math.max(p.w, p.h) * 0.85;
  const bloom = ctx.createRadialGradient(p.cx, p.cy, 0, p.cx, p.cy, bR);
  bloom.addColorStop(0, `rgba(6, 182, 212, ${lerp(0.04, 0.1, p.activePct)})`);
  bloom.addColorStop(1, "rgba(6, 182, 212, 0)");
  ctx.fillStyle = bloom;
  ctx.fillRect(p.cx - bR, p.cy - bR, bR * 2, bR * 2);
}

// ─── Draw: shared panel frame ─────────────────────────────────────────────────

function drawPanelFrame(ctx: CanvasRenderingContext2D, p: PanelState) {
  const { cx, cy, w, h, activePct } = p;
  const hw = w / 2, hh = h / 2;
  const borderAlpha = lerp(0.65, 1.0, activePct);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.transform(p.scaleX, p.skewY, 0, 1, 0, 0);
  const sc = 1 + 0.04 * activePct;
  ctx.scale(sc, sc);

  const innerGlow = ctx.createLinearGradient(0, -hh, 0, hh);
  innerGlow.addColorStop(0,   "rgba(6, 182, 212, 0.07)");
  innerGlow.addColorStop(0.4, "rgba(6, 182, 212, 0.03)");
  innerGlow.addColorStop(1,   "rgba(6, 182, 212, 0.01)");
  ctx.fillStyle = innerGlow;
  ctx.fillRect(-hw, -hh, w, h);

  ctx.save();
  ctx.beginPath(); ctx.rect(-hw, -hh, w, h); ctx.clip();
  ctx.fillStyle = "rgba(0, 0, 0, 0.045)";
  for (let sy = -hh; sy < hh; sy += 3) { ctx.fillRect(-hw, sy, w, 1); }
  ctx.restore();

  ctx.shadowColor = "rgba(6, 182, 212, 0.85)";
  ctx.shadowBlur = lerp(8, 24, activePct);
  ctx.strokeStyle = `rgba(6, 182, 212, ${borderAlpha})`;
  ctx.lineWidth = 1;
  ctx.strokeRect(-hw, -hh, w, h);

  const cL = 12;
  ctx.shadowColor = "rgba(6, 182, 212, 0.95)";
  ctx.shadowBlur = lerp(5, 14, activePct);
  ctx.strokeStyle = `rgba(6, 182, 212, ${Math.min(1, borderAlpha * 1.15)})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-hw + cL, -hh); ctx.lineTo(-hw, -hh); ctx.lineTo(-hw, -hh + cL);
  ctx.moveTo(hw - cL, -hh);  ctx.lineTo(hw, -hh);  ctx.lineTo(hw, -hh + cL);
  ctx.moveTo(-hw + cL, hh);  ctx.lineTo(-hw, hh);  ctx.lineTo(-hw, hh - cL);
  ctx.moveTo(hw - cL, hh);   ctx.lineTo(hw, hh);   ctx.lineTo(hw, hh - cL);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();
}

// ─── Draw: shared progress bars ───────────────────────────────────────────────

function drawProgressBars(ctx: CanvasRenderingContext2D, p: PanelState, twoRows: boolean) {
  const { cx, cy, w, h, activePct, progFill, progFill2 } = p;
  const hw = w / 2, hh = h / 2;
  const sc = 1 + 0.04 * activePct;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.transform(p.scaleX, p.skewY, 0, 1, 0, 0);
  ctx.scale(sc, sc);
  const barW = w - 16;
  const alpha = lerp(0.55, 0.9, activePct);
  const y1 = hh - 8, y2 = hh - 14;
  ctx.fillStyle = "rgba(59, 130, 246, 0.15)";
  ctx.fillRect(-hw + 8, y2 - 2, barW, 2);
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha})`;
  ctx.fillRect(-hw + 8, y2 - 2, barW * progFill2, 2);
  if (twoRows) {
    ctx.fillStyle = "rgba(59, 130, 246, 0.15)";
    ctx.fillRect(-hw + 8, y1 - 2, barW, 2);
    ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.75})`;
    ctx.fillRect(-hw + 8, y1 - 2, barW * progFill, 2);
  }
  ctx.restore();
}

// ─── Panel 0: Galaga ─────────────────────────────────────────────────────────

function drawGalagaPanel(ctx: CanvasRenderingContext2D, p: PanelState) {
  const { cx, cy, w, h, activePct } = p;
  const hw = w / 2, hh = h / 2;
  const sc = 1 + 0.04 * activePct;
  const alpha = lerp(0.7, 1.0, activePct);
  const cannonY = hh - 22;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.transform(p.scaleX, p.skewY, 0, 1, 0, 0);
  ctx.scale(sc, sc);
  ctx.beginPath(); ctx.rect(-hw, -hh, w, h); ctx.clip();

  // Title + score
  ctx.font = "bold 7px monospace";
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.85})`;
  ctx.fillText("GALAGA", -hw + 7, -hh + 10);
  ctx.textAlign = "right";
  ctx.fillText(`${p.galaScore}`, hw - 6, -hh + 10);
  ctx.textAlign = "left";

  // Aliens
  ctx.save();
  ctx.shadowColor = "rgba(6, 182, 212, 0.8)";
  ctx.shadowBlur = 4;
  p.galaAliens.forEach(a => {
    const s = 5.5;
    const fadeIn = a.phase === "enter" ? lerp(0.3, 1.0, a.t) : 1.0;
    const aAlpha = alpha * fadeIn * 0.92;

    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.strokeStyle = `rgba(6, 182, 212, ${aAlpha})`;
    ctx.lineWidth = 1;

    if (a.type === 0) {
      ctx.beginPath();
      ctx.moveTo(0, -s); ctx.lineTo(s, s * 0.6); ctx.lineTo(-s, s * 0.6); ctx.closePath();
      ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(6, 182, 212, ${aAlpha * 0.6})`; ctx.fill();
    } else if (a.type === 1) {
      ctx.beginPath();
      ctx.moveTo(0, -s); ctx.lineTo(s, 0); ctx.lineTo(0, s); ctx.lineTo(-s, 0); ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, 0); ctx.lineTo(s * 0.4, 0);
      ctx.moveTo(0, -s * 0.4); ctx.lineTo(0, s * 0.4);
      ctx.strokeStyle = `rgba(6, 182, 212, ${aAlpha * 0.5})`; ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(-s, 0); ctx.lineTo(-s * 0.5, -s); ctx.lineTo(s * 0.5, -s);
      ctx.lineTo(s, 0); ctx.lineTo(s * 0.5, s); ctx.lineTo(-s * 0.5, s); ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, -s); ctx.lineTo(-s * 0.8, -s * 1.5);
      ctx.moveTo(s * 0.5, -s);  ctx.lineTo(s * 0.8, -s * 1.5);
      ctx.strokeStyle = `rgba(6, 182, 212, ${aAlpha * 0.4})`; ctx.stroke();
    }
    ctx.restore();
  });
  ctx.restore();

  // Player bullets
  ctx.save();
  ctx.shadowColor = "rgba(6, 182, 212, 1)";
  ctx.shadowBlur = 8;
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha})`;
  p.galaBullets.forEach(b => { ctx.fillRect(b.x - 1, b.y - 5, 2, 9); });
  ctx.restore();

  // Alien bombs
  ctx.fillStyle = `rgba(255, 120, 80, ${alpha * 0.9})`;
  p.galaBombs.forEach(b => { ctx.fillRect(b.x - 1.5, b.y - 4, 3, 7); });

  // Cannon
  ctx.save();
  ctx.shadowColor = "rgba(6, 182, 212, 0.9)";
  ctx.shadowBlur = activePct > 0.3 ? 12 : 5;
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha})`;
  const ccx = p.galaCannonX;
  ctx.fillRect(ccx - 9, cannonY + 2, 18, 4);
  ctx.fillRect(ccx - 2.5, cannonY - 8, 5, 12);
  ctx.restore();

  if (activePct > 0.5) {
    ctx.font = "5px monospace";
    ctx.fillStyle = `rgba(6, 182, 212, ${(activePct - 0.5) * 2 * alpha * 0.55})`;
    ctx.textAlign = "center";
    ctx.fillText("MOVE MOUSE TO AIM", 0, hh - 6);
    ctx.textAlign = "left";
  }

  ctx.restore();
}

// ─── Panel 1: Snake ───────────────────────────────────────────────────────────

function drawSnakePanel(ctx: CanvasRenderingContext2D, p: PanelState) {
  const { cx, cy, w, h, activePct } = p;
  const hw = w / 2, hh = h / 2;
  const sc = 1 + 0.04 * activePct;
  const alpha = lerp(0.7, 1.0, activePct);
  const { cw, ch } = snakeCellDims(w, h);
  const gridX = -hw + 4;
  const gridY = -hh + 16;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.transform(p.scaleX, p.skewY, 0, 1, 0, 0);
  ctx.scale(sc, sc);
  ctx.beginPath(); ctx.rect(-hw, -hh, w, h); ctx.clip();

  // Title + score
  ctx.font = "bold 7px monospace";
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.85})`;
  ctx.fillText("SNAKE", -hw + 7, -hh + 10);
  ctx.textAlign = "right";
  ctx.fillText(`${p.snakeScore}`, hw - 6, -hh + 10);
  ctx.textAlign = "left";

  // Grid dots (faint)
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.07})`;
  for (let row = 0; row < SNAKE_ROWS; row++) {
    for (let col = 0; col < SNAKE_COLS; col++) {
      ctx.fillRect(gridX + col * cw + cw / 2 - 0.5, gridY + row * ch + ch / 2 - 0.5, 1, 1);
    }
  }

  // Snake body
  p.snakeBody.forEach((seg, idx) => {
    const bx = gridX + seg.x * cw + 1;
    const by = gridY + seg.y * ch + 1;
    const segAlpha = alpha * (idx === 0 ? 1.0 : lerp(0.85, 0.35, idx / p.snakeBody.length));
    ctx.save();
    if (idx === 0) { ctx.shadowColor = "rgba(6, 182, 212, 0.9)"; ctx.shadowBlur = 8; }
    ctx.fillStyle = `rgba(6, 182, 212, ${segAlpha})`;
    ctx.fillRect(bx, by, cw - 2, ch - 2);
    ctx.restore();
  });

  // Food — pulsing circle
  const pulse = 0.6 + 0.4 * Math.sin(p.pulsePhase);
  const fx = gridX + p.snakeFood.x * cw + cw / 2;
  const fy = gridY + p.snakeFood.y * ch + ch / 2;
  ctx.save();
  ctx.shadowColor = "rgba(6, 182, 212, 1)";
  ctx.shadowBlur = 10 * pulse;
  ctx.beginPath();
  ctx.arc(fx, fy, Math.min(cw, ch) * 0.28 * pulse, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha * pulse})`;
  ctx.fill();
  ctx.restore();

  // Death flash
  if (p.snakeDead && p.snakeDeadTimer > 90) {
    ctx.fillStyle = `rgba(255, 80, 80, ${((p.snakeDeadTimer - 90) / 30) * 0.25})`;
    ctx.fillRect(-hw, -hh, w, h);
    ctx.font = "bold 8px monospace";
    ctx.fillStyle = `rgba(255, 100, 80, ${alpha * 0.9})`;
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", 0, 0);
    ctx.textAlign = "left";
  }

  if (activePct > 0.5 && !p.snakeDead) {
    ctx.font = "5px monospace";
    ctx.fillStyle = `rgba(6, 182, 212, ${(activePct - 0.5) * 2 * alpha * 0.5})`;
    ctx.textAlign = "center";
    ctx.fillText("MOUSE TO STEER", 0, hh - 6);
    ctx.textAlign = "left";
  }

  ctx.restore();
}

// ─── Panel 2: Breakout ────────────────────────────────────────────────────────

function drawBreakoutPanel(ctx: CanvasRenderingContext2D, p: PanelState) {
  const { cx, cy, w, h, activePct } = p;
  const hw = w / 2, hh = h / 2;
  const sc = 1 + 0.04 * activePct;
  const alpha = lerp(0.7, 1.0, activePct);
  const contentTop = -hh + 14;
  const contentBottom = hh - 18;
  const brickW = (w - 14) / BREAK_COLS;
  const brickH = 6;
  const brickGap = 2;
  const paddleW = w * 0.27;
  const paddleH = 4;
  const paddleY = contentBottom - 6;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.transform(p.scaleX, p.skewY, 0, 1, 0, 0);
  ctx.scale(sc, sc);
  ctx.beginPath(); ctx.rect(-hw, -hh, w, h); ctx.clip();

  ctx.font = "bold 7px monospace";
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.85})`;
  ctx.fillText("BREAKOUT", -hw + 7, -hh + 10);
  ctx.textAlign = "right";
  ctx.fillText(`${p.breakScore}  ${"■".repeat(p.breakLives)}`, hw - 6, -hh + 10);
  ctx.textAlign = "left";

  const brickAreaTop = contentTop + 4;
  for (let row = 0; row < BREAK_ROWS; row++) {
    for (let col = 0; col < BREAK_COLS; col++) {
      if (!p.breakBricks[row]?.[col]) continue;
      const bx = -hw + 7 + col * (brickW + brickGap / BREAK_COLS);
      const by = brickAreaTop + row * (brickH + 3);
      const rowBrightness = 1 - row * 0.18;
      ctx.save();
      ctx.shadowColor = "rgba(6, 182, 212, 0.6)";
      ctx.shadowBlur = 3 + row;
      ctx.fillStyle = `rgba(6, 182, 212, ${alpha * rowBrightness * 0.45})`;
      ctx.fillRect(bx, by, brickW - 1, brickH);
      ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * rowBrightness * 0.85})`;
      ctx.lineWidth = 0.8;
      ctx.strokeRect(bx, by, brickW - 1, brickH);
      ctx.restore();
    }
  }

  p.breakParticles.forEach(pt => {
    ctx.fillStyle = `rgba(6, 182, 212, ${pt.life})`;
    ctx.fillRect(pt.x - 1, pt.y - 1, 2, 2);
  });

  ctx.save();
  ctx.shadowColor = "rgba(6, 182, 212, 1)";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(p.breakBallX, p.breakBallY, 3, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha})`; ctx.fill();
  ctx.restore();

  ctx.save();
  if (activePct > 0.2) { ctx.shadowColor = "rgba(6, 182, 212, 0.9)"; ctx.shadowBlur = lerp(0, 10, activePct); }
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha})`;
  ctx.fillRect(p.breakPaddleX - paddleW / 2, paddleY, paddleW, paddleH);
  ctx.restore();

  if (activePct > 0.5) {
    ctx.font = "5px monospace";
    ctx.fillStyle = `rgba(6, 182, 212, ${(activePct - 0.5) * 2 * alpha * 0.55})`;
    ctx.textAlign = "center";
    ctx.fillText("MOUSE TO MOVE PADDLE", 0, hh - 6);
    ctx.textAlign = "left";
  }

  ctx.restore();
}

// ─── Panel 3: Missile Command ─────────────────────────────────────────────────

function drawMissileCommandPanel(ctx: CanvasRenderingContext2D, p: PanelState) {
  const { cx, cy, w, h, activePct } = p;
  const hw = w / 2, hh = h / 2;
  const sc = 1 + 0.04 * activePct;
  const alpha = lerp(0.7, 1.0, activePct);
  const cityY = hh - 22;
  const cityXs = [-hw * 0.50, 0, hw * 0.50];

  ctx.save();
  ctx.translate(cx, cy);
  ctx.transform(p.scaleX, p.skewY, 0, 1, 0, 0);
  ctx.scale(sc, sc);
  ctx.beginPath(); ctx.rect(-hw, -hh, w, h); ctx.clip();

  ctx.font = "bold 7px monospace";
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.85})`;
  ctx.fillText("MISSILE CMD", -hw + 7, -hh + 10);
  ctx.textAlign = "right";
  ctx.fillText(`W${p.mcWave} ${p.mcScore}`, hw - 6, -hh + 10);
  ctx.textAlign = "left";

  ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.3})`;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-hw + 4, cityY + 10); ctx.lineTo(hw - 4, cityY + 10);
  ctx.stroke();

  cityXs.forEach((ccx, i) => {
    if (!p.mcCities[i]) {
      ctx.fillStyle = `rgba(255, 100, 50, ${alpha * 0.4})`;
      ctx.fillRect(ccx - 6, cityY + 4, 12, 4);
      return;
    }
    ctx.save();
    ctx.shadowColor = "rgba(6, 182, 212, 0.7)"; ctx.shadowBlur = 5;
    ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.85})`; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ccx - 8, cityY + 10); ctx.lineTo(ccx - 8, cityY + 2);
    ctx.lineTo(ccx - 5, cityY + 2); ctx.lineTo(ccx - 5, cityY - 2);
    ctx.lineTo(ccx - 2, cityY - 2); ctx.lineTo(ccx - 2, cityY - 6);
    ctx.lineTo(ccx + 2, cityY - 6); ctx.lineTo(ccx + 2, cityY - 2);
    ctx.lineTo(ccx + 5, cityY - 2); ctx.lineTo(ccx + 5, cityY + 2);
    ctx.lineTo(ccx + 8, cityY + 2); ctx.lineTo(ccx + 8, cityY + 10);
    ctx.stroke();
    ctx.restore();
  });

  // Missiles
  p.mcMissiles.forEach(m => {
    const trailLen = 0.15;
    const t0 = Math.max(0, m.progress - trailLen);
    const grad = ctx.createLinearGradient(
      lerp(m.sx, m.tx, t0), lerp(m.sy, m.ty, t0), m.x, m.y
    );
    grad.addColorStop(0, "rgba(255, 80, 60, 0)");
    grad.addColorStop(1, `rgba(255, 80, 60, ${alpha * 0.85})`);
    ctx.save();
    ctx.shadowColor = "rgba(255, 80, 60, 0.7)"; ctx.shadowBlur = 4;
    ctx.strokeStyle = grad; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(lerp(m.sx, m.tx, t0), lerp(m.sy, m.ty, t0));
    ctx.lineTo(m.x, m.y); ctx.stroke();
    ctx.beginPath(); ctx.arc(m.x, m.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 120, 80, ${alpha})`; ctx.fill();
    ctx.restore();
  });

  // Interceptors & explosions
  p.mcInterceptors.forEach(ic => {
    if (!ic.exploding) {
      ctx.save();
      ctx.shadowColor = "rgba(6, 182, 212, 1)"; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(ic.x, ic.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(6, 182, 212, ${alpha})`; ctx.fill();
      ctx.restore();
    } else {
      // During linger: full opacity; fading out after linger expires
      const lingerTotal = 90;
      const fadeAlpha = ic.lingerTimer > 0
        ? alpha                                           // linger — full
        : alpha * (ic.explodeRadius / ic.maxExplodeRadius); // expanding — fade as it shrinks is N/A
      // When lingerTimer counts down to 0 we fade based on remaining fraction
      const renderAlpha = ic.lingerTimer > 0
        ? alpha * lerp(0.5, 1.0, ic.lingerTimer / lingerTotal)
        : fadeAlpha;

      ctx.save();
      ctx.shadowColor = "rgba(6, 182, 212, 0.9)";
      ctx.shadowBlur = ic.lingerTimer > 0 ? 14 : 6;
      ctx.globalAlpha = renderAlpha;
      ctx.strokeStyle = "rgba(6, 182, 212, 1)";
      ctx.lineWidth = ic.lingerTimer > 0 ? 1.8 : 1.2;
      ctx.beginPath(); ctx.arc(ic.x, ic.y, ic.explodeRadius, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = renderAlpha * (ic.lingerTimer > 0 ? 0.12 : 0.06);
      ctx.fillStyle = "rgba(6, 182, 212, 1)";
      ctx.beginPath(); ctx.arc(ic.x, ic.y, ic.explodeRadius, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  });

  if (p.mcGameOverTimer > 0) {
    ctx.fillStyle = `rgba(255, 60, 40, ${Math.min(1, (180 - p.mcGameOverTimer) / 60) * 0.2})`;
    ctx.fillRect(-hw, -hh, w, h);
    ctx.font = "bold 8px monospace";
    ctx.fillStyle = `rgba(255, 100, 60, ${alpha * 0.9})`;
    ctx.textAlign = "center"; ctx.fillText("CITY LOST", 0, 0); ctx.textAlign = "left";
  }

  if (activePct > 0.5) {
    ctx.font = "5px monospace";
    ctx.fillStyle = `rgba(6, 182, 212, ${(activePct - 0.5) * 2 * alpha * 0.55})`;
    ctx.textAlign = "center"; ctx.fillText("CLICK TO INTERCEPT", 0, hh - 6); ctx.textAlign = "left";
  }

  ctx.restore();
}

// ─── Panel 4: Pong ───────────────────────────────────────────────────────────

function drawPongPanel(ctx: CanvasRenderingContext2D, p: PanelState) {
  const { cx, cy, w, h, activePct, pongBallX, pongBallY, pongPaddleL, pongPaddleR, pongScoreL, pongScoreR } = p;
  const hw = w / 2, hh = h / 2;
  const sc = 1 + 0.16 * activePct;
  const alpha = lerp(0.7, 1.0, activePct);
  const paddleH = 22, paddleW = 3;
  const paddleX = hw - 7;
  const wallB = hh - 16;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.transform(p.scaleX, p.skewY, 0, 1, 0, 0);
  ctx.scale(sc, sc);
  ctx.beginPath(); ctx.rect(-hw, -hh, w, h); ctx.clip();

  ctx.font = "bold 7px monospace";
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.75})`;
  ctx.fillText("PONG", -hw + 7, -hh + 10);
  ctx.textAlign = "center";
  ctx.fillText(`${pongScoreL}  ${pongScoreR}`, 0, -hh + 10);
  ctx.textAlign = "left";

  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.18})`; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(0, -wallB); ctx.lineTo(0, wallB); ctx.stroke();
  ctx.setLineDash([]); ctx.restore();

  ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.3})`; ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-hw + 4, -wallB); ctx.lineTo(hw - 4, -wallB);
  ctx.moveTo(-hw + 4,  wallB); ctx.lineTo(hw - 4,  wallB);
  ctx.stroke();

  ctx.save();
  if (activePct > 0.1) { ctx.shadowColor = "rgba(6, 182, 212, 0.9)"; ctx.shadowBlur = lerp(0, 8, activePct); }
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha})`;
  ctx.fillRect(-paddleX - paddleW / 2, pongPaddleL - paddleH / 2, paddleW, paddleH);
  ctx.restore();

  ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.75})`;
  ctx.fillRect(paddleX - paddleW / 2, pongPaddleR - paddleH / 2, paddleW, paddleH);

  ctx.save();
  ctx.shadowColor = "rgba(6, 182, 212, 1)"; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(pongBallX, pongBallY, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha})`; ctx.fill();
  ctx.restore();

  if (activePct > 0.5) {
    ctx.font = "5px monospace";
    ctx.fillStyle = `rgba(6, 182, 212, ${(activePct - 0.5) * 2 * alpha * 0.6})`;
    ctx.textAlign = "center"; ctx.fillText("← YOUR PADDLE", -hw * 0.45, -hh + 10); ctx.textAlign = "left";
  }
  ctx.restore();
}

// ─── Draw: pulse rings ────────────────────────────────────────────────────────

function drawPulseRings(ctx: CanvasRenderingContext2D, panels: PanelState[]) {
  panels.forEach((p) => {
    p.pulseRings.forEach((ring) => {
      const progress = ring.age / 0.6;
      if (progress >= 1) return;
      const r = lerp(ring.startR, ring.maxR, progress);
      const op = 0.4 * (1 - progress);
      ctx.beginPath(); ctx.arc(p.cx, p.cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(6, 182, 212, ${op})`; ctx.lineWidth = 1.5; ctx.stroke();
    });
  });
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function JarvisBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    const mouse = { x: -9999, y: -9999, clicked: false };

    const state = {
      panels: [] as PanelState[],
      particles: [] as Particle[],
    };

    const DRAW_FNS = [
      drawGalagaPanel,
      drawSnakePanel,
      drawBreakoutPanel,
      drawMissileCommandPanel,
      drawPongPanel,
    ];

    function init() {
      if (!canvas || !ctx) return;
      const W = canvas.width = window.innerWidth;
      const H = canvas.height = window.innerHeight;

      const geom = computePanelGeometry(W, H);
      state.panels = geom.map(({ cx, cy, w, h, skewY, scaleX }, i) => {
        const p = makePanelState(cx, cy, w, h, skewY, scaleX);
        p.bootAge = -(i * 0.22);
        return p;
      });

      state.particles = Array.from(
        { length: Math.floor(60 + Math.random() * 20) },
        () => makeParticle(W, H)
      );

      ctx.fillStyle = "#03060f";
      ctx.fillRect(0, 0, W, H);
    }

    function update() {
      if (!canvas) return;
      const W = canvas.width;
      const DT = 1 / 60;

      state.panels.forEach((p, i) => {
        p.wasActive = p.isActive;
        const d = dist2(mouse.x, mouse.y, p.cx, p.cy);
        p.isActive = d < (i === 4 ? 300 : 220);
        const tgt = p.isActive ? 1 : 0;
        p.activePct = lerp(p.activePct, tgt, p.isActive ? 0.06 : 0.04);

        const spd = 1 + p.activePct * 1.5;

        p.bootAge += DT;

        p.flickerTimer -= 1;
        if (p.flickerTimer <= 0) {
          p.flickerMult = 0.08 + Math.random() * 0.15;
          p.flickerTimer = Math.floor(480 + Math.random() * 540);
        }
        if (p.flickerMult < 1) p.flickerMult = Math.min(1, p.flickerMult + 0.35);

        p.angle += 0.006 * spd;
        p.pulsePhase += 0.025 * spd;

        p.progFill += 0.0018 * spd;
        if (p.progFill > 0.95) p.progFill = 0;
        p.progFill2 += 0.0024 * spd;
        if (p.progFill2 > 0.9) p.progFill2 = 0;

        // ── Panel 0: Galaga ─────────────────────────────────────────────────
        if (i === 0) {
          const hw = p.w / 2, hh = p.h / 2;
          const contentTop = -hh + 14;
          const contentH = (hh - 18) - contentTop;
          const cannonY = hh - 22;
          const bulletSpeed = 3.5;
          const slots = galaSlots(hw, hh);

          // Patrol oscillation — all patrol aliens sway together
          p.galaPatrolOffX += p.galaPatrolDir * 0.28;
          if (Math.abs(p.galaPatrolOffX) > hw * 0.18) p.galaPatrolDir *= -1;

          // Spawn new alien (up to 10 alive at once)
          p.galaSpawnTimer--;
          if (p.galaSpawnTimer <= 0 && p.galaAliens.length < 10) {
            const occupied = new Set(
              p.galaAliens.filter(a => a.phase !== "enter").map(a => `${a.homeX.toFixed(0)},${a.homeY.toFixed(0)}`)
            );
            const free = slots.filter(s => !occupied.has(`${s.x.toFixed(0)},${s.y.toFixed(0)}`));
            if (free.length > 0) {
              const slot = free[Math.floor(Math.random() * free.length)];
              // Spawn from left or right of top, sweep in with bezier arc
              const fromLeft = Math.random() > 0.5;
              const sx = fromLeft ? -hw - 12 : hw + 12;
              const sy = contentTop + 8;
              const cpX = fromLeft ? hw * 0.5 : -hw * 0.5;
              const cpY = contentTop + contentH * 0.22;
              p.galaAliens.push({
                x: sx, y: sy,
                type: slot.type,
                phase: "enter",
                t: 0,
                sx, sy, cpX, cpY,
                homeX: slot.x, homeY: slot.y,
                diveVX: 0, diveVY: 0,
              });
            }
            p.galaSpawnTimer = Math.floor(55 + Math.random() * 55);
          }

          // Dive timer — send a random patrol alien on a dive run
          p.galaDiveTimer--;
          if (p.galaDiveTimer <= 0) {
            const patrollers = p.galaAliens.filter(a => a.phase === "patrol");
            if (patrollers.length > 0) {
              const diver = patrollers[Math.floor(Math.random() * patrollers.length)];
              diver.phase = "dive";
              const dx = p.galaCannonX - diver.x + (Math.random() - 0.5) * 22;
              const dy = cannonY - diver.y;
              const len = Math.sqrt(dx * dx + dy * dy) || 1;
              const speed = 1.6 + Math.random() * 0.9;
              diver.diveVX = (dx / len) * speed;
              diver.diveVY = (dy / len) * speed;
            }
            p.galaDiveTimer = Math.floor(100 + Math.random() * 120);
          }

          // Update alien positions
          p.galaAliens = p.galaAliens.filter(a => {
            if (a.phase === "enter") {
              a.t = Math.min(1, a.t + 0.016);
              const mt = 1 - a.t;
              a.x = mt * mt * a.sx + 2 * mt * a.t * a.cpX + a.t * a.t * a.homeX;
              a.y = mt * mt * a.sy + 2 * mt * a.t * a.cpY + a.t * a.t * a.homeY;
              if (a.t >= 1) { a.phase = "patrol"; a.x = a.homeX; a.y = a.homeY; }
            } else if (a.phase === "patrol") {
              a.x = a.homeX + p.galaPatrolOffX;
            } else if (a.phase === "dive") {
              a.x += a.diveVX;
              a.y += a.diveVY;
              // Dive off screen — alien dies (no reward)
              if (a.y > hh + 14) return false;
              // Slight curve toward cannon during dive
              const pullX = p.galaCannonX - a.x;
              a.diveVX += pullX * 0.002;
            }
            return true;
          });

          // Cannon control
          if (p.isActive) {
            p.galaCannonX = clamp((mouse.x - p.cx) / p.scaleX, -hw + 10, hw - 10);
          } else {
            // AI: gently track the nearest alien
            if (p.galaAliens.length > 0) {
              const nearest = p.galaAliens.reduce((a, b) =>
                Math.abs(b.x - p.galaCannonX) < Math.abs(a.x - p.galaCannonX) ? b : a
              );
              p.galaCannonX = lerp(p.galaCannonX, clamp(nearest.x, -hw + 10, hw - 10), 0.025);
            }
          }

          // Auto-fire
          p.galaFireTimer--;
          if (p.galaFireTimer <= 0) {
            p.galaBullets.push({ x: p.galaCannonX, y: cannonY - 8 });
            p.galaFireTimer = p.isActive ? 32 : 50;
          }

          // Random bomb drop from diving aliens
          if (p.galaAliens.some(a => a.phase === "dive") && Math.random() < 0.006) {
            const divers = p.galaAliens.filter(a => a.phase === "dive");
            const dr = divers[Math.floor(Math.random() * divers.length)];
            p.galaBombs.push({ x: dr.x, y: dr.y + 5 });
          }

          // Move bullets — check alien hit by distance
          p.galaBullets = p.galaBullets.filter(b => {
            b.y -= bulletSpeed;
            if (b.y < contentTop - 4) return false;
            const hitIdx = p.galaAliens.findIndex(a => dist2(b.x, b.y, a.x, a.y) < 9);
            if (hitIdx >= 0) {
              p.galaAliens.splice(hitIdx, 1);
              p.galaScore++;
              return false;
            }
            return true;
          });

          // Move bombs
          p.galaBombs = p.galaBombs.filter(b => {
            b.y += 1.3;
            return b.y < cannonY + 10;
          });
        }

        // ── Panel 1: Snake ──────────────────────────────────────────────────
        if (i === 1) {
          const hw = p.w / 2, hh = p.h / 2;
          const { cw, ch } = snakeCellDims(p.w, p.h);
          const gridX = -hw + 4;
          const gridY = -hh + 16;

          if (p.snakeDead) {
            p.snakeDeadTimer--;
            if (p.snakeDeadTimer <= 0) {
              const snk = makeSnakeInit();
              p.snakeBody = snk.body;
              p.snakeDir = { x: 1, y: 0 };
              p.snakeNextDir = { x: 1, y: 0 };
              p.snakeFood = snk.food;
              p.snakeDead = false;
              p.snakeMoveTimer = 18;
            }
            return;
          }

          // Direction from mouse — update every frame for instant responsiveness
          if (p.isActive) {
            const head = p.snakeBody[0];
            // Head position in panel-local coords
            const headLX = gridX + (head.x + 0.5) * cw;
            const headLY = gridY + (head.y + 0.5) * ch;
            const mLX = (mouse.x - p.cx) / p.scaleX;
            const mLY = mouse.y - p.cy;
            const ddx = mLX - headLX;
            const ddy = mLY - headLY;
            // Require minimum distance to avoid jitter near head
            if (Math.abs(ddx) > cw * 0.4 || Math.abs(ddy) > ch * 0.4) {
              let wantDir = { x: 0, y: 0 };
              if (Math.abs(ddx) > Math.abs(ddy)) {
                wantDir = { x: ddx > 0 ? 1 : -1, y: 0 };
              } else {
                wantDir = { x: 0, y: ddy > 0 ? 1 : -1 };
              }
              // Allow any direction except an immediate 180° reverse
              if (!(wantDir.x === -p.snakeDir.x && wantDir.y === -p.snakeDir.y)) {
                p.snakeNextDir = wantDir;
              }
            }
          } else {
            p.snakeNextDir = snakeAIDir(p.snakeBody, p.snakeDir, p.snakeFood);
          }

          // Move snake on timer
          p.snakeMoveTimer--;
          if (p.snakeMoveTimer <= 0) {
            p.snakeDir = p.snakeNextDir;
            const head = p.snakeBody[0];
            const nx = head.x + p.snakeDir.x;
            const ny = head.y + p.snakeDir.y;

            // Wall collision — dies touching the actual edge cells
            if (nx < 0 || nx >= SNAKE_COLS || ny < 0 || ny >= SNAKE_ROWS) {
              p.snakeDead = true; p.snakeDeadTimer = 120;
              return;
            }
            if (p.snakeBody.some(s => s.x === nx && s.y === ny)) {
              p.snakeDead = true; p.snakeDeadTimer = 120;
              return;
            }

            const ateFood = nx === p.snakeFood.x && ny === p.snakeFood.y;
            const newBody = [{ x: nx, y: ny }, ...p.snakeBody];
            if (!ateFood) newBody.pop();
            else {
              p.snakeScore++;
              let fx: number, fy: number;
              do {
                // Food always 1 cell inside the boundary
                fx = 1 + Math.floor(Math.random() * (SNAKE_COLS - 2));
                fy = 1 + Math.floor(Math.random() * (SNAKE_ROWS - 2));
              } while (newBody.some(s => s.x === fx && s.y === fy));
              p.snakeFood = { x: fx, y: fy };
            }
            p.snakeBody = newBody;
            p.snakeMoveTimer = p.isActive ? 14 : 18;
          }
        }

        // ── Panel 2: Breakout ───────────────────────────────────────────────
        if (i === 2) {
          const hw = p.w / 2, hh = p.h / 2;
          const contentTop = -hh + 14;
          const contentBottom = hh - 18;
          const brickW = (p.w - 14) / BREAK_COLS;
          const brickH = 6;
          const paddleW = p.w * 0.27;
          const paddleH = 4;
          const paddleY = contentBottom - 6;
          const brickAreaTop = contentTop + 4;

          if (p.breakResetTimer > 0) {
            p.breakResetTimer--;
            if (p.breakResetTimer === 0) {
              p.breakBricks = makeBreakGrid();
              p.breakBallLaunched = false; p.breakLaunchTimer = 60;
              p.breakBallX = p.breakPaddleX; p.breakBallY = paddleY - 4;
              p.breakBallVX = 1.8 * (Math.random() > 0.5 ? 1 : -1); p.breakBallVY = -1.8;
              if (p.breakLives <= 0) { p.breakScore = 0; p.breakLives = 3; }
            }
            return;
          }

          if (p.isActive) {
            p.breakPaddleX = clamp((mouse.x - p.cx) / p.scaleX, -hw + paddleW / 2, hw - paddleW / 2);
          } else {
            p.breakPaddleX = lerp(p.breakPaddleX, clamp(p.breakBallX, -hw + paddleW / 2, hw - paddleW / 2), 0.05);
          }

          if (!p.breakBallLaunched) {
            p.breakBallX = p.breakPaddleX; p.breakBallY = paddleY - 4;
            p.breakLaunchTimer--;
            if (p.breakLaunchTimer <= 0) p.breakBallLaunched = true;
            return;
          }

          const ballSpd = lerp(1.0, 1.3, p.activePct);
          p.breakBallX += p.breakBallVX * ballSpd;
          p.breakBallY += p.breakBallVY * ballSpd;

          if (p.breakBallX < -hw + 6) { p.breakBallVX = Math.abs(p.breakBallVX); p.breakBallX = -hw + 6; }
          if (p.breakBallX > hw - 6)  { p.breakBallVX = -Math.abs(p.breakBallVX); p.breakBallX = hw - 6; }
          if (p.breakBallY < contentTop + 2) { p.breakBallVY = Math.abs(p.breakBallVY); p.breakBallY = contentTop + 2; }

          const paddleHalfW = paddleW / 2;
          if (
            p.breakBallY >= paddleY - 4 && p.breakBallY <= paddleY + paddleH &&
            p.breakBallX >= p.breakPaddleX - paddleHalfW - 3 &&
            p.breakBallX <= p.breakPaddleX + paddleHalfW + 3
          ) {
            p.breakBallVY = -Math.abs(p.breakBallVY);
            const rel = (p.breakBallX - p.breakPaddleX) / paddleHalfW;
            p.breakBallVX = rel * 2.2;
            p.breakBallY = paddleY - 5;
          }

          if (p.breakBallY > hh) {
            p.breakLives--;
            if (p.breakLives <= 0) {
              p.breakResetTimer = 90;
            } else {
              p.breakBallLaunched = false; p.breakLaunchTimer = 50;
              p.breakBallX = p.breakPaddleX; p.breakBallY = paddleY - 4;
              p.breakBallVX = 1.8 * (Math.random() > 0.5 ? 1 : -1); p.breakBallVY = -1.8;
            }
          }

          for (let row = 0; row < BREAK_ROWS; row++) {
            for (let col = 0; col < BREAK_COLS; col++) {
              if (!p.breakBricks[row]?.[col]) continue;
              const bx = -hw + 7 + col * (brickW + 2 / BREAK_COLS);
              const by = brickAreaTop + row * (brickH + 3);
              const bRight = bx + brickW - 1, bBottom = by + brickH;
              if (
                p.breakBallX >= bx - 3 && p.breakBallX <= bRight + 3 &&
                p.breakBallY >= by - 3 && p.breakBallY <= bBottom + 3
              ) {
                p.breakBricks[row][col] = false;
                p.breakScore++;
                const fromLeft  = Math.abs(p.breakBallX - bx);
                const fromRight = Math.abs(p.breakBallX - bRight);
                const fromTop   = Math.abs(p.breakBallY - by);
                const fromBot   = Math.abs(p.breakBallY - bBottom);
                const minD = Math.min(fromLeft, fromRight, fromTop, fromBot);
                if (minD === fromTop || minD === fromBot) p.breakBallVY *= -1;
                else p.breakBallVX *= -1;
                for (let k = 0; k < 5; k++) {
                  p.breakParticles.push({
                    x: bx + brickW / 2, y: by + brickH / 2,
                    vx: (Math.random() - 0.5) * 3,
                    vy: (Math.random() - 0.5) * 3,
                    life: 0.9 + Math.random() * 0.1,
                  });
                }
              }
            }
          }

          p.breakParticles = p.breakParticles.filter(pt => {
            pt.x += pt.vx; pt.y += pt.vy; pt.life -= 0.05; return pt.life > 0;
          });

          if (!p.breakBricks.some(row => row.some(Boolean))) {
            p.breakBricks = makeBreakGrid();
            p.breakBallLaunched = false; p.breakLaunchTimer = 50;
            p.breakBallX = p.breakPaddleX; p.breakBallY = paddleY - 4;
            p.breakBallVX = (p.breakBallVX > 0 ? 1 : -1) * Math.min(2.5, 1.8 + p.breakScore * 0.02);
            p.breakBallVY = -Math.abs(p.breakBallVX) * 0.9;
          }
        }

        // ── Panel 3: Missile Command ────────────────────────────────────────
        if (i === 3) {
          const hw = p.w / 2, hh = p.h / 2;
          const contentTop = -hh + 14;
          const cityY = hh - 22;
          const cityXs = [-hw * 0.50, 0, hw * 0.50];

          if (p.mcGameOverTimer > 0) {
            p.mcGameOverTimer--;
            if (p.mcGameOverTimer === 0) {
              p.mcCities = [true, true, true];
              p.mcMissiles = []; p.mcInterceptors = [];
              p.mcWave = 1; p.mcSpawnTimer = 150;
            }
            return;
          }

          p.mcSpawnTimer--;
          if (p.mcSpawnTimer <= 0) {
            const alive = p.mcCities.map((c, ci) => c ? ci : -1).filter(x => x >= 0);
            if (alive.length > 0) {
              const tIdx = alive[Math.floor(Math.random() * alive.length)];
              const sx = lerp(-hw + 8, hw - 8, Math.random());
              const sy = contentTop + 2;
              const tx = cityXs[tIdx] + (Math.random() - 0.5) * 10;
              p.mcMissiles.push({
                sx, sy, tx, ty: cityY,
                x: sx, y: sy, progress: 0,
                speed: 0.003 + p.mcWave * 0.001 + Math.random() * 0.002,
              });
            }
            const maxM = 2 + p.mcWave;
            p.mcSpawnTimer = Math.max(60, Math.floor(150 - p.mcWave * 15));
            if (p.mcMissiles.length >= maxM) p.mcSpawnTimer += 60;
          }

          p.mcMissiles = p.mcMissiles.filter(m => {
            m.progress = Math.min(1, m.progress + m.speed);
            m.x = lerp(m.sx, m.tx, m.progress);
            m.y = lerp(m.sy, m.ty, m.progress);
            if (m.progress >= 1) {
              const ni = cityXs.reduce((best, cx_, ci) =>
                Math.abs(m.tx - cx_) < Math.abs(m.tx - cityXs[best]) ? ci : best, 0);
              if (p.mcCities[ni]) {
                p.mcCities[ni] = false;
                if (p.mcCities.every(c => !c)) p.mcGameOverTimer = 180;
              }
              return false;
            }
            return true;
          });

          // Player fire on click
          if (p.isActive && mouse.clicked) {
            const targetX = clamp((mouse.x - p.cx) / p.scaleX, -hw + 4, hw - 4);
            const targetY = clamp(mouse.y - p.cy, contentTop + 2, cityY - 10);
            p.mcInterceptors.push({
              lx: 0, ly: cityY - 5, tx: targetX, ty: targetY,
              x: 0, y: cityY - 5, progress: 0,
              exploding: false, explodeRadius: 0,
              maxExplodeRadius: 20 + Math.random() * 6,
              lingerTimer: 0,
            });
          }

          // AI auto-fire
          p.mcAutoFireTimer--;
          if (p.mcAutoFireTimer <= 0 && p.mcMissiles.length > 0) {
            const target = p.mcMissiles.reduce((a, b) => a.progress > b.progress ? a : b);
            p.mcInterceptors.push({
              lx: 0, ly: cityY - 5, tx: target.x, ty: target.y,
              x: 0, y: cityY - 5, progress: 0,
              exploding: false, explodeRadius: 0,
              maxExplodeRadius: 18,
              lingerTimer: 0,
            });
            p.mcAutoFireTimer = Math.floor(90 + Math.random() * 60);
          }

          // Update interceptors
          p.mcInterceptors = p.mcInterceptors.filter(ic => {
            if (!ic.exploding) {
              // In flight
              ic.progress = Math.min(1, ic.progress + 0.05);
              ic.x = lerp(ic.lx, ic.tx, ic.progress);
              ic.y = lerp(ic.ly, ic.ty, ic.progress);
              if (ic.progress >= 1) {
                ic.exploding = true;
                // Snap to exactly full size immediately, then linger
                ic.explodeRadius = ic.maxExplodeRadius;
                ic.lingerTimer = 90; // 1.5 seconds at 60fps
              }
            } else if (ic.lingerTimer > 0) {
              // Linger phase — cloud sits at full radius, killing missiles
              ic.lingerTimer--;
              p.mcMissiles = p.mcMissiles.filter(m => {
                if (dist2(m.x, m.y, ic.x, ic.y) <= ic.explodeRadius) {
                  p.mcScore++;
                  if (p.mcScore % 5 === 0) p.mcWave = Math.min(p.mcWave + 1, 8);
                  return false;
                }
                return true;
              });
              if (ic.lingerTimer <= 0) return false; // done
            } else {
              return false;
            }
            return true;
          });
        }

        // ── Panel 4: Pong ───────────────────────────────────────────────────
        if (i === 4) {
          const hw = p.w / 2, hh = p.h / 2;
          const paddleH = 11, paddleX = hw - 7;
          const wallB = hh - 16;

          p.pongPaddleR = lerp(p.pongPaddleR, p.pongBallY, 0.045);
          if (p.isActive) {
            p.pongPaddleL = clamp(mouse.y - p.cy, -hh + paddleH, hh - paddleH);
          } else {
            p.pongPaddleL = lerp(p.pongPaddleL, p.pongBallY, 0.038);
          }
          p.pongPaddleL = clamp(p.pongPaddleL, -hh + paddleH, hh - paddleH);
          p.pongPaddleR = clamp(p.pongPaddleR, -hh + paddleH, hh - paddleH);

          p.pongBallX += p.pongBallVX * p.pongSpeed;
          p.pongBallY += p.pongBallVY * p.pongSpeed;

          if (p.pongBallY <= -(wallB - 2) || p.pongBallY >= wallB - 2) {
            p.pongBallVY *= -1;
            p.pongBallY = clamp(p.pongBallY, -(wallB - 2), wallB - 2);
          }

          if (p.pongBallX <= -paddleX + 4 && p.pongBallX > -paddleX &&
              Math.abs(p.pongBallY - p.pongPaddleL) < paddleH) {
            p.pongBallVX = Math.abs(p.pongBallVX);
            p.pongBallVY += (p.pongBallY - p.pongPaddleL) * 0.08;
            p.pongSpeed = Math.min(p.pongSpeed + 0.04, 2.0);
          }
          if (p.pongBallX >= paddleX - 4 && p.pongBallX < paddleX &&
              Math.abs(p.pongBallY - p.pongPaddleR) < paddleH) {
            p.pongBallVX = -Math.abs(p.pongBallVX);
            p.pongBallVY += (p.pongBallY - p.pongPaddleR) * 0.08;
            p.pongSpeed = Math.min(p.pongSpeed + 0.04, 2.0);
          }

          if (p.pongBallX < -hw || p.pongBallX > hw) {
            if (p.pongBallX > hw) p.pongScoreL++;
            else p.pongScoreR++;
            p.pongBallX = 0; p.pongBallY = 0;
            p.pongBallVX = 1.3 * (p.pongBallVX > 0 ? -1 : 1);
            p.pongBallVY = (Math.random() * 0.5 + 0.2) * (Math.random() > 0.5 ? 1 : -1);
            p.pongSpeed = 1.0;
          }
        }

        if (p.isActive && !p.wasActive) {
          const startR = Math.max(p.w, p.h) / 2;
          p.pulseRings.push({ age: 0, startR, maxR: startR * 1.5 });
        }
        p.pulseRings = p.pulseRings.filter(r => r.age < 0.6);
        p.pulseRings.forEach(r => { r.age += DT; });
      });

      mouse.clicked = false;

      state.particles.forEach((p) => {
        const md = dist2(mouse.x, mouse.y, p.x, p.y);
        if (md < 160 && md > 1) {
          const f = (1 - md / 160) * 0.022;
          p.vx += ((mouse.x - p.x) / md) * f;
          p.vy += ((mouse.y - p.y) / md) * f;
        }
        const spd = Math.sqrt(p.vx ** 2 + p.vy ** 2);
        if (spd > 0.9) { p.vx = (p.vx / spd) * 0.9; p.vy = (p.vy / spd) * 0.9; }
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        const H = canvas?.height ?? 1080;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      });
    }

    function draw() {
      if (!canvas || !ctx) return;
      const W = canvas.width, H = canvas.height;

      ctx.clearRect(0, 0, W, H);
      drawAmberGlowOverlay(ctx, W, H);
      state.panels.forEach(p => drawPanelDeskGlow(ctx, p, H));

      ctx.fillStyle = "rgba(59, 130, 246, 0.38)";
      state.particles.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      });

      state.panels.forEach((p, i) => {
        if (p.bootAge < 0) return;
        if (p.bootAge < 0.6) {
          const bootFlicker = Math.random() > 0.45 ? Math.random() * 0.9 : 0;
          ctx.globalAlpha = bootFlicker;
          drawPanelFrame(ctx, p);
          ctx.globalAlpha = 1;
          return;
        }
        ctx.globalAlpha = p.flickerMult;
        drawPanelFrame(ctx, p);
        DRAW_FNS[i]?.(ctx, p);
        drawProgressBars(ctx, p, true);
        ctx.globalAlpha = 1;
      });

      drawPulseRings(ctx, state.panels);
    }

    function loop() { update(); draw(); raf = requestAnimationFrame(loop); }

    function onMouseMove(e: MouseEvent) { mouse.x = e.clientX; mouse.y = e.clientY; }
    function onMouseClick() { mouse.clicked = true; }
    function onResize() { init(); }

    init();
    loop();
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("click", onMouseClick);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("click", onMouseClick);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0, left: 0,
        width: "100vw", height: "100vh",
        zIndex: -1,
        pointerEvents: "none",
        display: "block",
      }}
    />
  );
}
