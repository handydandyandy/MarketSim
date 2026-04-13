'use strict';

const CONFIG = {
  startingCash: 10000,
  baseTickMs: 1800,    // ms per simulated trading day at 1× speed
  maxHistory: 252,     // 1 trading year
};

const SECTORS = {
  TECH:     { name: 'Technology',  color: '#4fc3f7' },
  ENERGY:   { name: 'Energy',      color: '#ffb74d' },
  FINANCE:  { name: 'Finance',     color: '#81c784' },
  HEALTH:   { name: 'Healthcare',  color: '#f48fb1' },
  CONSUMER: { name: 'Consumer',    color: '#ce93d8' },
};

// 15 companies, 3 per sector
const STOCKS_DATA = [
  // TECHNOLOGY
  { symbol: 'NXUS', name: 'Nexus Systems',          sector: 'TECH',     price: 312.45, shares: 3.2e9, beta: 1.6, eps: 9.80,  divYield: 0.003, desc: 'Cloud infrastructure & AI services' },
  { symbol: 'BYTS', name: 'ByteStream Corp',         sector: 'TECH',     price: 87.20,  shares: 8.5e9, beta: 1.4, eps: 3.40,  divYield: 0.000, desc: 'Social media & digital advertising' },
  { symbol: 'QBIT', name: 'QuantumBit Labs',         sector: 'TECH',     price: 156.80, shares: 1.8e9, beta: 1.9, eps: 2.10,  divYield: 0.000, desc: 'Quantum computing & semiconductors' },
  // ENERGY
  { symbol: 'CRDX', name: 'CrudexPetro',             sector: 'ENERGY',   price: 68.30,  shares: 4.5e9, beta: 1.1, eps: 7.20,  divYield: 0.045, desc: 'Oil & gas exploration & production' },
  { symbol: 'GRNV', name: 'GreenVolt Energy',        sector: 'ENERGY',   price: 43.60,  shares: 2.1e9, beta: 1.3, eps: 1.20,  divYield: 0.010, desc: 'Solar & wind energy generation' },
  { symbol: 'FULX', name: 'FuelMax Refiners',        sector: 'ENERGY',   price: 51.90,  shares: 3.0e9, beta: 0.9, eps: 5.80,  divYield: 0.038, desc: 'Petroleum refining & distribution' },
  // FINANCE
  { symbol: 'APEX', name: 'Apex National Bank',      sector: 'FINANCE',  price: 145.20, shares: 2.8e9, beta: 1.1, eps: 12.40, divYield: 0.028, desc: 'Commercial & investment banking' },
  { symbol: 'VEST', name: 'VestCapital Group',       sector: 'FINANCE',  price: 98.50,  shares: 1.5e9, beta: 1.2, eps: 8.90,  divYield: 0.022, desc: 'Asset management & wealth advisory' },
  { symbol: 'INSX', name: 'InsureX Holdings',        sector: 'FINANCE',  price: 76.40,  shares: 2.2e9, beta: 0.8, eps: 6.20,  divYield: 0.031, desc: 'Diversified insurance services' },
  // HEALTHCARE
  { symbol: 'MEDI', name: 'MediCore Pharma',         sector: 'HEALTH',   price: 203.70, shares: 1.6e9, beta: 0.9, eps: 14.30, divYield: 0.018, desc: 'Prescription drugs & medical devices' },
  { symbol: 'BGEN', name: 'BioGenix Research',       sector: 'HEALTH',   price: 124.50, shares: 0.9e9, beta: 1.5, eps: 3.20,  divYield: 0.000, desc: 'Biotechnology & gene therapy' },
  { symbol: 'HLTH', name: 'HealthNet Systems',       sector: 'HEALTH',   price: 89.80,  shares: 3.4e9, beta: 0.7, eps: 7.10,  divYield: 0.014, desc: 'Healthcare IT & hospital software' },
  // CONSUMER
  { symbol: 'RXLT', name: 'Retail Nexus Group',      sector: 'CONSUMER', price: 178.90, shares: 2.0e9, beta: 1.0, eps: 11.20, divYield: 0.015, desc: 'Omnichannel retail & e-commerce' },
  { symbol: 'FGRP', name: 'FoodGroup Brands',        sector: 'CONSUMER', price: 62.30,  shares: 5.5e9, beta: 0.6, eps: 4.80,  divYield: 0.042, desc: 'Consumer food & beverage brands' },
  { symbol: 'LUXE', name: 'LuxeBrand International', sector: 'CONSUMER', price: 234.60, shares: 0.7e9, beta: 1.2, eps: 9.50,  divYield: 0.008, desc: 'Luxury fashion & lifestyle brands' },

  // NEW ADDITIONS: REAL WORLD PROXIES
  { symbol: 'AAPL', name: 'Apple Inc.',              sector: 'TECH',     price: 185.20, shares: 15.0e9, beta: 1.2, eps: 6.40, divYield: 0.005, desc: 'Consumer electronics & services leader' },
  { symbol: 'MSFT', name: 'Microsoft Corp.',         sector: 'TECH',     price: 380.50, shares: 7.4e9,  beta: 1.1, eps: 11.10, divYield: 0.008, desc: 'Enterprise software & cloud computing' },
  { symbol: 'TSLA', name: 'Tesla Motors',            sector: 'CONSUMER', price: 240.10, shares: 3.1e9,  beta: 2.1, eps: 3.10, divYield: 0.000, desc: 'Electric vehicles & clean energy' },
  { symbol: 'AMZN', name: 'Amazon.com',              sector: 'CONSUMER', price: 145.40, shares: 10.3e9, beta: 1.4, eps: 2.90, divYield: 0.000, desc: 'Global retail cloud & logistics operator' },
  { symbol: 'JPM',  name: 'JP Morgan Chase',         sector: 'FINANCE',  price: 170.80, shares: 2.8e9,  beta: 1.1, eps: 15.20, divYield: 0.025, desc: 'Multinational banking & financial powerhouse' },
  { symbol: 'JNJ',  name: 'Johnson & Johnson',       sector: 'HEALTH',   price: 155.30, shares: 2.4e9,  beta: 0.6, eps: 9.90, divYield: 0.030, desc: 'Pharma & consumer healthcare conglomerate' },
  { symbol: 'WMT',  name: 'Walmart Inc.',            sector: 'CONSUMER', price: 60.10,  shares: 8.0e9,  beta: 0.5, eps: 2.20, divYield: 0.015, desc: 'Multinational retail corporation' },
  { symbol: 'XOM',  name: 'Exxon Mobil',             sector: 'ENERGY',   price: 105.70, shares: 4.0e9,  beta: 0.9, eps: 8.50, divYield: 0.035, desc: 'Multinational oil & gas corporation' },
  { symbol: 'NVDX', name: 'Nvidia Corp Proxy',       sector: 'TECH',     price: 520.10, shares: 2.4e9,  beta: 1.8, eps: 12.10, divYield: 0.001, desc: 'AI hardware and accelerated computing' },
];

const GLOSSARY = [
  { term: 'Stock / Share',       def: 'A small ownership piece of a company. If a company has 1 billion shares and you own 1,000, you own 0.0001% of that company — including a claim on its future profits.' },
  { term: 'Market Capitalization', def: 'Total value the market assigns to a company = Share Price × Total Shares Outstanding. A $100 stock with 1B shares = $100B market cap. It reflects what investors collectively think the whole company is worth.' },
  { term: 'P/E Ratio',           def: 'Price-to-Earnings ratio. How much investors pay per $1 of annual profit. P/E of 20 means you pay $20 for every $1 earned. High P/E = expensive or high-growth expectations. Low P/E = cheap or slow-growth.' },
  { term: 'EPS (Earnings Per Share)', def: 'Annual company profit ÷ total shares outstanding. A company earning $1B with 100M shares has $10 EPS. Rising EPS usually drives stock prices up.' },
  { term: 'Beta',                def: 'Measures a stock\'s volatility relative to the market. Beta 1.0 = moves with the market. Beta 2.0 = moves twice as much (great in rallies, painful in crashes). Beta 0.5 = half as volatile.' },
  { term: 'Dividend Yield',      def: 'Annual cash payment to shareholders as % of stock price. A $100 stock paying $3/year = 3% yield. Mature companies share profits as dividends; growth companies reinvest instead.' },
  { term: 'Bull Market',         def: 'A sustained period of rising stock prices (typically 20%+ gain). Fueled by economic optimism, strong earnings, and low rates. Historically lasts longer than bear markets.' },
  { term: 'Bear Market',         def: 'A sustained decline of 20%+ from recent highs. Driven by economic slowdowns, rising rates, or crises. Historically painful but temporary — markets have always eventually recovered.' },
  { term: 'Sector Rotation',     def: 'Investors shifting money between industries as economic conditions change. In recessions, defensive sectors (healthcare, consumer staples) attract money. In booms, cyclicals (tech, financials) lead.' },
  { term: 'Interest Rates',      def: 'Set by central banks to control the economy. Higher rates = more expensive loans = slower growth = lower stock valuations. Lower rates = cheaper credit = faster growth. One of the most powerful market forces.' },
  { term: 'Inflation',           def: 'The rate at which prices rise over time. Moderate inflation (2-3%) is healthy. High inflation erodes purchasing power and forces central banks to raise rates, pressuring stock prices.' },
  { term: 'Volatility',          def: 'How wildly a price swings. Measured as the standard deviation of returns. High volatility = bigger moves up AND down. The VIX index tracks expected market volatility and is called the "fear gauge."' },
  { term: 'Earnings Report',     def: 'Quarterly financial results every public company must publish. Shows revenue, profit, and guidance. The most important date on a stock\'s calendar — prices can jump or crash 10-20% on earnings day.' },
  { term: 'Market Cycle',        def: 'Economies move through four repeating phases: Expansion (growth) → Peak (peak growth) → Contraction (slowdown) → Trough (bottom). Each phase creates different winners and losers across sectors.' },
  { term: 'Diversification',     def: '"Don\'t put all your eggs in one basket." Spreading investments across companies, sectors, and asset types reduces risk. A single stock can go to zero; a diversified portfolio rarely does.' },
  { term: 'Volume',              def: 'Number of shares traded in a session. High volume on a price move confirms conviction behind it. Low volume moves may reverse. Unusual volume spikes often signal big news ahead.' },
  { term: 'Forward P/E vs Trailing P/E', def: 'Trailing P/E uses last 12 months of actual earnings. Forward P/E uses next 12 months of analyst estimates. Investors usually pay more for expected future growth than past results.' },
  { term: 'Short Selling',       def: 'Borrowing shares to sell them now, hoping to buy them back cheaper later. Profits when stocks fall. Risky because losses are theoretically unlimited (stocks can rise infinitely but only fall to zero).' },
];
