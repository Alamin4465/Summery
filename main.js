let currentUser = null;

// ইউজার লগইন না করলে রিডাইরেক্ট করো
firebase.auth().onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    currentUser = user;
    activate(document.getElementById('nav-dashboard'), 'ড্যাশবোর্ড'); // ড্যাশবোর্ড ডিফল্ট
  }
});

// সব বাটনের ক্লিক হ্যান্ডলার
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('nav-dashboard')?.addEventListener('click', function () {
    activate(this, 'ড্যাশবোর্ড');
  });

  document.getElementById('nav-forms')?.addEventListener('click', function () {
    activate(this, 'ফ্রমস');
  });

  document.getElementById('nav-submit')?.addEventListener('click', function () {
    activate(this, 'ট্রানজেকশন');
  });

  document.getElementById('nav-filter')?.addEventListener('click', function () {
    activate(this, 'ফিল্টার');
  });

  document.getElementById('nav-profile')?.addEventListener('click', function () {
    activate(this, 'প্রোফাইল তথ্য');
  });
});

// সেকশন একটিভ এবং লোড করো
function activate(button, sectionName) {
  document.querySelectorAll('.menu-button').forEach(btn => btn.classList.remove('active'));
  button.classList.add('active');

  const content = document.getElementById('content');

  if (sectionName === 'প্রোফাইল তথ্য') {
    loadProfileInfo();
  } else if (sectionName === 'ড্যাশবোর্ড') {
    loadDashboardSummary();
  } else if (sectionName === 'ফ্রমস') {
    content.innerHTML = `<h2>ফর্ম পেজ</h2><p>এখানে ফর্ম আসবে।</p>`;
  } else if (sectionName === 'ট্রানজেকশন') {
    loadTransactions();
  } else if (sectionName === 'ফিল্টার') {
    content.innerHTML = `<h2>ফিল্টার</h2><p>ডেটা ফিল্টার করার ফিচার আসবে।</p>`;
  } else {
    content.innerHTML = `<p>এই অংশটি এখনো তৈরি হয়নি।</p>`;
  }
}

// প্রোফাইল তথ্য লোড করো
function loadProfileInfo() {
  const content = document.getElementById('content');
  content.innerHTML = `<h2 class="titel">প্রোফাইল তথ্য</h2><p>তথ্য লোড হচ্ছে...</p>`;

  firebase.firestore().collection("users").doc(currentUser.uid).get()
    .then(doc => {
      if (doc.exists) {
        const data = doc.data();
        content.innerHTML = `
          <h2 class="titel">প্রোফাইল তথ্য</h2>
          <ul>
            <li><strong>নাম:</strong> ${data.name || "নির্ধারিত নয়"}</li>
            <li><strong>ইমেইল:</strong> ${currentUser.email}</li>
            <li><strong>জন্মতারিখ:</strong> ${data.dob || "নির্ধারিত নয়"}</li>
            <li><strong>লিঙ্গ:</strong> ${data.gender || "নির্ধারিত নয়"}</li>
          </ul>
          <button onclick="changePassword()">🔑 পাসওয়ার্ড পরিবর্তন করুন</button>
        `;
      } else {
        content.innerHTML = `<p>প্রোফাইল তথ্য পাওয়া যায়নি।</p>`;
      }
    })
    .catch(error => {
      console.error("প্রোফাইল তথ্য লোড করতে সমস্যা:", error);
      content.innerHTML = `<p>প্রোফাইল লোডে সমস্যা হয়েছে।</p>`;
    });
}

function changePassword() {
  const email = currentUser.email;
  firebase.auth().sendPasswordResetEmail(email)
    .then(() => {
      alert("আপনার ইমেইলে পাসওয়ার্ড পরিবর্তনের লিংক পাঠানো হয়েছে।");
    })
    .catch(error => {
      console.error("পাসওয়ার্ড পরিবর্তনে সমস্যা:", error);
      alert("পাসওয়ার্ড রিসেট করতে সমস্যা হয়েছে।");
    });
}

// ✅ ড্যাশবোর্ড সামারি লোড করো
function loadDashboardSummary() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <h2>ড্যাশবোর্ড</h2>
    <div id="summary" class="summary-container">
      <div class="summary-card">
        <img src="https://cdn-icons-png.flaticon.com/128/3135/3135679.png" class="summary-icon" alt="আয়">
        <h3>মোট আয়</h3>
        <p><span id="totalIncome">0</span></p>
      </div>
      <div class="summary-card">
        <img src="https://cdn-icons-png.flaticon.com/128/992/992700.png" class="summary-icon" alt="ব্যয়">
        <h3>মোট ব্যয়</h3>
        <p><span id="totalExpense">0</span></p>
      </div>
      <div class="summary-card">
        <img src="https://cdn-icons-png.flaticon.com/128/3135/3135686.png" class="summary-icon" alt="ব্যালেন্স">
        <h3>বর্তমান ব্যালেন্স</h3>
        <p><span id="balance">0</span></p>
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
      const category = data.category || 'অন্যান্য';
      const date = (data.date || '').split('T')[0];

      if (data.type === "income") {
        totalIncome += amount;
        incomeByCategory[category] = (incomeByCategory[category] || 0) + amount;
      } else if (data.type === "expense") {
        totalExpense += amount;
        expenseByCategory[category] = (expenseByCategory[category] || 0) + amount;
      }

      if (date) {
        if (!dateWise[date]) dateWise[date] = { income: 0, expense: 0 };
        if (data.type === 'income') dateWise[date].income += amount;
        else if (data.type === 'expense') dateWise[date].expense += amount;
      }
    });

    const savings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

    document.getElementById("totalIncome").textContent = '৳' + toBanglaNumber(totalIncome);
document.getElementById("totalExpense").textContent = '৳' + toBanglaNumber(totalExpense);
document.getElementById("balance").textContent = '৳' + toBanglaNumber(savings);

    drawSummaryChart(totalIncome, totalExpense, savings);
    drawCategoryChart(incomeByCategory, expenseByCategory);
    drawLineChart(dateWise);
    drawFuelGauge(savingsRate);
  });
}

// 🔢 বাংলা নম্বর রূপান্তর
function toBanglaNumber(number) {
  return number.toLocaleString('bn-BD', { maximumFractionDigits: 2 });
}

function toBanglaPercentage(number) {
  return toBanglaNumber(number.toFixed(2)) + '%';
}

// 📊 বার চার্ট (সারাংশ)
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

// 🍩 ক্যাটাগরি ডোয়নাট চার্ট
function drawCategoryChart(incomeData, expenseData) {
  const ctx = document.getElementById('categoryChart').getContext('2d');

  const incomeCategories = Object.keys(incomeData);
  const expenseCategories = Object.keys(expenseData);
  const incomeValues = Object.values(incomeData);
  const expenseValues = Object.values(expenseData);

  const labels = [...incomeCategories, ...expenseCategories];
  const values = [...incomeValues, ...expenseValues];
  const colors = [...incomeCategories.map(() => '#4caf50'), ...expenseCategories.map(() => '#f44336')];

  const incomeTotal = incomeValues.reduce((a, b) => a + b, 0);
  const expenseTotal = expenseValues.reduce((a, b) => a + b, 0);
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

  // 🟦 ১. মাঝখানে ব্যাকগ্রাউন্ড রঙ বসানো
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, chart._metasets[0].data[0].outerRadius * 0.4, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(0, 0, 255, 0.1)'; // ⬅️ মাঝখানের ব্যাকগ্রাউন্ড কালার (ট্রান্সপারেন্ট কালো)
  ctx.fill();
  ctx.closePath();
  ctx.restore();

  // 🟩 ২. টেক্সট রঙ এবং স্টাইল
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff'; // ⬅️ টেক্সটের রঙ (সাদা)
  ctx.font = 'bold 28px SolaimanLipi, sans-serif';
  ctx.fillText('মোট টাকা', centerX, centerY - 10);
  ctx.font = 'bold 20px SolaimanLipi, sans-serif';
  ctx.fillText(`৳${toBanglaNumber(balance)}`, centerX, centerY + 15);
  ctx.restore();
}
    }]
  });
}

// 📈 লাইনে তারিখভিত্তিক চার্ট
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
        data: sortedDates.map(date => dateData[date].income),
        borderColor: '#4caf50',
        backgroundColor: 'rgba(76, 175, 80, 0.5)',
        pointBackgroundColor: '#4caf50',
        pointRadius: 4,
        tension: 0.5,
        fill: true
      },
      {
        label: 'ব্যয়',
        data: sortedDates.map(date => dateData[date].expense),
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
let fuelGaugeChart = null; // 🔥 Declare this globally

function drawFuelGauge(savingRate) {
  let color = "#FF0000";
  if (savingRate <= 10) color = "#FF0000";
  else if (savingRate <= 20) color = "#FF6666";
  else if (savingRate <= 30) color = "#FF9900";
  else if (savingRate <= 50) color = "#CCCC00";
  else if (savingRate <= 80) color = "#66CC66";
  else color = "#006400";

  const options = {
    chart: {
      height: 380,
      type: "radialBar",
      offsetY: -20,
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 800,
        animateGradually: {
          enabled: true,
          delay: 150
        },
        dynamicAnimation: {
          enabled: true,
          speed: 800
        }
      }
    },
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        hollow: {
          margin: 0,
          size: "50%",
          background: "transparent"
        },
        track: {
          background: "rgba(255, 255, 255, 0.1)",
          strokeWidth: "100%",
          margin: 0
        },
        dataLabels: {
          name: {
            offsetY: -5,
            color: "#fff",
            fontSize: "28"
          },
          value: {
            offsetY: 10,
            fontSize: "40px",
            color: "#fff",
            formatter: function (val) {
              return parseInt(val) + "%";
            }
          }
        }
      }
    },
    fill: {
      type: "solid",
      colors: [color],
    },
    stroke: {
      lineCap: "round",
    },
    series: [savingRate],
    labels: ["সঞ্চয় রেট"]
  };
  const chart = new ApexCharts(document.querySelector("#fuel-gauge"), options);
  if (fuelGaugeChart) fuelGaugeChart.destroy(); // পুরনো চার্ট থাকলে ধ্বংস করো
  fuelGaugeChart = chart;
  chart.render(); // নতুন চার্ট আঁকো
}

let currentFilter = 'all';
let unsubscribe = null;

function loadTransactions() {
  const db = firebase.firestore();
  const tbody = document.querySelector("#transactionTable tbody");
  const totalIncomeEl = document.getElementById("totalIncome");
  const totalExpenseEl = document.getElementById("totalExpense");
  const netTotalEl = document.getElementById("netTotal");

  // পূর্বের লিসেনার আনসাবস্ক্রাইব করুন
  if (unsubscribe) unsubscribe();

  let query = db.collection("users").doc(userId).collection("transactions").orderBy("timestamp", "desc");

  if (currentFilter !== "all") {
    query = query.where("type", "==", currentFilter);
  }

  unsubscribe = query.onSnapshot(snapshot => {
    tbody.innerHTML = "";
    let totalIncome = 0;
    let totalExpense = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      const amount = parseFloat(data.amount || 0);
      const type = data.type || "";

      if (type === "income") {
        totalIncome += amount;
      } else if (type === "expense") {
        totalExpense += amount;
      }

      const row = document.createElement("tr");
      row.className = type === "income" ? "income-row" : "expense-row";

      row.innerHTML = `
        <td>${data.date || ""}</td>
        <td>${type === "income" ? "আয়" : "ব্যয়"}</td>
        <td>${data.category || ""}</td>
        <td>${toBanglaNumber(amount)}</td>
        <td>
          <button class="editBtn" data-id="${doc.id}">এডিট</button>
          <button class="deleteBtn" data-id="${doc.id}">ডিলিট</button>
        </td>
      `;
      tbody.appendChild(row);
    });

    // মোট হিসাব আপডেট করুন
    totalIncomeEl.textContent = toBanglaNumber(totalIncome);
    totalExpenseEl.textContent = toBanglaNumber(totalExpense);
    netTotalEl.textContent = toBanglaNumber(totalIncome - totalExpense);
  });
}

// ফিল্টার বাটনের ইভেন্ট লিসেনার
document.querySelectorAll(".filterBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filterBtn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.getAttribute("data-filter");
    loadTransactions();
  });
});

// বাংলা সংখ্যায় রূপান্তর ফাংশন
function toBanglaNumber(number) {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return number.toString().replace(/\d/g, d => banglaDigits[d]);
}

// প্রাথমিকভাবে সব ট্রানজেকশন লোড করুন
loadTransactions();
