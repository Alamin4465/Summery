let currentUser = null; 
let unsubscribeTransaction = null; 
let allTransactions = []; 
let currentFilter = "all"; 

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
    <div class="Filter-tabel">
      <div id="filterButtons">
        <button data-filter="all" class="filterBtn active">সব</button>
        <button data-filter="income" class="filterBtn">শুধু আয়</button>
        <button data-filter="expense" class="filterBtn">শুধু ব্যয়</button>
      </div>
      <table id="transactionTable">
        <thead>
          <tr>
            <th>তারিখ</th>
            <th>টাইপ</th>
            <th>ক্যাটেগরি</th>
            <th>টাকা</th>
            <th>অ্যাকশন</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
    <div id="summary" style="margin-top: 20px; font-weight: bold;"></div>
    <!-- HTML এর মধ্যে চার্টের জন্য ক্যানভাস -->
<canvas id="incomeExpenseChart" width="400" height="200"></canvas>  `;

  // ফিল্টার বাটন ইভেন্ট
  document.querySelectorAll("#filterButtons .filterBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#filterButtons .filterBtn").forEach((b) =>
        b.classList.remove("active")
      );
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      fetchTransactionsRealtime();
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
      await firebase
        .firestore()
        .collection("users")
        .doc(currentUser.uid)
        .collection("transactions")
        .doc(e.target.dataset.id)
        .delete();
    }
  });

  // প্রথমবারে লোড
  fetchTransactionsRealtime();
}
let incomeExpenseChart = null;

function renderIncomeExpenseCategoryChart(transactions, filter) {
  const categoryTotals = {};

  // ক্যাটাগরি অনুযায়ী ডাটা গ্রুপিং
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
        labels.push(cat + " (আয়)");
        data.push(categoryTotals[cat].income);
        backgroundColors.push(greenShades[i % greenShades.length]);
      }
      if (categoryTotals[cat].expense > 0) {
        labels.push(cat + " (ব্যয়)");
        data.push(categoryTotals[cat].expense);
        backgroundColors.push(redShades[i % redShades.length]);
      }
    });
  }

  const totalAmount = data.reduce((a, b) => a + b, 0);

  const ctx = document.getElementById("incomeExpenseChart").getContext("2d");
  if (incomeExpenseChart) incomeExpenseChart.destroy();

  // Center text plugin
  const centerTextPlugin = {
    id: 'centerText',
    afterDraw(chart) {
      const { ctx, chartArea: { width, height, top, left } } = chart;
      ctx.save();
      ctx.fillStyle = "#fff"; // সাদা ফন্ট
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText(toBanglaNumber(totalAmount)+"৳", left + width / 2, top + height / 2);
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
        cutout: "50%"
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
  display: true,
  position: "right",
  labels: {
    generateLabels: function(chart) {
      const dataset = chart.data.datasets[0];
      const sum = dataset.data.reduce((a, b) => a + b, 0);
      return chart.data.labels.map((label, i) => {
        const value = dataset.data[i];
        const percentage = ((value / sum) * 100).toFixed(2) + "%";
        return {
          text: label + ": " + percentage,
          fillStyle: dataset.backgroundColor[i],
          strokeStyle: dataset.backgroundColor[i],
          index: i,
          font: {
            size: 12,       // চাইলে বড় বা ছোট করতে পারেন
            family: 'sans-serif',
            weight: 'bold',
            style: 'normal',
            lineHeight: 1.2,
            color: "#fff"   // এখানে সাদা ফন্ট explicitly
          }
        };
      });
    }
  }
},
        tooltip: {
          callbacks: {
            label: function(tooltipItem) {
              const value = tooltipItem.raw;
              const sum = data.reduce((a, b) => a + b, 0);
              const percentage = ((value / sum) * 100).toFixed(2);
              return `${tooltipItem.label}: ${toBanglaNumber(value)} (${percentage}%)`;
            }
          }
        },
        datalabels: {
          color: '#fff', // সেগমেন্টের % লেবেল সাদা
          display: true,
          formatter: (value, ctx) => {
            const sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
            const percentage = ((value / sum) * 100).toFixed(2);
            return percentage + "%";
          }
        }
      }
    },
    plugins: [centerTextPlugin, ChartDataLabels] // ChartDataLabels plugin যোগ করা
  });
}
// ------------------ রিয়েলটাইম ট্রানজেকশন ------------------
function fetchTransactionsRealtime() {
  if (!currentUser) return;
  if (unsubscribeTransaction) unsubscribeTransaction();

  const tbody = document.querySelector("#transactionTable tbody");
  tbody.innerHTML = "";
  allTransactions = [];

  const db = firebase.firestore();
  unsubscribeTransaction = db
    .collection("users")
    .doc(currentUser.uid)
    .collection("transactions")
    .orderBy("timestamp", "desc")
    .onSnapshot((snapshot) => {
      tbody.innerHTML = "";
      allTransactions = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const type = data.type || "";

        if (currentFilter !== "all" && type !== currentFilter) return;

        allTransactions.push({ id: doc.id, ...data });

        const row = document.createElement("tr");
        row.className = type === "income" ? "income-row" : "expense-row";

        if (data.category === "লোন গ্রহণ") row.classList.add("loan-taken");
        else if (data.category === "লোন পরিশোধ") row.classList.add("loan-repaid");

        row.innerHTML = `
          <td>${data.date || ""}</td>
          <td>${type === "income" ? "আয়" : "ব্যয়"}</td>
          <td>${data.category || ""}</td>
          <td>${toBanglaNumber(parseFloat(data.amount || 0))}</td>
          <td>
            <button class="edit_Btn" data-id="${doc.id}">পরিবর্তন</button>
            <button class="delete_Btn" data-id="${doc.id}">মুছে ফেলো</button>
          </td>
        `;
        tbody.appendChild(row);
      });

      renderSummary(allTransactions);
      renderIncomeExpenseCategoryChart(allTransactions, currentFilter);
    });
}

// ------------------ সামারি রেন্ডার ------------------
function renderSummary(transactions) {
  const summaryDiv = document.getElementById("summary");

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);

  const balance = totalIncome - totalExpense;

  let html = "";
  if (currentFilter === "all") {
    html = `মোট আয়: ${toBanglaNumber(totalIncome)} টাকা | মোট ব্যয়: ${toBanglaNumber(
      totalExpense
    )} টাকা | ব্যালেন্স: ${toBanglaNumber(balance)} টাকা`;
  } else if (currentFilter === "income") {
    html = `মোট আয়: ${toBanglaNumber(totalIncome)} টাকা`;
  } else {
    html = `মোট ব্যয়: ${toBanglaNumber(totalExpense)} টাকা`;
  }

  summaryDiv.innerHTML = html;
}

// ------------------ Overlay ফাংশন ------------------
async function showFixedOverlay(id) {
  if (!currentUser) return;

  const db = firebase.firestore();
  const docRef = db.collection("users")
    .doc(currentUser.uid)
    .collection("transactions")
    .doc(id);

  const doc = await docRef.get();
  const data = doc.data();
  if (!data) return alert("ডাটা পাওয়া যায়নি!");

  // আগের overlay থাকলে remove করে দাও
  const existing = document.querySelector(".edit-overlay-fixed");
  if (existing) existing.remove();

  document.body.style.overflow = "hidden"; // scroll lock

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
      <option value="income" ${data.type==='income'?'selected':''}>আয়</option>
      <option value="expense" ${data.type==='expense'?'selected':''}>ব্যয়</option>
    </select><br>
    <select class="category-select">
      <option value="">ক্যাটেগরি নির্বাচন করুন</option>
    </select><br>
    <input type="number" value="${data.amount || 0}" class="amount-input"/><br>
    <button class="save-btn">সংরক্ষণ করুন</button>
    <button class="cancel-btn">বাতিল</button>
  `;

  document.body.appendChild(overlay);

  const typeSelect = overlay.querySelector(".type-select");
  const categorySelect = overlay.querySelector(".category-select");

  // Categories load
  async function loadCategories(type) {
    const snapshot = await db
      .collection("users")
      .doc(currentUser.uid)
      .collection("categories")
      .where("type", "==", type)
      .get();

    categorySelect.innerHTML = `<option value="">ক্যাটেগরি নির্বাচন করুন</option>`;
    snapshot.docs.forEach(doc => {
      const opt = document.createElement("option");
      opt.value = doc.data().name;
      opt.textContent = doc.data().name;
      if (doc.data().name === data.category) opt.selected = true;
      categorySelect.appendChild(opt);
    });
  }

  await loadCategories(data.type);
  typeSelect.addEventListener("change", () => loadCategories(typeSelect.value));

  // Save & Cancel
  const saveBtn = overlay.querySelector(".save-btn");
  const cancelBtn = overlay.querySelector(".cancel-btn");

  saveBtn.addEventListener("click", async () => {
    const dateInput = overlay.querySelector(".date-input");
    const amountInput = overlay.querySelector(".amount-input");

    if (!dateInput.value || !typeSelect.value || !categorySelect.value || !amountInput.value) {
      return alert("সব ফিল্ড পূরণ করুন!");
    }

    await docRef.update({
      date: dateInput.value,
      type: typeSelect.value,
      category: categorySelect.value,
      amount: parseFloat(amountInput.value),
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    });

    overlay.remove();
    document.body.style.overflow = "";
    fetchTransactionsRealtime();
  }, { once: true });

  cancelBtn.addEventListener("click", () => {
    overlay.remove();
    document.body.style.overflow = "";
  }, { once: true });
}
