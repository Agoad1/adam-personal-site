"use client";

import { useEffect, useRef } from "react";

// ─── Utilities ────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function dist2(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}



// ─── Workflow topology (fixed layout, module-level) ───────────────────────────

const WF_NODES = [
  { nx: -0.72, ny: -0.45, label: "TRIGGER" },
  { nx: -0.14, ny: -0.45, label: "FILTER" },
  { nx:  0.44, ny: -0.45, label: "TRANSFORM" },
  { nx:  0.44, ny:  0.18, label: "API CALL" },
  { nx: -0.14, ny:  0.52, label: "STORE" },
];
const WF_EDGES: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [1, 4]];

// ─── ECG waveform helpers ─────────────────────────────────────────────────────

function ecgGaussian(x: number, mu: number, sigma: number): number {
  return Math.exp(-0.5 * ((x - mu) / sigma) ** 2);
}
function ecgSample(phase: number): number {
  // PQRST waveform — one heartbeat cycle over phase 0→1
  const p =  ecgGaussian(phase, 0.10, 0.025) * 0.15;
  const q = -ecgGaussian(phase, 0.18, 0.008) * 0.08;
  const r =  ecgGaussian(phase, 0.20, 0.012) * 1.0;
  const s = -ecgGaussian(phase, 0.23, 0.009) * 0.25;
  const t =  ecgGaussian(phase, 0.35, 0.040) * 0.30;
  return p + q + r + s + t;
}

// ─── Panel state ──────────────────────────────────────────────────────────────

interface PulseRing { age: number; startR: number; maxR: number; }

interface PanelState {
  // geometry
  cx: number; cy: number; w: number; h: number;
  // mouse
  isActive: boolean; wasActive: boolean;
  activePct: number; // 0→1 smooth
  pulseRings: PulseRing[];
  // widget state (varies by panel index)
  angle: number;        // generic rotation angle
  angle2: number;       // secondary rotation
  pulsePhase: number;   // generic sine phase
  // shared progress bars
  progFill: number; progFill2: number;
  skewY: number; scaleX: number;
  // boot sequence & flicker
  bootAge: number;      // seconds; starts negative (delay), counts to 0.6 = fully booted
  flickerMult: number;  // 1 normally, briefly drops near 0 during rare idle flicker
  flickerTimer: number; // countdown frames to next idle flicker
  // panel 0 — radar sweep
  radarAngle: number;
  radarContacts: { a: number; d: number; lit: number }[];
  // panel 1 — ECG vitals
  ecgBuffer: number[];
  ecgWriteIdx: number;
  ecgPhase: number;
  bpm: number;
  o2: number;
  // panel 2 — workflow nodes (packets; topology is module-level)
  wfPackets: { edge: number; t: number; speed: number }[];
  // panel 3 — gear + bars
  bars: number[]; barTargets: number[];
  // panel 4 — pong
  pongBallX: number; pongBallY: number;
  pongBallVX: number; pongBallVY: number;
  pongPaddleL: number; pongPaddleR: number;
  pongScoreL: number; pongScoreR: number;
  pongSpeed: number;
}

function makePanelState(cx: number, cy: number, w: number, h: number, skewY: number, scaleX: number): PanelState {
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
    // panel 0 — radar
    radarAngle: Math.random() * Math.PI * 2,
    radarContacts: Array.from({ length: 7 }, () => ({
      a: Math.random() * Math.PI * 2,
      d: 0.25 + Math.random() * 0.65,
      lit: 0,
    })),
    // panel 1 — ECG
    ecgBuffer: new Array(200).fill(0) as number[],
    ecgWriteIdx: 0,
    ecgPhase: Math.random(),
    bpm: 62 + Math.floor(Math.random() * 14),
    o2: 96 + Math.floor(Math.random() * 4),
    // panel 2 — workflow
    wfPackets: Array.from({ length: 6 }, () => ({
      edge: Math.floor(Math.random() * 5),
      t: Math.random(),
      speed: 0.003 + Math.random() * 0.004,
    })),
    // panel 3 — gear + bars
    bars: [0.72, 0.45, 0.88, 0.33, 0.61, 0.78, 0.50, 0.66],
    barTargets: [0.72, 0.45, 0.88, 0.33, 0.61, 0.78, 0.50, 0.66],
    // panel 4 — pong
    pongBallX: 0, pongBallY: 0,
    pongBallVX: 1.3 * (Math.random() > 0.5 ? 1 : -1),
    pongBallVY: 0.8 * (Math.random() > 0.5 ? 1 : -1),
    pongPaddleL: 0, pongPaddleR: 0,
    pongScoreL: 0, pongScoreR: 0,
    pongSpeed: 1.0,
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

// ─── Panel layout (proportional so it scales with canvas size) ────────────────

function computePanelGeometry(W: number, H: number) {
  // Positions derived from the reference image (2752x1536).
  // Image aspect ratio ~1.79:1. With object-fit:cover these % map directly
  // at standard 16:9 viewports and stay close at other ratios.
  //
  // Panel centers (% of image):
  //   P1 Blueprint:  x≈12.5%  y≈36%
  //   P2 Terminal:   x≈29%    y≈36%
  // Symmetrical placement across the desk, following a gentle curve downwards at the edges
  const xPcts  = [0.180, 0.340, 0.500, 0.660, 0.820];
  const yPcts  = [0.460, 0.420, 0.400, 0.420, 0.460];

  // Panel widths
  const wPcts  = [0.150, 0.150, 0.150, 0.150, 0.150];
  const wPx    = wPcts.map(f => clamp(f * W, 150, 310));
  const hPx    = wPx.map(w => w * 0.70);
  const skewYs = [-0.10, -0.04, 0, 0.04, 0.10];
  const scaleXs = [0.86, 0.95, 1, 0.95, 0.86];

  return xPcts.map((xf, i) => ({
    cx: xf * W,
    cy: yPcts[i] * H,
    w: wPx[i],
    h: hPx[i],
    skewY: skewYs[i],
    scaleX: scaleXs[i],
  }));
}

// ─── Draw: amber glow overlay (animated shimmer over real desk LED in photo) ──

function drawAmberGlowOverlay(ctx: CanvasRenderingContext2D, W: number, H: number) {
  // The real amber LED strip sits at ~57% down the image.
  // We overlay an animated glow on top to make it feel alive.
  const stripY = H * 0.57;
  const stripRX = W * 0.50;
  const stripRY = H * 0.028;
  const cx = W / 2;

  // Soft warm bloom beneath the strip
  const warmGrad = ctx.createRadialGradient(cx, stripY + 10, 0, cx, stripY + 10, W * 0.48);
  warmGrad.addColorStop(0, "rgba(255, 160, 40, 0.07)");
  warmGrad.addColorStop(0.5, "rgba(255, 140, 20, 0.03)");
  warmGrad.addColorStop(1, "rgba(255, 140, 20, 0)");
  ctx.fillStyle = warmGrad;
  ctx.fillRect(0, stripY - 20, W, H - stripY + 40);

  // Animated glow arc on top of the real strip
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, stripY, stripRX, stripRY, 0, Math.PI * 0.08, Math.PI * 0.92);
  ctx.strokeStyle = "rgba(255, 185, 70, 0.35)";
  ctx.lineWidth = 4;
  ctx.shadowColor = "rgba(255, 160, 40, 0.7)";
  ctx.shadowBlur = 22;
  ctx.stroke();
  ctx.restore();
}

// ─── Draw: panel glow on desk ─────────────────────────────────────────────────

function drawPanelDeskGlow(ctx: CanvasRenderingContext2D, p: PanelState, H: number) {
  const bottom = p.cy + p.h / 2;
  const glowH = H * 0.28;
  const alpha = lerp(0.04, 0.09, p.activePct);
  const grad = ctx.createLinearGradient(0, bottom, 0, bottom + glowH);
  grad.addColorStop(0, `rgba(6, 182, 212, ${alpha})`);
  grad.addColorStop(1, "rgba(6, 182, 212, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(p.cx - p.w * 0.65, bottom, p.w * 1.3, glowH);

  // Panel outer bloom
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

  // Holographic fill — very light cyan tint, nearly transparent
  const innerGlow = ctx.createLinearGradient(0, -hh, 0, hh);
  innerGlow.addColorStop(0,   "rgba(6, 182, 212, 0.07)");
  innerGlow.addColorStop(0.4, "rgba(6, 182, 212, 0.03)");
  innerGlow.addColorStop(1,   "rgba(6, 182, 212, 0.01)");
  ctx.fillStyle = innerGlow;
  ctx.fillRect(-hw, -hh, w, h);

  // Scanlines — subtle horizontal bands across the panel interior
  ctx.save();
  ctx.beginPath(); ctx.rect(-hw, -hh, w, h); ctx.clip();
  ctx.fillStyle = "rgba(0, 0, 0, 0.045)";
  for (let sy = -hh; sy < hh; sy += 3) {
    ctx.fillRect(-hw, sy, w, 1);
  }
  ctx.restore();

  // Border with cyan glow
  ctx.shadowColor = "rgba(6, 182, 212, 0.85)";
  ctx.shadowBlur = lerp(8, 24, activePct);
  ctx.strokeStyle = `rgba(6, 182, 212, ${borderAlpha})`;
  ctx.lineWidth = 1;
  ctx.strokeRect(-hw, -hh, w, h);

  // Corner accent L-marks (12px) — brighter than border, own glow
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

// ─── Draw: shared progress bars (bottom of panel) ────────────────────────────

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
  const y1 = hh - 8;
  const y2 = hh - 14;
  // track
  ctx.fillStyle = `rgba(59, 130, 246, 0.15)`;
  ctx.fillRect(-hw + 8, y2 - 2, barW, 2);
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha})`;
  ctx.fillRect(-hw + 8, y2 - 2, barW * progFill2, 2);
  if (twoRows) {
    ctx.fillStyle = `rgba(59, 130, 246, 0.15)`;
    ctx.fillRect(-hw + 8, y1 - 2, barW, 2);
    ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.75})`;
    ctx.fillRect(-hw + 8, y1 - 2, barW * progFill, 2);
  }
  ctx.restore();
}

// ─── Panel 0: Sector Radar Sweep ─────────────────────────────────────────────

function drawRadarPanel(ctx: CanvasRenderingContext2D, p: PanelState) {
  const { cx, cy, w, h, activePct, radarAngle, radarContacts } = p;
  const hw = w / 2, hh = h / 2;
  const sc = 1 + 0.04 * activePct;
  const alpha = lerp(0.7, 1.0, activePct);
  const maxR = Math.min(hw, hh) * 0.82;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.transform(p.scaleX, p.skewY, 0, 1, 0, 0);
  ctx.scale(sc, sc);
  ctx.beginPath(); ctx.rect(-hw, -hh, w, h); ctx.clip();

  // Title
  ctx.font = "bold 7px monospace";
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.85})`;
  ctx.fillText("SECTOR SCAN", -hw + 7, -hh + 10);

  // Translate to center for polar drawing
  ctx.save();
  ctx.translate(0, 2);

  // Range rings
  for (let r = 1; r <= 4; r++) {
    ctx.beginPath();
    ctx.arc(0, 0, maxR * (r / 4), 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.18})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Crosshair lines (N/S/E/W)
  ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.15})`;
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * maxR, Math.sin(a) * maxR);
    ctx.stroke();
  }

  // Sweep afterglow trail (8 steps behind the beam)
  for (let step = 8; step >= 0; step--) {
    const trailAngle = radarAngle - step * 0.08;
    const trailAlpha = alpha * (1 - step / 9) * 0.18;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, maxR, trailAngle - 0.16, trailAngle, false);
    ctx.closePath();
    ctx.fillStyle = `rgba(6, 182, 212, ${trailAlpha})`;
    ctx.fill();
  }

  // Main sweep beam (bright pie slice)
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, maxR, radarAngle - 0.16, radarAngle, false);
  ctx.closePath();
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.28})`;
  ctx.fill();
  // Bright leading edge
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(radarAngle) * maxR, Math.sin(radarAngle) * maxR);
  ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.7})`;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Contact blips
  radarContacts.forEach((c) => {
    if (c.lit <= 0.01) return;
    const bx = Math.cos(c.a) * c.d * maxR;
    const by = Math.sin(c.a) * c.d * maxR;
    ctx.save();
    ctx.shadowColor = "rgba(6, 182, 212, 0.9)";
    ctx.shadowBlur = c.lit > 0.5 ? 8 : 3;
    ctx.beginPath();
    ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(6, 182, 212, ${alpha * c.lit})`;
    ctx.fill();
    ctx.restore();
  });

  // Center dot
  ctx.beginPath();
  ctx.arc(0, 0, 2, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.7})`;
  ctx.fill();

  ctx.restore(); // polar translate

  // Coords label bottom-right
  ctx.font = "6px monospace";
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.45})`;
  ctx.textAlign = "right";
  ctx.fillText("N 047° E", hw - 6, hh - 6);
  ctx.textAlign = "left";

  ctx.restore();
}

// ─── Panel 1: ECG Vitals Monitor ─────────────────────────────────────────────

function drawEcgPanel(ctx: CanvasRenderingContext2D, p: PanelState) {
  const { cx, cy, w, h, activePct, ecgBuffer, ecgWriteIdx, bpm, o2 } = p;
  const hw = w / 2, hh = h / 2;
  const sc = 1 + 0.04 * activePct;
  const alpha = lerp(0.7, 1.0, activePct);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.transform(p.scaleX, p.skewY, 0, 1, 0, 0);
  ctx.scale(sc, sc);
  ctx.beginPath(); ctx.rect(-hw, -hh, w, h); ctx.clip();

  // Title
  ctx.font = "bold 7px monospace";
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.85})`;
  ctx.fillText("VITALS MONITOR", -hw + 7, -hh + 10);

  const splitX = hw * 0.30;   // readout column occupies right 30%
  const waveW = hw + splitX - 4;  // waveform area width
  const waveLeft = -hw + 4;
  const waveTop = -hh + 14;
  const waveH = h - 24;

  // Grid lines (4 horizontal dotted)
  ctx.save();
  ctx.setLineDash([2, 4]);
  ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.1})`;
  ctx.lineWidth = 0.5;
  for (let g = 1; g <= 3; g++) {
    const gy = waveTop + waveH * (g / 4);
    ctx.beginPath();
    ctx.moveTo(waveLeft, gy);
    ctx.lineTo(waveLeft + waveW, gy);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();

  // ECG waveform — ring buffer read from ecgWriteIdx backwards
  const bufLen = ecgBuffer.length;
  const waveAmpl = waveH * 0.38;
  const midY = waveTop + waveH * 0.5;

  // Draw glow pass (blurry, dim) then sharp pass
  for (let pass = 0; pass < 2; pass++) {
    ctx.save();
    if (pass === 0) {
      ctx.shadowColor = "rgba(6, 182, 212, 0.7)";
      ctx.shadowBlur = 6;
      ctx.globalAlpha *= 0.5;
    }
    ctx.beginPath();
    for (let i = 0; i < bufLen; i++) {
      const bufIdx = ((ecgWriteIdx - bufLen + i) + bufLen * 2) % bufLen;
      const x = waveLeft + (i / (bufLen - 1)) * waveW;
      const y = midY - ecgBuffer[bufIdx] * waveAmpl;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * (pass === 0 ? 0.5 : 0.9)})`;
    ctx.lineWidth = pass === 0 ? 2 : 1.2;
    ctx.stroke();
    ctx.restore();
  }

  // Bright dot at latest sample (right edge)
  const latestY = midY - (ecgBuffer[(ecgWriteIdx - 1 + bufLen) % bufLen]) * waveAmpl;
  ctx.save();
  ctx.shadowColor = "rgba(6, 182, 212, 1)";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(waveLeft + waveW, latestY, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha})`;
  ctx.fill();
  ctx.restore();

  // Divider
  ctx.beginPath();
  ctx.moveTo(splitX + 2, -hh + 6);
  ctx.lineTo(splitX + 2, hh - 6);
  ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.2})`;
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Readout column
  const readX = splitX + 8;
  const entries = [
    { value: String(bpm), label: "BPM", big: true },
    { value: `${o2}%`, label: "O\u2082 SAT", big: false },
    { value: "98.2°", label: "TEMP F", big: false },
  ];
  let ry = -hh + 22;
  entries.forEach(({ value, label, big }) => {
    ctx.font = `bold ${big ? 13 : 10}px monospace`;
    ctx.fillStyle = `rgba(6, 182, 212, ${alpha})`;
    ctx.textAlign = "left";
    ctx.fillText(value, readX, ry);
    ry += big ? 11 : 9;
    ctx.font = "5px monospace";
    ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.55})`;
    ctx.fillText(label, readX, ry);
    ry += big ? 16 : 14;
  });
  ctx.textAlign = "left";

  ctx.restore();
}

// ─── Panel 2: Workflow / Automation Nodes ────────────────────────────────────

function drawWorkflowPanel(ctx: CanvasRenderingContext2D, p: PanelState) {
  const { cx, cy, w, h, activePct, wfPackets } = p;
  const hw = w / 2, hh = h / 2;
  const sc = 1 + 0.04 * activePct;
  const alpha = lerp(0.7, 1.0, activePct);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.transform(p.scaleX, p.skewY, 0, 1, 0, 0);
  ctx.scale(sc, sc);
  ctx.beginPath(); ctx.rect(-hw, -hh, w, h); ctx.clip();

  // Title
  ctx.font = "bold 7px monospace";
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.85})`;
  ctx.fillText("AUTOMATION", -hw + 7, -hh + 10);

  // Resolve node pixel positions
  const nodeW = 34, nodeH = 12;
  const nodes = WF_NODES.map(n => ({
    x: n.nx * hw,
    y: n.ny * hh,
    label: n.label,
  }));

  // Draw edges
  WF_EDGES.forEach(([a, b]) => {
    const na = nodes[a], nb = nodes[b];
    ctx.beginPath();
    ctx.moveTo(na.x, na.y);
    ctx.lineTo(nb.x, nb.y);
    ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.22})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Arrowhead at destination
    const dx = nb.x - na.x, dy = nb.y - na.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / len, uy = dy / len;
    const ax = nb.x - ux * (nodeW / 2 + 3);
    const ay = nb.y - uy * (nodeH / 2 + 3);
    const px = -uy, py = ux;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax - ux * 5 + px * 3, ay - uy * 5 + py * 3);
    ctx.lineTo(ax - ux * 5 - px * 3, ay - uy * 5 - py * 3);
    ctx.closePath();
    ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.35})`;
    ctx.fill();
  });

  // Draw data packets
  ctx.save();
  ctx.shadowColor = "rgba(6, 182, 212, 0.9)";
  ctx.shadowBlur = 8;
  wfPackets.forEach(pk => {
    const [a, b] = WF_EDGES[pk.edge] ?? [0, 1];
    const na = nodes[a], nb = nodes[b];
    const pkx = lerp(na.x, nb.x, pk.t);
    const pky = lerp(na.y, nb.y, pk.t);
    ctx.beginPath();
    ctx.arc(pkx, pky, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.95})`;
    ctx.fill();
  });
  ctx.restore();

  // Draw nodes on top
  nodes.forEach(n => {
    const nx = n.x - nodeW / 2, ny = n.y - nodeH / 2;
    // Rounded rect fill
    const r = 2;
    ctx.beginPath();
    ctx.moveTo(nx + r, ny);
    ctx.lineTo(nx + nodeW - r, ny);
    ctx.arcTo(nx + nodeW, ny, nx + nodeW, ny + r, r);
    ctx.lineTo(nx + nodeW, ny + nodeH - r);
    ctx.arcTo(nx + nodeW, ny + nodeH, nx + nodeW - r, ny + nodeH, r);
    ctx.lineTo(nx + r, ny + nodeH);
    ctx.arcTo(nx, ny + nodeH, nx, ny + nodeH - r, r);
    ctx.lineTo(nx, ny + r);
    ctx.arcTo(nx, ny, nx + r, ny, r);
    ctx.closePath();
    ctx.fillStyle = "rgba(4, 12, 35, 0.85)";
    ctx.fill();
    ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.7})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // Label
    ctx.font = "5px monospace";
    ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.9})`;
    ctx.textAlign = "center";
    ctx.fillText(n.label, n.x, n.y + 2);
    ctx.textAlign = "left";
  });

  ctx.restore();
}

// ─── Panel 3: Gear + Bars ─────────────────────────────────────────────────────

function drawGearBarsPanel(ctx: CanvasRenderingContext2D, p: PanelState) {
  const { cx, cy, w, h, angle, angle2, activePct, bars } = p;
  const hw = w / 2, hh = h / 2;
  const sc = 1 + 0.04 * activePct;
  const alpha = lerp(0.7, 1.0, activePct);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.transform(p.scaleX, p.skewY, 0, 1, 0, 0);
  ctx.scale(sc, sc);
  ctx.beginPath(); ctx.rect(-hw, -hh, w, h); ctx.clip();

  // Title
  ctx.font = "bold 7px monospace";
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.85})`;
  ctx.fillText("MK.3 STABILIZER", -hw + 7, -hh + 10);

  // ── Gear (top half) ──
  const gCX = -hw * 0.18;
  const gCY = -hh * 0.22;
  const outerR = Math.min(hw, hh) * 0.46;
  const innerR = outerR * 0.60;
  const coreR  = outerR * 0.28;

  // Outer ring
  ctx.beginPath();
  ctx.arc(gCX, gCY, outerR, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.55})`;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Gear teeth (24)
  ctx.save();
  ctx.translate(gCX, gCY);
  ctx.rotate(angle);
  const teeth = 24;
  for (let ti = 0; ti < teeth; ti++) {
    const a = (ti / teeth) * Math.PI * 2;
    const tH = outerR * 0.12;
    ctx.save();
    ctx.rotate(a);
    ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.5})`;
    ctx.fillRect(-2, -(outerR + tH), 4, tH);
    ctx.restore();
  }
  // Inner ring
  ctx.beginPath();
  ctx.arc(0, 0, innerR, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.4})`;
  ctx.lineWidth = 1;
  ctx.stroke();
  // Spokes
  for (let si = 0; si < 6; si++) {
    const a = (si / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * coreR, Math.sin(a) * coreR);
    ctx.lineTo(Math.cos(a) * innerR, Math.sin(a) * innerR);
    ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.38})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // Core circle
  ctx.beginPath();
  ctx.arc(0, 0, coreR, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.65})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Small gear (bottom-left of big gear)
  const sgX = gCX - outerR * 0.72;
  const sgY = gCY + outerR * 0.60;
  const sgR = outerR * 0.28;
  ctx.save();
  ctx.translate(sgX, sgY);
  ctx.rotate(angle2);
  ctx.beginPath();
  ctx.arc(0, 0, sgR, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.45})`;
  ctx.lineWidth = 1;
  ctx.stroke();
  const sgTeeth = 12;
  for (let ti = 0; ti < sgTeeth; ti++) {
    const a = (ti / sgTeeth) * Math.PI * 2;
    const tH = sgR * 0.22;
    ctx.save();
    ctx.rotate(a);
    ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.42})`;
    ctx.fillRect(-1.2, -(sgR + tH), 2.4, tH);
    ctx.restore();
  }
  ctx.restore();

  // ── Bar chart (right side + bottom) ──
  const barLabels = ["CPU", "NET", "GPU", "I/O", "SYS", "PWR"];
  const chartX = gCX + outerR + 10;
  const chartTop = -hh + 14;
  const chartH = hh * 0.95;
  const chartW = hw - chartX - 4;
  const barCount = barLabels.length;
  const barW = chartW / barCount - 2;

  barLabels.forEach((label, bi) => {
    const val = bars[bi] ?? 0.5;
    const bx = chartX + bi * (barW + 2);
    const bH = chartH * val;
    const by = chartTop + chartH - bH;
    ctx.fillStyle = `rgba(59, 130, 246, 0.12)`;
    ctx.fillRect(bx, chartTop, barW, chartH);
    ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.75})`;
    ctx.fillRect(bx, by, barW, bH);
    ctx.font = "5px monospace";
    ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.5})`;
    ctx.textAlign = "center";
    ctx.fillText(label, bx + barW / 2, chartTop + chartH + 7);
    ctx.textAlign = "left";
  });

  ctx.restore();
}

// ─── Panel 4: Pong ───────────────────────────────────────────────────────────

function drawPongPanel(ctx: CanvasRenderingContext2D, p: PanelState) {
  const {
    cx, cy, w, h, activePct,
    pongBallX, pongBallY, pongPaddleL, pongPaddleR,
    pongScoreL, pongScoreR,
  } = p;
  const hw = w / 2, hh = h / 2;
  // Scale up more than other panels so there's more target area for the paddle
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

  // Title + score
  ctx.font = "bold 7px monospace";
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.75})`;
  ctx.fillText("PONG", -hw + 7, -hh + 10);
  ctx.textAlign = "center";
  ctx.fillText(`${pongScoreL}  ${pongScoreR}`, 0, -hh + 10);
  ctx.textAlign = "left";

  // Center dashed divider
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.18})`;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(0, -wallB);
  ctx.lineTo(0, wallB);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Top / bottom walls
  ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.3})`;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-hw + 4, -wallB); ctx.lineTo(hw - 4, -wallB);
  ctx.moveTo(-hw + 4,  wallB); ctx.lineTo(hw - 4,  wallB);
  ctx.stroke();

  // Left paddle
  ctx.save();
  if (activePct > 0.1) {
    ctx.shadowColor = "rgba(6, 182, 212, 0.9)";
    ctx.shadowBlur = lerp(0, 8, activePct);
  }
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha})`;
  ctx.fillRect(-paddleX - paddleW / 2, pongPaddleL - paddleH / 2, paddleW, paddleH);
  ctx.restore();

  // Right paddle
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.75})`;
  ctx.fillRect(paddleX - paddleW / 2, pongPaddleR - paddleH / 2, paddleW, paddleH);

  // Ball
  ctx.save();
  ctx.shadowColor = "rgba(6, 182, 212, 1)";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(pongBallX, pongBallY, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha})`;
  ctx.fill();
  ctx.restore();

  // Mouse hint when active
  if (activePct > 0.5) {
    ctx.font = "5px monospace";
    ctx.fillStyle = `rgba(6, 182, 212, ${(activePct - 0.5) * 2 * alpha * 0.6})`;
    ctx.textAlign = "center";
    ctx.fillText("← YOUR PADDLE", -hw * 0.45, -hh + 10);
    ctx.textAlign = "left";
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
      ctx.beginPath();
      ctx.arc(p.cx, p.cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(6, 182, 212, ${op})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
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
    const mouse = { x: -9999, y: -9999 };

    // Animation state shared by all panels
    const state = {
      panels: [] as PanelState[],
      particles: [] as Particle[],
    };

    const DRAW_FNS = [
      drawRadarPanel,
      drawEcgPanel,
      drawWorkflowPanel,
      drawGearBarsPanel,
      drawPongPanel,
    ];

    function init() {
      if (!canvas || !ctx) return;
      const W = canvas.width = window.innerWidth;
      const H = canvas.height = window.innerHeight;

      const geom = computePanelGeometry(W, H);
      state.panels = geom.map(({ cx, cy, w, h, skewY, scaleX }, i) => {
        const p = makePanelState(cx, cy, w, h, skewY, scaleX);
        // Stagger boot: panel 0 starts immediately, each subsequent panel 0.22s later
        p.bootAge = -(i * 0.22);
        return p;
      });

      state.particles = Array.from(
        { length: Math.floor(60 + Math.random() * 20) },
        () => makeParticle(W, H)
      );

      // Initial solid fill
      ctx.fillStyle = "#03060f";
      ctx.fillRect(0, 0, W, H);
    }

    function update() {
      if (!canvas) return;
      const W = canvas.width, H = canvas.height;
      const DT = 1 / 60;

      state.panels.forEach((p, i) => {
        p.wasActive = p.isActive;
        const d = dist2(mouse.x, mouse.y, p.cx, p.cy);
        p.isActive = d < (i === 4 ? 300 : 220);
        const tgt = p.isActive ? 1 : 0;
        p.activePct = lerp(p.activePct, tgt, p.isActive ? 0.06 : 0.04);

        const spd = 1 + p.activePct * 1.5; // 1× idle → 2.5× active

        // Boot sequence — advance age every frame
        p.bootAge += DT;

        // Idle flicker — rare, brief opacity drop
        p.flickerTimer -= 1;
        if (p.flickerTimer <= 0) {
          p.flickerMult = 0.08 + Math.random() * 0.15;
          p.flickerTimer = Math.floor(480 + Math.random() * 540); // 8–17s @ 60fps
        }
        // Recover flicker quickly (3–4 frames)
        if (p.flickerMult < 1) {
          p.flickerMult = Math.min(1, p.flickerMult + 0.35);
        }

        // Angles / phase (used by radar, ECG, geo)
        p.angle += 0.006 * spd;
        p.pulsePhase += 0.025 * spd;

        // Progress bars (used by drawProgressBars)
        p.progFill += 0.0018 * spd;
        if (p.progFill > 0.95) p.progFill = 0;
        p.progFill2 += 0.0024 * spd;
        if (p.progFill2 > 0.9) p.progFill2 = 0;

        // Panel 0 — radar sweep + contacts
        if (i === 0) {
          const sweepSpd = lerp(0.015, 0.035, p.activePct);
          p.radarAngle = (p.radarAngle + sweepSpd) % (Math.PI * 2);
          p.radarContacts.forEach(c => {
            const diff = Math.abs(((p.radarAngle - c.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
            if (diff < 0.15) c.lit = 1.0;
            else c.lit = Math.max(0, c.lit - 0.005);
          });
        }

        // Panel 1 — ECG waveform
        if (i === 1) {
          const phaseDelta = (p.bpm / 60 / 60) * lerp(1, 1.3, p.activePct);
          p.ecgPhase = (p.ecgPhase + phaseDelta) % 1.0;
          p.ecgBuffer[p.ecgWriteIdx % p.ecgBuffer.length] = ecgSample(p.ecgPhase);
          p.ecgWriteIdx++;
          if (Math.random() < 0.002) {
            p.bpm = clamp(p.bpm + (Math.random() > 0.5 ? 1 : -1), 58, 76);
          }
        }

        // Panel 2 — workflow packets
        if (i === 2) {
          p.wfPackets.forEach(pk => {
            pk.t += pk.speed * lerp(1, 2.2, p.activePct);
            if (pk.t >= 1) {
              pk.t = 0;
              pk.edge = Math.floor(Math.random() * WF_EDGES.length);
              pk.speed = 0.003 + Math.random() * 0.004;
            }
          });
        }

        // Panel 3 — gear rotation + bars
        if (i === 3) {
          p.angle += 0.006 * spd;
          p.angle2 -= 0.009 * spd;
          p.bars.forEach((v, j) => {
            p.bars[j] = lerp(v, p.barTargets[j], 0.012 * spd);
            if (Math.abs(p.bars[j] - p.barTargets[j]) < 0.01) {
              p.barTargets[j] = 0.15 + Math.random() * 0.82;
            }
          });
        }

        // Panel 4 — pong simulation
        if (i === 4) {
          const hw = p.w / 2, hh = p.h / 2;
          const paddleH = 11;
          const paddleX = hw - 7;
          const wallB = hh - 16;

          // Right paddle AI
          p.pongPaddleR = lerp(p.pongPaddleR, p.pongBallY, 0.045);

          // Left paddle: mouse-driven when active (exact), else AI
          if (p.isActive) {
            p.pongPaddleL = clamp(mouse.y - p.cy, -hh + paddleH, hh - paddleH);
          } else {
            p.pongPaddleL = lerp(p.pongPaddleL, p.pongBallY, 0.038);
          }
          p.pongPaddleL = clamp(p.pongPaddleL, -hh + paddleH, hh - paddleH);
          p.pongPaddleR = clamp(p.pongPaddleR, -hh + paddleH, hh - paddleH);

          // Move ball
          p.pongBallX += p.pongBallVX * p.pongSpeed;
          p.pongBallY += p.pongBallVY * p.pongSpeed;

          // Wall bounce
          if (p.pongBallY <= -(wallB - 2) || p.pongBallY >= wallB - 2) {
            p.pongBallVY *= -1;
            p.pongBallY = clamp(p.pongBallY, -(wallB - 2), wallB - 2);
          }

          // Left paddle collision
          if (p.pongBallX <= -paddleX + 4 && p.pongBallX > -paddleX &&
              Math.abs(p.pongBallY - p.pongPaddleL) < paddleH) {
            p.pongBallVX = Math.abs(p.pongBallVX);
            p.pongBallVY += (p.pongBallY - p.pongPaddleL) * 0.08;
            p.pongSpeed = Math.min(p.pongSpeed + 0.04, 2.0);
          }
          // Right paddle collision
          if (p.pongBallX >= paddleX - 4 && p.pongBallX < paddleX &&
              Math.abs(p.pongBallY - p.pongPaddleR) < paddleH) {
            p.pongBallVX = -Math.abs(p.pongBallVX);
            p.pongBallVY += (p.pongBallY - p.pongPaddleR) * 0.08;
            p.pongSpeed = Math.min(p.pongSpeed + 0.04, 2.0);
          }

          // Score + reset
          if (p.pongBallX < -hw || p.pongBallX > hw) {
            if (p.pongBallX > hw) p.pongScoreL++;
            else p.pongScoreR++;
            p.pongBallX = 0; p.pongBallY = 0;
            p.pongBallVX = 1.3 * (p.pongBallVX > 0 ? -1 : 1);
            p.pongBallVY = (Math.random() * 0.5 + 0.2) * (Math.random() > 0.5 ? 1 : -1);
            p.pongSpeed = 1.0;
          }
        }

        // Pulse ring on cursor entry
        if (p.isActive && !p.wasActive) {
          const startR = Math.max(p.w, p.h) / 2;
          p.pulseRings.push({ age: 0, startR, maxR: startR * 1.5 });
        }
        p.pulseRings = p.pulseRings.filter(r => r.age < 0.6);
        p.pulseRings.forEach(r => { r.age += DT; });
      });

      // Particles
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
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      });
    }

    function draw() {
      if (!canvas || !ctx) return;
      const W = canvas.width, H = canvas.height;

      // 1. Clear canvas so background image stays visible
      ctx.clearRect(0, 0, W, H);

      // 2. Amber LED glow overlay (animated shimmer on top of real desk LED)
      drawAmberGlowOverlay(ctx, W, H);

      // 3. Panel desk glows
      state.panels.forEach(p => drawPanelDeskGlow(ctx, p, H));

      // 4. Particles
      ctx.fillStyle = "rgba(59, 130, 246, 0.38)";
      state.particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Panel frames + content (with boot flicker and idle flicker)
      state.panels.forEach((p, i) => {
        // Not booted yet — skip entirely
        if (p.bootAge < 0) return;

        // Booting (0 → 0.6s) — flicker the border only
        if (p.bootAge < 0.6) {
          const bootFlicker = Math.random() > 0.45 ? Math.random() * 0.9 : 0;
          ctx.globalAlpha = bootFlicker;
          drawPanelFrame(ctx, p);
          ctx.globalAlpha = 1;
          return;
        }

        // Fully booted — apply idle flicker multiplier
        ctx.globalAlpha = p.flickerMult;
        drawPanelFrame(ctx, p);
        DRAW_FNS[i]?.(ctx, p);
        drawProgressBars(ctx, p, true);
        ctx.globalAlpha = 1;
      });

      // 6. Pulse rings
      drawPulseRings(ctx, state.panels);
    }

    function loop() {
      update();
      draw();
      raf = requestAnimationFrame(loop);
    }

    function onMouseMove(e: MouseEvent) { mouse.x = e.clientX; mouse.y = e.clientY; }
    function onResize() { init(); }

    init();
    loop();
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -1,
        pointerEvents: "none",
        display: "block",
      }}
    />
  );
}
