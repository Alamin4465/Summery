let currentFilter = "all";
let allTransactions = [];
let currentUser = null;
let unsubscribeTransaction = null;

// Firebase auth state চেক (লগইন না হলে রিডাইরেক্ট)
firebase.auth().onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    currentUser = user;
    userId = user.uid;
    activate(document.getElementById('nav-dashboard'), 'ড্যাশবোর্ড');
  }
});

// DOM লোড হলে মেনু বাটনগুলোতে ইভেন্ট লিসেনার লাগানো
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('nav-dashboard')?.addEventListener('click', () => activate(document.getElementById('nav-dashboard'), 'ড্যাশবোর্ড'));
  document.getElementById('nav-forms')?.addEventListener('click', () => activate(document.getElementById('nav-forms'), 'ফ্রমস'));
  document.getElementById('nav-submit')?.addEventListener('click', () => activate(document.getElementById('nav-submit'), 'ট্রানজেকশন'));
  document.getElementById('nav-filter')?.addEventListener('click', () => activate(document.getElementById('nav-filter'), 'ফিল্টার'));
  document.getElementById('nav-profile')?.addEventListener('click', () => activate(document.getElementById('nav-profile'), 'প্রোফাইল তথ্য'));
});

// সেকশন অ্যাকটিভেট করার ফাংশন
function activate(button, sectionName) {
  document.querySelectorAll('.menu-button').forEach(btn => btn.classList.remove('active'));
  button.classList.add('active');

  const content = document.getElementById('content');

  if (sectionName === 'প্রোফাইল তথ্য') {
    loadProfileInfo();
  } else if (sectionName === 'ড্যাশবোর্ড') {
    loadDashboardSummary();
  } else if (sectionName === 'ফ্রমস') {
    renderForm();
  } else if (sectionName === 'ফিল্টার') {
    transactionFilter();
  } else if (sectionName === 'ট্রানজেকশন') {
    loadTransactions();
  } else {
    content.innerHTML = `<p>এই অংশটি এখনো তৈরি হয়নি।</p>`;
  }
}

// বাংলা নম্বর রূপান্তর (কমা সহ)
function toBanglaNumber(number) {
  if (typeof number !== "number") number = parseFloat(number) || 0;
  return number.toLocaleString('bn-BD', { maximumFractionDigits: 2 });
}

// Income ও Expense ক্যাটাগরি তালিকা (প্রয়োজন অনুযায়ী পরিবর্তন করো)
const incomeCategories = ["বেতন", "ব্যবসা", "অন্যান্য", "বাইক"];
const expenseCategories = [
  "বাসা ভাড়া", "মোবাইল রিচার্জ", "বিদ্যুৎ বিল", "পরিবহন", "দোকান বিল",
  "কেনাকাটা", "গাড়ির খরচ", "কাচা বাজার", "বাড়ি", "হাস্পাতাল",
  "ব্যক্তিগত", "অন্যান্য", "গাড়ির তেল", "নাস্তা", "খাওয়া"
];

// ট্রানজেকশন লোড (ফিল্টার ও রিয়েলটাইম)
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
  `;

  // ফিল্টার বাটনে ইভেন্ট লাগানো
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

// Firestore থেকে রিয়েলটাইম ডেটা ফেচ ও রেন্ডার
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
    });
}

// মোট আয়/ব্যয়/ব্যালেন্স দেখানো
function renderSummary(transactions) {
  const summaryDiv = document.getElementById('summary');
  const totalIncome = transactions.filter(t => t.type === "income").reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);
  const balance = totalIncome - totalExpense;

  let html = "";
  if (currentFilter === "all") {
    html = `মোট আয়: ${toBanglaNumber(totalIncome)} টাকা | মোট ব্যয়: ${toBanglaNumber(totalExpense)} টাকা | বর্তমান ব্যালেন্স: ${toBanglaNumber(balance)} টাকা`;
  } else if (currentFilter === "income") {
    html = `মোট আয়: ${toBanglaNumber(totalIncome)} টাকা`;
  } else if (currentFilter === "expense") {
    html = `মোট ব্যয়: ${toBanglaNumber(totalExpense)} টাকা`;
  }
  summaryDiv.innerHTML = html;
}

// Edit/Delete হ্যান্ডলার
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

      // Prompt দিয়ে ডাটা এডিট করা
      const newDate = prompt("তারিখ (YYYY-MM-DD):", data.date || "");
      if (newDate === null) return;

      const newType = prompt("টাইপ (income/expense):", data.type || "");
      if (newType === null || !["income", "expense"].includes(newType)) return alert("সঠিক টাইপ দিন");

      const categories = newType === "income" ? incomeCategories : expenseCategories;
      const newCategory = prompt(`ক্যাটেগরি নির্বাচন করুন:\n${categories.join(", ")}`, data.category || "");
      if (newCategory === null || !categories.includes(newCategory)) return alert("সঠিক ক্যাটেগরি দিন");

      const newAmountStr = prompt("টাকার পরিমাণ লিখুন:", data.amount || "");
      if (newAmountStr === null) return;

      const newAmount = parseFloat(newAmountStr);
      if (isNaN(newAmount)) return alert("সঠিক টাকার পরিমাণ দিন");

      // ডকুমেন্ট আপডেট
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
      if (confirm("আপনি কি নিশ্চিতভাবে ডিলিট করতে চান?")) {
        const db = firebase.firestore();
        await db.collection("users").doc(currentUser.uid).collection("transactions").doc(id).delete();
      }
    };
  });
}

function loadDashboardSummary() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <h2>ড্যাশবোর্ড</h2>

    <div id="summary" class="summary-container">
      <div class="summary-card">
        <h3>মোট আয়</h3>
        <p><span id="totalIncome">০</span> টাকা</p>
      </div>
      <div class="summary-card">
        <h3>মোট ব্যয়</h3>
        <p><span id="totalExpense">০</span> টাকা</p>
      </div>
      <div class="summary-card">
        <h3>বর্তমান ব্যালেন্স</h3>
        <p><span id="balance">০</span> টাকা</p>
      </div>
    </div>

    <div class="chartstyle">
  										<div id="fuel-gauge"></div>
      <canvas id="summaryChart"></canvas>
    </div>
  </br>
    <div class="chartstyle">
      <canvas id="lineChart"></canvas>
      <canvas id="categoryChart"></canvas>
    </div>
  `;

  const db = firebase.firestore();
  db.collection("users").doc(currentUser.uid).collection("transactions").onSnapshot(snapshot => {
    let totalIncome = 0;
    let totalExpense = 0;
    let incomeByCategory = {};
    let expenseByCategory = {};
    let dateWise = {};

    snapshot.forEach(doc => {
      const data = doc.data();
      const amount = parseFloat(data.amount || 0);
      const type = data.type;
      const category = data.category || "অন্যান্য";
      const date = data.date || "অজানা";

      if (type === "income") {
        totalIncome += amount;
        incomeByCategory[category] = (incomeByCategory[category] || 0) + amount;
      } else if (type === "expense") {
        totalExpense += amount;
        expenseByCategory[category] = (expenseByCategory[category] || 0) + amount;
      }

      if (!dateWise[date]) {
        dateWise[date] = { income: 0, expense: 0 };
      }
      dateWise[date][type] += amount;
    });

    const balance = totalIncome - totalExpense;
    const savingRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;

    // আপডেট সংক্ষিপ্ত তথ্য
    document.getElementById("totalIncome").textContent = toBanglaNumber(totalIncome);
    document.getElementById("totalExpense").textContent = toBanglaNumber(totalExpense);
    document.getElementById("balance").textContent = toBanglaNumber(balance);

    // চার্ট আঁকা
    drawSummaryChart(totalIncome, totalExpense, balance);
    drawCategoryChart(incomeByCategory, expenseByCategory);
    drawLineChart(dateWise);
    drawFuelGauge(savingRate);
  });
}

function drawSummaryChart(income, expense, balance) {
  const ctx = document.getElementById('summaryChart').getContext('2d');
    new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['আয়', 'ব্যয়', 'সঞ্চয়'],
      datasets: [{
        data: [income, expense, balance],
        backgroundColor: ['#4caf50', '#f44336', '#2196f3']
      }]
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        datalabels: {
          color: 'white',
          font: {
            weight: 'bold',
            size: 19
          },
          anchor: 'end',
          align: 'start',
          formatter: function(value) {
            return '৳' + value.toLocaleString();
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { display: false },
          grid: { color: 'rgba(255,255,255,0.1)' }
        },
        x: {
          ticks: { color: 'white' }
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}
function drawCategoryChart(incomeData, expenseData) {
  const ctx = document.getElementById('categoryChart').getContext('2d');

  const incomeCategories = Object.keys(incomeData);
  const expenseCategories = Object.keys(expenseData);

  const labels = [
    ...incomeCategories.map(c => `আয় - ${c}`),
    ...expenseCategories.map(c => `ব্যয় - ${c}`)
  ];
  const values = [
    ...incomeCategories.map(c => incomeData[c]),
    ...expenseCategories.map(c => expenseData[c])
  ];
  const colors = [
    ...incomeCategories.map(() => '#4caf50'),
    ...expenseCategories.map(() => '#f44336')
  ];

  const incomeTotal = values.slice(0, incomeCategories.length).reduce((a, b) => a + b, 0);
  const expenseTotal = values.slice(incomeCategories.length).reduce((a, b) => a + b, 0);
  const balance = incomeTotal - expenseTotal;
  const total = incomeTotal + expenseTotal;

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors
      }]
    },
    options: {
      responsive: true,
      cutout: '40%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.parsed;
              const percentage = ((value / total) * 100).toFixed(1);
              return `${context.label}: ৳${toBanglaNumber(value)} (${toBanglaNumber(percentage)}%)`;
            }
          }
        },
        datalabels: {
          color: '#fff',
          font: { weight: 'bold', size: 18 },
          formatter: (value) => {
            const percentage = (value / total) * 100;
            return percentage > 2 ? toBanglaNumber(percentage.toFixed(1)) + '%' : '';
          }
        }
      }
    },
    plugins: [ChartDataLabels, {
      id: 'centerText',
      beforeDraw(chart) {
        const { width, height, ctx } = chart;
        const centerX = width / 2;
        const centerY = height / 2;

        // মাঝখানে ব্যাকগ্রাউন্ড রঙ
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, chart._metasets[0].data[0].outerRadius * 0.4, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(0, 0, 255, 0.1)';
        ctx.fill();
        ctx.closePath();
        ctx.restore();

        // টেক্সট
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px SolaimanLipi, sans-serif';
        ctx.fillText('মোট টাকা', centerX, centerY - 10);
        ctx.font = 'bold 20px SolaimanLipi, sans-serif';
        ctx.fillText(`৳${toBanglaNumber(balance)}`, centerX, centerY + 15);
        ctx.restore();
      }
    }]
  });
}
function drawLineChart(dateData) {
  const ctx = document.getElementById('lineChart').getContext('2d');
  const sortedDates = Object.keys(dateData).sort();

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: sortedDates,
      datasets: [
        {
          label: 'আয়',
          data: sortedDates.map(date => dateData[date].income || 0),
          borderColor: '#4caf50',
          backgroundColor: 'rgba(76, 175, 80, 0.5)',
          pointBackgroundColor: '#4caf50',
          pointRadius: 4,
          tension: 0.5,
          fill: true
        },
        {
          label: 'ব্যয়',
          data: sortedDates.map(date => dateData[date].expense || 0),
          borderColor: '#f44336',
          backgroundColor: 'rgba(244, 67, 54, 0.5)',
          pointBackgroundColor: '#f44336',
          pointRadius: 4,
          tension: 0.5,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          mode: 'index',
          intersect: false,
          bodyFont: {
            size: 20 // টুলটিপের ফন্ট সাইজ বড়
          },
          titleFont: {
            size: 22 // টুলটিপের টাইটেল বড়
          }
        },
        legend: {
          labels: {
            font: {
              family: 'Arial',
              size: 24 // লেবেল (আয়/ব্যয়) ফন্ট সাইজ
            },
            color: '#ffffff'
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#ffffff',
            font: {
              size: 18 // এক্স-অক্ষ টিক ফন্ট সাইজ
            }
          }
        },
        y: {
          beginAtZero: true,
          min: 0,
          ticks: {
            stepSize: 500,
            color: '#ffffff',
            font: {
              size: 18 // ওয়াই-অক্ষ টিক ফন্ট সাইজ
            },
            callback: function(value) {
              return value + ' টাকা';
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.2)'
          }
        }
      }
    }
  });
}
function drawFuelGauge(savingRate) {
  function getColor(savingRate) {
    if (savingRate <= 5) return "#b71c1c";       
    else if (savingRate <= 11) return "#D63029";  
    else if (savingRate <= 17) return "#f44336"; 
    else if (savingRate <= 23) return "#FA6E1B";  
    else if (savingRate <= 30) return "#ff9800"; 
    else if (savingRate <= 37) return "#E6BA1D"; 
    else if (savingRate <= 44) return "#DACB2B";  
    else if (savingRate <= 51) return "#cddc39";  
    else if (savingRate <= 58) return "#ADD13F"; 
    else if (savingRate <= 65) return "#9DCC42";  
    else if (savingRate <= 72) return "#8DC645";  
    else if (savingRate <= 79) return "#5EA23C"; 
    else if (savingRate <= 84) return "#469037";
    else if (savingRate <= 90) return "#3A8735"; 
    else if (savingRate <= 95) return "#348234";
    else return "#2e7d32";                        
  }

  const color = getColor(savingRate); // ✅ এখানে ফাংশন কল করে color বের করছি

  const options = {
    chart: {
      height: 300,
      type: "radialBar",
    },
    series: [savingRate],
    labels: ["সঞ্চয় হার (%)"],
    colors: [color], // ✅ এখন ঠিকঠাক color বসানো হলো
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        hollow: {
          size: "50%",
        },
        track: {
          background:"rgba(0, 0, 0, 0.1)",
          startAngle: -135,
          endAngle: 135,
        },
        dataLabels: {
          name: {
            fontSize: "16px",
            color: "#000",
            offsetY: 30,
          },
          value: {
            offsetY: -20,
            fontSize: "22px",
            color: "#000",
            formatter: function (val) {
              return toBanglaNumber(val.toFixed(0)) + " %";
            },
          },
        },
      },
    },
    fill: {
      type: "solid",
    },
    stroke: {
      lineCap: "round",
    },
  };

  const chart = new ApexCharts(document.querySelector("#fuel-gauge"), options);
  chart.render();
}


// Helper: Convert English number to Bangla
function toBanglaNumber(input) {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return input
    .toString()
    .split('')
    .map(d => (/\d/.test(d) ? banglaDigits[parseInt(d)] : d))
    .join('');
}


// DOM loaded হলে কল করো
document.addEventListener("DOMContentLoaded", function () {
});


// প্রোফাইল তথ্য লোডার (আপনি ডাটাবেজ অনুযায়ী আপডেট করবেন)
function loadProfileInfo() {
  const content = document.getElementById('content');
  content.innerHTML = `<h2>প্রোফাইল তথ্য</h2><p>এই অংশে ইউজারের প্রোফাইল তথ্য দেখাবে।</p>`;
}
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


function transactionFilter() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <h2>লেনদেন ফর্ম</h2>
  <div class="Filter-monthday">
      <div class ="monthday">
      <h2>মাস ও তারিখ ফিল্টার </h2>
        <label>তারিখ নির্বাচন করুন:</label>
        <input type="date" id="dateFilter" />
        <label>মাস নির্বাচন করুন:</label>
        <input type="month" id="monthFilter" />
        <button id="resetFilterBtn">রিসেট</button>
      </div>
<div class="monthdaytable">
      <table id="filteredTable" border="1" style="margin-top: 10px; width: 100%;">
        <thead>
          <tr>
            <th>তারিখ/মাস</th>
            <th>ক্যাটাগরি</th>
            <th>আয় টাকা</th>
            <th>ব্যয় টাকা</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
</div>
  <div class="monthly-summary">
      <table id="monthlySummary" style="display:none">
  <tr><td>আগের ব্যালেন্স:</td><td id="prevBalance"></td></tr>
  <tr><td>মাসিক আয়:</td><td id="monthlyIncome"></td></tr>
  <tr><td>মাসিক ব্যয়:</td><td id="monthlyExpense"></td></tr>
  <tr><td>মোট ব্যালেন্স:</td><td id="totalBalance"></td></tr>
</table>
    </div>
  </div>
    `;
  // টাকা ফরম্যাট বাংলায়
function formatTaka(amount) {
  return "৳" + Number(amount).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// রিসেট ফিল্টার
document.getElementById("resetFilterBtn").addEventListener("click", () => {
  document.getElementById("dateFilter").value = "";
  document.getElementById("monthFilter").value = "";
  document.querySelector("#filteredTable tbody").innerHTML = "";
  document.getElementById("monthlySummary").style.display = "none";
});

// তারিখ ফিল্টার ইভেন্ট লিসেনার
document.getElementById("dateFilter").addEventListener("change", () => {
  const date = document.getElementById("dateFilter").value;
  if (date) {
    const user = firebase.auth().currentUser;
    if (user) {
      filterByDate(user.uid, date);
      calculateDailySummary(user.uid, date);
    }
  }
});

// তারিখ অনুসারে ফিল্টার
function filterByDate(userId, date) {
  const db = firebase.firestore();
  const tbody = document.querySelector("#filteredTable tbody");
  tbody.innerHTML = "";

  db.collection("users")
    .doc(userId)
    .collection("transactions")
    .where("date", "==", date)
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data();
        const income = data.type === "income" ? formatTaka(data.amount) : "";
        const expense = data.type === "expense" ? formatTaka(data.amount) : "";
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${data.date || ""}</td>
          <td>${data.category || ""}</td>
          <td>${income}</td>
          <td>${expense}</td>
        `;
        tbody.appendChild(tr);
      });
    });
}
  // মাস ফিল্টার ইভেন্ট লিসেনার
document.getElementById("monthFilter").addEventListener("change", () => {
  const month = document.getElementById("monthFilter").value;
  if (month) {
    const user = firebase.auth().currentUser;
    if (user) {
      filterByMonth(user.uid, month);
      calculateMonthlySummary(user.uid, month);
    }
  }
});
  // দৈনিক সামারি ক্যালকুলেশন
function calculateDailySummary(userId, date) {
  const selectedDate = new Date(date);
  selectedDate.setHours(0, 0, 0, 0); // আজকের শুরু সময়

  const nextDay = new Date(selectedDate);
  nextDay.setDate(nextDay.getDate() + 1); // পরের দিন = আজকের শেষ পর্যন্ত
  nextDay.setHours(0, 0, 0, 0);

  let income = 0;
  let expense = 0;
  let prevBalance = 0;

  const db = firebase.firestore();
  const transactionRef = db.collection("users").doc(userId).collection("transactions");

  // সব আগের ট্রান্সাকশন ধরো (আজকের 00:00 এর আগে)
  transactionRef
    .where("timestamp", "<", selectedDate)
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.type === "income") prevBalance += data.amount || 0;
        else if (data.type === "expense") prevBalance -= data.amount || 0;
      });

      // আজকের ট্রান্সাকশন
      return transactionRef
        .where("timestamp", ">=", selectedDate)
        .where("timestamp", "<", nextDay)
        .get();
    })
    .then(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.type === "income") income += data.amount || 0;
        else if (data.type === "expense") expense += data.amount || 0;
      });

      const total = prevBalance + income - expense;
      const dateLabel = new Date(date).toLocaleDateString("bn-BD", {
        year: "numeric", month: "short", day: "numeric"
      });

      const summaryTable = document.getElementById("monthlySummary");
      summaryTable.innerHTML = `
        <thead>
          <tr>
            <th>তারিখ</th>
            <th>বিবরণ</th>
            <th>আয়</th>
            <th>ব্যয়</th>
            <th>টাকা</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td rowspan="4" style="font-weight: bold;">${dateLabel}</td>
            <td colspan="3">শেষ টাকা</td>
            <td>${formatTaka(prevBalance)}</td>
          </tr>
          <tr>
            <td>আজকের আয়</td>
            <td>${formatTaka(income)}</td>
            <td></td>
            <td></td>
          </tr>
          <tr>
            <td>আজকের ব্যয়</td>
            <td></td>
            <td>${formatTaka(expense)}</td>
            <td>${formatTaka(total)}</td>
          </tr>
          <tr>
            <td colspan="3">মোট</td>
            <td>${formatTaka(total)}</td>
          </tr>
        </tbody>
      `;

      summaryTable.style.display = "table";
      renderSummaryChart(`${dateLabel} - আয় বনাম ব্যয়`, income, expense);
    });
}

// মাস অনুসারে ফিল্টার
function filterByMonth(userId, month) {
  const db = firebase.firestore();
  const tbody = document.querySelector("#filteredTable tbody");
  tbody.innerHTML = "";

  const [year, mon] = month.split("-");
  const start = new Date(`${year}-${mon}-01`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  db.collection("users")
    .doc(userId)
    .collection("transactions")
    .where("timestamp", ">=", start)
    .where("timestamp", "<", end)
    .orderBy("timestamp", "asc")
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data();
        const income = data.type === "income" ? formatTaka(data.amount) : "";
        const expense = data.type === "expense" ? formatTaka(data.amount) : "";
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${data.date || ""}</td>
          <td>${data.category || ""}</td>
          <td>${income}</td>
          <td>${expense}</td>
        `;
        tbody.appendChild(tr);
      });
    });
}
  function calculateMonthlySummary(userId, month) {
  const [year, mon] = month.split("-");
  const currentMonthStart = new Date(`${year}-${mon}-01`);
  const currentMonthEnd = new Date(currentMonthStart);
  currentMonthEnd.setMonth(currentMonthEnd.getMonth() + 1);

  const prevMonthStart = new Date(currentMonthStart);
  prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);

  let monthlyIncome = 0;
  let monthlyExpense = 0;
  let prevBalance = 0;

  const db = firebase.firestore();
  const transactionRef = db.collection("users").doc(userId).collection("transactions");

  transactionRef
    .where("timestamp", ">=", prevMonthStart)
    .where("timestamp", "<", currentMonthStart)
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.type === "income") prevBalance += data.amount || 0;
        else if (data.type === "expense") prevBalance -= data.amount || 0;
      });

      return transactionRef
        .where("timestamp", ">=", currentMonthStart)
        .where("timestamp", "<", currentMonthEnd)
        .get();
    })
    .then(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.type === "income") monthlyIncome += data.amount || 0;
        else if (data.type === "expense") monthlyExpense += data.amount || 0;
      });
      const total = prevBalance + monthlyIncome - monthlyExpense;
      const monthName = new Date(currentMonthStart).toLocaleString("bn-BD", {
        month: "short",
        year: "numeric",
      });
      const summaryTable = document.getElementById("monthlySummary");
      summaryTable.innerHTML = `
        <thead>
          <tr>
            <th>মাস</th>
            <th>বিবরণ</th>
            <th>আয়</th>
            <th>ব্যয়</th>
            <th>টাকা</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td rowspan="4" style="border: 2px solid #000; color: black;">${monthName}</td>
            <td colspan="3">শেষ টাকা</td>
            <td>${formatTaka(prevBalance)}</td>
          </tr>
          <tr>
            <td>মাসের আয়</td>
            <td>${formatTaka(monthlyIncome)}</td>
            <td></td>
            <td></td>
          </tr>
          <tr>
            <td>মাসের ব্যয়</td>
            <td></td>
            <td>${formatTaka(monthlyExpense)}</td>
            <td>${formatTaka(total)}</td>
          </tr>
          <tr>
            <td colspan="3">মোট</td>
            <td>${formatTaka(total)}</td>
          </tr>
        </tbody>
      `;
      summaryTable.style.display = "table";
      renderSummaryChart(`${monthName} - আয় বনাম ব্যয়`, monthlyIncome, monthlyExpense);
    });
}
}
  
