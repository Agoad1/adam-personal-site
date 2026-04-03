"use client";

import { useEffect, useRef } from "react";

interface DataLine {
  text: string;
  scrollY: number;
}

interface PulseRing {
  radius: number;
  maxRadius: number;
  opacity: number;
}

interface Panel {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  depth: number;
  dataLines: DataLine[];
  dataScrollSpeed: number;
  hasHUD: boolean;
  hudAngle: number;
  hudSpeed: number;
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
  trail: { x: number; y: number }[];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function randomHexString(): string {
  const segments = Math.floor(Math.random() * 3) + 3;
  const parts: string[] = [];
  for (let i = 0; i < segments; i++) {
    parts.push(
      Math.floor(Math.random() * 0xffff)
        .toString(16)
        .toUpperCase()
        .padStart(4, "0")
    );
  }
  return parts.join(" ");
}

function createPanel(canvasW: number, canvasH: number): Panel {
  const depth = Math.random();
  const width = lerp(80, 300, depth);
  const height = lerp(50, 160, depth);
  const x = lerp(width / 2, canvasW - width / 2, Math.random());
  const y = lerp(height / 2, canvasH - height / 2, Math.random());
  const speed = 0.15;
  const angle = Math.random() * Math.PI * 2;
  const lineCount = Math.floor(Math.random() * 3) + 3;
  const dataLines: DataLine[] = [];
  for (let i = 0; i < lineCount; i++) {
    dataLines.push({ text: randomHexString(), scrollY: Math.random() * height });
  }
  return {
    x,
    y,
    width,
    height,
    vx: Math.cos(angle) * speed * Math.random(),
    vy: Math.sin(angle) * speed * Math.random(),
    depth,
    dataLines,
    dataScrollSpeed: lerp(0.1, 0.4, depth),
    hasHUD: Math.random() > 0.5,
    hudAngle: Math.random() * Math.PI * 2,
    hudSpeed: lerp(0.002, 0.008, Math.random()),
    isActive: false,
    wasActive: false,
    pulseRings: [],
    baseOpacity: lerp(0.2, 0.6, depth),
    currentOpacity: lerp(0.2, 0.6, depth),
  };
}

function createParticle(canvasW: number, canvasH: number): Particle {
  const maxSpeed = 0.4;
  return {
    x: Math.random() * canvasW,
    y: Math.random() * canvasH,
    vx: (Math.random() - 0.5) * maxSpeed,
    vy: (Math.random() - 0.5) * maxSpeed,
    size: Math.random() + 1,
    trail: [],
  };
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

export default function JarvisBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrameId: number;
    const mouse = { x: -1000, y: -1000 };
    const PANEL_COUNT = 10;
    const PARTICLE_COUNT = 100;

    let panels: Panel[] = [];
    let particles: Particle[] = [];

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      panels = Array.from({ length: PANEL_COUNT }, () =>
        createPanel(canvas.width, canvas.height)
      );
      particles = Array.from({ length: PARTICLE_COUNT }, () =>
        createParticle(canvas.width, canvas.height)
      );
    }

    function drawCornerAccents(
      cx: number,
      cy: number,
      w: number,
      h: number,
      opacity: number
    ) {
      if (!ctx) return;
      const len = 10;
      const x0 = cx - w / 2;
      const y0 = cy - h / 2;
      const x1 = cx + w / 2;
      const y1 = cy + h / 2;
      ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`;
      ctx.lineWidth = 1.5;
      // top-left
      ctx.beginPath();
      ctx.moveTo(x0 + len, y0);
      ctx.lineTo(x0, y0);
      ctx.lineTo(x0, y0 + len);
      ctx.stroke();
      // top-right
      ctx.beginPath();
      ctx.moveTo(x1 - len, y0);
      ctx.lineTo(x1, y0);
      ctx.lineTo(x1, y0 + len);
      ctx.stroke();
      // bottom-left
      ctx.beginPath();
      ctx.moveTo(x0 + len, y1);
      ctx.lineTo(x0, y1);
      ctx.lineTo(x0, y1 - len);
      ctx.stroke();
      // bottom-right
      ctx.beginPath();
      ctx.moveTo(x1 - len, y1);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x1, y1 - len);
      ctx.stroke();
    }

    function drawHUD(
      cx: number,
      cy: number,
      angle: number,
      opacity: number
    ) {
      if (!ctx) return;
      const radii = [12, 20, 30];
      radii.forEach((r, i) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle + (i * Math.PI) / 4);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 1.5);
        ctx.strokeStyle = `rgba(6, 182, 212, ${opacity * 0.6})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      });
      // center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(6, 182, 212, ${opacity * 0.8})`;
      ctx.fill();
    }

    function drawPanel(panel: Panel) {
      if (!ctx) return;
      const { x, y, width, height, currentOpacity, isActive, hasHUD, hudAngle } = panel;
      const scale = isActive ? lerp(1.0, 1.05, Math.min(1, currentOpacity * 1.2)) : 1.0;

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);

      const hw = width / 2;
      const hh = height / 2;

      // Panel fill
      ctx.fillStyle = `rgba(6, 20, 50, ${0.3 * currentOpacity * 1.5})`;
      ctx.fillRect(-hw, -hh, width, height);

      // Border
      ctx.strokeStyle = `rgba(59, 130, 246, ${currentOpacity})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(-hw, -hh, width, height);

      // Corner accents
      drawCornerAccents(0, 0, width, height, currentOpacity * 1.2);

      // Clipped data text
      ctx.save();
      ctx.beginPath();
      ctx.rect(-hw + 4, -hh + 4, width - 8, height - 8);
      ctx.clip();

      const lineSpacing = Math.min(14, (height - 8) / panel.dataLines.length);
      ctx.font = "9px monospace";
      ctx.fillStyle = `rgba(6, 182, 212, ${currentOpacity * 0.7})`;

      panel.dataLines.forEach((line, i) => {
        const baseY = -hh + 4 + i * lineSpacing;
        const textY = baseY + (line.scrollY % lineSpacing);
        // draw current and wrapped line
        ctx.fillText(line.text, -hw + 6, textY);
        ctx.fillText(line.text, -hw + 6, textY - lineSpacing * panel.dataLines.length);
      });

      ctx.restore();

      // HUD
      if (hasHUD) {
        drawHUD(0, 0, hudAngle, currentOpacity);
      }

      ctx.restore();
    }

    function drawPulseRings(panel: Panel) {
      if (!ctx) return;
      panel.pulseRings.forEach((ring) => {
        ctx.beginPath();
        ctx.arc(panel.x, panel.y, ring.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(59, 130, 246, ${ring.opacity})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }

    function animate() {
      if (!canvas || !ctx) return;
      const W = canvas.width;
      const H = canvas.height;

      // Trail fill
      ctx.fillStyle = "rgba(3, 6, 15, 0.15)";
      ctx.fillRect(0, 0, W, H);

      // Update panels
      panels.forEach((panel) => {
        panel.wasActive = panel.isActive;

        // Move
        panel.x += panel.vx;
        panel.y += panel.vy;

        // Bounce
        const hw = panel.width / 2;
        const hh = panel.height / 2;
        if (panel.x - hw < 0) { panel.x = hw; panel.vx *= -1; }
        if (panel.x + hw > W) { panel.x = W - hw; panel.vx *= -1; }
        if (panel.y - hh < 0) { panel.y = hh; panel.vy *= -1; }
        if (panel.y + hh > H) { panel.y = H - hh; panel.vy *= -1; }

        // Mouse proximity
        const d = dist(mouse.x, mouse.y, panel.x, panel.y);
        panel.isActive = d < 200;
        const speedMult = panel.isActive ? 3 : 1;

        // HUD
        panel.hudAngle += panel.hudSpeed * speedMult;

        // Data scroll
        panel.dataLines.forEach((line) => {
          line.scrollY += panel.dataScrollSpeed * speedMult;
          if (line.scrollY > panel.height) line.scrollY = 0;
        });

        // Opacity lerp
        const targetOpacity = panel.isActive
          ? lerp(0.75, 0.95, panel.baseOpacity)
          : panel.baseOpacity;
        panel.currentOpacity = lerp(panel.currentOpacity, targetOpacity, 0.05);

        // Pulse ring on entry
        if (panel.isActive && !panel.wasActive) {
          panel.pulseRings.push({ radius: 10, maxRadius: 80, opacity: 0.5 });
        }

        // Update pulse rings
        panel.pulseRings = panel.pulseRings.filter((ring) => ring.opacity > 0.01);
        panel.pulseRings.forEach((ring) => {
          ring.radius += (ring.maxRadius - ring.radius) * 0.06;
          ring.opacity *= 0.93;
        });
      });

      // Connection lines between close panels
      for (let i = 0; i < panels.length; i++) {
        for (let j = i + 1; j < panels.length; j++) {
          const d = dist(panels[i].x, panels[i].y, panels[j].x, panels[j].y);
          if (d < 300) {
            const alpha = (1 - d / 300) * 0.12;
            ctx.beginPath();
            ctx.moveTo(panels[i].x, panels[i].y);
            ctx.lineTo(panels[j].x, panels[j].y);
            ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw panels + pulse rings
      panels.forEach((panel) => {
        drawPanel(panel);
        drawPulseRings(panel);
      });

      // Update & draw particles
      particles.forEach((p) => {
        // Cursor attraction
        const md = dist(mouse.x, mouse.y, p.x, p.y);
        if (md < 150 && md > 0) {
          const force = (1 - md / 150) * 0.03;
          p.vx += ((mouse.x - p.x) / md) * force;
          p.vy += ((mouse.y - p.y) / md) * force;
        }

        // Speed cap
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > 1.2) {
          p.vx = (p.vx / speed) * 1.2;
          p.vy = (p.vy / speed) * 1.2;
        }

        // Trail
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 7) p.trail.shift();

        p.x += p.vx;
        p.y += p.vy;

        // Wrap edges
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;

        // Draw trail
        p.trail.forEach((pt, i) => {
          const trailOpacity = (i / p.trail.length) * 0.15;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, p.size * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(59, 130, 246, ${trailOpacity})`;
          ctx.fill();
        });

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(59, 130, 246, 0.5)";
        ctx.fill();

        // Panel corner connection lines
        panels.forEach((panel) => {
          const corners = [
            { x: panel.x - panel.width / 2, y: panel.y - panel.height / 2 },
            { x: panel.x + panel.width / 2, y: panel.y - panel.height / 2 },
            { x: panel.x - panel.width / 2, y: panel.y + panel.height / 2 },
            { x: panel.x + panel.width / 2, y: panel.y + panel.height / 2 },
          ];
          corners.forEach((corner) => {
            const cd = dist(p.x, p.y, corner.x, corner.y);
            if (cd < 60) {
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(corner.x, corner.y);
              ctx.strokeStyle = `rgba(59, 130, 246, ${(1 - cd / 60) * 0.15})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          });
        });
      });

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
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: -1,
        pointerEvents: "none",
        display: "block",
      }}
    />
  );
}
