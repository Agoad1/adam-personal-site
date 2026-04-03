"use client";

import { useEffect, useRef } from "react";

// ─── Utilities ────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function dist2(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

// ─── Terminal data ─────────────────────────────────────────────────────────────

function hex4() { return Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, "0"); }
function ts() {
  const h = String(Math.floor(Math.random() * 24)).padStart(2, "0");
  const m = String(Math.floor(Math.random() * 60)).padStart(2, "0");
  const s = String(Math.floor(Math.random() * 60)).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

const TERMINAL_LINES = [
  () => `${ts()} >> SYS ${hex4()} PROC`,
  () => `${ts()} >> NODE [${Math.floor(Math.random() * 99)}] OK`,
  () => `${ts()} >> DATA ${hex4()} RX`,
  () => `${ts()} >> SYNC ${Math.random().toFixed(6)}`,
  () => `${ts()} >> PKT ${hex4()} ACK`,
  () => `${ts()} >> MEM: ${Math.floor(Math.random() * 100)}%`,
  () => `${ts()} >> ERR 0x${hex4()} CLR`,
  () => `${ts()} >> DELTA ${(Math.random() * 9.99).toFixed(3)}`,
  () => `C:\\> INIT SEQUENCE ${hex4()}`,
  () => `> PING ${hex4()}:${hex4()} TTL=64`,
];

const ALERT_LINES = [
  () => `${ts()} | ALERT: UNIT ${Math.floor(Math.random() * 9) + 1} OFFLINE`,
  () => `${ts()} | INFO: SYNC COMPLETE`,
  () => `${ts()} | WARN: LATENCY ${Math.floor(Math.random() * 200) + 10}ms`,
  () => `${ts()} | ALERT: NODE FAIL ${hex4()}`,
  () => `${ts()} | OK: HANDSHAKE ${hex4()}`,
  () => `${ts()} | INFO: PROC ${Math.floor(Math.random() * 99)}% LOAD`,
  () => `${ts()} | ALERT: MEM THRESHOLD`,
  () => `${ts()} | OK: BACKUP RESTORED`,
];

function genTermLine() { return TERMINAL_LINES[Math.floor(Math.random() * TERMINAL_LINES.length)](); }
function genAlertLine() { return ALERT_LINES[Math.floor(Math.random() * ALERT_LINES.length)](); }

// ─── 3D polyhedron (icosahedron-ish diamond) ──────────────────────────────────

// Vertices of a simple octahedron + elongated tips = diamond-like shape
const GEO_VERTS_BASE: [number, number, number][] = [
  [0, 1.6, 0],     // top
  [0, -1.6, 0],    // bottom
  [1, 0, 0],       // right
  [-1, 0, 0],      // left
  [0, 0, 1],       // front
  [0, 0, -1],      // back
  [0.7, 0.5, 0.7], // upper rf
  [-0.7, 0.5, 0.7],// upper lf
  [0.7, 0.5, -0.7],// upper rb
  [-0.7, 0.5, -0.7],// upper lb
  [0.7, -0.5, 0.7], // lower rf
  [-0.7, -0.5, 0.7],// lower lf
  [0.7, -0.5, -0.7],// lower rb
  [-0.7, -0.5, -0.7],// lower lb
];

const GEO_EDGES: [number, number][] = [
  [0,6],[0,7],[0,8],[0,9],
  [1,10],[1,11],[1,12],[1,13],
  [6,7],[7,8],[8,9],[9,6],  // won't exist — let's connect them properly
  [6,10],[7,11],[8,12],[9,13],
  [10,11],[11,12],[12,13],[13,10],
  [2,6],[2,8],[2,10],[2,12],
  [3,7],[3,9],[3,11],[3,13],
  [4,6],[4,7],[4,10],[4,11],
  [5,8],[5,9],[5,12],[5,13],
];

function rotateY(v: [number, number, number], a: number): [number, number, number] {
  return [v[0] * Math.cos(a) + v[2] * Math.sin(a), v[1], -v[0] * Math.sin(a) + v[2] * Math.cos(a)];
}
function rotateX(v: [number, number, number], a: number): [number, number, number] {
  return [v[0], v[1] * Math.cos(a) - v[2] * Math.sin(a), v[1] * Math.sin(a) + v[2] * Math.cos(a)];
}
function project(v: [number, number, number], fov: number): [number, number] {
  const z = v[2] + 4;
  const scale = fov / z;
  return [v[0] * scale, v[1] * scale];
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
  // panel 2 — terminal
  termBuffer: string[]; termScroll: number;
  // panel 3 — health gauges
  gauge1: number; gauge2: number; latency: number;
  // panel 4 — geo
  geoAngleY: number; geoAngleX: number;
  // panel 5 — bars + alert log
  bars: number[]; barTargets: number[];
  alertBuffer: string[]; alertScroll: number;
  // shared progress bars
  progFill: number; progFill2: number;
  skewY: number; scaleX: number;
}

function makePanelState(cx: number, cy: number, w: number, h: number, skewY: number, scaleX: number): PanelState {
  const TBUF = 30;
  const ABUF = 20;
  return {
    cx, cy, w, h,
    isActive: false, wasActive: false, activePct: 0,
    pulseRings: [],
    angle: Math.random() * Math.PI * 2,
    angle2: Math.random() * Math.PI * 2,
    pulsePhase: Math.random() * Math.PI * 2,
    termBuffer: Array.from({ length: TBUF }, genTermLine),
    termScroll: 0,
    gauge1: 0.92, gauge2: 0.92, latency: 12,
    geoAngleY: Math.random() * Math.PI * 2,
    geoAngleX: 0.3,
    bars: [0.72, 0.45, 0.88, 0.33, 0.61, 0.78, 0.50, 0.66],
    barTargets: [0.72, 0.45, 0.88, 0.33, 0.61, 0.78, 0.50, 0.66],
    alertBuffer: Array.from({ length: ABUF }, genAlertLine),
    alertScroll: 0,
    progFill: Math.random() * 0.6,
    progFill2: Math.random() * 0.5,
    skewY, scaleX,
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

  // Fill
  ctx.fillStyle = "rgba(4, 12, 35, 0.75)";
  ctx.fillRect(-hw, -hh, w, h);

  // Border
  ctx.strokeStyle = `rgba(6, 182, 212, ${borderAlpha})`;
  ctx.lineWidth = 1;
  ctx.strokeRect(-hw, -hh, w, h);

  // Corner accent L-marks (12px)
  const cL = 12;
  ctx.strokeStyle = `rgba(6, 182, 212, ${borderAlpha})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-hw + cL, -hh); ctx.lineTo(-hw, -hh); ctx.lineTo(-hw, -hh + cL);
  ctx.moveTo(hw - cL, -hh);  ctx.lineTo(hw, -hh);  ctx.lineTo(hw, -hh + cL);
  ctx.moveTo(-hw + cL, hh);  ctx.lineTo(-hw, hh);  ctx.lineTo(-hw, hh - cL);
  ctx.moveTo(hw - cL, hh);   ctx.lineTo(hw, hh);   ctx.lineTo(hw, hh - cL);
  ctx.stroke();

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

// ─── Panel 1: Dense Code Logs (Replacing Blueprint) ──────────────────────────

function drawCodeLogsPanel(ctx: CanvasRenderingContext2D, p: PanelState) {
  const { cx, cy, w, h, activePct, termBuffer, termScroll, pulsePhase } = p;
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
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.9})`;
  ctx.fillText("SYS.LOG :: KRNL THREAD", -hw + 7, -hh + 12);

  // Line separator
  ctx.beginPath();
  ctx.moveTo(-hw + 7, -hh + 16);
  ctx.lineTo(hw - 7, -hh + 16);
  ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.3})`;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Two columns of continuous logs
  const lh = 9;
  const visLines = Math.floor((h - 26) / lh);
  ctx.font = "6px monospace";

  for (let i = 0; i < visLines + 2; i++) {
    // Left Col
    const idx1 = (Math.floor(termScroll / lh) + i) % termBuffer.length;
    const y1 = -hh + 24 + i * lh - (termScroll % lh);
    if (y1 > -hh + 18 && y1 < hh) {
      ctx.fillStyle = `rgba(6, 182, 212, ${alpha * clamp((y1 - (-hh + 18)) / 20, 0, 0.7)})`;
      ctx.fillText(termBuffer[idx1] ?? "", -hw + 8, y1);
    }
    
    // Right Col
    const idx2 = (Math.floor(termScroll * 1.3 / lh) + i + 7) % termBuffer.length;
    const y2 = -hh + 24 + i * lh - ((termScroll * 1.3) % lh);
    if (y2 > -hh + 18 && y2 < hh) {
      ctx.fillStyle = `rgba(59, 130, 246, ${alpha * clamp((y2 - (-hh + 18)) / 20, 0, 0.7)})`;
      ctx.fillText(termBuffer[idx2] ?? "", 2, y2);
    }
  }

  // Blinking cursor
  if (Math.sin(pulsePhase * 4) > 0) {
    ctx.fillStyle = `rgba(6, 182, 212, ${alpha})`;
    ctx.fillRect(hw - 12, -hh + 7, 4, 7);
  }

  ctx.restore();
}

// ─── Panel 1: Mk.3 STABILIZER Blueprint ──────────────────────────────────────

function drawBlueprintPanel(ctx: CanvasRenderingContext2D, p: PanelState) {
  const { cx, cy, w, h, angle, angle2, activePct } = p;
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
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.9})`;
  ctx.fillText("MK.3 STABILIZER", -hw + 7, -hh + 10);

  // Center gear wheel
  const gCX = 0, gCY = -4;
  const outerR = Math.min(hw, hh) * 0.54;
  const innerR = outerR * 0.58;
  const coreR  = outerR * 0.28;

  // Outer ring
  ctx.beginPath();
  ctx.arc(gCX, gCY, outerR, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.6})`;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Gear teeth (24 teeth)
  const teeth = 24;
  ctx.save();
  ctx.translate(gCX, gCY);
  ctx.rotate(angle);
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const toothH = outerR * 0.12;
    ctx.save();
    ctx.rotate(a);
    ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.55})`;
    ctx.fillRect(-2, -(outerR + toothH), 4, toothH);
    ctx.restore();
  }

  // Middle ring
  ctx.beginPath();
  ctx.arc(0, 0, innerR, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.5})`;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Spokes
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * coreR, Math.sin(a) * coreR);
    ctx.lineTo(Math.cos(a) * innerR, Math.sin(a) * innerR);
    ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.45})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Core circle
  ctx.beginPath();
  ctx.arc(0, 0, coreR, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.7})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Small gear bottom-left
  const sg = { x: -hw + outerR * 0.55, y: hh * 0.45 };
  const sgR = outerR * 0.28;
  ctx.save();
  ctx.translate(sg.x, sg.y);
  ctx.rotate(angle2);
  ctx.beginPath();
  ctx.arc(0, 0, sgR, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.5})`;
  ctx.lineWidth = 1;
  ctx.stroke();
  const sgTeeth = 12;
  for (let i = 0; i < sgTeeth; i++) {
    const a = (i / sgTeeth) * Math.PI * 2;
    const tH = sgR * 0.2;
    ctx.save();
    ctx.rotate(a);
    ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.45})`;
    ctx.fillRect(-1.2, -(sgR + tH), 2.4, tH);
    ctx.restore();
  }
  ctx.restore();

  // Annotation lines (radiating from outer ring)
  ctx.font = "6px monospace";
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.55})`;
  const annotations = [
    { a: -0.5, label: "ROTOR FRAME" },
    { a: 0.8, label: "BEARING" },
    { a: -2.3, label: "SYNC AXIS" },
  ];
  annotations.forEach(({ a, label }) => {
    const x0 = gCX + Math.cos(a) * (outerR + 4);
    const y0 = gCY + Math.sin(a) * (outerR + 4);
    const x1 = gCX + Math.cos(a) * (outerR + 22);
    const y1 = gCY + Math.sin(a) * (outerR + 22);
    ctx.beginPath();
    ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
    ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.35})`;
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.fillText(label, x1 + (Math.cos(a) > 0 ? 2 : -ctx.measureText(label).width - 2), y1 + 3);
  });

  ctx.restore();
}

// ─── Panel 2: Terminal + Radar ────────────────────────────────────────────────

function drawTerminalRadarPanel(ctx: CanvasRenderingContext2D, p: PanelState) {
  const { cx, cy, w, h, angle, pulsePhase, activePct, termBuffer, termScroll } = p;
  const hw = w / 2, hh = h / 2;
  const sc = 1 + 0.04 * activePct;
  const alpha = lerp(0.7, 1.0, activePct);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.transform(p.scaleX, p.skewY, 0, 1, 0, 0);
  ctx.scale(sc, sc);
  ctx.beginPath(); ctx.rect(-hw, -hh, w, h); ctx.clip();

  const splitX = -hw + w * 0.45;

  // ── Left half: terminal text ──
  ctx.save();
  ctx.beginPath(); ctx.rect(-hw, -hh, w * 0.45, h); ctx.clip();
  ctx.font = "7px monospace";
  const lh = 10;
  const visLines = Math.ceil(h / lh) + 2;
  for (let i = 0; i < visLines; i++) {
    const idx = (Math.floor(termScroll / lh) + i) % termBuffer.length;
    const y = -hh + i * lh - (termScroll % lh) + 10;
    ctx.fillStyle = `rgba(6, 182, 212, ${alpha * lerp(0.35, 0.65, i / visLines)})`;
    ctx.fillText(termBuffer[idx], -hw + 4, y);
  }
  ctx.restore();

  // Divider line
  ctx.beginPath();
  ctx.moveTo(splitX, -hh + 6);
  ctx.lineTo(splitX, hh - 6);
  ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.25})`;
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // ── Right half: radar HUD circle ──
  const rCX = splitX + (hw - splitX) / 2 + (hw - splitX) * 0.05;
  const rCY = -4;
  const maxR = Math.min((hw - splitX) * 0.46, hh * 0.72);

  // Outer ring with tick marks
  ctx.save();
  ctx.translate(rCX, rCY);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.arc(0, 0, maxR, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(59, 130, 246, ${alpha * 0.55})`;
  ctx.lineWidth = 1;
  ctx.stroke();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const major = i % 4 === 0;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (maxR - (major ? 6 : 3)), Math.sin(a) * (maxR - (major ? 6 : 3)));
    ctx.lineTo(Math.cos(a) * maxR, Math.sin(a) * maxR);
    ctx.strokeStyle = `rgba(59, 130, 246, ${alpha * (major ? 0.7 : 0.35)})`;
    ctx.lineWidth = major ? 1.5 : 0.7;
    ctx.stroke();
  }
  ctx.restore();

  // Middle ring pulsing
  const midAlpha = lerp(0.3, 0.7, (Math.sin(pulsePhase) + 1) / 2);
  ctx.beginPath();
  ctx.arc(rCX, rCY, maxR * 0.68, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(59, 130, 246, ${alpha * midAlpha})`;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Inner partial arc (counter-clockwise)
  ctx.save();
  ctx.translate(rCX, rCY);
  ctx.rotate(-angle * 1.3);
  ctx.beginPath();
  ctx.arc(0, 0, maxR * 0.4, 0, Math.PI * 1.7);
  ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.6})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Center glow
  const cgGrad = ctx.createRadialGradient(rCX, rCY, 0, rCX, rCY, maxR * 0.22);
  cgGrad.addColorStop(0, `rgba(6, 182, 212, ${alpha * 0.35})`);
  cgGrad.addColorStop(1, "rgba(6, 182, 212, 0)");
  ctx.fillStyle = cgGrad;
  ctx.beginPath();
  ctx.arc(rCX, rCY, maxR * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ─── Panel 3: System Health ───────────────────────────────────────────────────

function drawSystemHealthPanel(ctx: CanvasRenderingContext2D, p: PanelState) {
  const { cx, cy, w, h, activePct, gauge1, gauge2, latency } = p;
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
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.8})`;
  ctx.fillText("SYSTEM HEALTH", -hw + 7, -hh + 11);

  // Two arc gauges side by side
  const gaugeY = -hh * 0.22;
  const gaugeR = Math.min(hw * 0.38, hh * 0.42);
  const g1X = -hw * 0.44;
  const g2X = hw * 0.44;

  function drawGauge(gx: number, val: number) {
    const startA = Math.PI * 0.75;
    const endA = Math.PI * 2.25;
    const fillA = startA + (endA - startA) * val;
    // Track
    ctx.beginPath();
    ctx.arc(gx, gaugeY, gaugeR, startA, endA);
    ctx.strokeStyle = `rgba(59, 130, 246, ${alpha * 0.2})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    // Fill
    ctx.beginPath();
    ctx.arc(gx, gaugeY, gaugeR, startA, fillA);
    ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.9})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    // Label
    ctx.font = `bold ${Math.round(gaugeR * 0.42)}px monospace`;
    ctx.fillStyle = `rgba(6, 182, 212, ${alpha})`;
    ctx.textAlign = "center";
    ctx.fillText(`${Math.round(val * 100)}%`, gx, gaugeY + gaugeR * 0.18);
    ctx.textAlign = "left";
  }

  drawGauge(g1X, gauge1);
  drawGauge(g2X, gauge2);

  // Gauge labels
  ctx.font = "7px monospace";
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.65})`;
  ctx.textAlign = "center";
  ctx.fillText("CPU", g1X, gaugeY + gaugeR + 10);
  ctx.fillText("MEM", g2X, gaugeY + gaugeR + 10);
  ctx.textAlign = "left";

  // Latency line
  const latY = hh * 0.22;
  ctx.font = "8px monospace";
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.75})`;
  ctx.textAlign = "center";
  ctx.fillText(`LATENCY: ${latency}ms`, 0, latY);

  // XJ-09 designation
  ctx.font = "bold 9px monospace";
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.55})`;
  ctx.textAlign = "right";
  ctx.fillText("XJ-09", hw - 7, hh - 18);
  ctx.textAlign = "left";

  ctx.restore();
}

// ─── Panel 4: 3D Geo Visualizer ───────────────────────────────────────────────

function drawGeoPanel(ctx: CanvasRenderingContext2D, p: PanelState) {
  const { cx, cy, w, h, geoAngleY, geoAngleX, activePct } = p;
  const hw = w / 2, hh = h / 2;
  const sc = 1 + 0.04 * activePct;
  const alpha = lerp(0.7, 1.0, activePct);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.transform(p.scaleX, p.skewY, 0, 1, 0, 0);
  ctx.scale(sc, sc);
  ctx.beginPath(); ctx.rect(-hw, -hh, w, h); ctx.clip();

  const fov = Math.min(w, h) * 1.2;
  const scale3d = Math.min(hw, hh) * 0.52;

  // Project all vertices
  const projected = GEO_VERTS_BASE.map((v) => {
    const rv = rotateY(rotateX(v, geoAngleX), geoAngleY);
    const [px, py] = project(rv, fov);
    return { px: px * scale3d, py: py * scale3d, z: rv[2] };
  });

  // Draw edges — back edges dimmer
  GEO_EDGES.forEach(([a, b]) => {
    if (a >= projected.length || b >= projected.length) return;
    const pa = projected[a], pb = projected[b];
    const avgZ = (pa.z + pb.z) / 2;
    const depthAlpha = clamp((avgZ + 2) / 4, 0.15, 1);
    ctx.beginPath();
    ctx.moveTo(pa.px, pa.py);
    ctx.lineTo(pb.px, pb.py);
    ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * depthAlpha * 0.75})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });

  // Vertex glows
  projected.forEach(({ px, py, z }) => {
    const depthAlpha = clamp((z + 2) / 4, 0.2, 1);
    const vGrad = ctx.createRadialGradient(px, py, 0, px, py, 4);
    vGrad.addColorStop(0, `rgba(6, 182, 212, ${alpha * depthAlpha * 0.8})`);
    vGrad.addColorStop(1, "rgba(6, 182, 212, 0)");
    ctx.fillStyle = vGrad;
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // Label
  ctx.font = "bold 9px monospace";
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.55})`;
  ctx.textAlign = "right";
  ctx.fillText("XJ-09", hw - 7, hh - 18);
  ctx.textAlign = "left";

  ctx.restore();
}

// ─── Panel 5: Performance Metrics + Alert Log ─────────────────────────────────

function drawMetricsAlertPanel(ctx: CanvasRenderingContext2D, p: PanelState) {
  const { cx, cy, w, h, activePct, bars, alertBuffer, alertScroll } = p;
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
  ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.8})`;
  ctx.fillText("PERFORMANCE METRICS", -hw + 5, -hh + 11);

  const splitX = -hw + w * 0.32;

  // ── Left: vertical bar chart ──
  const barLabels = ["CPU", "MEM", "NET", "GPU", "I/O", "DSK", "SYS", "PWR"];
  const chartH = h * 0.62;
  const chartTop = -hh + 18;
  const barCount = bars.length;
  const barW = ((splitX - (-hw + 4)) / barCount) - 2;

  bars.forEach((val, i) => {
    const bx = -hw + 4 + i * (barW + 2);
    const bH = chartH * val;
    const by = chartTop + chartH - bH;
    // Bar track
    ctx.fillStyle = `rgba(59, 130, 246, 0.12)`;
    ctx.fillRect(bx, chartTop, barW, chartH);
    // Bar fill
    ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.75})`;
    ctx.fillRect(bx, by, barW, bH);
    // Label
    ctx.font = "5px monospace";
    ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.55})`;
    ctx.textAlign = "center";
    ctx.fillText(barLabels[i] ?? "", bx + barW / 2, chartTop + chartH + 7);
    ctx.textAlign = "left";
  });

  // Divider
  ctx.beginPath();
  ctx.moveTo(splitX + 3, -hh + 6);
  ctx.lineTo(splitX + 3, hh - 6);
  ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.2})`;
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // ── Right: scrolling alert log ──
  ctx.save();
  ctx.beginPath();
  ctx.rect(splitX + 6, -hh + 4, hw - (splitX + 6 - (-hw)), h - 8);
  ctx.clip();

  const lh = 9;
  const logX = splitX + 8;
  const visLines = Math.ceil(h / lh) + 2;
  ctx.font = "6px monospace";

  for (let i = 0; i < visLines; i++) {
    const idx = (Math.floor(alertScroll / lh) + i) % alertBuffer.length;
    const y = -hh + i * lh - (alertScroll % lh) + 10;
    const line = alertBuffer[idx] ?? "";
    const isAlert = line.includes("ALERT");
    ctx.fillStyle = isAlert
      ? `rgba(6, 182, 212, ${alpha * 0.85})`
      : `rgba(6, 182, 212, ${alpha * 0.4})`;
    ctx.fillText(line, logX, y);
  }
  ctx.restore();

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
      drawBlueprintPanel,
      drawTerminalRadarPanel,
      drawSystemHealthPanel,
      drawGeoPanel,
      drawMetricsAlertPanel,
    ];

    function init() {
      if (!canvas || !ctx) return;
      const W = canvas.width = window.innerWidth;
      const H = canvas.height = window.innerHeight;

      const geom = computePanelGeometry(W, H);
      state.panels = geom.map(({ cx, cy, w, h, skewY, scaleX }) => makePanelState(cx, cy, w, h, skewY, scaleX));

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
        p.isActive = d < 220;
        const tgt = p.isActive ? 1 : 0;
        p.activePct = lerp(p.activePct, tgt, p.isActive ? 0.06 : 0.04);

        const spd = 1 + p.activePct * 1.5; // 1× idle → 2.5× active

        // Angles
        p.angle += 0.006 * spd;
        p.angle2 -= 0.009 * spd;
        p.pulsePhase += 0.025 * spd;

        // Terminal scroll
        p.termScroll += 0.5 * spd;
        if (p.termScroll >= p.termBuffer.length * 10) {
          p.termScroll = 0;
          p.termBuffer[Math.floor(Math.random() * p.termBuffer.length)] = genTermLine();
        }

        // Alert scroll
        if (i === 4) {
          p.alertScroll += 0.35 * spd;
          if (p.alertScroll >= p.alertBuffer.length * 9) {
            p.alertScroll = 0;
            p.alertBuffer[Math.floor(Math.random() * p.alertBuffer.length)] = genAlertLine();
          }
        }

        // Geo rotation
        p.geoAngleY += 0.007 * spd;
        p.geoAngleX += 0.002 * spd;

        // Bars
        p.bars.forEach((v, j) => {
          p.bars[j] = lerp(v, p.barTargets[j], 0.008 * spd);
          if (Math.abs(p.bars[j] - p.barTargets[j]) < 0.01) {
            p.barTargets[j] = 0.2 + Math.random() * 0.78;
          }
        });

        // Progress bars
        p.progFill += 0.0018 * spd;
        if (p.progFill > 0.95) p.progFill = 0;
        p.progFill2 += 0.0024 * spd;
        if (p.progFill2 > 0.9) p.progFill2 = 0;

        // Health gauges (slow drift)
        if (i === 2) {
          p.gauge1 = 0.88 + Math.sin(p.pulsePhase * 0.3) * 0.06;
          p.gauge2 = 0.90 + Math.cos(p.pulsePhase * 0.25) * 0.05;
          p.latency = Math.round(10 + Math.abs(Math.sin(p.pulsePhase * 0.4)) * 18);
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
      // drawAmberGlowOverlay(ctx, W, H);

      // 3. Panel desk glows
      state.panels.forEach(p => drawPanelDeskGlow(ctx, p, H));

      // 4. Particles
      ctx.fillStyle = "rgba(59, 130, 246, 0.38)";
      state.particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Panel frames + content
      state.panels.forEach((p, i) => {
        drawPanelFrame(ctx, p);
        DRAW_FNS[i]?.(ctx, p);
        drawProgressBars(ctx, p, true);
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
