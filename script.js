// Demo stock data
const stocks = [
    { symbol: "RELIANCE", price: 2800 },
    { symbol: "TCS", price: 3500 },
    { symbol: "INFY", price: 1500 }
];

// Insert stock list
function loadStocks() {
    const list = document.getElementById("stockList");
    list.innerHTML = "";

    stocks.forEach(item => {
        const div = document.createElement("div");
        div.className = "stock-item";
        div.textContent = `${item.symbol} - ₹${item.price}`;
        list.appendChild(div);
    });
}

loadStocks();


// TAB SWITCHING
const tabButtons = document.querySelectorAll(".tab");

tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        tabButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const tab = btn.dataset.tab;

        if (tab === "stocks") {
            loadStocks();
            document.querySelector(".section-title").textContent = "Buy Stocks";
        }
        if (tab === "funds") {
            document.getElementById("stockList").innerHTML = "Mutual Funds Coming Soon…";
            document.querySelector(".section-title").textContent = "Funds";
        }
        if (tab === "portfolio") {
            document.getElementById("stockList").innerHTML = "Portfolio is empty.";
            document.querySelector(".section-title").textContent = "My Portfolio";
        }
    });
});
