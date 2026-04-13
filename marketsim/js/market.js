'use strict';

class MarketEngine {
  constructor(stocksData) {
    this.day = 0;
    this.interestRate = 0.04;   // 4%
    this.inflation    = 0.025;  // 2.5%
    this.gdpGrowth    = 0.025;  // 2.5%

    // Economic cycle
    this.cycle = {
      phase: 'EXPANSION',
      dayInPhase: 0,
      phaseDuration: 90 + Math.floor(Math.random() * 30),
    };

    this.indexValue     = 1000;
    this.indexPrevValue = 1000;
    this.indexHistory   = [1000];
    this.sectorReturns  = {};
    this.marketReturn   = 0;
    this.pendingEvents  = [];  // events generated this tick

    // Init stocks
    this.stocks = {};
    for (const s of stocksData) {
      this.stocks[s.symbol] = {
        ...s,
        currentPrice: s.price,
        prevPrice: s.price,
        change: 0,
        changePct: 0,
        volume: Math.floor(s.shares * 0.005),
        history: [],
        earningsOffset: Math.floor(Math.random() * 63),
        momentum: 0,
      };
      this._generateInitialHistory(s.symbol);
    }
  }

  // ─── Normal random (Box-Muller) ───────────────────────────────────────────
  _rnd(mean = 0, std = 1) {
    let u, v;
    do { u = Math.random(); } while (u === 0);
    do { v = Math.random(); } while (v === 0);
    return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // ─── Pre-generate 60 days of plausible history ───────────────────────────
  _generateInitialHistory(symbol) {
    const s = this.stocks[symbol];
    let p = s.price * (0.88 + Math.random() * 0.12);
    for (let i = 0; i < 60; i++) {
      p = Math.max(0.50, p * (1 + this._rnd(0.0002, 0.012 * s.beta)));
      s.history.push(p);
    }
    s.history.push(s.price);
    s.currentPrice = s.price;
  }

  // ─── Cycle parameters ────────────────────────────────────────────────────
  _cycleParams() {
    return {
      EXPANSION:   { drift:  0.0007, vol: 0.008,  irDrift:  0.0003, infDrift:  0.0001 },
      PEAK:        { drift:  0.0001, vol: 0.012,  irDrift:  0.0001, infDrift:  0.00005 },
      CONTRACTION: { drift: -0.0009, vol: 0.016,  irDrift: -0.0002, infDrift: -0.00005 },
      TROUGH:      { drift: -0.0002, vol: 0.013,  irDrift: -0.0002, infDrift: -0.00005 },
    }[this.cycle.phase];
  }

  // Extra daily drift by sector during each phase
  _sectorBias(sector) {
    const b = {
      EXPANSION:   { TECH:  0.003, CONSUMER:  0.001, FINANCE:  0.000, ENERGY: -0.001, HEALTH: -0.001 },
      PEAK:        { TECH: -0.001, CONSUMER:  0.000, FINANCE:  0.001, ENERGY:  0.003, HEALTH:  0.001 },
      CONTRACTION: { TECH: -0.003, CONSUMER: -0.001, FINANCE: -0.002, ENERGY: -0.001, HEALTH:  0.002 },
      TROUGH:      { TECH:  0.001, CONSUMER: -0.001, FINANCE:  0.002, ENERGY:  0.000, HEALTH:  0.001 },
    };
    return (b[this.cycle.phase][sector] || 0);
  }

  // ─── Main tick ────────────────────────────────────────────────────────────
  tick() {
    this.day++;
    this.pendingEvents = [];

    this._advanceCycle();
    this._updateMacro();

    const cp = this._cycleParams();
    this.marketReturn = this._rnd(cp.drift, cp.vol);

    // Sector returns
    for (const sector of Object.keys(SECTORS)) {
      this.sectorReturns[sector] =
        this.marketReturn * 0.6 + this._sectorBias(sector) + this._rnd(0, 0.004);
    }

    // Update stocks
    for (const sym of Object.keys(this.stocks)) {
      this._updateStockPrice(sym);
    }

    // Earnings checks
    this._checkEarnings();

    // Random macro events (~2% chance/day)
    if (Math.random() < 0.02) this._spawnMacroEvent();

    // Index
    this.indexPrevValue = this.indexValue;
    this.indexValue     = this._calcIndex();
    this.indexHistory.push(this.indexValue);
    if (this.indexHistory.length > CONFIG.maxHistory) this.indexHistory.shift();

    return [...this.pendingEvents];
  }

  // ─── Economic cycle advancement ──────────────────────────────────────────
  _advanceCycle() {
    this.cycle.dayInPhase++;
    if (this.cycle.dayInPhase < this.cycle.phaseDuration) return;

    const phases    = ['EXPANSION', 'PEAK', 'CONTRACTION', 'TROUGH'];
    const durations = { EXPANSION: 80 + Math.floor(Math.random() * 40),
                        PEAK:      20 + Math.floor(Math.random() * 20),
                        CONTRACTION: 60 + Math.floor(Math.random() * 40),
                        TROUGH:    20 + Math.floor(Math.random() * 30) };
    const prev = this.cycle.phase;
    const next = phases[(phases.indexOf(prev) + 1) % phases.length];

    this.cycle = { phase: next, dayInPhase: 0, phaseDuration: durations[next] };
    this.pendingEvents.push(this._phaseChangeEvent(prev, next));
  }

  // ─── Macro indicator drift ────────────────────────────────────────────────
  _updateMacro() {
    const cp = this._cycleParams();
    this.interestRate = Math.max(0.005, Math.min(0.12,
      this.interestRate + this._rnd(cp.irDrift, 0.0002)));
    this.inflation = Math.max(0.001, Math.min(0.15,
      this.inflation + this._rnd(cp.infDrift, 0.0001)));
    const gdpDrift = { EXPANSION: 0.0001, PEAK: 0.00005, CONTRACTION: -0.0001, TROUGH: -0.00005 };
    this.gdpGrowth = Math.max(-0.05, Math.min(0.08,
      this.gdpGrowth + this._rnd(gdpDrift[this.cycle.phase], 0.0001)));
  }

  // ─── Individual stock price update ───────────────────────────────────────
  _updateStockPrice(symbol) {
    const s = this.stocks[symbol];

    // High-P/E stocks hurt more by rising rates
    const pe = s.currentPrice / Math.max(0.01, s.eps);
    const ratePenalty = (pe > 20 && this.interestRate > 0.06)
      ? -0.0005 * (pe - 20) * (this.interestRate - 0.06) * 10 : 0;

    // Bank stocks benefit from rising rates (wider net interest margins)
    const rateBonus = (s.sector === 'FINANCE' && this.interestRate > 0.04)
      ? 0.0003 * (this.interestRate - 0.04) * 100 : 0;

    const marketComponent = this.marketReturn * s.beta;
    const sectorComponent = this.sectorReturns[s.sector] * 0.3;
    const stockNoise      = this._rnd(0, 0.007 * s.beta);

    // Light momentum (trend-following)
    s.momentum = s.momentum * 0.85 + (s.changePct / 100) * 0.15;
    const momentumBoost = s.momentum * 0.08;

    const totalReturn = marketComponent + sectorComponent + stockNoise * 0.7
                      + ratePenalty + rateBonus + momentumBoost;

    s.prevPrice    = s.currentPrice;
    s.currentPrice = Math.max(0.50, s.currentPrice * (1 + totalReturn));
    s.change       = s.currentPrice - s.prevPrice;
    s.changePct    = (s.change / s.prevPrice) * 100;

    // Volume spikes on bigger moves
    s.volume = Math.floor(s.shares * 0.005 * (0.7 + 3 * Math.abs(totalReturn) * 100 + Math.random() * 0.6));

    s.history.push(s.currentPrice);
    if (s.history.length > CONFIG.maxHistory) s.history.shift();
  }

  // ─── Quarterly earnings (every 63 days, staggered per stock) ─────────────
  _checkEarnings() {
    for (const [sym, s] of Object.entries(this.stocks)) {
      if (this.day < 5) continue;
      if ((this.day - s.earningsOffset) % 63 !== 0) continue;

      // Surprise: slightly positive skew (companies tend to guide conservatively)
      const surprise  = this._rnd(0.02, 0.13);
      const impact    = surprise * 0.45;

      s.currentPrice = Math.max(0.50, s.currentPrice * (1 + impact));
      s.change       = s.currentPrice - s.prevPrice;
      s.changePct    = (s.change / s.prevPrice) * 100;

      // EPS grows/shrinks with earnings
      s.eps = Math.max(0.01, s.eps * (1 + this._rnd(0.02, 0.12)));

      const beat = surprise > 0.05, miss = surprise < -0.05;
      this.pendingEvents.push({
        type:     beat ? 'EARNINGS_BEAT' : miss ? 'EARNINGS_MISS' : 'EARNINGS_INLINE',
        symbol:   sym,
        sector:   null,
        impact:   impact * 100,
        headline: beat
          ? `${s.name} beats earnings by ${(surprise * 100).toFixed(1)}% — stock surges`
          : miss
          ? `${s.name} misses earnings — EPS below expectations`
          : `${s.name} reports in-line quarterly results`,
        detail: beat
          ? `${s.name} (${sym}) reported quarterly earnings that beat analyst expectations by ${(surprise * 100).toFixed(1)}%. When a company earns more than investors expected, it signals stronger business health, causing buyers to pile in and push the price up. This is an "earnings beat." Analysts publish estimates before each earnings report, and beating those estimates — even slightly — often produces an outsized price reaction.`
          : miss
          ? `${s.name} (${sym}) missed analyst estimates this quarter. Disappointed investors sold shares, driving the price down. Stocks are priced based on future profit expectations — if a company signals it\'s growing slower than hoped, investors re-price it lower. Even a tiny miss can cause a large drop because it changes confidence in future guidance.`
          : `${s.name} (${sym}) reported results roughly in line with analyst expectations. With no surprise in either direction, the market reaction is muted. This is common — markets often "price in" expected results beforehand, so when those results arrive, there\'s little new information to act on.`,
        concept: 'Earnings Reports',
        lesson:  beat
          ? `Stocks often move more on how earnings compare to expectations than on whether the company made a profit. Beating expectations = stock up; missing = stock down.`
          : `Analyst consensus estimates set the bar. A company can be profitable yet still fall if it earns less than investors hoped. That gap between expectation and reality drives price movement.`,
      });
    }
  }

  // ─── Macro event generator ────────────────────────────────────────────────
  _spawnMacroEvent() {
    const roll = Math.random();

    if (roll < 0.35) {
      // Fed rate decision
      const hiking = this.cycle.phase === 'EXPANSION' || this.cycle.phase === 'PEAK';
      const delta  = hiking ? 0.0025 : -0.0025;
      this.interestRate = Math.max(0.005, Math.min(0.12, this.interestRate + delta));

      this.pendingEvents.push({
        type:     hiking ? 'RATE_HIKE' : 'RATE_CUT',
        symbol:   null, sector: null,
        impact:   hiking ? -1.2 : 1.2,
        headline: hiking
          ? `Fed raises rates to ${(this.interestRate * 100).toFixed(2)}% to fight inflation`
          : `Fed cuts rates to ${(this.interestRate * 100).toFixed(2)}% to stimulate economy`,
        detail: hiking
          ? `The Federal Reserve raised its benchmark interest rate to ${(this.interestRate * 100).toFixed(2)}%. Higher rates make borrowing more expensive for businesses and consumers, slowing economic activity and investment. This generally lowers stock valuations because:\n1) Future profits are worth less when discounted at higher rates.\n2) Safer assets like bonds become more competitive with stocks.\n3) Companies pay more interest on their debt, cutting profits.\nGrowth stocks (high P/E) are hit hardest because much of their value comes from far-future earnings.`
          : `The Federal Reserve cut its benchmark interest rate to ${(this.interestRate * 100).toFixed(2)}%. Lower rates stimulate the economy by making borrowing cheaper. This tends to boost stock prices because:\n1) Future profits are worth more when discounted at lower rates.\n2) Bonds yield less, making stocks relatively more attractive.\n3) Companies pay less interest, improving their profitability.\nGrowth and technology stocks typically benefit most from rate cuts.`,
        concept: 'Interest Rates & The Fed',
        lesson:  hiking
          ? `Rising rates = headwind for stocks, especially high-P/E growth companies. Banks (APEX, VEST) are an exception — they profit from higher rates.`
          : `Falling rates = tailwind for stocks. The phrase "Don\'t fight the Fed" refers to aligning investments with central bank policy direction.`,
      });

    } else if (roll < 0.65) {
      // Economic data release
      const gdpStrong = this.gdpGrowth > 0.015;
      const jobsNum   = Math.floor(150 + (gdpStrong ? 1 : -1) * Math.random() * 120);
      const isGdp     = Math.random() < 0.5;

      this.pendingEvents.push({
        type:     'ECONOMIC_DATA',
        symbol:   null, sector: null,
        impact:   gdpStrong ? 0.7 : -0.7,
        headline: isGdp
          ? `GDP ${gdpStrong ? 'exceeds' : 'misses'} forecasts at ${(this.gdpGrowth * 100).toFixed(1)}% annualized`
          : `Jobs report: ${jobsNum}K jobs added, ${gdpStrong ? 'above' : 'below'} expectations`,
        detail: isGdp
          ? `Gross Domestic Product (GDP) is the broadest measure of economic output — the total value of all goods and services produced. ${gdpStrong ? 'Strong' : 'Weak'} GDP growth signals ${gdpStrong ? 'a healthy economy, supporting corporate revenues and profits — investors respond positively.' : 'economic slowdown, threatening corporate profits and often triggering selling across markets.'} GDP data arrives quarterly and is one of the most closely watched economic reports.`
          : `The monthly jobs report (non-farm payrolls) shows how many new jobs were created. ${gdpStrong ? `A strong ${jobsNum}K reading signals businesses are confident enough to hire — good for consumer spending and corporate profits.` : `A weak ${jobsNum}K reading signals slowing business activity and can cause investors to fear a recession.`} Employment is a "lagging indicator" — it reflects economic conditions that already existed, so markets sometimes move ahead of the data.`,
        concept: 'Economic Indicators',
        lesson:  `GDP and employment data give investors a read on the economy\'s health. Strong data → stocks rise. Weak data → stocks fall. These reports arrive on a fixed schedule, creating predictable moments of volatility.`,
      });

    } else {
      // Sector shock
      const sectors  = Object.keys(SECTORS);
      const sector   = sectors[Math.floor(Math.random() * sectors.length)];
      const positive = Math.random() > 0.5;
      const sectorInfo = {
        TECH:     { pos: 'AI chip breakthrough sparks broad tech rally',          neg: 'Antitrust investigation weighs on big tech stocks' },
        ENERGY:   { pos: 'OPEC+ announces production cuts — oil prices surge',    neg: 'Renewable subsidy boost pressures fossil fuel stocks' },
        FINANCE:  { pos: 'Stress tests clear all major banks; buybacks ahead',    neg: 'Loan default rates rise, credit concerns hit financials' },
        HEALTH:   { pos: 'FDA fast-tracks approval for blockbuster drug',         neg: 'Drug price controls legislation threatens pharma margins' },
        CONSUMER: { pos: 'Consumer confidence surges to multi-year high',         neg: 'Retail sales miss as households tighten spending' },
      };

      // Apply shock to sector stocks
      for (const [sym, s] of Object.entries(this.stocks)) {
        if (s.sector !== sector) continue;
        const shockR   = (positive ? 0.018 : -0.018) + this._rnd(0, 0.006);
        s.currentPrice = Math.max(0.50, s.currentPrice * (1 + shockR));
        s.change       = s.currentPrice - s.prevPrice;
        s.changePct    = (s.change / s.prevPrice) * 100;
      }

      this.pendingEvents.push({
        type:     'SECTOR_SHOCK',
        symbol:   null, sector,
        impact:   positive ? 2.0 : -2.0,
        headline: positive ? sectorInfo[sector].pos : sectorInfo[sector].neg,
        detail: `This is a sector-wide event affecting all ${SECTORS[sector].name} stocks. Sector shocks happen when news specifically affects an entire industry — regulations, commodity prices, technological shifts, or demand changes. Because all companies in a sector face similar business conditions, investors tend to buy or sell the whole group simultaneously.\n\nThis is why portfolio diversification across sectors matters: a single sector event can wipe out gains if all your holdings are in one industry.`,
        concept: 'Sector Dynamics',
        lesson:  `Sector-specific news moves entire industries together. Owning stocks in multiple sectors reduces the damage from any one sector's bad news — that's diversification in action.`,
      });
    }
  }

  // ─── Phase change events (educational) ────────────────────────────────────
  _phaseChangeEvent(prev, next) {
    const info = {
      'EXPANSION->PEAK': {
        headline: 'Market reaches peak — growth maxing out, volatility building',
        detail:   'The economy has hit its peak — the highest point in the current cycle. Growth is still positive but slowing. Interest rates may be elevated from fighting inflation. Stock valuations look stretched compared to historical averages. This phase is characterized by increasing volatility as investors debate how much longer the bull run can last. Historically, peaks are followed by corrections or bear markets.',
        concept: 'Market Cycle: Peak',
        lesson:  'Peaks are only obvious in hindsight. Warning signs include: high valuations (P/E ratios well above average), slowing earnings growth, elevated rates, and reduced economic momentum.',
      },
      'PEAK->CONTRACTION': {
        headline: '⚠️ Economy enters contraction — bear market conditions developing',
        detail:   'The economy has moved into contraction. GDP growth is slowing or turning negative, unemployment is rising, and corporate profits are under pressure. Stock prices typically fall significantly — a drop of 20%+ from peak is officially a "bear market." Sectors hit hardest include Technology (high valuations), Consumer Discretionary, and Financials. Defensive sectors like Healthcare and Consumer Staples tend to hold up better.\n\nThis phase feels scary but is a normal and necessary part of the cycle — it clears excesses, brings valuations back to earth, and sets the stage for the next recovery.',
        concept: 'Bear Markets',
        lesson:  'Bear markets average a -36% decline and last ~9 months historically. Investors who hold diversified portfolios and avoid panic-selling typically recover and go on to new highs.',
      },
      'CONTRACTION->TROUGH': {
        headline: 'Economy approaching trough — markets searching for a bottom',
        detail:   'The economy is at or near its lowest point. Conditions are still difficult — unemployment is elevated, GDP growth may be negative — but forward-looking investors begin positioning for recovery. Markets often bottom before the economy does, sometimes months earlier.\n\nThis "climbing the wall of worry" effect happens because stock prices reflect future expected profits, not today\'s conditions. Savvy investors buy when news is worst but the outlook starts to improve.',
        concept: 'Market Bottoms',
        lesson:  'The best time to buy is often when the news is worst. Markets lead the economy — prices typically recover 6-12 months before economic data confirms a turnaround.',
      },
      'TROUGH->EXPANSION': {
        headline: '🚀 New expansion begins — bull market recovery underway',
        detail:   'The economy has entered a new expansion phase. GDP is growing, jobs are being created, and central banks often support recovery with lower interest rates. This typically coincides with the start of a new bull market. The sectors that typically lead out of a trough: Financials (rate cuts boost lending margins), Consumer Discretionary (spending recovers), and Technology (growth premium expands with lower rates).\n\nHistorically, the early stages of a new bull market produce the highest returns — often 50-100% from trough to the next peak.',
        concept: 'Bull Markets & Recovery',
        lesson:  'Investors who buy during bear markets earn the highest long-term returns. The challenge: things look bleakest at exactly the right time to invest.',
      },
    };

    const key = `${prev}->${next}`;
    const ev  = info[key] || {
      headline: `Economy transitions: ${prev} → ${next}`,
      detail:   'Economic cycles naturally rotate through four phases. Each creates different opportunities across sectors.',
      concept: 'Economic Cycles',
      lesson:  'Understanding cycle phases helps predict which sectors will outperform. No phase lasts forever.',
    };

    return { type: 'PHASE_CHANGE', symbol: null, sector: null, impact: 0, ...ev };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  _calcIndex() {
    let cur = 0, base = 0;
    for (const s of Object.values(this.stocks)) {
      cur  += s.currentPrice * s.shares;
      base += s.price        * s.shares;
    }
    return (cur / base) * 1000;
  }

  getIndexChangePct() {
    return ((this.indexValue - this.indexPrevValue) / this.indexPrevValue) * 100;
  }

  getSectorSummary() {
    const out = {};
    for (const sector of Object.keys(SECTORS)) {
      let total = 0, n = 0;
      for (const s of Object.values(this.stocks)) {
        if (s.sector === sector) { total += s.changePct; n++; }
      }
      out[sector] = n ? total / n : 0;
    }
    return out;
  }

  getPrices() {
    const p = {};
    for (const [sym, s] of Object.entries(this.stocks)) p[sym] = s.currentPrice;
    return p;
  }

  // Human-readable date string from day number
  getDateString() {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const totalDays = this.day;
    const year  = Math.floor(totalDays / 252) + 1;
    const doy   = ((totalDays - 1) % 252) + 1;   // 1-252
    const monthIdx = Math.min(11, Math.floor((doy - 1) / 21));
    const dayNum   = ((doy - 1) % 21) + 1;
    return `${months[monthIdx]} ${dayNum}, Year ${year}`;
  }
}
