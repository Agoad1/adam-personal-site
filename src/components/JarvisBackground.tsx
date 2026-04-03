"use client";

import { useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProgressBar {
  fillPct: number;
  speed: number;
  target: number;
}

interface PulseRing {
  startRadius: number;
  maxRadius: number;
  age: number; // seconds, 0 → 0.6
}

interface Panel {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  zone: "top" | "mid" | "bottom";
  depth: number;
  dataBuffer: string[];
  bufferHead: number;
  scrollOffset: number;
  dataScrollSpeed: number;
  hasHUD: boolean;
  hudRadius: number;
  hudOuterAngle: number;
  hudInnerAngle: number;
  hudPulsePhase: number;
  hudSpeed: number;
  progressBars: ProgressBar[];
  isActive: boolean;
  wasActive: boolean;
  pulseRings: PulseRing[];
  baseOpacity: number;
  currentOpacity: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LINE_HEIGHT = 11;
const BUFFER_SIZE = 20;
const DT = 1 / 60;

// ─── Utilities ────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

function rnd() {
  return Math.random();
}

function hex4() {
  return Math.floor(rnd() * 0xffff)
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");
}

function bin4() {
  return Math.floor(rnd() * 16)
    .toString(2)
    .padStart(4, "0");
}

// ─── Terminal data generators ─────────────────────────────────────────────────

const lineGens: (() => string)[] = [
  () => `0x${hex4()} > PROC`,
  () => `SYS: ${(rnd() * 2).toFixed(3)}ms`,
  () => `NODE [${Math.floor(rnd() * 99)}] OK`,
  () => `DATA ${bin4()} ${bin4()}`,
  () => `${(rnd() * 360).toFixed(1)}° > ${hex4()}`,
  () => `MEM: ${Math.floor(rnd() * 100)}%`,
  () => `PKT ${hex4()} RX`,
  () => `SYNC ${rnd().toFixed(6)}`,
  () => `[${hex4()}] ACK`,
  () => `CORE ${Math.floor(rnd() * 8)}: ACTIVE`,
  () => `ERR 0x${hex4()} CLR`,
  () => `DELTA ${(rnd() * 9.99).toFixed(3)}`,
];

function genLine(): string {
  return lineGens[Math.floor(rnd() * lineGens.length)]();
}

// ─── Panel factory ────────────────────────────────────────────────────────────

function makePanel(
  x: number,
  y: number,
  w: number,
  h: number,
  zone: Panel["zone"],
  depth: number
): Panel {
  const isBottom = zone === "bottom";
  const isMid = zone === "mid";

  // Bottom panels sit on the desk — no drift
  const speed = isBottom ? 0 : lerp(0.02, 0.07, rnd());
  const angle = rnd() * Math.PI * 2;

  const baseOpacity = isBottom
    ? lerp(0.55, 0.7, depth)
    : isMid
    ? lerp(0.25, 0.5, depth)
    : lerp(0.07, 0.22, depth);

  const hudRadius = isBottom ? 26 : 18;

  return {
    x,
    y,
    width: w,
    height: h,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    zone,
    depth,
    dataBuffer: Array.from({ length: BUFFER_SIZE }, genLine),
    bufferHead: 0,
    scrollOffset: rnd() * LINE_HEIGHT,
    dataScrollSpeed: lerp(0.14, 0.48, depth) * (isBottom ? 1.6 : 1),
    hasHUD: !isBottom ? isMid && rnd() > 0.4 : rnd() > 0.4,
    hudRadius,
    hudOuterAngle: rnd() * Math.PI * 2,
    hudInnerAngle: rnd() * Math.PI * 2,
    hudPulsePhase: rnd() * Math.PI * 2,
    hudSpeed: lerp(0.005, 0.015, rnd()),
    progressBars: Array.from({ length: rnd() > 0.45 ? 2 : 1 }, () => ({
      fillPct: rnd() * 0.5,
      speed: lerp(0.001, 0.0038, rnd()),
      target: lerp(0.4, 0.95, rnd()),
    })),
    isActive: false,
    wasActive: false,
    pulseRings: [],
    baseOpacity,
    currentOpacity: baseOpacity,
  };
}

// ─── Scene initialization ─────────────────────────────────────────────────────

function initPanels(W: number, H: number): Panel[] {
  const panels: Panel[] = [];
  const pad = 25;

  // Bottom row: 5-6 panels in a horizontal row across the full width
  const bottomCount = rnd() > 0.5 ? 6 : 5;
  const spacing = (W - 2 * pad) / bottomCount;
  const bTop = H * 0.72;
  const bBot = H * 0.91;
  for (let i = 0; i < bottomCount; i++) {
    const w = lerp(185, 265, rnd());
    const h = lerp(122, 172, rnd());
    const baseX = pad + spacing * i + spacing / 2;
    const x = Math.max(w / 2 + pad, Math.min(W - w / 2 - pad, baseX + (rnd() - 0.5) * spacing * 0.22));
    const y = lerp(bTop + h / 2 + 4, bBot - h / 2 - 4, rnd());
    panels.push(makePanel(x, y, w, h, "bottom", lerp(0.82, 1.0, rnd())));
  }

  // Mid panels: 2-3, floating above desk
  const midCount = rnd() > 0.5 ? 3 : 2;
  const mTop = H * 0.38;
  const mBot = H * 0.67;
  for (let i = 0; i < midCount; i++) {
    const w = lerp(100, 152, rnd());
    const h = lerp(68, 108, rnd());
    const t = (i + 0.5 + (rnd() - 0.5) * 0.55) / midCount;
    const x = lerp(w / 2 + 50, W - w / 2 - 50, t);
    const y = lerp(mTop + h / 2, mBot - h / 2, rnd());
    panels.push(makePanel(x, y, w, h, "mid", lerp(0.4, 0.65, rnd())));
  }

  // Top panels: 2-3, barely visible in far background
  const topCount = rnd() > 0.5 ? 3 : 2;
  const tTop = H * 0.05;
  const tBot = H * 0.33;
  for (let i = 0; i < topCount; i++) {
    const w = lerp(48, 86, rnd());
    const h = lerp(32, 55, rnd());
    const t = (i + 0.5 + (rnd() - 0.5) * 0.5) / topCount;
    const x = lerp(w / 2 + 50, W - w / 2 - 50, t);
    const y = lerp(tTop + h / 2, tBot - h / 2, rnd());
    panels.push(makePanel(x, y, w, h, "top", lerp(0.05, 0.2, rnd())));
  }

  return panels;
}

function initParticles(W: number, H: number): Particle[] {
  const count = Math.floor(lerp(62, 80, rnd()));
  return Array.from({ length: count }, () => ({
    x: rnd() * W,
    y: rnd() * H,
    vx: (rnd() - 0.5) * 0.34,
    vy: (rnd() - 0.5) * 0.34,
    size: lerp(1.0, 1.5, rnd()),
  }));
}

// ─── Draw: desk surface ───────────────────────────────────────────────────────

function drawDeskSurface(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const y0 = H * 0.85;
  const grad = ctx.createLinearGradient(0, y0, 0, H);
  grad.addColorStop(0, "rgba(10, 20, 50, 0)");
  grad.addColorStop(0.55, "rgba(10, 20, 50, 0.13)");
  grad.addColorStop(1, "rgba(10, 20, 50, 0.08)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, y0, W, H - y0);
}

// ─── Draw: panel glow ─────────────────────────────────────────────────────────

function drawPanelGlow(ctx: CanvasRenderingContext2D, panel: Panel, H: number) {
  const { x, y, width, height, currentOpacity, zone } = panel;

  // Bloom around panel
  const gw = width * 2.2;
  const gh = height * 2.2;
  const bloom = ctx.createRadialGradient(x, y, 0, x, y, Math.max(gw, gh) / 2);
  bloom.addColorStop(0, `rgba(59, 130, 246, ${currentOpacity * 0.09})`);
  bloom.addColorStop(1, "rgba(59, 130, 246, 0)");
  ctx.fillStyle = bloom;
  ctx.fillRect(x - gw / 2, y - gh / 2, gw, gh);

  // Bottom panels cast downward glow onto desk surface
  if (zone === "bottom") {
    const deskY = y + height / 2;
    const glowH = H - deskY;
    if (glowH > 0) {
      const deskGrad = ctx.createLinearGradient(0, deskY, 0, deskY + glowH * 0.6);
      deskGrad.addColorStop(0, `rgba(59, 130, 246, ${currentOpacity * 0.055})`);
      deskGrad.addColorStop(1, "rgba(59, 130, 246, 0)");
      ctx.fillStyle = deskGrad;
      ctx.fillRect(x - width / 2 - 18, deskY, width + 36, glowH * 0.6);
    }
  }
}

// ─── Draw: individual panel ───────────────────────────────────────────────────

function drawPanel(ctx: CanvasRenderingContext2D, panel: Panel) {
  const {
    x, y, width: w, height: h,
    currentOpacity, baseOpacity, zone,
    hasHUD, hudRadius, hudOuterAngle, hudInnerAngle, hudPulsePhase,
    progressBars, dataBuffer, bufferHead, scrollOffset,
  } = panel;

  const activePct = Math.max(0, Math.min(1, (currentOpacity - baseOpacity) / 0.38));
  const scale = 1 + 0.04 * activePct;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const hw = w / 2;
  const hh = h / 2;

  // Interior fill
  ctx.fillStyle = `rgba(4, 12, 35, ${Math.min(0.92, 0.7 * currentOpacity + 0.12)})`;
  ctx.fillRect(-hw, -hh, w, h);

  // Border — idle 0.6, active 1.0
  const borderAlpha = lerp(0.6, 1.0, activePct);
  ctx.strokeStyle = `rgba(59, 130, 246, ${borderAlpha})`;
  ctx.lineWidth = 1;
  ctx.strokeRect(-hw, -hh, w, h);

  // Corner accent marks (12px legs)
  const cLen = 12;
  ctx.strokeStyle = `rgba(59, 130, 246, ${borderAlpha * 1.1})`;
  ctx.lineWidth = 1.5;
  // TL
  ctx.beginPath(); ctx.moveTo(-hw + cLen, -hh); ctx.lineTo(-hw, -hh); ctx.lineTo(-hw, -hh + cLen); ctx.stroke();
  // TR
  ctx.beginPath(); ctx.moveTo(hw - cLen, -hh); ctx.lineTo(hw, -hh); ctx.lineTo(hw, -hh + cLen); ctx.stroke();
  // BL
  ctx.beginPath(); ctx.moveTo(-hw + cLen, hh); ctx.lineTo(-hw, hh); ctx.lineTo(-hw, hh - cLen); ctx.stroke();
  // BR
  ctx.beginPath(); ctx.moveTo(hw - cLen, hh); ctx.lineTo(hw, hh); ctx.lineTo(hw, hh - cLen); ctx.stroke();

  // ── Data lines ──────────────────────────────────────────
  // Reserve bottom area for progress bars (22px)
  const dataAreaH = h - 28;
  const fontSize = zone === "bottom" ? 9 : zone === "mid" ? 8 : 7;
  const lh = LINE_HEIGHT;

  ctx.save();
  ctx.beginPath();
  ctx.rect(-hw + 5, -hh + 5, w - 10, Math.max(0, dataAreaH));
  ctx.clip();
  ctx.font = `${fontSize}px monospace`;
  ctx.fillStyle = `rgba(6, 182, 212, ${currentOpacity * 0.6})`;
  const visCount = Math.ceil(dataAreaH / lh) + 2;
  for (let i = 0; i < visCount; i++) {
    const idx = (bufferHead + i) % BUFFER_SIZE;
    const lineY = -hh + 5 + lh * i - scrollOffset;
    ctx.fillText(dataBuffer[idx], -hw + 7, lineY + fontSize);
  }
  ctx.restore();

  // ── HUD wheel ────────────────────────────────────────────
  if (hasHUD) {
    const hr = hudRadius;
    const hudX = hw - hr - 8;
    const hudY = -hh + hr + 8;
    const hAlpha = currentOpacity * 0.85;

    // Outer ring (clockwise) with tick marks
    ctx.save();
    ctx.translate(hudX, hudY);
    ctx.rotate(hudOuterAngle);
    ctx.beginPath();
    ctx.arc(0, 0, hr, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(59, 130, 246, ${hAlpha * 0.5})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const major = i % 3 === 0;
      const r0 = major ? hr - 5 : hr - 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      ctx.lineTo(Math.cos(a) * hr, Math.sin(a) * hr);
      ctx.strokeStyle = `rgba(59, 130, 246, ${hAlpha * (major ? 0.7 : 0.38)})`;
      ctx.lineWidth = major ? 1.5 : 0.7;
      ctx.stroke();
    }
    ctx.restore();

    // Middle ring — pulses opacity 0.3 → 0.7
    const midAlpha = lerp(0.3, 0.7, (Math.sin(hudPulsePhase) + 1) / 2);
    ctx.beginPath();
    ctx.arc(hudX, hudY, Math.round(hr * 0.73), 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(59, 130, 246, ${hAlpha * midAlpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Inner ring (counter-clockwise, partial arc)
    ctx.save();
    ctx.translate(hudX, hudY);
    ctx.rotate(hudInnerAngle);
    ctx.beginPath();
    ctx.arc(0, 0, Math.round(hr * 0.46), 0, Math.PI * 1.65);
    ctx.strokeStyle = `rgba(59, 130, 246, ${hAlpha * 0.5})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Center dot
    ctx.beginPath();
    ctx.arc(hudX, hudY, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(59, 130, 246, ${hAlpha})`;
    ctx.fill();
  }

  // ── Progress bars (bottom of panel) ──────────────────────
  const barW = w - 16;
  const barH = 2;
  const barGap = 5;
  const totalBarBlock = progressBars.length * (barH + barGap) - barGap;
  let barY = hh - 9 - totalBarBlock;

  progressBars.forEach((bar) => {
    // Track
    ctx.fillStyle = `rgba(59, 130, 246, ${currentOpacity * 0.18})`;
    ctx.fillRect(-hw + 8, barY, barW, barH);
    // Fill
    ctx.fillStyle = `rgba(6, 182, 212, ${currentOpacity * 0.65})`;
    ctx.fillRect(-hw + 8, barY, barW * bar.fillPct, barH);
    barY += barH + barGap;
  });

  ctx.restore();
}

// ─── Draw: pulse rings ────────────────────────────────────────────────────────

function drawPulseRings(ctx: CanvasRenderingContext2D, panels: Panel[]) {
  panels.forEach((panel) => {
    panel.pulseRings.forEach((ring) => {
      const progress = ring.age / 0.6;
      if (progress >= 1) return;
      const radius = lerp(ring.startRadius, ring.maxRadius, progress);
      const opacity = 0.4 * (1 - progress);
      ctx.beginPath();
      ctx.arc(panel.x, panel.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  });
}

// ─── Draw: particles ──────────────────────────────────────────────────────────

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  ctx.fillStyle = "rgba(59, 130, 246, 0.4)";
  particles.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ─── Update: panels ───────────────────────────────────────────────────────────

function updatePanels(
  panels: Panel[],
  mouse: { x: number; y: number },
  W: number,
  H: number
) {
  panels.forEach((panel) => {
    panel.wasActive = panel.isActive;

    // Drift (top/mid panels only — bottom panels sit on desk)
    if (panel.vx !== 0 || panel.vy !== 0) {
      panel.x += panel.vx;
      panel.y += panel.vy;
      const hw = panel.width / 2;
      const hh = panel.height / 2;
      if (panel.x - hw < 0) { panel.x = hw; panel.vx *= -1; }
      if (panel.x + hw > W) { panel.x = W - hw; panel.vx *= -1; }
      if (panel.y - hh < 0) { panel.y = hh; panel.vy *= -1; }
      if (panel.y + hh > H) { panel.y = H - hh; panel.vy *= -1; }
    }

    // Mouse proximity (220px)
    const d = dist(mouse.x, mouse.y, panel.x, panel.y);
    panel.isActive = d < 220;
    const mult = panel.isActive ? 2.5 : 1;

    // HUD animation
    panel.hudOuterAngle += panel.hudSpeed * mult;          // clockwise
    panel.hudInnerAngle -= panel.hudSpeed * 0.68 * mult;  // counter-clockwise
    panel.hudPulsePhase += 0.02 * mult;

    // Data scroll — new line enters at bottom as old exits top
    panel.scrollOffset += panel.dataScrollSpeed * mult;
    if (panel.scrollOffset >= LINE_HEIGHT) {
      panel.scrollOffset -= LINE_HEIGHT;
      const old = panel.bufferHead;
      panel.bufferHead = (panel.bufferHead + 1) % BUFFER_SIZE;
      panel.dataBuffer[old] = genLine(); // refresh scrolled-off line
    }

    // Progress bars
    panel.progressBars.forEach((bar) => {
      bar.fillPct += bar.speed * mult;
      if (bar.fillPct >= bar.target) {
        bar.fillPct = 0;
        bar.target = lerp(0.4, 0.95, Math.random());
      }
    });

    // Opacity — lerp toward target (active = base + 0.38, capped at 1.0)
    const targetOpacity = panel.isActive
      ? Math.min(1.0, panel.baseOpacity + 0.38)
      : panel.baseOpacity;
    panel.currentOpacity = lerp(
      panel.currentOpacity,
      targetOpacity,
      panel.isActive ? 0.065 : 0.042
    );

    // Spawn pulse ring on cursor entry
    if (panel.isActive && !panel.wasActive) {
      const startR = Math.max(panel.width, panel.height) / 2;
      panel.pulseRings.push({
        startRadius: startR,
        maxRadius: startR * 1.5,
        age: 0,
      });
    }

    // Age and cull pulse rings
    panel.pulseRings = panel.pulseRings.filter((r) => r.age < 0.6);
    panel.pulseRings.forEach((ring) => { ring.age += DT; });
  });
}

// ─── Update: particles ────────────────────────────────────────────────────────

function updateParticles(
  particles: Particle[],
  mouse: { x: number; y: number },
  W: number,
  H: number
) {
  particles.forEach((p) => {
    const md = dist(mouse.x, mouse.y, p.x, p.y);
    if (md < 160 && md > 1) {
      const force = (1 - md / 160) * 0.024;
      p.vx += ((mouse.x - p.x) / md) * force;
      p.vy += ((mouse.y - p.y) / md) * force;
    }
    const spd = Math.sqrt(p.vx ** 2 + p.vy ** 2);
    if (spd > 1.0) { p.vx = (p.vx / spd); p.vy = (p.vy / spd); }
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0) p.x = W;
    if (p.x > W) p.x = 0;
    if (p.y < 0) p.y = H;
    if (p.y > H) p.y = 0;
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function JarvisBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrameId: number;
    const mouse = { x: -9999, y: -9999 };
    let panels: Panel[] = [];
    let particles: Particle[] = [];

    function resize() {
      if (!canvas || !ctx) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Full initial fill so background is #03060f immediately
      ctx.fillStyle = "#03060f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      panels = initPanels(canvas.width, canvas.height);
      particles = initParticles(canvas.width, canvas.height);
    }

    function animate() {
      if (!canvas || !ctx) return;
      const W = canvas.width;
      const H = canvas.height;

      // Slight trail — not a full clear, creates motion smear
      ctx.fillStyle = "rgba(3, 6, 15, 0.2)";
      ctx.fillRect(0, 0, W, H);

      const topPanels = panels.filter((p) => p.zone === "top");
      const midPanels = panels.filter((p) => p.zone === "mid");
      const botPanels = panels.filter((p) => p.zone === "bottom");

      // Draw order per spec:
      // 1. Desk surface gradient
      drawDeskSurface(ctx, W, H);

      // 2. Background panel glows (far back panels)
      topPanels.forEach((p) => drawPanelGlow(ctx, p, H));
      midPanels.forEach((p) => drawPanelGlow(ctx, p, H));

      // 3. Background panels (top zone — barely there)
      topPanels.forEach((p) => drawPanel(ctx, p));

      // 4. Mid panels
      midPanels.forEach((p) => drawPanel(ctx, p));

      // 5. Particles (float across all zones)
      drawParticles(ctx, particles);

      // 6. Main desk panels — glow first, then panel on top
      botPanels.forEach((p) => drawPanelGlow(ctx, p, H));
      botPanels.forEach((p) => drawPanel(ctx, p));

      // 7. Pulse rings (always on top of panels)
      drawPulseRings(ctx, panels);

      // Update state
      updatePanels(panels, mouse, W, H);
      updateParticles(particles, mouse, W, H);

      animFrameId = requestAnimationFrame(animate);
    }

    function onMouseMove(e: MouseEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }

    resize();
    animate();
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", resize);
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
