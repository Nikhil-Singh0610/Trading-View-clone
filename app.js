// API Keys
const API_KEY = "your_alpha_vantage_api_key"; // <-- Replace with your AlphaVantage key
const BINANCE_API_KEY = "your_binance_testnet_api_key"; // <-- Replace with your Binance Testnet API key
const BINANCE_API_SECRET = "your_binance_testnet_api_secret"; // <-- Replace with your Binance Testnet API secret

// Chart Related Variables
let symbol = "BTCUSD"; // Default symbol
let timeframe = "1min"; // Default timeframe
const chartContainer = document.getElementById('chart');
let chart, lineSeries, livePriceLine;
let entryLine, stopLossLine, takeProfitLine;

// Trading Related Variables
let entryPrice = 0;
let quantity = 0;

// Initialize Chart
function initChart() {
  chart = LightweightCharts.createChart(chartContainer, {
    width: chartContainer.clientWidth,
    height: chartContainer.clientHeight,
    layout: { backgroundColor: '#ffffff', textColor: '#000' },
    grid: { vertLines: { color: '#eee' }, horzLines: { color: '#eee' }},
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
    timeScale: { timeVisible: true, secondsVisible: true }
  });

  lineSeries = chart.addLineSeries({ color: 'rgb(0, 123, 255)', lineWidth: 2 });

  fetchAndUpdateChart();
  setInterval(fetchAndUpdateChart, 15000); // Auto-update
}

// Fetch price data
async function fetchAndUpdateChart() {
  try {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=${timeframe}&apikey=${API_KEY}&outputsize=compact`;
    const response = await fetch(url);
    const data = await response.json();

    const timeSeriesKey = Object.keys(data).find(key => key.includes("Time Series"));
    const timeSeries = data[timeSeriesKey];

    if (!timeSeries) {
      console.error("Error fetching data:", data);
      return;
    }

    const formattedData = Object.keys(timeSeries).reverse().map(time => ({
      time: new Date(time).getTime() / 1000,
      value: parseFloat(timeSeries[time]["4. close"]),
    }));

    lineSeries.setData(formattedData);
    const latestPrice = formattedData.at(-1).value;
    updateLivePriceLine(latestPrice);

  } catch (err) {
    console.error("Failed to fetch data:", err);
  }
}

// Update Live Price
function updateLivePriceLine(price) {
  if (livePriceLine) chart.removePriceLine(livePriceLine);
  livePriceLine = chart.addPriceLine({
    price,
    color: 'orange',
    lineWidth: 2,
    title: 'Live Price',
    lineStyle: LightweightCharts.LineStyle.Dashed,
  });
}

// Place Order on Binance Futures Testnet
async function placeOrder(side) {
  const url = 'https://testnet.binancefuture.com/fapi/v1/order';
  const params = new URLSearchParams({
    symbol: symbol.replace("USD", "USDT"), // Binance format BTCUSDT
    side: side.toUpperCase(),
    type: 'MARKET',
    quantity: quantity.toFixed(3),
    timestamp: Date.now()
  });

  const crypto = window.crypto || window.msCrypto;

  async function createSignature(queryString, secret) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(queryString));
    return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const signature = await createSignature(params.toString(), BINANCE_API_SECRET);
  const finalUrl = `${url}?${params.toString()}&signature=${signature}`;

  const response = await fetch(finalUrl, {
    method: 'POST',
    headers: { 'X-MBX-APIKEY': BINANCE_API_KEY }
  });

  const data = await response.json();
  console.log('Order Response:', data);
  alert(`${side} Order Placed Successfully! ✅`);
}

// Calculate SMC
document.getElementById('calculate-smc').addEventListener('click', () => {
  const investment = parseFloat(document.getElementById("investment-amount").value);
  entryPrice = parseFloat(document.getElementById("entry-price-input").value);

  if (isNaN(investment) || isNaN(entryPrice) || investment <= 0 || entryPrice <= 0) {
    alert("Please enter valid numbers.");
    return;
  }

  quantity = investment / entryPrice;

  const riskPercent = investment < 5000 ? 0.015 : investment <= 20000 ? 0.01 : 0.008;
  const riskAmount = entryPrice * riskPercent;
  const stopLoss = entryPrice - riskAmount;
  const rewardMultiplier = riskAmount < 2 ? 3 : riskAmount <= 5 ? 2.5 : 2;
  const takeProfit = entryPrice + (riskAmount * rewardMultiplier);
  const rrr = (takeProfit - entryPrice) / (entryPrice - stopLoss);

  document.getElementById("no-of-shares").textContent = `Number of Shares: ${quantity.toFixed(2)}`;
  document.getElementById("entry-price").textContent = `Entry Price: $${entryPrice.toFixed(2)}`;
  document.getElementById("stop-loss").textContent = `Stop-Loss: $${stopLoss.toFixed(2)}`;
  document.getElementById("take-profit").textContent = `Take-Profit: $${takeProfit.toFixed(2)}`;
  document.getElementById("risk-reward").textContent = `Risk-Reward Ratio: ${rrr.toFixed(2)}`;

  // Draw Lines
  if (entryLine) chart.removePriceLine(entryLine);
  if (stopLossLine) chart.removePriceLine(stopLossLine);
  if (takeProfitLine) chart.removePriceLine(takeProfitLine);

  entryLine = chart.addPriceLine({ price: entryPrice, color: 'blue', lineWidth: 2, title: 'Entry' });
  stopLossLine = chart.addPriceLine({ price: stopLoss, color: 'red', lineWidth: 2, lineStyle: LightweightCharts.LineStyle.Dotted, title: 'StopLoss' });
  takeProfitLine = chart.addPriceLine({ price: takeProfit, color: 'green', lineWidth: 2, lineStyle: LightweightCharts.LineStyle.Dotted, title: 'TakeProfit' });
});

// Theme Toggle
document.getElementById('theme-toggle').addEventListener('click', () => {
  document.body.classList.toggle('dark-theme');
});

// Buy/Sell Button Listeners
document.getElementById('buy-button').addEventListener('click', () => placeOrder('BUY'));
document.getElementById('sell-button').addEventListener('click', () => placeOrder('SELL'));

// Initialize
initChart();





