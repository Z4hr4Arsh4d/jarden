// Draws the jar and the day/night sky. Pure function of (ctx, view) — no state, no React.

export const CANVAS_W = 480;
export const CANVAS_H = 640;

function lerp(a, b, t) { return a + (b - a) * t; }
function lerpColor(c1, c2, t) {
  return `rgb(${Math.round(lerp(c1[0], c2[0], t))},${Math.round(lerp(c1[1], c2[1], t))},${Math.round(lerp(c1[2], c2[2], t))})`;
}

const NIGHT_TOP = [16, 20, 40],  DAY_TOP = [120, 170, 215];
const NIGHT_BOT = [12, 15, 28],  DAY_BOT = [80, 125, 170];

export function drawJar(ctx, view = {}) {
  const { fps = 0, sun = 1, day = 1, timeOfDay = 0.5, humidity = 0 } = view;
  const w = CANVAS_W, h = CANVAS_H;
  ctx.imageSmoothingEnabled = false;

  // sky behind the jar breathes with the sun
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, lerpColor(NIGHT_TOP, DAY_TOP, sun));
  bg.addColorStop(1, lerpColor(NIGHT_BOT, DAY_BOT, sun));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // jar geometry
  const jx = 60, jy = 70, jw = w - 120, jh = h - 150, r = 26;

  // glass body
  ctx.beginPath();
  roundRect(ctx, jx, jy, jw, jh, r);
  ctx.fillStyle = "rgba(180, 210, 235, 0.06)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(200, 225, 245, 0.55)";
  ctx.stroke();

  // rim
  ctx.beginPath();
  roundRect(ctx, jx - 10, jy - 18, jw + 20, 26, 10);
  ctx.fillStyle = "#2e3745";
  ctx.fill();
  ctx.strokeStyle = "rgba(200,225,245,0.35)";
  ctx.stroke();

  // a faint mist inside the glass when the air holds water (night)
  if (humidity > 1) {
    const mist = Math.min(0.22, humidity / 900);
    ctx.beginPath();
    roundRect(ctx, jx + 3, jy + 3, jw - 6, jh - 6, r - 3);
    ctx.fillStyle = `rgba(210, 228, 242, ${mist})`;
    ctx.fill();
  }

  // glass highlight streak
  ctx.beginPath();
  ctx.moveTo(jx + 22, jy + 30);
  ctx.quadraticCurveTo(jx + 10, jy + jh * 0.5, jx + 26, jy + jh - 40);
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.stroke();

  // soil bed
  const soilH = 90;
  ctx.beginPath();
  roundRect(ctx, jx + 6, jy + jh - soilH - 6, jw - 12, soilH, 14);
  ctx.fillStyle = "#4c3826";
  ctx.fill();
  ctx.fillStyle = "#5d4630";
  ctx.fillRect(jx + 6, jy + jh - soilH - 6, jw - 12, 14);

  // sun / moon
  const arcT = (timeOfDay - 0.25) / 0.5;              // 0..1 across the daylight arc
  if (sun > 0) {
    const sx = lerp(jx + 20, jx + jw - 20, arcT);
    const sy = jy + 46 - Math.sin(Math.PI * arcT) * 34;
    ctx.beginPath();
    ctx.arc(sx, sy, 12, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 226, 130, 0.95)";
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(jx + jw - 40, jy + 40, 9, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(226, 232, 246, 0.9)";
    ctx.fill();
  }

  // HUD
  ctx.fillStyle = "rgba(232,236,241,0.8)";
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillText(`day ${day}`, 12, 20);
  ctx.fillText(`${fps.toFixed(0)} fps`, 12, 38);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
