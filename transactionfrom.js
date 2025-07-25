const incomeCategories = ["বেতন", "ব্যবসা", "অন্যান্য", "বাইক"];
const expenseCategories =  [
    "বাসা ভাড়া", "মোবাইল রিচার্জ", "বিদ্যুৎ বিল", "পরিবহন", "দোকান বিল",
    "কেনাকাটা", "গাড়ির খরচ", "কাচা বাজার", "বাড়ি", "হাস্পাতাল",
    "ব্যক্তিগত", "অন্যান্য", "গাড়ির তেল", "নাস্তা", "খাওয়া","চুলকাটানো","লাইফ স্টাইল","সঞ্চয়"
  ];

// Bangla Number Format
function toBanglaNumber(number) {
  if (typeof number !== "number") number = parseFloat(number) || 0;
  return number.toLocaleString('bn-BD', { maximumFractionDigits: 2 });
}


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

// প্রথমে income/expense ক্লাস সেট করা
row.className = (type === "income") ? "income-row" : "expense-row";

// লোন ক্যাটাগরি চেক করে অতিরিক্ত ক্লাস অ্যাড করা
if (data.category === "লোন গ্রহণ") {
  row.classList.add("loan-taken");
} else if (data.category === "লোন পরিশোধ") {
  row.classList.add("loan-repaid");
}
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

