
let currentUser = null;

firebase.auth().onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    currentUser = user;
    loadDashboardSummary();
  }
});

function activate(button, sectionName) {
  document.querySelectorAll('.menu-button').forEach(btn => btn.classList.remove('active'));
  button.classList.add('active');
  const content = document.getElementById('content');

  if (sectionName === 'প্রোফাইল তথ্য') loadProfileInfo();
  else if (sectionName === 'ড্যাশবোর্ড') loadDashboardSummary();
    else if (sectionName === 'ফ্রমস') submitHandler();
  else content.innerHTML = `<p>এই অংশটি এখনো তৈরি হয়নি।</p>`;
}

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

function loadDashboardSummary() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <h2 class="titel">ড্যাশবোর্ড</h2>
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
      <div style="display:none" class="summary-card">
        <img src="https://cdn-icons-png.flaticon.com/128/1484/1484840.png" class="summary-icon" alt="সঞ্চয় রেট">
        <h3>সঞ্চয় রেট</h3>
        <p><span id="savingsRate">0%</span></p>
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

    document.getElementById("totalIncome").textContent = toBanglaNumber(totalIncome);
    document.getElementById("totalExpense").textContent = toBanglaNumber(totalExpense);
    document.getElementById("balance").textContent = toBanglaNumber(savings);
    document.getElementById("savingsRate").textContent = toBanglaPercentage(savingsRate);

    drawSummaryChart(totalIncome, totalExpense, savings);
    drawCategoryChart(incomeByCategory, expenseByCategory);
    drawLineChart(dateWise);
    drawFuelGauge(savingsRate);
  });
}

function toBanglaNumber(number) {
  return number.toLocaleString('bn-BD', { maximumFractionDigits: 2 });
}

function toBanglaPercentage(number) {
  return toBanglaNumber(number.toFixed(2)) + '%';
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
          size: "70%",
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
