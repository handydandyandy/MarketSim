'use strict';

class Portfolio {
  constructor(startingCash) {
    this.cash         = startingCash;
    this.holdings     = {};        // symbol → { shares, avgCost }
    this.transactions = [];
    this.valueHistory = [startingCash];  // total value per day
    this.startValue   = startingCash;
    this.prevDayValue = startingCash;
    this.seenConcepts = new Set();  // to gate first-time learning cards
  }

  // ─── Trading ──────────────────────────────────────────────────────────────
  buy(symbol, shares, price) {
    const cost = shares * price;
    if (cost > this.cash) return { ok: false, msg: `Insufficient cash. Need $${cost.toFixed(2)}, have $${this.cash.toFixed(2)}.` };
    if (shares <= 0)       return { ok: false, msg: 'Enter a valid share count.' };

    this.cash -= cost;
    if (!this.holdings[symbol]) {
      this.holdings[symbol] = { shares: 0, avgCost: 0 };
    }
    const h = this.holdings[symbol];
    h.avgCost = (h.avgCost * h.shares + price * shares) / (h.shares + shares);
    h.shares += shares;

    this.transactions.push({ day: null, type: 'BUY', symbol, shares, price, total: cost });
    return { ok: true, msg: `Bought ${shares} share${shares !== 1 ? 's' : ''} of ${symbol} @ $${price.toFixed(2)}` };
  }

  sell(symbol, shares, price) {
    const h = this.holdings[symbol];
    if (!h || h.shares < shares) return { ok: false, msg: `You only hold ${h ? h.shares : 0} shares of ${symbol}.` };
    if (shares <= 0)              return { ok: false, msg: 'Enter a valid share count.' };

    const proceeds   = shares * price;
    const gainLoss   = (price - h.avgCost) * shares;
    const gainLossPct = ((price - h.avgCost) / h.avgCost) * 100;

    this.cash  += proceeds;
    h.shares   -= shares;
    if (h.shares <= 0) delete this.holdings[symbol];

    this.transactions.push({ day: null, type: 'SELL', symbol, shares, price, total: proceeds, gainLoss });
    return {
      ok: true,
      msg: `Sold ${shares} share${shares !== 1 ? 's' : ''} of ${symbol} @ $${price.toFixed(2)}`,
      gainLoss,
      gainLossPct,
    };
  }

  // ─── Value calculations ───────────────────────────────────────────────────
  totalValue(prices) {
    let inv = 0;
    for (const [sym, h] of Object.entries(this.holdings)) {
      inv += h.shares * (prices[sym] || 0);
    }
    return this.cash + inv;
  }

  investedValue(prices) {
    let v = 0;
    for (const [sym, h] of Object.entries(this.holdings)) {
      v += h.shares * (prices[sym] || 0);
    }
    return v;
  }

  dailyPnL(prices) {
    return this.totalValue(prices) - this.prevDayValue;
  }

  recordDay(prices) {
    const currentVal = this.totalValue(prices);
    this.valueHistory.push(currentVal);
    if (this.valueHistory.length > CONFIG.maxHistory) this.valueHistory.shift();
    // Cache yesterday's end-of-day value so Today's P&L tracks against it
    this.prevDayValue = this.valueHistory.length > 1 
      ? this.valueHistory[this.valueHistory.length - 2] 
      : this.startValue;
  }

  totalReturn(prices) {
    return ((this.totalValue(prices) - this.startValue) / this.startValue) * 100;
  }

  holdingReturn(symbol, currentPrice) {
    const h = this.holdings[symbol];
    if (!h) return null;
    const pct = ((currentPrice - h.avgCost) / h.avgCost) * 100;
    const abs = (currentPrice - h.avgCost) * h.shares;
    return { pct, abs, shares: h.shares, avgCost: h.avgCost };
  }
}
