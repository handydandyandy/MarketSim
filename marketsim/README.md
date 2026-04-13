# MarketSim — Virtual Economy Game

A browser-based stock market simulation that mimics real financial markets, teaches economic concepts in context, and lets you manage a live portfolio — all running locally with zero dependencies.

Open `index.html` in any modern browser to play. No install, no server, no internet required.

---

## How to Run

```
econ_game/
└── index.html   ← open this
```

Double-click `index.html`, or serve it locally:

```bash
# Python
python3 -m http.server 8000
# then open http://localhost:8000

# Node.js (npx)
npx serve .
```

The game runs entirely in JavaScript in your browser tab. It stops when you close the tab and resets when you reload.

---

## Overview

You start with **$10,000** in virtual cash and a live simulated market of 15 stocks across 5 sectors. Every 1.8 seconds represents one trading day. The economy moves through realistic cycles — expansion, peak, contraction, trough — and every event that moves the market comes with a plain-English explanation of *why*.

The goal: grow your portfolio and outperform the **COMP Index** benchmark.

---

## Layout

The interface is split into three panels:

### Left — Your Portfolio
- Total portfolio value and percentage return since start
- Line chart comparing your portfolio vs the COMP Index over time
- Cash balance, invested value, today's P&L, and "vs Market" comparison
- List of current holdings with per-position return

### Center — The Market
- **COMP Index** — a market-cap-weighted index of all 15 stocks, baseline 1000
- **Sector heat bar** — live average % change for each of the 5 sectors today
- **Stock table** — all 15 stocks with price, daily change, P/E ratio, market cap, volume, and a 30-day sparkline chart
- Filter tabs to view stocks by sector
- **Stock detail panel** — opens when you click a stock row; shows a full price history chart, key metrics, and the trade panel

### Right — Education & News
- **Market Condition** — explains the current economic phase, what it means for investors, and how far through the phase the economy is
- **Economic Indicators** — live bar charts for Fed interest rate, inflation, and GDP growth with contextual explanations
- **Market News** — every event that affects prices appears here; click any item to expand a full explanation and key lesson
- **Glossary button** — opens a searchable reference of 18 financial terms

---

## Trading

1. Click any stock row in the table to open the detail panel
2. Enter a share quantity in the **Shares** input
3. Click **Buy** or **Sell**
4. The cost estimate updates live as you type; it turns red if you can't afford the trade

The detail panel shows:
- Full price chart (up to 252 trading days of history)
- P/E Ratio, Beta, EPS, Dividend Yield, Market Cap, Volume — all with hover tooltips
- Your current holding in that stock (shares owned, average cost, unrealized return)
- Realized P&L is shown in a toast notification after each sell

---

## Controls

| Action | Control |
|--------|---------|
| Pause / resume | `Space` or the ⏸ button |
| Set 1× speed | `1` or the 1× button |
| Set 2× speed | `2` or the 2× button |
| Set 5× speed | `5` or the 5× button |
| Close detail / modal | `Esc` |

**Speed reference:**
- 1× — 1 trading day every 1.8 seconds (~7.5 minutes per trading year)
- 2× — 1 trading day every 0.9 seconds
- 5× — 1 trading day every 0.36 seconds (~1.5 minutes per trading year)

---

## Market Simulation

### Economic Cycle

The engine runs a four-phase economic cycle that loops continuously. Each phase has a different market drift and volatility profile:

| Phase | Typical Duration | Daily Drift | Daily Volatility | Characteristics |
|-------|-----------------|-------------|-----------------|-----------------|
| Expansion | 80–120 days | +0.07% | 0.8% | Rising GDP, low unemployment, bull market |
| Peak | 20–40 days | +0.01% | 1.2% | Growth slowing, high valuations, rising volatility |
| Contraction | 60–100 days | −0.09% | 1.6% | Falling profits, rising unemployment, bear market |
| Trough | 20–40 days | −0.02% | 1.3% | Economy at bottom, markets begin discounting recovery |

Phase transitions are announced as news events with full explanations.

### Price Simulation

Each stock's daily return is the sum of four components:

```
daily_return = (market_return × beta)
             + (sector_return × 0.3)
             + (stock_noise × 0.7)
             + event_impact
             + rate_sensitivity_drag
             + momentum_factor
```

- **Market return** — drawn from a normal distribution with parameters set by the current cycle phase
- **Beta** — amplifies or dampens market moves for each stock (QBIT at 1.9× vs FGRP at 0.6×)
- **Sector return** — each sector has a phase-dependent bias (e.g. Energy outperforms at Peak, Healthcare is defensive in Contractions)
- **Stock noise** — stock-specific random variation
- **Rate sensitivity** — high P/E stocks are penalised when interest rates exceed 6%; bank stocks benefit from higher rates
- **Momentum** — a small carry-forward of recent price direction (trend following)

### Events

Events fire in two ways:

**Scheduled — Earnings Reports**
Every stock reports quarterly earnings every 63 simulated trading days (staggered by stock so they don't all hit at once). The surprise is drawn from a normal distribution with a slight positive skew (companies tend to guide conservatively). A 5%+ beat moves the stock up; a 5%+ miss moves it down.

**Random — Macro & Sector Events (~2% chance per day)**
Three types are randomly selected:

- **Fed rate decision** — raises rates during Expansion/Peak, cuts during Contraction/Trough. Directly updates `interestRate` and creates market-wide pressure.
- **Economic data release** — GDP or jobs report, positive or negative based on the current cycle. Creates broad market movement.
- **Sector shock** — one sector receives a large move (±~1.8%) from industry-specific news. All stocks in that sector are affected simultaneously.

Every event object carries four fields used by the news panel:
- `headline` — one-line summary shown in the news feed
- `detail` — 2–4 paragraphs explaining the mechanism and real-world context
- `concept` — the financial concept being illustrated (e.g. "Earnings Reports", "Interest Rates & The Fed")
- `lesson` — one key takeaway shown in a highlighted box

### Economic Indicators

Three macro variables drift each day based on cycle parameters:

| Indicator | Starting Value | Effect on Stocks |
|-----------|---------------|-----------------|
| Fed Interest Rate | 4.00% | >6% hurts growth stocks; rising rates benefit banks |
| Inflation | 2.50% | High inflation forces rate hikes, pressuring equities |
| GDP Growth | 2.50% | Below 0% = recession territory; signals Contraction phase |

---

## The 15 Stocks

### Technology
| Symbol | Company | Beta | Div. Yield | Notes |
|--------|---------|------|-----------|-------|
| NXUS | Nexus Systems | 1.6 | 0.3% | Cloud infrastructure & AI |
| BYTS | ByteStream Corp | 1.4 | 0% | Social media & advertising |
| QBIT | QuantumBit Labs | 1.9 | 0% | Quantum computing — most volatile |

### Energy
| Symbol | Company | Beta | Div. Yield | Notes |
|--------|---------|------|-----------|-------|
| CRDX | CrudexPetro | 1.1 | 4.5% | Oil & gas — high dividend |
| GRNV | GreenVolt Energy | 1.3 | 1.0% | Solar & wind — growth play |
| FULX | FuelMax Refiners | 0.9 | 3.8% | Refining — relatively stable |

### Finance
| Symbol | Company | Beta | Div. Yield | Notes |
|--------|---------|------|-----------|-------|
| APEX | Apex National Bank | 1.1 | 2.8% | Benefits from high rates |
| VEST | VestCapital Group | 1.2 | 2.2% | Asset management |
| INSX | InsureX Holdings | 0.8 | 3.1% | Insurance — defensive |

### Healthcare
| Symbol | Company | Beta | Div. Yield | Notes |
|--------|---------|------|-----------|-------|
| MEDI | MediCore Pharma | 0.9 | 1.8% | Large pharma — defensive |
| BGEN | BioGenix Research | 1.5 | 0% | Biotech — speculative, pipeline risk |
| HLTH | HealthNet Systems | 0.7 | 1.4% | Healthcare IT — lowest beta |

### Consumer
| Symbol | Company | Beta | Div. Yield | Notes |
|--------|---------|------|-----------|-------|
| RXLT | Retail Nexus Group | 1.0 | 1.5% | E-commerce — market-neutral |
| FGRP | FoodGroup Brands | 0.6 | 4.2% | Staples — most defensive, highest div |
| LUXE | LuxeBrand International | 1.2 | 0.8% | Luxury — cyclical consumer |

**Beta guide:** values below 1.0 are less volatile than the market (defensive); values above 1.0 amplify market moves. QBIT (1.9) will swing nearly twice as hard as the market in either direction. FGRP (0.6) barely reacts.

---

## Education System

Learning happens in three layers:

### 1. Contextual News (right panel)
Every market-moving event generates a news item explaining the real mechanism behind the price move. Click any item to read:
- What happened and why
- How the market mechanism works in reality
- A highlighted "Key Lesson" takeaway

### 2. Learning Cards (bottom popup)
First-time encounters with concepts trigger a dismissible card at the bottom of the screen. These fire once each for:
- Welcome / how to play
- First stock purchase (diversification tip)
- First earnings report
- Each economic cycle phase transition
- Fed rate decisions, economic data releases, sector shocks

### 3. Financial Glossary
The glossary button (bottom of right panel) opens a modal covering 18 terms:

Stock / Share · Market Capitalization · P/E Ratio · EPS · Beta · Dividend Yield · Bull Market · Bear Market · Sector Rotation · Interest Rates · Inflation · Volatility · Earnings Report · Market Cycle · Diversification · Volume · Forward vs Trailing P/E · Short Selling

### 4. Metric Tooltips
Hovering over any metric card in the stock detail panel (P/E, Beta, EPS, Div. Yield, Mkt Cap, Volume) shows a browser tooltip explaining what the number means.

---

## Sector Rotation Reference

This table shows which sectors tend to outperform in each cycle phase — a core real-world investing concept the simulation models directly:

| Phase | Outperforms | Underperforms | Reason |
|-------|------------|--------------|--------|
| Expansion | Technology, Consumer | Healthcare | Growth premium, rising consumer spending |
| Peak | Energy | Technology | Commodity demand peaks; tech valuations stretched |
| Contraction | Healthcare, (FGRP) | Technology, Finance | Defensive demand; credit/growth fears |
| Trough | Finance | Consumer | Rate cuts expand bank margins; recovery anticipated |

---

## File Structure

```
econ_game/
├── index.html          # HTML layout — 3-column shell, all modals
├── style.css           # Dark theme, all component styles (638 lines)
└── js/
    ├── config.js       # Stock data, sector definitions, glossary (60 lines)
    ├── market.js       # MarketEngine — price simulation, events, cycle (388 lines)
    ├── portfolio.js    # Portfolio — buy/sell, holdings, P&L tracking (92 lines)
    ├── charts.js       # ChartRenderer — Canvas price chart, sparklines (185 lines)
    ├── ui.js           # UIManager — all DOM rendering and event handlers (570 lines)
    └── main.js         # Game loop, speed controls, keyboard shortcuts (97 lines)
```

**Total: ~2,270 lines. No build step. No frameworks. No network requests.**

### Module responsibilities

**`config.js`** — Pure data. `STOCKS_DATA` array, `SECTORS` map, `CONFIG` constants, `GLOSSARY` array. Edit this file to add stocks, change starting cash, or adjust simulation speed.

**`market.js`** — `MarketEngine` class. Owns all simulation state: stock prices, economic cycle, interest rates, inflation, GDP. `tick()` advances one trading day and returns an array of event objects. Price simulation uses Box-Muller normal random draws. Event generation is probabilistic.

**`portfolio.js`** — `Portfolio` class. Stateless relative to the market — it only stores cash, holdings (symbol → {shares, avgCost}), and value history. `buy()` and `sell()` return `{ok, msg}` objects. `recordDay()` must be called each tick to update `valueHistory`.

**`charts.js`** — `ChartRenderer` class. Three methods: `drawPriceChart()` for the full stock detail canvas, `drawPortfolioChart()` for the left panel mini-chart, `drawSparkline()` for table row thumbnails. All use the HTML5 Canvas 2D API directly.

**`ui.js`** — `UIManager` class. Reads from `market` and `portfolio`, writes to the DOM. Called once per tick via `render(events)`. Also owns all user interaction logic: trade execution, filter tabs, modal open/close, learning card display, toast notifications.

**`main.js`** — Bootstraps all classes, owns the `setInterval` game loop, wires up speed/pause controls and keyboard shortcuts.

---

## Customisation

All tunable values are in `js/config.js` and the top of `js/market.js`.

**Change starting cash:**
```js
// config.js
const CONFIG = {
  startingCash: 50000,   // ← change this
  ...
};
```

**Change simulation speed:**
```js
// config.js
const CONFIG = {
  baseTickMs: 1800,   // ms per trading day at 1× (lower = faster)
  ...
};
```

**Add a stock:**
```js
// config.js — append to STOCKS_DATA
{ symbol: 'MINE', name: 'My Company', sector: 'TECH',
  price: 100.00, shares: 1e9, beta: 1.2,
  eps: 5.00, divYield: 0.01, desc: 'My company description' },
```

**Change cycle phase durations** — edit the `durations` object inside `_advanceCycle()` in `market.js`.

**Change sector outperformance biases** — edit the `_sectorBias()` method in `market.js`. The values are additional daily drift added on top of the market return for stocks in that sector during each phase.

---

## Known Limitations

- **No save state** — reloading the page resets everything. State is not persisted to localStorage.
- **No short selling** — you can only buy and sell long positions.
- **No fractional shares** — quantities must be whole numbers.
- **Single session** — designed for one player in one browser tab.
- **Simplified fundamentals** — EPS updates on earnings but dividends are display-only (not paid to cash).
