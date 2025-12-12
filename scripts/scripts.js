/* ============================================================
   MARKET DATA (COMPRESSED REALISTIC 6-MONTH HISTORY)
   ============================================================ */

const STOCKS = [
    {
        symbol: "RELIANCE",
        name: "Reliance Industries Ltd",
        price: 1556.50,
        change: +1.2,
        history6M: [1420, 1455, 1470, 1500, 1525, 1540, 1556]
    },
    {
        symbol: "TATAMOTORS",
        name: "Tata Motors Ltd",
        price: 373.45,
        change: -0.8,
        history6M: [310, 325, 330, 345, 350, 360, 373]
    },
    {
        symbol: "HDFCBANK",
        name: "HDFC Bank Ltd",
        price: 1000.20,
        change: +0.45,
        history6M: [910, 930, 950, 960, 980, 995, 1000]
    },
    {
        symbol: "WIPRO",
        name: "Wipro Ltd",
        price: 260.55,
        change: -0.25,
        history6M: [230, 240, 245, 250, 255, 258, 260]
    },
    {
        symbol: "AFFLE",
        name: "Affle India Ltd",
        price: 1685.80,
        change: +2.1,
        history6M: [1500, 1530, 1580, 1600, 1630, 1670, 1685]
    },
    {
        symbol: "ADANIGREEN",
        name: "Adani Green Energy Ltd",
        price: 1040.20,
        change: +3.1,
        history6M: [860, 900, 920, 950, 980, 1020, 1040]
    },
    {
        symbol: "MRF",
        name: "MRF Ltd",
        price: 98000,
        change: +0.9,
        history6M: [88000, 90000, 93000, 95000, 96000, 97500, 98000]
    },
];

/* MUTUAL FUNDS */
const FUNDS = [
    {
        symbol: "EDMID150",
        name: "Edelweiss Nifty Midcap150 Momentum 50 Index Fund",
        nav: 18.39,
        history6M: [15.2, 15.8, 16.3, 17.0, 17.8, 18.1, 18.39]
    },
    {
        symbol: "HDFCMID",
        name: "HDFC Mid Cap Fund",
        nav: 114.21,
        history6M: [104, 106, 108, 110, 111, 113, 114]
    },
    {
        symbol: "HDFCSMALL",
        name: "HDFC Small Cap Fund",
        nav: 162.41,
        history6M: [150, 152, 155, 157, 160, 161, 162]
    },
    {
        symbol: "NIPPLARGE",
        name: "Nippon India Large Cap Fund",
        nav: 74.33,
        history6M: [66, 68, 70, 71, 72, 73, 74]
    },
    {
        symbol: "SBILARGE",
        name: "SBI Large Cap Fund",
        nav: 35.12,
        history6M: [30, 31, 32, 33, 34, 34.7, 35.1]
    },
    {
        symbol: "NIPPMID",
        name: "Nippon India Growth Mid Cap Fund",
        nav: 129.83,
        history6M: [115, 118, 120, 122, 124, 128, 129]
    },
    {
        symbol: "NIPPSMALL",
        name: "Nippon India Small Cap Fund",
        nav: 102.11,
        history6M: [89, 92, 94, 97, 99, 101, 102]
    },
    {
        symbol: "HDFCLARGE",
        name: "HDFC Large Cap Fund",
        nav: 32.55,
        history6M: [28, 29, 30, 31, 31.5, 32, 32.55]
    }
];

/* ============================================================
   APP STATE
============================================================ */
let wallet = 10000;
let portfolio = {};     
let orders = [];        
let activeAsset = null; 
let activeType = null;  
let chart = null;

/* ============================================================
   UI ELEMENTS
============================================================ */
const navButtons = document.querySelectorAll(".nav-btn");
const screens = document.querySelectorAll(".screen");

const stocksList = document.getElementById("stocksList");
const fundsList = document.getElementById("fundsList");

const holdingsList = document.getElementById("holdingsList");
const portfolioSummary = document.getElementById("portfolioSummary");

const profilePanel = document.getElementById("profilePanel");
const profileBtn = document.getElementById("profileBtn");
const closeProfile = document.getElementById("closeProfile");
const walletBalance = document.getElementById("walletBalance");
const addMoneyBtn = document.getElementById("addMoneyBtn");

/* Detail Screen */
const detailScreen = document.getElementById("detailScreen");
const backToMain = document.getElementById("backToMain");
const detailName = document.getElementById("detailName");
const detailPrice = document.getElementById("detailPrice");
const tradeBox = document.getElementById("tradeBox");
const tradeInput = document.getElementById("tradeInput");
const confirmTrade = document.getElementById("confirmTrade");

/* ============================================================
   RENDER STOCK LIST
============================================================ */
function renderStocks() {
    stocksList.innerHTML = "";
    STOCKS.forEach(stock => {
        const card = document.createElement("div");
        card.className = "stock-card";
        card.onclick = () => openDetail(stock, "stock");

        card.innerHTML = `
            <div class="card-left">
                <div class="card-logo"></div>
                <div>
                    <div class="card-name">${stock.name}</div>
                    <div class="card-symbol">${stock.symbol}</div>
                </div>
            </div>

            <div class="card-price">
                ₹${stock.price}
                <div class="card-change ${stock.change >= 0 ? "green" : "red"}">
                    ${stock.change >= 0 ? "+" : ""}${stock.change}%
                </div>
            </div>
        `;

        stocksList.appendChild(card);
    });
}

renderStocks();

/* ============================================================
   RENDER FUND LIST
============================================================ */
function renderFunds() {
    fundsList.innerHTML = "";
    FUNDS.forEach(fund => {
        const card = document.createElement("div");
        card.className = "fund-card";
        card.onclick = () => openDetail(fund, "fund");

        card.innerHTML = `
            <div class="card-left">
                <div class="card-logo"></div>
                <div>
                    <div class="card-name">${fund.name}</div>
                    <div class="card-symbol">${fund.symbol}</div>
                </div>
            </div>

            <div class="card-price">
                ₹${fund.nav}
            </div>
        `;

        fundsList.appendChild(card);
    });
}

renderFunds();

/* ============================================================
   NAVIGATION
============================================================ */
navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-screen");

        navButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        screens.forEach(s => s.classList.remove("active-screen"));
        document.getElementById(target).classList.add("active-screen");

        detailScreen.classList.add("hidden");
    });
});

/* ============================================================
   PROFILE PANEL
============================================================ */
profileBtn.onclick = () => profilePanel.classList.add("active");
closeProfile.onclick = () => profilePanel.classList.remove("active");

addMoneyBtn.onclick = () => {
    wallet += 1000;
    walletBalance.textContent = wallet;
};

/* ============================================================
   DETAIL PAGE OPEN
============================================================ */
function openDetail(asset, type) {
    activeAsset = asset;
    activeType = type;

    detailName.textContent = asset.name;
    detailPrice.textContent = type === "stock" ? `₹${asset.price}` : `NAV: ₹${asset.nav}`;

    switchScreen(detailScreen);

    drawChart(asset.history6M);
}

/* ============================================================
   SWITCH SCREEN
============================================================ */
function switchScreen(screen) {
    screens.forEach(s => s.classList.remove("active-screen"));
    screen.classList.add("active-screen");
}

/* ============================================================
   CHART RENDERING
============================================================ */
function drawChart(history) {
    if (chart) chart.destroy();

    const ctx = document.getElementById("detailChart").getContext("2d");

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: ["6M-5", "6M-4", "6M-3", "6M-2", "6M-1", "6M", "Today"],
            datasets: [{
                data: history,
                borderColor: "#1fa46e",
                borderWidth: 2,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { ticks: { color: "white" } },
                y: { ticks: { color: "white" } }
            }
        }
    });
}

/* ============================================================
   BUY / SELL / SIP HANDLING
============================================================ */
document.getElementById("buyBtn").onclick = () => {
    tradeBox.classList.remove("hidden");
    confirmTrade.onclick = handleBuy;
};

document.getElementById("sellBtn").onclick = () => {
    tradeBox.classList.remove("hidden");
    confirmTrade.onclick = handleSell;
};

/* ---------------- BUY ---------------- */
function handleBuy() {
    let qty = Number(tradeInput.value);
    if (qty <= 0) return alert("Enter amount/quantity.");

    let cost;
    if (activeType === "stock") cost = qty * activeAsset.price;
    else cost = qty;  

    if (wallet < cost) return alert("Not enough funds.");

    wallet -= cost;
    walletBalance.textContent = wallet;

    if (!portfolio[activeAsset.symbol]) {
        portfolio[activeAsset.symbol] = {
            type: activeType,
            qty: 0,
            invested: 0
        };
    }

    portfolio[activeAsset.symbol].qty += qty;
    portfolio[activeAsset.symbol].invested += cost;

    orders.push({
        type: "BUY",
        symbol: activeAsset.symbol,
        qty,
        cost,
        date: new Date().toLocaleString()
    });

    tradeInput.value = "";
    tradeBox.classList.add("hidden");
    updatePortfolio();
}

/* ---------------- SELL ---------------- */
function handleSell() {
    let qty = Number(tradeInput.value);
    if (qty <= 0) return alert("Enter amount/quantity.");

    let holding = portfolio[activeAsset.symbol];
    if (!holding || holding.qty < qty) return alert("Not enough quantity.");

    let credit =
        activeType === "stock"
            ? qty * activeAsset.price
            : qty;

    wallet += credit;
    walletBalance.textContent = wallet;

    holding.qty -= qty;
    holding.invested -= credit;

    if (holding.qty <= 0) delete portfolio[activeAsset.symbol];

    orders.push({
        type: "SELL",
        symbol: activeAsset.symbol,
        qty,
        credit,
        date: new Date().toLocaleString()
    });

    tradeInput.value = "";
    tradeBox.classList.add("hidden");
    updatePortfolio();
}

/* ============================================================
   PORTFOLIO RENDERING
============================================================ */
function updatePortfolio() {
    holdingsList.innerHTML = "";

    let totalValue = 0;
    let invested = 0;

    for (let symbol in portfolio) {
        const hold = portfolio[symbol];

        let asset =
            STOCKS.find(s => s.symbol === symbol) ||
            FUNDS.find(f => f.symbol === symbol);

        let price = hold.type === "stock" ? asset.price : asset.nav;
        let value = price * hold.qty;

        totalValue += value;
        invested += hold.invested;

        const div = document.createElement("div");
        div.className = "holding";

        div.innerHTML = `
            <strong>${asset.name}</strong><br>
            Qty: ${hold.qty}<br>
            Value: ₹${value.toFixed(2)}<br>
            P/L: <span class="${value >= hold.invested ? "green" : "red"}">
                ₹${(value - hold.invested).toFixed(2)}
            </span>
        `;

        holdingsList.appendChild(div);
    }

    portfolioSummary.innerHTML = `
        <strong>Total Value:</strong> ₹${totalValue.toFixed(2)}<br>
        <strong>Invested:</strong> ₹${invested.toFixed(2)}<br>
        <strong>Overall P/L:</strong>
        <span class="${totalValue >= invested ? "green" : "red"}">
            ₹${(totalValue - invested).toFixed(2)}
        </span>
    `;
}

updatePortfolio();

/* ============================================================
   BACK BUTTON
============================================================ */
backToMain.onclick = () => {
    detailScreen.classList.add("hidden");
    document.getElementById("stocksScreen").classList.add("active-screen");
};
