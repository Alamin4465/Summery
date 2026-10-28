let currentUser = null;
let unsubscribeTransaction = null;
let allTransactions = [];
let currentFilter = "all";

// 🆕 ওয়ালেট স্টেট
let allWallets = [];
let unsubscribeWallets = null;

// ------------------ বাংলা সংখ্যা ফরম্যাট ------------------
function toBanglaNumber(number) {
  if (typeof number !== "number") number = parseFloat(number) || 0;
  return number.toLocaleString('bn-BD', { maximumFractionDigits: 2 });
}

// ------------------ ট্রানজেকশন লোড ------------------
function loadTransactions() {
  const content = document.getElementById("content");
  content.innerHTML = `
    <h2 class="titel">ট্রানজেকশন</h2>

    <!-- 🆕 ওয়ালেট সারসংক্ষেপ এখানে -->
    <div id="walletSummary"></div>

    <div class="Filter-tabel">
      <div id="filterButtons">
        <button data-filter="all" class="filterBtn active">সব</button>
        <button data-filter="income" class="filterBtn">শুধু আয়</button>
        <button data-filter="expense" class="filterBtn">শুধু ব্যয়</button>
      </div>
      <table id="transactionTable">
        <thead>
          <tr>
            <th>তারিখ</th>
            <th>টাইপ</th>
            <th>ক্যাটেগরি</th>
            <th>ওয়ালেট</th>
            <th>টাকা</th>
            <th>অ্যাকশন</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
    <div id="summary" style="margin-top: 20px; font-weight: bold;"></div>
    <canvas id="incomeExpenseChart" width="400" height="200"></canvas>
  `;

  // ফিল্টার বাটন ইভেন্ট
  document.querySelectorAll("#filterButtons .filterBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#filterButtons .filterBtn").forEach((b) =>
        b.classList.remove("active")
      );
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderTransactionTable();
      renderSummary(allTransactions);
      renderIncomeExpenseCategoryChart(allTransactions, currentFilter);
    });
  });

  // ইভেন্ট ডেলিগেশন
  const tbody = document.querySelector("#transactionTable tbody");
  tbody.addEventListener("click", async (e) => {
    if (e.target.classList.contains("edit_Btn")) {
      showFixedOverlay(e.target.dataset.id);
    }

    if (e.target.classList.contains("delete_Btn")) {
      if (!confirm("আপনি কি সত্যিই ডিলিট করতে চান?")) return;

      const docId = e.target.dataset.id;
      const t = allTransactions.find(x => x.id === docId);
      if (!t) return;

      const db = firebase.firestore();
      const batch = db.batch();

      // 🆕 ডিলিটের সময় ওয়ালেট ব্যালেন্স উল্টে দেওয়া
      if (t.walletId) {
        const walletRef = db.collection("users").doc(currentUser.uid)
          .collection("wallets").doc(t.walletId);
        const delta = t.type === 'income'
          ? -parseFloat(t.amount || 0)
          : parseFloat(t.amount || 0);
        batch.update(walletRef, {
          balance: firebase.firestore.FieldValue.increment(delta)
        });
      }

      batch.delete(db.collection("users").doc(currentUser.uid)
        .collection("transactions").doc(docId));

      try {
        await batch.commit();
      } catch (err) {
        alert("ডিলিটে সমস্যা: " + err.message);
      }
    }
  });

  // প্রথমবার ওয়ালেট লোড + ট্রানজেকশন
  loadWalletsForTransactions();
  fetchTransactionsRealtime();
}

// 🆕 ওয়ালেট লোড (রিয়েল-টাইম)
function loadWalletsForTransactions() {
  if (!currentUser) return;
  if (unsubscribeWallets) unsubscribeWallets();

  const db = firebase.firestore();
  unsubscribeWallets = db
    .collection("users")
    .doc(currentUser.uid)
    .collection("wallets")
    .onSnapshot(snapshot => {
      allWallets = [];
      snapshot.forEach(doc => {
        allWallets.push({ id: doc.id, ...doc.data() });
      });
      renderWalletSummary();
      if (document.querySelector("#transactionTable tbody")) {
        renderTransactionTable();
      }
    }, err => console.error("ওয়ালেট লোডে সমস্যা:", err));
}

// 🆕 ওয়ালেট সারসংক্ষেপ রেন্ডার
function renderWalletSummary() {
  const div = document.getElementById('walletSummary');
  if (!div) return;

  if (allWallets.length === 0) {
    div.innerHTML = `
      <p style="color:#fff; text-align:center; padding:14px;
                background:rgba(0,0,0,0.25); border-radius:10px;
                text-shadow:1px 1px 3px rgba(0,0,0,0.6);">
        💼 এখনো কোনো ওয়ালেট নেই। ফর্মস → ওয়ালেট ম্যানেজ থেকে যোগ করুন।
      </p>`;
    return;
  }

  const sorted = [...allWallets].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', 'bn-BD')
  );

  let total = 0;
  let rows = '';
  sorted.forEach(w => {
    const bal = w.balance || 0;
    total += bal;
    const color = bal >= 0 ? '#81c784' : '#ef5350';
    rows += `
      <tr>
        <td>${w.name}</td>
        <td style="color:${color}; font-weight:bold;">${toBanglaNumber(bal)} ৳</td>
      </tr>`;
  });

  const totalColor = total >= 0 ? '#66bb6a' : '#ef5350';

  div.innerHTML = `
    <h3>💼 ওয়ালেট সারসংক্ষেপ</h3>
    <table class="transaction-table">
      <thead>
        <tr><th>ওয়ালেট</th><th>ব্যালেন্স</th></tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr style="background:rgba(102,51,153,0.5); font-weight:bold;">
          <td>মোট</td>
          <td style="color:${totalColor};">${toBanglaNumber(total)} ৳</td>
        </tr>
      </tfoot>
    </table>
  `;
}

let incomeExpenseChart = null;

function renderIncomeExpenseCategoryChart(transactions, filter) {
  const categoryTotals = {};

  transactions.forEach((t) => {
    const cat = t.category || "অন্যান্য";
    const type = t.type || "expense";
    const amount = parseFloat(t.amount || 0);

    if (!categoryTotals[cat]) categoryTotals[cat] = { income: 0, expense: 0 };
    categoryTotals[cat][type] += amount;
  });

  let labels = [];
  let data = [];
  let backgroundColors = [];

  const greenShades = [
    "rgba(0, 128, 0, 0.7)",
    "rgba(34, 139, 34, 0.7)",
    "rgba(50, 205, 50, 0.7)",
    "rgba(144, 238, 144, 0.7)",
    "rgba(0, 100, 0, 0.7)"
  ];
  const redShades = [
    "rgba(255, 0, 0, 0.7)",
    "rgba(178, 34, 34, 0.7)",
    "rgba(255, 99, 71, 0.7)",
    "rgba(220, 20, 60, 0.7)",
    "rgba(139, 0, 0, 0.7)"
  ];

  if (filter === "income") {
    labels = Object.keys(categoryTotals);
    data = labels.map(cat => categoryTotals[cat].income);
    backgroundColors = labels.map((_, i) => greenShades[i % greenShades.length]);
  } else if (filter === "expense") {
    labels = Object.keys(categoryTotals);
    data = labels.map(cat => categoryTotals[cat].expense);
    backgroundColors = labels.map((_, i) => redShades[i % redShades.length]);
  } else {
    labels = [];
    data = [];
    backgroundColors = [];
    Object.keys(categoryTotals).forEach((cat, i) => {
      if (categoryTotals[cat].income > 0) {
        labels.push(cat + " (আয়)");
        data.push(categoryTotals[cat].income);
        backgroundColors.push(greenShades[i % greenShades.length]);
      }
      if (categoryTotals[cat].expense > 0) {
        labels.push(cat + " (ব্যয়)");
        data.push(categoryTotals[cat].expense);
        backgroundColors.push(redShades[i % redShades.length]);
      }
    });
  }

  const totalAmount = data.reduce((a, b) => a + b, 0);

  const ctx = document.getElementById("incomeExpenseChart").getContext("2d");
  if (incomeExpenseChart) incomeExpenseChart.destroy();

  const centerTextPlugin = {
    id: 'centerText',
    afterDraw(chart) {
      const { ctx, chartArea: { width, height, top, left } } = chart;
      ctx.save();
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText(toBanglaNumber(totalAmount) + "৳", left + width / 2, top + height / 2);
      ctx.restore();
    }
  };

  const whiteLegendPlugin = {
    id: 'whiteLegend',
    afterDraw(chart) {
      const legend = chart.legend;
      if (!legend) return;
      const ctx = chart.ctx;
      ctx.save();
      ctx.fillStyle = "#fff";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      legend.legendItems.forEach(item => {
        const textX = item.left + 25;
        const textY = item.top + item.height / 2;
        ctx.fillText(item.text, textX, textY);
      });
      ctx.restore();
    }
  };

  incomeExpenseChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: backgroundColors,
        borderColor: "transparent",
        borderWidth: 2,
        hoverOffset: 30,
        cutout: "50%"
      }]
    },
    options: {
      plugins: {
        legend: {
          display: true,
          position: "right",
          labels: {
            color: "#fff",
            font: { size: 12, weight: "bold" },
          }
        },
        tooltip: {
          callbacks: {
            label: function (tooltipItem) {
              const value = tooltipItem.raw;
              const sum = data.reduce((a, b) => a + b, 0);
              const percentage = ((value / sum) * 100).toFixed(2);
              return `${tooltipItem.label}: ${toBanglaNumber(value)} (${percentage}%)`;
            }
          }
        },
        datalabels: {
          color: '#fff',
          display: true,
          formatter: (value, ctx) => {
            const sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
            const percentage = ((value / sum) * 100).toFixed(2);
            return percentage + "%";
          }
        }
      }
    },
    plugins: [centerTextPlugin, ChartDataLabels, whiteLegendPlugin]
  });
}

// ------------------ রিয়েলটাইম ট্রানজেকশন ------------------
function fetchTransactionsRealtime() {
  if (!currentUser) return;
  if (unsubscribeTransaction) unsubscribeTransaction();

  allTransactions = [];

  const db = firebase.firestore();
  unsubscribeTransaction = db
    .collection("users")
    .doc(currentUser.uid)
    .collection("transactions")
    .orderBy("timestamp", "desc")
    .onSnapshot((snapshot) => {
      allTransactions = [];
      snapshot.forEach((doc) => {
        allTransactions.push({ id: doc.id, ...doc.data() });
      });

      renderTransactionTable();
      renderSummary(allTransactions);
      renderIncomeExpenseCategoryChart(allTransactions, currentFilter);
    });
}

// 🆕 টেবিল রেন্ডার (ফিল্টার + ওয়ালেট কলাম সহ)
function renderTransactionTable() {
  const tbody = document.querySelector("#transactionTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const filtered = allTransactions.filter(
    t => currentFilter === "all" || (t.type || "") === currentFilter
  );

  filtered.forEach((t) => {
    const type = t.type || "";
    const row = document.createElement("tr");
    row.className = type === "income" ? "income-row" : "expense-row";

    if (t.category === "লোন গ্রহণ") row.classList.add("loan-taken");
    else if (t.category === "লোন পরিশোধ") row.classList.add("loan-repaid");

    let walletName = '—';
    if (t.walletId) {
      const w = allWallets.find(x => x.id === t.walletId);
      if (w) walletName = w.name;
    }

    row.innerHTML = `
      <td>${t.date || ""}</td>
      <td>${type === "income" ? "আয়" : "ব্যয়"}</td>
      <td>${t.category || ""}</td>
      <td>${walletName}</td>
      <td>${toBanglaNumber(parseFloat(t.amount || 0))}</td>
      <td>
        <button class="edit_Btn" data-id="${t.id}">পরিবর্তন</button>
        <button class="delete_Btn" data-id="${t.id}">মুছে ফেলো</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// ------------------ সামারি রেন্ডার ------------------
function renderSummary(transactions) {
  const summaryDiv = document.getElementById("summary");
  if (!summaryDiv) return;

  const filtered = transactions.filter(
    t => currentFilter === "all" || (t.type || "") === currentFilter
  );

  const totalIncome = filtered
    .filter((t) => t.type === "income")
    .reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);

  const totalExpense = filtered
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);

  const balance = totalIncome - totalExpense;

  let html = "";
  if (currentFilter === "all") {
    html = `মোট আয়: ${toBanglaNumber(totalIncome)} টাকা | মোট ব্যয়: ${toBanglaNumber(totalExpense)} টাকা | ব্যালেন্স: ${toBanglaNumber(balance)} টাকা`;
  } else if (currentFilter === "income") {
    html = `মোট আয়: ${toBanglaNumber(totalIncome)} টাকা`;
  } else {
    html = `মোট ব্যয়: ${toBanglaNumber(totalExpense)} টাকা`;
  }

  summaryDiv.innerHTML = html;
}

// ------------------ Overlay (এডিট) — ওয়ালেট সহ ------------------
async function showFixedOverlay(id) {
  if (!currentUser) return;

  const db = firebase.firestore();
  const docRef = db.collection("users")
    .doc(currentUser.uid)
    .collection("transactions")
    .doc(id);

  const doc = await docRef.get();
  const data = doc.data();
  if (!data) return alert("ডাটা পাওয়া যায়নি!");

  const existing = document.querySelector(".edit-overlay-fixed");
  if (existing) existing.remove();

  document.body.style.overflow = "hidden";

  const overlay = document.createElement("div");
  overlay.className = "edit-overlay-fixed";
  overlay.style.cssText = `
    position: fixed;
    top: 50px;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    padding: 20px;
    border-radius: 12px;
    width: 90%;
    max-width: 400px;
    z-index: 9999;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
  `;

  overlay.innerHTML = `
    <h3>ট্রানজেকশন এডিট করুন</h3>
    <input type="date" value="${data.date || ''}" class="date-input"/><br>
    <select class="type-select">
      <option value="income" ${data.type === 'income' ? 'selected' : ''}>আয়</option>
      <option value="expense" ${data.type === 'expense' ? 'selected' : ''}>ব্যয়</option>
    </select><br>
    <select class="category-select">
      <option value="">ক্যাটেগরি নির্বাচন করুন</option>
    </select><br>
    <select class="wallet-select">
      <option value="">ওয়ালেট নির্বাচন করুন</option>
    </select><br>
    <input type="number" value="${data.amount || 0}" class="amount-input"/><br>
    <button class="save-btn">সংরক্ষণ করুন</button>
    <button class="cancel-btn">বাতিল</button>
  `;

  document.body.appendChild(overlay);

  const typeSelect = overlay.querySelector(".type-select");
  const categorySelect = overlay.querySelector(".category-select");
  const walletSelect = overlay.querySelector(".wallet-select");

  // ক্যাটেগরি লোড
  async function loadCategories(type) {
    const snapshot = await db
      .collection("users")
      .doc(currentUser.uid)
      .collection("categories")
      .where("type", "==", type)
      .get();

    categorySelect.innerHTML = `<option value="">ক্যাটেগরি নির্বাচন করুন</option>`;
    snapshot.docs.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.data().name;
      opt.textContent = d.data().name;
      if (d.data().name === data.category) opt.selected = true;
      categorySelect.appendChild(opt);
    });
  }

  // ওয়ালেট লোড
  function loadWalletsDropdown() {
    walletSelect.innerHTML = `<option value="">ওয়ালেট নির্বাচন করুন</option>`;
    allWallets.forEach(w => {
      const opt = document.createElement("option");
      opt.value = w.id;
      opt.textContent = `${w.name} (${toBanglaNumber(w.balance || 0)} ৳)`;
      if (w.id === data.walletId) opt.selected = true;
      walletSelect.appendChild(opt);
    });
  }

  await loadCategories(data.type);
  loadWalletsDropdown();

  typeSelect.addEventListener("change", () => loadCategories(typeSelect.value));

  const saveBtn = overlay.querySelector(".save-btn");
  const cancelBtn = overlay.querySelector(".cancel-btn");

  // সেভ — পুরনো ওয়ালেট রিভার্স, নতুন ওয়ালেটে প্রয়োগ
  saveBtn.addEventListener("click", async () => {
    const dateInput = overlay.querySelector(".date-input");
    const amountInput = overlay.querySelector(".amount-input");
    const newWalletId = walletSelect.value;
    const newAmount = parseFloat(amountInput.value);

    if (!dateInput.value || !typeSelect.value || !categorySelect.value ||
        isNaN(newAmount) || newAmount <= 0) {
      return alert("সব ফিল্ড পূরণ করুন!");
    }
    if (!newWalletId) {
      return alert("ওয়ালেট নির্বাচন করুন!");
    }

    const batch = db.batch();

    // ১. পুরনো ওয়ালেটের প্রভাব উল্টাও (যদি ছিল)
    if (data.walletId) {
      const oldWalletRef = db.collection("users").doc(currentUser.uid)
        .collection("wallets").doc(data.walletId);
      const oldDelta = data.type === 'income'
        ? -parseFloat(data.amount || 0)
        : parseFloat(data.amount || 0);
      batch.update(oldWalletRef, {
        balance: firebase.firestore.FieldValue.increment(oldDelta)
      });
    }

    // ২. নতুন ওয়ালেটে নতুন প্রভাব প্রয়োগ
    const newWalletRef = db.collection("users").doc(currentUser.uid)
      .collection("wallets").doc(newWalletId);
    const newDelta = typeSelect.value === 'income' ? newAmount : -newAmount;
    batch.update(newWalletRef, {
      balance: firebase.firestore.FieldValue.increment(newDelta)
    });

    // ৩. ট্রানজেকশন আপডেট
    batch.update(docRef, {
      date: dateInput.value,
      type: typeSelect.value,
      category: categorySelect.value,
      amount: newAmount,
      walletId: newWalletId,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    });

    try {
      await batch.commit();
      overlay.remove();
      document.body.style.overflow = "";
    } catch (err) {
      alert("আপডেটে সমস্যা: " + err.message);
    }
  }, { once: true });

  cancelBtn.addEventListener("click", () => {
    overlay.remove();
    document.body.style.overflow = "";
  }, { once: true });
}