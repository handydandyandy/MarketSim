'use strict';

class ChartRenderer {
  // ─── Full price chart (stock detail) ─────────────────────────────────────
  drawPriceChart(canvas, history, sectorColor, events = []) {
    if (!canvas || !history || history.length < 2) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const pad = { top: 10, right: 10, bottom: 28, left: 58 };
    const cW = W - pad.left - pad.right;
    const cH = H - pad.top  - pad.bottom;

    const min = Math.min(...history) * 0.998;
    const max = Math.max(...history) * 1.002;
    const range = max - min || 1;

    const toX = i => pad.left + (i / (history.length - 1)) * cW;
    const toY = v => pad.top  + cH - ((v - min) / range) * cH;

    // Background
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = '#1c2128';
    ctx.lineWidth   = 1;
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = pad.top + (i / gridLines) * cH;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();

      // Price label
      const price = max - (i / gridLines) * range;
      ctx.fillStyle  = '#8b949e';
      ctx.font       = '10px monospace';
      ctx.textAlign  = 'right';
      ctx.fillText(`$${price.toFixed(2)}`, pad.left - 4, y + 3);
    }

    // Time axis labels
    const labelCount = Math.min(5, history.length);
    ctx.fillStyle = '#8b949e';
    ctx.font      = '9px monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i < labelCount; i++) {
      const idx = Math.floor((i / (labelCount - 1)) * (history.length - 1));
      const x   = toX(idx);
      ctx.fillText(`D-${history.length - 1 - idx}`, x, H - 4);
    }

    // Area fill under line
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + cH);
    grad.addColorStop(0,   sectorColor + '55');
    grad.addColorStop(0.7, sectorColor + '11');
    grad.addColorStop(1,   sectorColor + '00');

    ctx.beginPath();
    ctx.moveTo(toX(0), toY(history[0]));
    for (let i = 1; i < history.length; i++) {
      ctx.lineTo(toX(i), toY(history[i]));
    }
    ctx.lineTo(toX(history.length - 1), pad.top + cH);
    ctx.lineTo(pad.left, pad.top + cH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Price line
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(history[0]));
    for (let i = 1; i < history.length; i++) {
      ctx.lineTo(toX(i), toY(history[i]));
    }
    ctx.strokeStyle = sectorColor;
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // Current price dot
    const lastX = toX(history.length - 1);
    const lastY = toY(history[history.length - 1]);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fillStyle = sectorColor;
    ctx.fill();
  }

  // ─── Portfolio value chart (left panel) ──────────────────────────────────
  drawPortfolioChart(canvas, valueHistory, indexHistory, startValue) {
    if (!canvas || !valueHistory || valueHistory.length < 2) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const padL = 6, padR = 6, padT = 6, padB = 6;
    const cW = W - padL - padR;
    const cH = H - padT - padB;

    // Combine both series for scaling
    const allVals = [...valueHistory];
    if (indexHistory) {
      // Normalize index to same start as portfolio
      const idxStart = indexHistory[0] || 1000;
      allVals.push(...indexHistory.map(v => startValue * (v / idxStart)));
    }
    const min = Math.min(...allVals) * 0.995;
    const max = Math.max(...allVals) * 1.005;
    const range = max - min || 1;

    const toX = (i, len) => padL + (i / (len - 1)) * cW;
    const toY = v => padT + cH - ((v - min) / range) * cH;

    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    // Baseline (starting value)
    const baseY = toY(startValue);
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth   = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(padL, baseY);
    ctx.lineTo(W - padR, baseY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Index comparison (grey)
    if (indexHistory && indexHistory.length > 1) {
      const idxStart = indexHistory[0];
      ctx.beginPath();
      for (let i = 0; i < indexHistory.length; i++) {
        const v = startValue * (indexHistory[i] / idxStart);
        const x = toX(i, indexHistory.length);
        const y = toY(v);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#484f58';
      ctx.lineWidth   = 1;
      ctx.stroke();
    }

    // Portfolio line
    const isUp = valueHistory[valueHistory.length - 1] >= startValue;
    const lineColor = isUp ? '#3fb950' : '#f85149';

    ctx.beginPath();
    for (let i = 0; i < valueHistory.length; i++) {
      const x = toX(i, valueHistory.length);
      const y = toY(valueHistory[i]);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = lineColor;
    ctx.lineWidth   = 1.5;
    ctx.stroke();
  }

  // ─── Sparkline in stock table ─────────────────────────────────────────────
  drawSparkline(canvas, history, isUp) {
    if (!canvas || !history || history.length < 2) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const slice = history.slice(-30);
    const min   = Math.min(...slice) * 0.998;
    const max   = Math.max(...slice) * 1.002;
    const range = max - min || 1;

    const toX = i => (i / (slice.length - 1)) * W;
    const toY = v => H - ((v - min) / range) * H * 0.9 - H * 0.05;

    ctx.beginPath();
    for (let i = 0; i < slice.length; i++) {
      const x = toX(i), y = toY(slice[i]);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = isUp ? '#3fb950' : '#f85149';
    ctx.lineWidth   = 1.2;
    ctx.stroke();
  }
}
