'use strict';

class UIManager {
  constructor(market, portfolio, charts) {
    this.market    = market;
    this.portfolio = portfolio;
    this.charts    = charts;

    this.selectedSymbol = null;
    this.sectorFilter   = 'ALL';
    this.newsItems      = [];
    this.maxNews        = 40;

    this._bindEvents();
    this._populateGlossary();
  }

  // ─── Initial DOM bindings ─────────────────────────────────────────────────
  _bindEvents() {
    // Sector filter tabs
    document.querySelectorAll('#sector-tabs .tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#sector-tabs .tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.sectorFilter = btn.dataset.sector;
        this.renderStockTable();
      });
    });

    // Close stock detail
    document.getElementById('close-detail').addEventListener('click', () => {
      this.selectedSymbol = null;
      document.getElementById('stock-detail').classList.add('hidden');
      document.getElementById('stock-table-wrap').classList.remove('hidden');
    });

    // Trade qty input → update cost preview
    document.getElementById('trade-qty').addEventListener('input', () => this._updateTradeCost());

    // Buy button
    document.getElementById('buy-btn').addEventListener('click', () => this._executeTrade('BUY'));

    // Sell button
    document.getElementById('sell-btn').addEventListener('click', () => this._executeTrade('SELL'));

    // Glossary open/close
    document.getElementById('glossary-btn').addEventListener('click', () => {
      document.getElementById('glossary-modal').classList.remove('hidden');
    });
    document.getElementById('glossary-close').addEventListener('click', () => {
      document.getElementById('glossary-modal').classList.add('hidden');
    });
    document.getElementById('glossary-backdrop').addEventListener('click', () => {
      document.getElementById('glossary-modal').classList.add('hidden');
    });

    // Learning card close
    document.getElementById('lc-close').addEventListener('click', () => {
      document.getElementById('learning-card').classList.add('hidden');
    });
  }

  // ─── Main render (called every tick) ─────────────────────────────────────
  render(events) {
    const prices = this.market.getPrices();

    this._renderHeader();
    this._renderPortfolio(prices);
    this._renderIndicesBar();
    this.renderStockTable();
    if (this.selectedSymbol) this._renderStockDetail(this.selectedSymbol);
    this._renderConditionPanel();
    this._renderIndicators();

    // Process new events → news
    if (events && events.length) {
      for (const ev of events) this._addNewsItem(ev);
      this._renderNews();
      // Show learning card for first occurrence of each concept
      const primary = events.find(e => e.concept);
      if (primary && !this.portfolio.seenConcepts.has(primary.concept)) {
        this.portfolio.seenConcepts.add(primary.concept);
        this._showLearningCard(primary.concept, primary.lesson);
      }
    }

    // Portfolio chart
    this.charts.drawPortfolioChart(
      document.getElementById('portfolio-chart'),
      this.portfolio.valueHistory,
      this.market.indexHistory,
      this.portfolio.startValue
    );
  }

  // ─── Header ───────────────────────────────────────────────────────────────
  _renderHeader() {
    const m = this.market;
    setText('hdr-day', m.day);
    setText('hdr-date', m.getDateString());
    setText('hdr-rate', `${(m.interestRate * 100).toFixed(2)}%`);
    setText('hdr-inflation', `${(m.inflation * 100).toFixed(2)}%`);

    const phaseEl = document.getElementById('hdr-phase');
    const icons   = { EXPANSION: '📈 Expansion', PEAK: '🔺 Peak', CONTRACTION: '📉 Contraction', TROUGH: '🔻 Trough' };
    phaseEl.textContent = icons[m.cycle.phase] || m.cycle.phase;
    phaseEl.className   = 'phase-badge ' + m.cycle.phase.toLowerCase();
  }

  // ─── Portfolio panel ──────────────────────────────────────────────────────
  _renderPortfolio(prices) {
    const total   = this.portfolio.totalValue(prices);
    const invested = this.portfolio.investedValue(prices);
    const daily   = this.portfolio.dailyPnL(prices);
    const ret     = this.portfolio.totalReturn(prices);

    setText('port-total', fmt$(total));
    const portChangeEl = document.getElementById('port-change');
    portChangeEl.textContent = `${fmtDelta$(ret >= 0 ? total - this.portfolio.startValue : total - this.portfolio.startValue)} (${ret >= 0 ? '+' : ''}${ret.toFixed(2)}%)`;
    portChangeEl.className   = 'port-change ' + (ret >= 0 ? 'up' : 'dn');

    setText('port-cash', fmt$(this.portfolio.cash));
    setText('port-invested', fmt$(invested));

    const pnlEl = document.getElementById('port-daily-pnl');
    pnlEl.textContent = fmtDelta$(daily);
    pnlEl.className   = 'stat-value ' + (daily >= 0 ? 'up' : 'dn');

    // vs Market
    const mktRet = ((this.market.indexValue - 1000) / 1000) * 100;
    const diff   = ret - mktRet;
    const vmEl   = document.getElementById('port-vs-market');
    vmEl.textContent = ret === 0 && invested === 0 ? '—' : `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}%`;
    vmEl.className   = 'stat-value ' + (diff >= 0 ? 'up' : 'dn');

    // Holdings list
    this._renderHoldings(prices);
  }

  _renderHoldings(prices) {
    const el = document.getElementById('holdings-list');
    const h  = this.portfolio.holdings;
    if (Object.keys(h).length === 0) {
      el.innerHTML = '<div class="empty-state">Buy stocks to build your portfolio</div>';
      return;
    }
    el.innerHTML = Object.entries(h).map(([sym, holding]) => {
      const s     = this.market.stocks[sym];
      const val   = holding.shares * (prices[sym] || 0);
      const ret   = ((prices[sym] - holding.avgCost) / holding.avgCost) * 100;
      const color = ret >= 0 ? 'up' : 'dn';
      const secColor = SECTORS[s.sector]?.color || '#ccc';
      return `
        <div class="holding-row" data-symbol="${sym}" onclick="window.game.selectStock('${sym}')">
          <div class="holding-left">
            <span class="holding-sym" style="color:${secColor}">${sym}</span>
            <span class="holding-shares">${holding.shares} sh</span>
          </div>
          <div class="holding-right">
            <span class="holding-val">${fmt$(val)}</span>
            <span class="holding-ret ${color}">${ret >= 0 ? '+' : ''}${ret.toFixed(2)}%</span>
          </div>
        </div>`;
    }).join('');
  }

  // ─── Indices bar ──────────────────────────────────────────────────────────
  _renderIndicesBar() {
    const m       = this.market;
    const chg     = m.getIndexChangePct();
    const total   = ((m.indexValue - 1000) / 1000) * 100;

    setText('idx-comp-value', m.indexValue.toFixed(2));
    const chgEl = document.getElementById('idx-comp-change');
    chgEl.textContent = `${chg >= 0 ? '▲' : '▼'} ${Math.abs(chg).toFixed(2)}% (${total >= 0 ? '+' : ''}${total.toFixed(2)}% total)`;
    chgEl.className   = 'idx-change ' + (chg >= 0 ? 'up' : 'dn');

    // Sector heat badges
    const heatEl = document.getElementById('sector-heat');
    const summary = m.getSectorSummary();
    heatEl.innerHTML = Object.entries(SECTORS).map(([key, sec]) => {
      const chgS = summary[key] || 0;
      return `<div class="sector-badge" style="border-color:${sec.color}20; color:${chgS >= 0 ? '#3fb950' : '#f85149'}">
        <span style="color:${sec.color}">${sec.name}</span>
        <span>${chgS >= 0 ? '▲' : '▼'}${Math.abs(chgS).toFixed(2)}%</span>
      </div>`;
    }).join('');
  }

  // ─── Stock table ──────────────────────────────────────────────────────────
  renderStockTable() {
    const tbody  = document.getElementById('stock-rows');
    const stocks = Object.values(this.market.stocks)
      .filter(s => this.sectorFilter === 'ALL' || s.sector === this.sectorFilter);

    tbody.innerHTML = stocks.map(s => {
      const sec   = SECTORS[s.sector];
      const pe    = s.currentPrice / Math.max(0.01, s.eps);
      const mktCap = fmtMktCap(s.currentPrice * s.shares);
      const vol   = fmtVol(s.volume);
      const up    = s.changePct >= 0;
      const chgClass = up ? 'up' : 'dn';
      const held  = this.portfolio.holdings[s.symbol];

      return `
        <tr class="stock-row ${s.symbol === this.selectedSymbol ? 'selected' : ''}"
            data-symbol="${s.symbol}"
            onclick="window.game.selectStock('${s.symbol}')">
          <td>
            <span class="sym-tag" style="color:${sec.color}">${s.symbol}</span>
            ${held ? `<span class="held-dot" title="You own ${held.shares} shares">●</span>` : ''}
          </td>
          <td class="name-cell">${s.name}</td>
          <td class="mono th-price">${fmt$(s.currentPrice)}</td>
          <td class="mono th-chg ${chgClass}">
            ${up ? '▲' : '▼'} ${Math.abs(s.changePct).toFixed(2)}%
          </td>
          <td class="mono th-pe">${pe.toFixed(1)}×</td>
          <td class="mono th-mktcap muted">${mktCap}</td>
          <td class="mono th-vol muted">${vol}</td>
          <td><canvas class="spark-canvas" data-sym="${s.symbol}" width="60" height="22"></canvas></td>
        </tr>`;
    }).join('');

    // Draw sparklines
    stocks.forEach(s => {
      const canvas = tbody.querySelector(`canvas[data-sym="${s.symbol}"]`);
      if (canvas) this.charts.drawSparkline(canvas, s.history, s.changePct >= 0);
    });
  }

  // ─── Stock detail panel ───────────────────────────────────────────────────
  selectStock(symbol) {
    if (this.selectedSymbol !== symbol) {
        document.getElementById('trade-qty').value = '';
    }
    this.selectedSymbol = symbol;
    document.getElementById('stock-table-wrap').classList.add('hidden');
    document.getElementById('stock-detail').classList.remove('hidden');
    this._renderStockDetail(symbol);
  }

  _renderStockDetail(symbol) {
    const s   = this.market.stocks[symbol];
    const sec = SECTORS[s.sector];
    if (!s) return;

    const prices = this.market.getPrices();
    const pe     = s.currentPrice / Math.max(0.01, s.eps);
    const mktCap = fmtMktCap(s.currentPrice * s.shares);
    const up     = s.changePct >= 0;

    setText('det-symbol', s.symbol);
    setText('det-name', s.name);
    const secBadge = document.getElementById('det-sector');
    secBadge.textContent  = sec.name;
    secBadge.style.color  = sec.color;
    secBadge.style.borderColor = sec.color + '66';

    setText('det-price',      fmt$(s.currentPrice));
    setText('det-desc',       s.desc);
    const changeEl = document.getElementById('det-change');
    changeEl.textContent  = `${up ? '▲ +' : '▼ '}${fmt$(Math.abs(s.change))}`;
    changeEl.className    = 'det-change ' + (up ? 'up' : 'dn');
    const changePctEl = document.getElementById('det-change-pct');
    changePctEl.textContent = `(${up ? '+' : ''}${s.changePct.toFixed(2)}%)`;
    changePctEl.className   = 'det-change-pct ' + (up ? 'up' : 'dn');

    // Chart
    this.charts.drawPriceChart(
      document.getElementById('stock-chart'),
      s.history,
      sec.color
    );

    // Metrics
    const held = this.portfolio.holdingReturn(symbol, s.currentPrice);
    document.getElementById('det-metrics').innerHTML = `
      <div class="metric-card" title="How much investors pay per $1 of annual profit. High P/E means expensive or high-growth expectations.">
        <div class="metric-label">P/E Ratio <span class="tip">?</span></div>
        <div class="metric-val">${pe.toFixed(1)}×</div>
      </div>
      <div class="metric-card" title="Sensitivity to market moves. Beta 1.6 means this stock moves ~60% more than the market.">
        <div class="metric-label">Beta <span class="tip">?</span></div>
        <div class="metric-val">${s.beta.toFixed(1)}</div>
      </div>
      <div class="metric-card" title="Annual earnings divided by total shares. Profit per share.">
        <div class="metric-label">EPS <span class="tip">?</span></div>
        <div class="metric-val">${fmt$(s.eps)}</div>
      </div>
      <div class="metric-card" title="Annual dividend as % of share price. Reliable income paid to shareholders.">
        <div class="metric-label">Div. Yield <span class="tip">?</span></div>
        <div class="metric-val">${s.divYield > 0 ? (s.divYield * 100).toFixed(2) + '%' : 'None'}</div>
      </div>
      <div class="metric-card" title="Total value the market assigns to this company = Price × Shares.">
        <div class="metric-label">Mkt Cap <span class="tip">?</span></div>
        <div class="metric-val">${mktCap}</div>
      </div>
      <div class="metric-card" title="Number of shares bought or sold today. Higher volume confirms stronger conviction behind price moves.">
        <div class="metric-label">Volume <span class="tip">?</span></div>
        <div class="metric-val">${fmtVol(s.volume)}</div>
      </div>
    `;

    // Holding info
    const holdingEl = document.getElementById('trade-holding');
    if (held) {
      holdingEl.innerHTML = `
        <span class="held-label">You own ${held.shares} shares</span>
        <span class="held-cost"> · Avg cost ${fmt$(held.avgCost)}</span>
        <span class="held-ret ${held.pct >= 0 ? 'up' : 'dn'}">
          ${held.pct >= 0 ? '+' : ''}${held.pct.toFixed(2)}%
          (${fmtDelta$(held.abs)})
        </span>`;
    } else {
      holdingEl.innerHTML = '<span class="held-label muted">Not in portfolio</span>';
    }

    this._updateTradeCost();
  }

  _updateTradeCost() {
    if (!this.selectedSymbol) return;
    const s    = this.market.stocks[this.selectedSymbol];
    const qty  = parseInt(document.getElementById('trade-qty').value) || 0;
    const cost = qty * s.currentPrice;
    const el   = document.getElementById('trade-cost');
    if (qty <= 0) { el.textContent = 'Cost: —'; return; }
    el.textContent = `Cost: ${fmt$(cost)} · Cash after: ${fmt$(this.portfolio.cash - cost)}`;
    el.className   = 'trade-cost-display ' + (cost > this.portfolio.cash ? 'dn' : '');
  }

  _executeTrade(type) {
    if (!this.selectedSymbol) return;
    const qty = parseInt(document.getElementById('trade-qty').value);
    if (!qty || qty <= 0) { this.showToast('Enter a valid quantity', 'warn'); return; }

    const s   = this.market.stocks[this.selectedSymbol];
    const res = type === 'BUY'
      ? this.portfolio.buy(this.selectedSymbol, qty, s.currentPrice)
      : this.portfolio.sell(this.selectedSymbol, qty, s.currentPrice);

    if (res.ok) {
      this.showToast(res.msg, 'ok');
      if (type === 'SELL' && res.gainLoss !== undefined) {
        const gl = res.gainLoss;
        setTimeout(() => {
          this.showToast(
            `Realized P&L: ${gl >= 0 ? '+' : ''}${fmt$(gl)} (${res.gainLossPct >= 0 ? '+' : ''}${res.gainLossPct.toFixed(2)}%)`,
            gl >= 0 ? 'ok' : 'err'
          );
        }, 800);
      }
      document.getElementById('trade-qty').value = '';
      this._renderStockDetail(this.selectedSymbol);
      // First buy learning card
      if (type === 'BUY' && !this.portfolio.seenConcepts.has('first-buy')) {
        this.portfolio.seenConcepts.add('first-buy');
        this._showLearningCard('Portfolio Diversification',
          'Great first trade! As you build your portfolio, consider spreading your money across different sectors (Tech, Energy, Finance, etc.). Diversification reduces risk — if one sector crashes, others may hold steady or rise. Rule of thumb: no single stock should be more than 20-25% of your portfolio.');
      }
    } else {
      this.showToast(res.msg, 'err');
    }
  }

  // ─── Education panel ──────────────────────────────────────────────────────
  _renderConditionPanel() {
    const m   = this.market;
    const el  = document.getElementById('condition-card');
    const idx = ((m.indexValue - 1000) / 1000) * 100;

    const phaseInfo = {
      EXPANSION: {
        icon: '🚀', label: 'Bull Market — Expansion',
        color: '#3fb950',
        desc: `The economy is growing. GDP is expanding, employment is rising, and corporate profits are improving. Stock prices generally trend up during expansions. This is when growth stocks (Tech, Consumer) tend to outperform. The risk: stretched valuations and rising interest rates can trigger a reversal.`,
      },
      PEAK: {
        icon: '🔺', label: 'Market Peak',
        color: '#d29922',
        desc: `Growth is maxing out. Valuations are elevated, interest rates may be high, and economic momentum is slowing. Markets become volatile as investors debate when the cycle will turn. Energy and materials often outperform at peaks as commodity prices stay elevated.`,
      },
      CONTRACTION: {
        icon: '📉', label: 'Bear Market — Contraction',
        color: '#f85149',
        desc: `The economy is slowing or shrinking. Corporate profits are falling, unemployment rising. Stock prices typically decline 20-40% from peak in a bear market. Defensive sectors (Healthcare, Consumer Staples like FGRP) tend to hold up better. Bear markets are temporary — every one has ended with new highs.`,
      },
      TROUGH: {
        icon: '🔻', label: 'Market Trough',
        color: '#ce93d8',
        desc: `The economy is near its lowest point but may be stabilizing. Forward-looking investors often start buying here, anticipating recovery. Markets frequently bottom before economic data confirms it — patience and discipline are rewarded at troughs. Financial stocks often lead recoveries as rate cuts improve their outlook.`,
      },
    };

    const info = phaseInfo[m.cycle.phase];
    el.innerHTML = `
      <div class="condition-header" style="color:${info.color}">
        ${info.icon} ${info.label}
      </div>
      <div class="condition-body">${info.desc}</div>
      <div class="condition-progress">
        <div class="prog-label">Phase progress: Day ${m.cycle.dayInPhase} / ${m.cycle.phaseDuration}</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${Math.min(100, (m.cycle.dayInPhase / m.cycle.phaseDuration) * 100).toFixed(1)}%; background:${info.color}"></div>
        </div>
      </div>
      <div class="condition-idx">
        COMP Index: <strong style="color:${idx >= 0 ? '#3fb950' : '#f85149'}">${idx >= 0 ? '+' : ''}${idx.toFixed(2)}% total</strong>
      </div>`;
  }

  _renderIndicators() {
    const m  = this.market;
    const el = document.getElementById('indicators-display');

    const rateColor = m.interestRate > 0.07 ? '#f85149' : m.interestRate < 0.03 ? '#3fb950' : '#d29922';
    const infColor  = m.inflation    > 0.05 ? '#f85149' : m.inflation    < 0.02 ? '#58a6ff' : '#3fb950';
    const gdpColor  = m.gdpGrowth    < 0    ? '#f85149' : m.gdpGrowth    > 0.02 ? '#3fb950' : '#d29922';

    el.innerHTML = `
      <div class="indicator-row" title="Set by central bank. Higher rates = more expensive borrowing, lower stock valuations.">
        <span class="ind-label">Fed Rate</span>
        <div class="ind-bar-wrap">
          <div class="ind-bar" style="width:${Math.min(100, (m.interestRate / 0.12) * 100).toFixed(0)}%; background:${rateColor}"></div>
        </div>
        <span class="ind-val" style="color:${rateColor}">${(m.interestRate * 100).toFixed(2)}%</span>
      </div>
      <div class="indicator-row" title="Rate of price increases. High inflation forces rate hikes, pressuring stocks.">
        <span class="ind-label">Inflation</span>
        <div class="ind-bar-wrap">
          <div class="ind-bar" style="width:${Math.min(100, (m.inflation / 0.10) * 100).toFixed(0)}%; background:${infColor}"></div>
        </div>
        <span class="ind-val" style="color:${infColor}">${(m.inflation * 100).toFixed(2)}%</span>
      </div>
      <div class="indicator-row" title="Annualized economic growth rate. Below 0% = recession.">
        <span class="ind-label">GDP Growth</span>
        <div class="ind-bar-wrap">
          <div class="ind-bar" style="width:${Math.max(0, Math.min(100, ((m.gdpGrowth + 0.05) / 0.13) * 100)).toFixed(0)}%; background:${gdpColor}"></div>
        </div>
        <span class="ind-val" style="color:${gdpColor}">${(m.gdpGrowth * 100).toFixed(2)}%</span>
      </div>
      <div class="indicator-legend">
        <span>Rates &gt;7% → growth stocks hurt</span><br>
        <span>Inflation &gt;5% → Fed forced to hike</span><br>
        <span>GDP &lt;0% → recession risk</span>
      </div>`;
  }

  // ─── News feed ────────────────────────────────────────────────────────────
  _addNewsItem(event) {
    this.newsItems.unshift({
      ...event,
      day: this.market.day,
      date: this.market.getDateString(),
      id: Date.now() + Math.random(),
    });
    if (this.newsItems.length > this.maxNews) this.newsItems.pop();
    setText('news-count', this.newsItems.length);
  }

  _renderNews() {
    const el = document.getElementById('news-feed');
    if (!this.newsItems.length) {
      el.innerHTML = '<div class="empty-state">Market news will appear here as events unfold.</div>';
      return;
    }

    const typeColor = {
      EARNINGS_BEAT:  '#3fb950', EARNINGS_MISS: '#f85149', EARNINGS_INLINE: '#8b949e',
      RATE_HIKE:      '#f85149', RATE_CUT:      '#3fb950',
      ECONOMIC_DATA:  '#58a6ff', SECTOR_SHOCK:  '#d29922',
      PHASE_CHANGE:   '#a371f7',
    };
    const typeIcon = {
      EARNINGS_BEAT:  '📈', EARNINGS_MISS: '📉', EARNINGS_INLINE: '📊',
      RATE_HIKE:      '🏦', RATE_CUT:      '🏦',
      ECONOMIC_DATA:  '📋', SECTOR_SHOCK:  '⚡',
      PHASE_CHANGE:   '🔄',
    };

    el.innerHTML = this.newsItems.slice(0, 15).map(item => {
      const color = typeColor[item.type] || '#8b949e';
      const icon  = typeIcon[item.type]  || '📰';
      const sym   = item.symbol ? `<span class="news-sym" style="color:${SECTORS[this.market.stocks[item.symbol]?.sector]?.color||'#fff'}">${item.symbol}</span>` : '';
      const impact = item.impact && Math.abs(item.impact) > 0.1
        ? `<span class="${item.impact >= 0 ? 'up' : 'dn'}">${item.impact >= 0 ? '▲' : '▼'}${Math.abs(item.impact).toFixed(1)}%</span>`
        : '';

      return `
        <div class="news-item" onclick="this.classList.toggle('expanded')">
          <div class="news-main">
            <span class="news-icon">${icon}</span>
            <div class="news-content">
              <div class="news-headline">${sym}${item.headline} ${impact}</div>
              <div class="news-meta" style="color:${color}">Day ${item.day} · ${item.concept || item.type}</div>
            </div>
          </div>
          <div class="news-detail">
            <p>${item.detail.replace(/\n/g, '<br>')}</p>
            ${item.lesson ? `<div class="news-lesson">💡 <strong>Key Lesson:</strong> ${item.lesson}</div>` : ''}
          </div>
        </div>`;
    }).join('');
  }

  // ─── Learning card ────────────────────────────────────────────────────────
  _showLearningCard(concept, lesson) {
    setText('lc-concept', concept);
    setText('lc-text', lesson);
    const card = document.getElementById('learning-card');
    card.classList.remove('hidden');
    card.classList.add('slide-up');
    // Auto-dismiss after 12s
    clearTimeout(this._lcTimer);
    this._lcTimer = setTimeout(() => {
      card.classList.add('hidden');
      card.classList.remove('slide-up');
    }, 12000);
  }

  // ─── Toast notification ───────────────────────────────────────────────────
  showToast(msg, type = 'ok') {
    const el     = document.getElementById('toast');
    const iconEl = document.getElementById('toast-icon');
    const txtEl  = document.getElementById('toast-text');

    const configs = { ok: { icon: '✓', cls: 'ok' }, err: { icon: '✗', cls: 'err' }, warn: { icon: '⚠', cls: 'warn' } };
    const cfg = configs[type] || configs.ok;

    iconEl.textContent = cfg.icon;
    txtEl.textContent  = msg;
    el.className       = `toast ${cfg.cls}`;

    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.add('hidden'), 3500);
  }

  // ─── Glossary ─────────────────────────────────────────────────────────────
  _populateGlossary() {
    document.getElementById('glossary-list').innerHTML = GLOSSARY.map(g => `
      <div class="glossary-entry">
        <div class="gloss-term">${g.term}</div>
        <div class="gloss-def">${g.def}</div>
      </div>`).join('');
  }
}

// ─── Formatting helpers ───────────────────────────────────────────────────────
function fmt$(v) {
  if (v >= 1000) return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return '$' + v.toFixed(2);
}
function fmtDelta$(v) {
  return (v >= 0 ? '+$' : '-$') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtMktCap(v) {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(1)}M`;
  return fmt$(v);
}
function fmtVol(v) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toString();
}
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
