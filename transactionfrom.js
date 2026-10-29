// ============================================
// ট্রানজেকশন সেকশন (transactionfrom.js)
// ============================================

let unsubscribeTransaction = null;
let allTransactions = [];
let currentFilter = "all";

let allWallets = [];
let unsubscribeWallets = null;

// ------------------ বাংলা সংখ্যা ফরম্যাট ------------------
function toBanglaNumber(number) {
  if (typeof number !== "number") number = parseFloat(number);
  if (!Number.isFinite(number)) number = 0;
  return number.toLocaleString('bn-BD', { maximumFractionDigits: 2 });
}

// 🆕 transfer বাদ দেওয়ার হেল্পার
function isTransferTx(t) {
  return t && (t.type === "transfer" || t.category === "ওয়ালেট ট্রান্সফার");
}

// ------------------ ট্রানজেকশন লোড ------------------
function loadTransactions() {
  const content = document.getElementById("content");
  if (!content) return;

  content.innerHTML = `
    <h2 class="titel">ট্রানজেকশন</h2>

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

    <div class="chart-container" style="max-width: 450px; height: 350px;">
      <canvas id="incomeExpenseChart"></canvas>
    </div>
  `;

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

  const tbody = document.querySelector("#transactionTable tbody");
  if (tbody) {
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

        if (t.walletId) {
          const oldAmount = Number(t.amount) || 0;
          const walletRef = db.collection("users").doc(currentUser.uid)
            .collection("wallets").doc(t.walletId);
          const delta = t.type === 'income' ? -oldAmount : oldAmount;
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
  }

  loadWalletsForTransactions();
  fetchTransactionsRealtime();
}

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

function renderWalletSummary() {
  const div = document.getElementById('walletSummary');
  if (!div) return;

  if (allWallets.length === 0) {
    div.innerHTML = `
      <p style="text-align:center; padding:14px; background:var(--glass-bg); border-radius:10px;">
        💼 এখনো কোনো ওয়ালেট নেই। সেটিংস → ওয়ালেট ম্যানেজ থেকে যোগ করুন।
      </p>`;
    return;
  }

  const sorted = [...allWallets].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', 'bn-BD')
  );

  let total = 0;
  let rows = '';
  sorted.forEach(w => {
    const bal = Number(w.balance) || 0;
    total += bal;
    const color = bal >= 0 ? 'var(--success-dark)' : 'var(--danger-dark)';
    rows += `
      <tr>
        <td>${w.name || '—'}</td>
        <td style="color:${color}; font-weight:bold;">${toBanglaNumber(bal)} ৳</td>
      </tr>`;
  });

  const totalColor = total >= 0 ? 'var(--success-dark)' : 'var(--danger-dark)';

  div.innerHTML = `
    <h3>💼 ওয়ালেট সারসংক্ষেপ</h3>
    <table class="transaction-table">
      <thead>
        <tr><th>ওয়ালেট</th><th>ব্যালেন্স</th></tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr style="background:rgba(102,51,153,0.2); font-weight:bold;">
          <td>মোট</td>
          <td style="color:${totalColor};">${toBanglaNumber(total)} ৳</td>
        </tr>
      </tfoot>
    </table>
  `;
}

let incomeExpenseChart = null;

function renderIncomeExpenseCategoryChart(transactions, filter) {
  const canvas = document.getElementById("incomeExpenseChart");
  if (!canvas) return;

  const categoryTotals = {};

  (transactions || []).forEach((t) => {
    if (isTransferTx(t)) return;  // 🆕 transfer বাদ

    const cat = t.category || "অন্যান্য";
    const type = t.type || "expense";
    const amount = Number(t.amount) || 0;

    if (!categoryTotals[cat]) categoryTotals[cat] = { income: 0, expense: 0 };
    categoryTotals[cat][type] += amount;
  });

  let labels = [];
  let data = [];
  let backgroundColors = [];

  const greenShades = [
    "rgba(0, 128, 0, 0.8)",
    "rgba(34, 139, 34, 0.8)",
    "rgba(50, 205, 50, 0.8)",
    "rgba(144, 238, 144, 0.8)",
    "rgba(0, 100, 0, 0.8)"
  ];
  const redShades = [
    "rgba(255, 0, 0, 0.8)",
    "rgba(178, 34, 34, 0.8)",
    "rgba(255, 99, 71, 0.8)",
    "rgba(220, 20, 60, 0.8)",
    "rgba(139, 0, 0, 0.8)"
  ];

  if (filter === "income") {
    labels = Object.keys(categoryTotals).filter(c => categoryTotals[c].income > 0);
    data = labels.map(cat => categoryTotals[cat].income);
    backgroundColors = labels.map((_, i) => greenShades[i % greenShades.length]);
  } else if (filter === "expense") {
    labels = Object.keys(categoryTotals).filter(c => categoryTotals[c].expense > 0);
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
  const hasData = data.length > 0 && totalAmount > 0;

  const ctx = canvas.getContext("2d");
  if (incomeExpenseChart) {
    try { incomeExpenseChart.destroy(); } catch (e) {}
    incomeExpenseChart = null;
  }

  const safeLabels = hasData ? labels : ['কোনো ডাটা নেই'];
  const safeData = hasData ? data : [1];
  const safeColors = hasData ? backgroundColors : ['#9ca3af'];

  const textColor = (function () {
    try {
      return getComputedStyle(document.body).getPropertyValue('--text-primary').trim() || "#111";
    } catch (e) {
      return "#111";
    }
  })();

  const centerTextPlugin = {
    id: 'centerText',
    afterDraw(chart) {
      if (!hasData) return;

      const meta = chart._metasets && chart._metasets[0];
      const firstArc = meta && meta.data && meta.data[0];
      const outerRadius = firstArc && firstArc.outerRadius;
      if (!outerRadius || outerRadius <= 0) return;

      const { width, height, ctx } = chart;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius * 0.5, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fill();
      ctx.closePath();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = textColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText(toBanglaNumber(totalAmount) + "৳", centerX, centerY);
      ctx.restore();
    }
  };

  incomeExpenseChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: safeLabels,
      datasets: [{
        data: safeData,
        backgroundColor: safeColors,
        borderColor: "transparent",
        borderWidth: 2,
        hoverOffset: hasData ? 30 : 0,
        cutout: "50%"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: hasData,
          position: "right",
          labels: {
            color: textColor,
            font: { size: 12, weight: "bold" }
          }
        },
        tooltip: {
          enabled: hasData,
          callbacks: {
            label: function (tooltipItem) {
              const value = Number(tooltipItem.raw) || 0;
              const sum = safeData.reduce((a, b) => a + b, 0);
              const percentage = sum > 0 ? ((value / sum) * 100).toFixed(2) : '০.০০';
              return `${tooltipItem.label}: ${toBanglaNumber(value)} (${percentage}%)`;
            }
          }
        },
        datalabels: {
          color: '#fff',
          display: hasData,
          formatter: (value, ctx) => {
            const sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
            if (sum === 0) return '০%';
            const percentage = ((value / sum) * 100).toFixed(2);
            return percentage + "%";
          }
        }
      }
    },
    plugins: [centerTextPlugin, ChartDataLabels]
  });
}

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
        const data = doc.data();
        if (isTransferTx(data)) return;  // 🆕 transfer বাদ
        allTransactions.push({ id: doc.id, ...data });
      });

      renderTransactionTable();
      renderSummary(allTransactions);
      renderIncomeExpenseCategoryChart(allTransactions, currentFilter);
    }, err => console.error("Transactions realtime error:", err));
}

function renderTransactionTable() {
  const tbody = document.querySelector("#transactionTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const filtered = allTransactions.filter(
    t => (currentFilter === "all" || (t.type || "") === currentFilter) && !isTransferTx(t)
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
      if (w) walletName = w.name || '—';
    }

    row.innerHTML = `
      <td>${t.date || ""}</td>
      <td>${type === "income" ? "আয়" : "ব্যয়"}</td>
      <td>${t.category || ""}</td>
      <td>${walletName}</td>
      <td>${toBanglaNumber(Number(t.amount) || 0)}</td>
      <td>
        <button class="edit_Btn" data-id="${t.id}">পরিবর্তন</button>
        <button class="delete_Btn" data-id="${t.id}">মুছে ফেলো</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function renderSummary(transactions) {
  const summaryDiv = document.getElementById("summary");
  if (!summaryDiv) return;

  const filtered = (transactions || []).filter(
    t => (currentFilter === "all" || (t.type || "") === currentFilter) && !isTransferTx(t)
  );

  const totalIncome = filtered
    .filter((t) => t.type === "income")
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  const totalExpense = filtered
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

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

async function showFixedOverlay(id) {
  if (!currentUser) return;

  const db = firebase.firestore();
  const docRef = db.collection("users")
    .doc(currentUser.uid)
    .collection("transactions")
    .doc(id);

  let data;
  try {
    const doc = await docRef.get();
    if (!doc.exists) {
      return alert("ডাটা পাওয়া যায়নি!");
    }
    data = doc.data();
    if (!data) return alert("ডাটা পাওয়া যায়নি!");
  } catch (err) {
    return alert("ডাটা লোডে সমস্যা: " + err.message);
  }

  // 🆕 transfer হলে এডিট করা যাবে না
  if (isTransferTx(data)) {
    return alert("ওয়ালেট ট্রান্সফার এন্ট্রি এখান থেকে এডিট করা যাবে না।");
  }

  const existing = document.querySelector(".edit-overlay-fixed");
  if (existing) existing.remove();

  document.body.style.overflow = "hidden";

  const overlay = document.createElement("div");
  overlay.className = "edit-overlay-fixed";

  overlay.innerHTML = `
    <h3>ট্রানজেকশন এডিট করুন</h3>
    <input type="date" value="${data.date || ''}" class="form-input date-input"/>
    <select class="form-input type-select">
      <option value="income" ${data.type === 'income' ? 'selected' : ''}>আয়</option>
      <option value="expense" ${data.type === 'expense' ? 'selected' : ''}>ব্যয়</option>
    </select>
    <select class="form-input category-select">
      <option value="">ক্যাটেগরি নির্বাচন করুন</option>
    </select>
    <select class="form-input wallet-select">
      <option value="">ওয়ালেট নির্বাচন করুন</option>
    </select>
    <input type="number" value="${Number(data.amount) || 0}" class="form-input amount-input"/>
    <button class="save-btn">সংরক্ষণ করুন</button>
    <button class="cancel-btn">বাতিল</button>
  `;

  document.body.appendChild(overlay);

  const typeSelect = overlay.querySelector(".type-select");
  const categorySelect = overlay.querySelector(".category-select");
  const walletSelect = overlay.querySelector(".wallet-select");

  async function loadCategories(type) {
    try {
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
    } catch (err) {
      console.error("Category load error:", err);
    }
  }

  function loadWalletsDropdown() {
    walletSelect.innerHTML = `<option value="">ওয়ালেট নির্বাচন করুন</option>`;
    allWallets.forEach(w => {
      const opt = document.createElement("option");
      opt.value = w.id;
      opt.textContent = `${w.name} (${toBanglaNumber(Number(w.balance) || 0)} ৳)`;
      if (w.id === data.walletId) opt.selected = true;
      walletSelect.appendChild(opt);
    });
  }

  await loadCategories(data.type || "income");
  loadWalletsDropdown();

  typeSelect.addEventListener("change", () => loadCategories(typeSelect.value));

  const saveBtn = overlay.querySelector(".save-btn");
  const cancelBtn = overlay.querySelector(".cancel-btn");

  function closeOverlay() {
    overlay.remove();
    document.body.style.overflow = "";
  }

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

    const oldAmount = Number(data.amount) || 0;
    const oldType = data.type || 'expense';

    if (data.walletId) {
      const oldWalletRef = db.collection("users").doc(currentUser.uid)
        .collection("wallets").doc(data.walletId);
      const oldDelta = oldType === 'income' ? -oldAmount : oldAmount;
      batch.update(oldWalletRef, {
        balance: firebase.firestore.FieldValue.increment(oldDelta)
      });
    }

    const newWalletRef = db.collection("users").doc(currentUser.uid)
      .collection("wallets").doc(newWalletId);
    const newDelta = typeSelect.value === 'income' ? newAmount : -newAmount;
    batch.update(newWalletRef, {
      balance: firebase.firestore.FieldValue.increment(newDelta)
    });

    batch.update(docRef, {
      date: dateInput.value,
      type: typeSelect.value,
      category: categorySelect.value,
      amount: newAmount,
      walletId: newWalletId,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    try {
      await batch.commit();
      closeOverlay();
    } catch (err) {
      alert("আপডেটে সমস্যা: " + err.message);
    }
  });

  cancelBtn.addEventListener("click", closeOverlay);
}