function submitHandler(e) {
  e.preventDefault();

  const user = firebase.auth().currentUser;
  if (!user) return;

  const date = document.getElementById("date").value;
  const type = document.getElementById("type").value;
  const category = document.getElementById("category").value;
  const amount = parseFloat(document.getElementById("amount").value);

  firebase.firestore()
    .collection("users")
    .doc(user.uid)
    .collection("transactions")
    .add({
      date,
      type,
      category,
      amount,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      document.getElementById("transactionForm").reset();
      loadTransactions(user.uid);
    })
    .catch((error) => {
      console.error("সংরক্ষণ করতে সমস্যা হয়েছে:", error);
    });
}

// content section এ ফর্ম বসানো ও event listener বসানো
function renderForm() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <h2>লেনদেন ফর্ম</h2>
    <form id="transactionForm">
      <input class="form-input" type="date" id="date" required>
      
      <select class="form-input" id="type" required>
        <option value="">টাইপ নির্বাচন করুন</option>
        <option value="income">আয়</option>
        <option value="expense">ব্যয়</option>
      </select>
      
      <select class="form-input" id="category" required>
        <option value="">ক্যাটেগরি নির্বাচন করুন</option>
      </select>
      
      <input type="number" class="form-input" id="amount" placeholder="টাকার পরিমাণ" required>
      <button type="submit" class="form-button">সংরক্ষণ করুন</button>
    </form>

    <h3>সাম্প্রতিক ১০টি লেনদেন</h3>
    <div id="recent-transactions"></div>
  `;

  // টাইপ অনুযায়ী ক্যাটাগরি সেটআপ
  const incomeCategories = ["বেতন", "ব্যবসা", "অন্যান্য", "বাইক"];
  const expenseCategories = [
    "বাসা ভাড়া", "মোবাইল রিচার্জ", "বিদ্যুৎ বিল", "পরিবহন", "দোকান বিল",
    "কেনাকাটা", "গাড়ির খরচ", "কাচা বাজার", "বাড়ি", "হাস্পাতাল",
    "ব্যক্তিগত", "অন্যান্য", "গাড়ির তেল", "নাস্তা", "খাওয়া"
  ];

  document.getElementById("type").addEventListener("change", function () {
    const selectedType = this.value;
    const categorySelect = document.getElementById("category");
    categorySelect.innerHTML = '<option value="">ক্যাটেগরি নির্বাচন করুন</option>';

    const categories = selectedType === "income" ? incomeCategories :
                       selectedType === "expense" ? expenseCategories : [];

    categories.forEach(cat => {
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = cat;
      categorySelect.appendChild(option);
    });
  });

  // সাবমিট ইভেন্ট
  document.getElementById("transactionForm").addEventListener("submit", submitHandler);

  // রেন্ডার করার সময় ইউজার থাকলে লেনদেন লোড
  const user = firebase.auth().currentUser;
  if (user) {
    loadRecentTransactions(user.uid);
  }
}

function loadRecentTransactions(uid) {
  firebase.firestore()
    .collection("users")
    .doc(uid)
    .collection("transactions")
    .orderBy("timestamp", "desc")
    .limit(10)
    .get()
    .then((querySnapshot) => {
      let html = `
        <table class="transaction-table">
          <thead>
            <tr>
              <th>তারিখ</th>
              <th>টাইপ</th>
              <th>ক্যাটেগরি</th>
              <th>পরিমাণ</th>
            </tr>
          </thead>
          <tbody>
      `;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const rowClass = data.type === "income" ? "income-row" : "expense-row";
        const iconClass = data.type === "income" ? "income-icon" : "expense-icon";
        const date = data.date || "";
        const category = data.category || "";
        const amount = data.amount?.toLocaleString('bn-BD') || 0;
        const typeLabel = data.type === "income" ? "আয়" : "ব্যয়";

        html += `
          <tr class="${rowClass}">
            <td>${date}</td>
            <td class="${iconClass}">${typeLabel}</td>
            <td>${category}</td>
            <td>${amount} ৳</td>
          </tr>
        `;
      });

      html += `</tbody></table>`;
      document.getElementById("recent-transactions").innerHTML = html;
    })
    .catch((error) => {
      console.error("লেনদেন লোড করতে সমস্যা হয়েছে:", error);
    });
}


// Bangla Number Format
function toBanglaNumber(number) {
  if (typeof number !== "number") number = parseFloat(number) || 0;
  return number.toLocaleString('bn-BD', { maximumFractionDigits: 2 });
}

// Category Lists
const incomeCategories = ["বেতন", "ব্যবসা", "অন্যান্য", "বাইক"];
const expenseCategories = [
  "বাসা ভাড়া", "মোবাইল রিচার্জ", "বিদ্যুৎ বিল", "পরিবহন", "দোকান বিল",
  "কেনাকাটা", "গাড়ির খরচ", "কাচা বাজার", "বাড়ি", "হাস্পাতাল",
  "ব্যক্তিগত", "অন্যান্য", "গাড়ির তেল", "নাস্তা", "খাওয়া"
];

// Transaction Load UI
function loadTransactions() {
  const content = document.getElementById('content');
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
<div id="incomexpensescatagori"></div>
  `;

  document.querySelectorAll('#filterButtons .filterBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#filterButtons .filterBtn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      fetchTransactionsRealtime();
    });
  });

  fetchTransactionsRealtime();
}

// Firestore থেকে রিয়েলটাইম ডেটা
function fetchTransactionsRealtime() {
  if (unsubscribeTransaction) unsubscribeTransaction();

  const tbody = document.querySelector("#transactionTable tbody");
  tbody.innerHTML = "";
  allTransactions = [];

  const db = firebase.firestore();

  unsubscribeTransaction = db.collection("users")
    .doc(currentUser.uid)
    .collection("transactions")
    .orderBy("timestamp", "desc")
    .onSnapshot(snapshot => {
      tbody.innerHTML = "";
      allTransactions = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        const type = data.type || "";
        if (currentFilter !== "all" && type !== currentFilter) return;

        allTransactions.push({ id: doc.id, ...data });

        const row = document.createElement("tr");
        row.className = (type === "income") ? "income-row" : "expense-row";
        row.innerHTML = `
          <td>${data.date || ""}</td>
          <td>${type === "income" ? "আয়" : "ব্যয়"}</td>
          <td>${data.category || ""}</td>
          <td>${toBanglaNumber(parseFloat(data.amount || 0))}</td>
          <td>
            <button class="editBtn" data-id="${doc.id}">এডিট</button>
            <button class="deleteBtn" data-id="${doc.id}">ডিলিট</button>
          </td>
        `;
        tbody.appendChild(row);
      });

      renderSummary(allTransactions);
      setupEditDeleteHandlers();

      // 🔥 এখানে চার্ট কল
      renderIncomeExpenseCategoryChart(allTransactions, currentFilter);
    });
}

// Summary
function renderSummary(transactions) {
  const summaryDiv = document.getElementById('summary');
  const totalIncome = transactions.filter(t => t.type === "income").reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);
  const balance = totalIncome - totalExpense;

  let html = "";
  if (currentFilter === "all") {
    html = `মোট আয়: ${toBanglaNumber(totalIncome)} টাকা | মোট ব্যয়: ${toBanglaNumber(totalExpense)} টাকা | ব্যালেন্স: ${toBanglaNumber(balance)} টাকা`;
  } else if (currentFilter === "income") {
    html = `মোট আয়: ${toBanglaNumber(totalIncome)} টাকা`;
  } else {
    html = `মোট ব্যয়: ${toBanglaNumber(totalExpense)} টাকা`;
  }

  summaryDiv.innerHTML = html;
}

// Edit/Delete Setup
function setupEditDeleteHandlers() {
  const tbody = document.querySelector("#transactionTable tbody");

  tbody.querySelectorAll(".editBtn").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const db = firebase.firestore();
      const docRef = db.collection("users").doc(currentUser.uid).collection("transactions").doc(id);
      const doc = await docRef.get();
      const data = doc.data();

      if (!data) return alert("ডাটা পাওয়া যায়নি!");

      const newDate = prompt("তারিখ (YYYY-MM-DD):", data.date || "");
      if (newDate === null) return;

      const newType = prompt("টাইপ (income/expense):", data.type || "");
      if (newType === null || !["income", "expense"].includes(newType)) return alert("সঠিক টাইপ দিন");

      const categories = newType === "income" ? incomeCategories : expenseCategories;
      const newCategory = prompt(`ক্যাটেগরি:\n${categories.join(", ")}`, data.category || "");
      if (newCategory === null || !categories.includes(newCategory)) return alert("সঠিক ক্যাটেগরি দিন");

      const newAmountStr = prompt("টাকার পরিমাণ:", data.amount || "");
      if (newAmountStr === null) return;

      const newAmount = parseFloat(newAmountStr);
      if (isNaN(newAmount)) return alert("সঠিক টাকার পরিমাণ দিন");

      await docRef.update({
        date: newDate,
        type: newType,
        category: newCategory,
        amount: newAmount,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });

      fetchTransactionsRealtime();
    };
  });

  tbody.querySelectorAll(".deleteBtn").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      if (confirm("আপনি কি ডিলিট করতে চান?")) {
        const db = firebase.firestore();
        await db.collection("users").doc(currentUser.uid).collection("transactions").doc(id).delete();
      }
    };
  });
}

function renderIncomeExpenseCategoryChart(transactions, filterType = "all") {
  function generateCategoryMap(transactions, filter, type) {
    const map = {};
    transactions.forEach(t => {
      if ((filter === "all" || t.type === filter) && t.type === type) {
        if (!map[t.category]) map[t.category] = 0;
        map[t.category] += parseFloat(t.amount) || 0;
      }
    });
    return map;
  }

  const incomeMap = generateCategoryMap(transactions, filterType, "income");
  const expenseMap = generateCategoryMap(transactions, filterType, "expense");

  const incomeCategories = Object.keys(incomeMap);
  const incomeValues = Object.values(incomeMap);
  const expenseCategories = Object.keys(expenseMap);
  const expenseValues = Object.values(expenseMap);

  const series = [...incomeValues, ...expenseValues];
  const labels = [
    ...incomeCategories.map(c => "আয়: " + c),
    ...expenseCategories.map(c => "ব্যয়: " + c)
  ];

  const incomeColors = incomeValues.map((_, i) => `hsl(145, 60%, ${60 - i * 5}%)`);
  const expenseColors = expenseValues.map((_, i) => `hsl(10, 70%, ${65 - i * 5}%)`);
  const colors = [...incomeColors, ...expenseColors];

  const totalIncome = incomeValues.reduce((a, b) => a + b, 0);
  const totalExpense = expenseValues.reduce((a, b) => a + b, 0);

  let totalLabel = "মোট";
  let displayTotal = totalIncome - totalExpense;

  if (filterType === "income") {
    totalLabel = "মোট আয়";
    displayTotal = totalIncome;
  } else if (filterType === "expense") {
    totalLabel = "মোট ব্যয়";
    displayTotal = totalExpense;
  }

  const options = {
    chart: {
      type: 'donut',
      height: 420,
      toolbar: { show: false },
      fontFamily: 'Noto Sans Bengali, Kalpurush, sans-serif'
    },
    series: series,
    labels: labels,
    colors: colors,
    legend: {
  position: 'bottom',
  fontSize: '14px',
  labels: {
    colors: '#ffffff' // ✅ সাদা লেবেল
  }
},
    dataLabels: {
      enabled: true,
      formatter: val => `${val.toFixed(1)}%`,
      style: {
        fontSize: '13px',
        fontWeight: 'bold',
        colors: ['#fff']  // ✅ এখানেই center text সাদা
      }
    },
    tooltip: {
      y: {
        formatter: (value, { seriesIndex, w }) => {
          const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
          const percent = ((value / total) * 100).toFixed(1);
          return `৳ ${value.toLocaleString("bn-BD")} (${percent.toLocaleString("bn-BD")}%)`;
        },
        title: {
          formatter: (seriesName) => `${seriesName}`
        }
      },
      style: {
        fontSize: '14px',
        fontFamily: 'Noto Sans Bengali, Kalpurush, sans-serif'
      }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '45%',
          labels: {
            show: true,
            name: {
              show: true,
              color: '#ffffff',       // ✅ সেন্টার নাম সাদা
              fontSize: '16px',
              fontWeight: 'bold'
            },
            value: {
              show: true,
              color: '#ffffff',       // ✅ সেন্টার ভ্যালু সাদা
              fontSize: '20px',
              fontWeight: 'bold',
              formatter: function (val) {
                return `৳ ${parseFloat(val).toLocaleString("bn-BD")}`;
              }
            },
            total: {
              show: true,
              label: totalLabel,
              fontSize: '18px',
              color: '#ffffff',       // ✅ সেন্টার টোটাল লেবেল সাদা
              formatter: function () {
                return `৳ ${displayTotal.toLocaleString("bn-BD")}`;
              }
            }
          }
        }
      }
    }
  };

  // রেন্ডার
  if (window.chartInstance) {
    chartInstance.updateOptions(options);
    chartInstance.updateSeries(series);
  } else {
    window.chartInstance = new ApexCharts(document.querySelector("#incomexpensescatagori"), options);
    chartInstance.render();
  }
}
