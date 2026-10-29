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

    <div class="chart-container" style="max-width: 450px; height: 350px; margin: 20px auto; background: var(--glass-bg); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid var(--glass-border); border-radius: 14px; padding: 15px;">
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

// ------------------ 🆕 নতুন চার্ট কোড (Glass + 2D Pie) ------------------
let incomeExpenseChart = null;

function renderIncomeExpenseCategoryChart(transactions, filter) {
  const canvas = document.getElementById("incomeExpenseChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  if (incomeExpenseChart) {
    try { incomeExpenseChart.destroy(); } catch (e) {}
    incomeExpenseChart = null;
  }

  const categoryTotals = {};
  (transactions || []).forEach((t) => {
    if (isTransferTx(t)) return; // transfer বাদ

    const cat = t.category || "অন্যান্য";
    const type = t.type || "expense";
    const amount = Number(t.amount) || 0;

    if (!categoryTotals[cat]) categoryTotals[cat] = { income: 0, expense: 0 };
    categoryTotals[cat][type] += amount;
  });

  let labels = [];
  let data = [];
  let colors = [];

  // গ্লাস ইফেক্টের জন্য ৮৫% অপাসিটি (স্বচ্ছ) রঙ
  const greenColors = ["rgba(0, 128, 0, 0.85)", "rgba(34, 139, 34, 0.85)", "rgba(50, 205, 50, 0.85)", "rgba(0, 100, 0, 0.85)", "rgba(144, 238, 144, 0.85)"]; 
  const redColors = ["rgba(255, 0, 0, 0.85)", "rgba(220, 20, 60, 0.85)", "rgba(178, 34, 34, 0.85)", "rgba(139, 0, 0, 0.85)", "rgba(255, 99, 71, 0.85)"];

  if (filter === "income") {
    labels = Object.keys(categoryTotals).filter(c => categoryTotals[c].income > 0);
    data = labels.map(cat => categoryTotals[cat].income);
    colors = labels.map((_, i) => greenColors[i % greenColors.length]);
  } else if (filter === "expense") {
    labels = Object.keys(categoryTotals).filter(c => categoryTotals[c].expense > 0);
    data = labels.map(cat => categoryTotals[cat].expense);
    colors = labels.map((_, i) => redColors[i % redColors.length]);
  } else {
    Object.keys(categoryTotals).forEach((cat, i) => {
      if (categoryTotals[cat].income > 0) {
        labels.push(cat + " (আয়)");
        data.push(categoryTotals[cat].income);
        colors.push(greenColors[i % greenColors.length]);
      }
      if (categoryTotals[cat].expense > 0) {
        labels.push(cat + " (ব্যয়)");
        data.push(categoryTotals[cat].expense);
        colors.push(redColors[i % redColors.length]);
      }
    });
  }

  const totalSum = data.reduce((a, b) => a + b, 0);
  const hasData = data.length > 0 && totalSum > 0;

  function formatBanglaPercent(value) {
    const banglaDigits = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
    const num = Number(value);
    if (!Number.isFinite(num)) return '০%';
    let str = num.toFixed(1) + '%';
    return str.replace(/\d/g, d => banglaDigits[d]);
  }

  const safeLabels = hasData ? labels : ['কোনো ডাটা নেই'];
  const safeData = hasData ? data : [1];
  const safeColors = hasData ? colors : ['rgba(156, 163, 175, 0.85)'];

  incomeExpenseChart = new Chart(ctx, {
    type: 'pie', // ছবির মতো ২ডি পাই চার্ট
    data: {
      labels: safeLabels,
      datasets: [{
        data: safeData,
        backgroundColor: safeColors,
        borderWidth: 2,
        borderColor: 'rgba(0, 0, 0, 0.7)' // ছবির মতো কালো বর্ডার
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 1000, easing: 'easeOutQuart' },
      plugins: {
        legend: {
          display: hasData,
          position: window.innerWidth < 480 ? "bottom" : "right",
          labels: {
            color: '#374151',
            font: { size: 13, weight: 'bold' },
            padding: 12,
            boxWidth: 14
          }
        },
        tooltip: {
          enabled: hasData,
          callbacks: {
            label: function (context) {
              const label = context.label || '';
              const value = Number(context.parsed) || 0;
              const percentage = totalSum === 0 ? 0 : ((value / totalSum) * 100).toFixed(1);
              return `${label}: ${toBanglaNumber(value)} ৳ (${formatBanglaPercent(percentage)})`;
            }
          }
        },
        // পাই-এর ভেতরে টেক্সট দেখানোর সেটিংস
        datalabels: {
          color: '#fff', 
          textStrokeColor: 'rgba(0, 0, 0, 0.8)',
          textStrokeWidth: 2,
          font: { weight: 'bold', size: 12 },
          formatter: (value, ctx) => {
            if (totalSum === 0) return '';
            const percentage = (value / totalSum) * 100;
            if (percentage < 5) return formatBanglaPercent(percentage);
            const label = ctx.chart.data.labels[ctx.dataIndex];
            return `${label}\n${formatBanglaPercent(percentage)}`;
          },
          anchor: 'center',
          align: 'center',
          display: (ctx) => {
            const value = ctx.dataset.data[ctx.dataIndex];
            const percentage = (value / totalSum) * 100;
            return percentage > 5; // ৫% এর বেশি হলেই ভেতরে টেক্সট দেখাবে
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}

// ------------------ বাকি কোড ------------------
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