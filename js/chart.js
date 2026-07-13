// chart.js — minimal canvas line/bar charts (no external dependency, works offline)
export function drawLineChart(canvas, points, { color = '#b8752f', unit = 'kg' } = {}) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  if (!points.length) return;
  const pad = { l: 34, r: 12, t: 16, b: 22 };
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;

  ctx.strokeStyle = 'rgba(236,231,222,0.12)';
  ctx.lineWidth = 1;
  ctx.font = '10px IBM Plex Mono, monospace';
  ctx.fillStyle = 'rgba(236,231,222,0.5)';
  [min, (min + max) / 2, max].forEach((v) => {
    const y = pad.t + plotH - ((v - min) / range) * plotH;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(w - pad.r, y);
    ctx.stroke();
    ctx.fillText(Math.round(v) + unit, 2, y + 3);
  });

  const stepX = points.length > 1 ? plotW / (points.length - 1) : 0;
  ctx.beginPath();
  points.forEach((p, i) => {
    const x = pad.l + stepX * i;
    const y = pad.t + plotH - ((p.value - min) / range) * plotH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  points.forEach((p, i) => {
    const x = pad.l + stepX * i;
    const y = pad.t + plotH - ((p.value - min) / range) * plotH;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });
}

export function drawBarChart(canvas, bars, { color = '#b8752f' } = {}) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);
  if (!bars.length) return;

  const pad = { l: 8, r: 8, t: 8, b: 20 };
  const max = Math.max(...bars.map((b) => b.value), 1);
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;
  const gap = 6;
  const barW = (plotW - gap * (bars.length - 1)) / bars.length;

  ctx.font = '10px IBM Plex Sans, sans-serif';
  bars.forEach((b, i) => {
    const x = pad.l + i * (barW + gap);
    const bh = (b.value / max) * plotH;
    const y = pad.t + plotH - bh;
    ctx.fillStyle = b.highlight ? color : 'rgba(236,231,222,0.25)';
    ctx.fillRect(x, y, barW, bh);
    ctx.fillStyle = 'rgba(236,231,222,0.6)';
    ctx.textAlign = 'center';
    ctx.fillText(b.label, x + barW / 2, h - 6);
  });
}
