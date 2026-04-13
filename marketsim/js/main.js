'use strict';

// ─── Game singleton ───────────────────────────────────────────────────────────
const game = {
  market:    null,
  portfolio: null,
  charts:    null,
  ui:        null,

  speed:     1,
  paused:    false,
  _interval: null,

  init() {
    this.market    = new MarketEngine(STOCKS_DATA);
    this.portfolio = new Portfolio(CONFIG.startingCash);
    this.charts    = new ChartRenderer();
    this.ui        = new UIManager(this.market, this.portfolio, this.charts);

    // Expose selectStock for onclick handlers
    window.game = this;

    this._bindControls();
    this._startLoop();

    // Initial render before first tick
    this.ui.render([]);

    // Welcome card
    setTimeout(() => {
      this.ui._showLearningCard(
        'Welcome to MarketSim',
        'You start with $10,000. Buy and sell stocks by clicking any row in the table. ' +
        'Watch the Education panel on the right — every market event comes with a real explanation of WHY it happened. ' +
        'Click any news item to expand its full lesson. Use the Glossary button anytime to look up terms. ' +
        'The goal: grow your portfolio and beat the COMP Index benchmark!'
      );
    }, 500);
  },

  _startLoop() {
    clearInterval(this._interval);
    if (!this.paused) {
      this._interval = setInterval(() => this._tick(), Math.floor(CONFIG.baseTickMs / this.speed));
    }
  },

  _tick() {
    const events = this.market.tick();
    this.portfolio.recordDay(this.market.getPrices());
    this.ui.render(events);
  },

  selectStock(symbol) {
    this.ui.selectStock(symbol);
  },

  async saveGame() {
    const wasPaused = this.paused;
    this.paused = true;
    this._startLoop();

    const state = {
        player: {
            name: "Player One",
            cash: this.portfolio.cash,
            portfolio_value: this.portfolio.totalValue(this.market.getPrices()),
            difficulty: "Normal"
        },
        stocks_held: Object.entries(this.portfolio.holdings).map(([sym, h]) => ({
            ticker: sym, quantity: h.shares, average_cost: h.avgCost
        })),
        options_held: [],
        game_time: {
            current_date: this.market.getDateString(),
            day_count: this.market.day
        },
        market_conditions: {
            volatility_index: 0,
            recent_events: [],
            interest_rate: this.market.interestRate,
            inflation: this.market.inflation,
            gdp_growth: this.market.gdpGrowth,
            cycle: this.market.cycle
        },
        game_settings: { sound_enabled: true, music_volume: 0.7 },
        market_stocks_history: this.market.stocks,
        market_index_history: {
            indexValue: this.market.indexValue,
            indexPrevValue: this.market.indexPrevValue,
            indexHistory: this.market.indexHistory
        },
        portfolio_transactions: this.portfolio.transactions,
        portfolio_history: this.portfolio.valueHistory,
    };

    try {
        localStorage.setItem('marketSimSave', JSON.stringify(state));
        this.ui.showToast("Game Saved Successfully!");
    } catch (e) {
        alert("Failed to save to local storage: " + e.message);
    }

    if (!wasPaused) {
        this.paused = false;
        this._startLoop();
    }
  },

  async loadGame() {
    try {
        const saved = localStorage.getItem('marketSimSave');
        if (!saved) throw new Error("No saved game found.");
        const state = JSON.parse(saved);
        
        this.paused = true;
        this._startLoop();
        document.getElementById('pause-btn').textContent = '▶';

        this.portfolio.cash = state.player.cash;
        this.portfolio.holdings = {};
        for (const h of state.stocks_held) {
             this.portfolio.holdings[h.ticker] = { shares: h.quantity, avgCost: h.average_cost };
        }
        
        if (state.portfolio_history) this.portfolio.valueHistory = state.portfolio_history;
        if (state.portfolio_transactions) this.portfolio.transactions = state.portfolio_transactions;

        this.market.day = state.game_time.day_count;
        this.market.interestRate = state.market_conditions.interest_rate;
        this.market.inflation = state.market_conditions.inflation;
        this.market.gdpGrowth = state.market_conditions.gdp_growth;
        this.market.cycle = state.market_conditions.cycle;

        if (state.market_stocks_history) {
            this.market.stocks = state.market_stocks_history;
        }
        if (state.market_index_history) {
            this.market.indexValue = state.market_index_history.indexValue;
            this.market.indexPrevValue = state.market_index_history.indexPrevValue;
            this.market.indexHistory = state.market_index_history.indexHistory;
        }

        this.ui.render([]);
        this.ui.showToast("Game Loaded!");
    } catch(e) {
        alert("Failed to load save file.");
    }
  },

  async exportSave() {
    const saved = localStorage.getItem('marketSimSave');
    if (!saved) {
        alert("No save game exists yet. Click 'Save' first!");
        return;
    }
    const b64 = btoa(encodeURIComponent(saved));
    try {
        await navigator.clipboard.writeText(b64);
        this.ui.showToast("Save string copied to clipboard!");
    } catch (err) {
        prompt("Copy this save string manually:", b64);
        this.ui.showToast("Save string generated!");
    }
  },

  importSave() {
    document.getElementById('import-textarea').value = '';
    document.getElementById('import-modal').classList.remove('hidden');
  },

  async _executeImport(b64) {
    if (!b64) return;
    try {
        const decoded = decodeURIComponent(atob(b64));
        JSON.parse(decoded); // Validate JSON format
        localStorage.setItem('marketSimSave', decoded);
        await this.loadGame();
        document.getElementById('import-modal').classList.add('hidden');
    } catch (e) {
        alert("Invalid save string!");
    }
  },

  _bindControls() {
    const btnSave = document.getElementById('btn-save');
    const btnLoad = document.getElementById('btn-load');
    const btnExport = document.getElementById('btn-export');
    const btnImport = document.getElementById('btn-import');

    if (btnSave) btnSave.addEventListener('click', () => this.saveGame());
    if (btnLoad) btnLoad.addEventListener('click', () => this.loadGame());
    if (btnExport) btnExport.addEventListener('click', () => this.exportSave());
    if (btnImport) btnImport.addEventListener('click', () => this.importSave());

    const importSubmit = document.getElementById('import-submit');
    if (importSubmit) importSubmit.addEventListener('click', () => {
        this._executeImport(document.getElementById('import-textarea').value);
    });

    document.getElementById('import-close').addEventListener('click', () => {
        document.getElementById('import-modal').classList.add('hidden');
    });
    document.getElementById('import-backdrop').addEventListener('click', () => {
        document.getElementById('import-modal').classList.add('hidden');
    });

    // Speed buttons
    document.querySelectorAll('.speed-btn[data-speed]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.speed-btn[data-speed]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.speed  = parseInt(btn.dataset.speed);
        this.paused = false;
        document.getElementById('pause-btn').textContent = '⏸';
        this._startLoop();
      });
    });

    // Pause button
    document.getElementById('pause-btn').addEventListener('click', () => {
      this.paused = !this.paused;
      document.getElementById('pause-btn').textContent = this.paused ? '▶' : '⏸';
      this._startLoop();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === ' ') {
        e.preventDefault();
        document.getElementById('pause-btn').click();
      }
      if (e.key === 'Escape') {
        document.getElementById('close-detail').click();
        document.getElementById('glossary-modal').classList.add('hidden');
        document.getElementById('import-modal').classList.add('hidden');
      }
      if (e.key === '1') document.querySelector('.speed-btn[data-speed="1"]').click();
      if (e.key === '2') document.querySelector('.speed-btn[data-speed="2"]').click();
      if (e.key === '5') document.querySelector('.speed-btn[data-speed="5"]').click();
    });
  },
};

// Boot when DOM is ready
document.addEventListener('DOMContentLoaded', () => game.init());
