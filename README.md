<div align="center">
  <h1>📈 MarketSim — Virtual Economy Simulator</h1>
  <p>A real-time stock market simulator that teaches you how the economy works.<br>No real money. No risk. Just learning.</p>

  <a href="https://marketsimulator1.netlify.app/"><strong>▶ Play Now</strong></a>
</div>

---

## 🎮 How to Play

### Getting Started
1. **Open the game** at [marketsimulator1.netlify.app](https://marketsimulator1.netlify.app/)
2. You start with **$10,000 in cash**. Your goal is to grow your portfolio and beat the COMP Index benchmark.
3. The market simulates real economic cycles — expansions, peaks, contractions, and troughs. Learn to ride each one.

### Buying & Selling Stocks
1. **Browse the stock table** in the center panel. You'll see 24 stocks across 5 sectors: Technology, Energy, Finance, Healthcare, and Consumer.
2. **Click any stock row** to open its detail view with a price chart, P/E ratio, beta, EPS, dividend yield, and more.
3. **Enter a quantity** in the "Shares" input and click **Buy** or **Sell**.
4. Your holdings, cash balance, and portfolio performance update instantly in the left panel.

### Understanding the Market
- **COMP Index** — The composite index at the top tracks the overall market. Try to beat it!
- **Sector Badges** — Color-coded sector performance shows which industries are hot or cold right now.
- **Economic Indicators** — The right panel shows Fed Rate, Inflation, and GDP Growth. These drive the entire market cycle.
- **Market News** — Click any news item to expand it and read a detailed lesson about *why* the event happened.

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Space` | Pause / Resume |
| `1` `2` `5` | Set speed to 1×, 2×, or 5× |
| `Esc` | Close stock detail / Close modals |

---

## 💾 Save System

MarketSim uses a **Cookie Clicker-style save system**. Your progress is stored in your browser's local storage automatically when you click Save.

| Button | What it does |
|--------|-------------|
| **Save** | Saves your full game state (portfolio, market history, economic cycle) to your browser |
| **Load** | Restores your last saved game |
| **Export** | Copies your entire save as a Base64 text string to your clipboard |
| **Import** | Opens a modal where you can paste a save string to restore your game on any device |

### How to Transfer Your Save to Another Device
1. Click **Export** — the save string is copied to your clipboard.
2. Paste it somewhere safe (a text file, Discord message, email to yourself, etc).
3. On your other device, open the game, click **Import**, paste the string, and click **Load and Resume**.

> ⚠️ **Warning:** Clearing your browser cache will delete your local save. Use **Export** regularly to back up your progress!

---

## 📚 Learning Features

- **Financial Glossary** — Click the 📚 button in the right panel to open a full dictionary of investing terms (P/E ratio, beta, short selling, etc).
- **Learning Cards** — Context-sensitive tips pop up at key moments to explain real financial concepts as they happen in your game.
- **News Lessons** — Every market event (earnings reports, rate changes, sector shocks) comes with a detailed real-world explanation.

---

## 🛠 Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript — no frameworks, no build tools, no dependencies
- **Hosting:** [Netlify](https://netlify.com) (free static hosting)
- **Save System:** Browser `localStorage` + Base64 export/import

---

## 🚀 Run Locally

No server required. Just clone and open:

```bash
git clone https://github.com/YOUR_USERNAME/MarketSim.git
cd MarketSim
# Open index.html in your browser
start index.html    # Windows
open index.html     # macOS
```

---

## 📄 License

This project is open source. Feel free to fork, modify, and deploy your own version.
