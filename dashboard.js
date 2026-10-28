function loadDashboardSummary() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <h2 class="titel">ড্যাশবোর্ড</h2>

    <div id="summary" class="summary-container">
      <div class="summary-card income">
        <div class="summary-icon"><i class="fas fa-money-bill-wave"></i></div>
        <h3>মোট আয়</h3>
        <p><span id="totalIncome">০</span> টাকা</p>
      </div>
      <div class="summary-card expense">
        <div class="summary-icon"><i class="fas fa-credit-card"></i></div>
        <h3>মোট ব্যয়</h3>
        <p><span id="totalExpense">০</span> টাকা</p>
      </div>
      <div class="summary-card balance">
        <div class="summary-icon"><i class="fas fa-wallet"></i></div>
        <h3>বর্তমান ব্যালেন্স</h3>
        <p><span id="balance">০</span> টাকা</p>
      </div>
    </div>

    <div class="chartstyle">
      <div id="fuel-gauge"></div>
      <canvas id="summaryChart"></canvas>
    </div>
    <br>
    <div class="chartstyle">
      <div class="chart-wrapper" style="max-width: 800px; margin: auto;">
        <div id="chartContainer" style="position: relative; width: 100%;">
          <canvas id="lineChart" height="300"></canvas>
        </div>
        <div style="display: flex; justify-content: center; margin-top: 20px;">
          <input type="range" id="dateSlider" min="0" max="0" value="0" step="1"
            style="width:60%; height:16px; appearance:none; -webkit-appearance:none;
                   background:#ccc; border-radius:10px; outline:none; cursor:pointer;" />
        </div>
      </div>
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

      if (!dateWise[date]) dateWise[date] = { income: 0, expense: 0 };
      dateWise[date][type] += amount;
    });

    const balance = totalIncome - totalExpense;
    const savingRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;

    document.getElementById("totalIncome").textContent = toBanglaNumber(totalIncome);
    document.getElementById("totalExpense").textContent = toBanglaNumber(totalExpense);
    document.getElementById("balance").textContent = toBanglaNumber(balance);

    drawSummaryChart(totalIncome, totalExpense, balance);
    drawCategoryChart(incomeByCategory, expenseByCategory);
    drawLineChart(dateWise);
    drawFuelGauge(savingRate);
  });
}

// ============================================
// ✅ drawSummaryChart
// ============================================
function drawSummaryChart(income, expense, balance) {
  const canvas = document.getElementById('summaryChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  if (window._summaryChartInstance) {
    window._summaryChartInstance.destroy();
  }

  window._summaryChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['আয়', 'ব্যয়', 'সঞ্চয়'],
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
          font: { weight: 'bold', size: 19 },
          anchor: 'end',
          align: 'start',
          formatter: function (value) {
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

// ============================================
// ✅ drawCategoryChart — outerRadius এরর থেকে নিরাপদ
// ============================================
function drawCategoryChart(incomeData, expenseData) {
  const canvas = document.getElementById('categoryChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  const incomeCategories = Object.keys(incomeData || {});
  const expenseCategories = Object.keys(expenseData || {});

  const labels = [
    ...incomeCategories.map(c => `আয় - ${c}`),
    ...expenseCategories.map(c => `ব্যয় - ${c}`)
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

  if (window._categoryChartInstance) {
    window._categoryChartInstance.destroy();
  }

  const hasData = values.length > 0 && total > 0;
  const safeLabels = hasData ? labels : ['কোনো ডাটা নেই'];
  const safeValues = hasData ? values : [1];
  const safeColors = hasData ? colors : ['#555'];

  window._categoryChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: safeLabels,
      datasets: [{
        data: safeValues,
        backgroundColor: safeColors,
        borderWidth: 2,
        hoverOffset: hasData ? 30 : 0,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      cutout: '40%',
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: hasData,
          callbacks: {
            label: (context) => {
              const value = context.parsed;
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
              return `${context.label}: ৳${toBanglaNumber(value)} (${toBanglaNumber(percentage)}%)`;
            }
          }
        },
        datalabels: {
          color: '#fff',
          font: { weight: 'bold', size: 18 },
          formatter: (value) => {
            if (!hasData || total === 0) return '';
            const percentage = (value / total) * 100;
            return percentage > 2 ? toBanglaNumber(percentage.toFixed(1)) + '%' : '';
          }
        }
      }
    },
    plugins: [ChartDataLabels, {
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
        ctx.arc(centerX, centerY, outerRadius * 0.4, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(0, 0, 255, 0.1)';
        ctx.fill();
        ctx.closePath();
        ctx.restore();

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

// ============================================
// ✅ drawLineChart
// ============================================
let lineChartInstance = null;

function drawLineChart(dateData) {
  const canvas = document.getElementById('lineChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const sortedDates = Object.keys(dateData || {}).sort();

  const incomeData = sortedDates.map(date => dateData[date].income || 0);
  const expenseData = sortedDates.map(date => dateData[date].expense || 0);

  if (lineChartInstance) {
    lineChartInstance.destroy();
    lineChartInstance = null;
  }

  lineChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: sortedDates,
      datasets: [
        {
          label: 'আয়',
          data: incomeData,
          borderColor: '#4caf50',
          backgroundColor: 'rgba(76, 175, 80, 0.5)',
          pointBackgroundColor: '#4caf50',
          pointRadius: 4,
          tension: 0.5,
          fill: true
        },
        {
          label: 'ব্যয়',
          data: expenseData,
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
          bodyFont: { size: 20 },
          titleFont: { size: 22 }
        },
        legend: {
          labels: {
            font: { family: 'Arial', size: 24 },
            color: '#ffffff'
          }
        },
        annotation: {
          annotations: {}
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#ffffff',
            font: { size: 18 }
          }
        },
        y: {
          beginAtZero: true,
          min: 0,
          ticks: {
            stepSize: 500,
            color: '#ffffff',
            font: { size: 18 },
            callback: function (value) {
              return value + ' টাকা';
            }
          },
          grid: { color: 'rgba(255, 255, 255, 0.2)' }
        }
      }
    }
  });

  setupSlider(dateData, sortedDates);
}

// ============================================
// ✅ setupSlider
// ============================================
function setupSlider(dateData, sortedDates) {
  const slider = document.getElementById('dateSlider');
  if (!slider) return;

  if (!sortedDates || sortedDates.length === 0) {
    slider.max = 0;
    slider.value = 0;
    return;
  }

  slider.max = sortedDates.length - 1;

  const newSlider = slider.cloneNode(true);
  slider.parentNode.replaceChild(newSlider, slider);
  newSlider.max = sortedDates.length - 1;

  newSlider.addEventListener('input', function () {
    if (!lineChartInstance) return;

    const index = parseInt(this.value) || 0;
    const date = sortedDates[index];
    if (!date) return;

    const income = dateData[date].income || 0;
    const expense = dateData[date].expense || 0;
    const balance = income - expense;

    const banglaDate = convertToBanglaNumber(date);
    const banglaIncome = convertToBanglaNumber(income);
    const banglaExpense = convertToBanglaNumber(expense);
    const banglaBalance = convertToBanglaNumber(balance);

    lineChartInstance.options.plugins.annotation.annotations = {
      infoLabel: {
        type: 'label',
        xValue: sortedDates[0],
        yValue: lineChartInstance.scales.y.max,
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        color: '#fff',
        font: { size: 14, weight: 'bold' },
        padding: 4,
        content: [
          `তারিখ: ${banglaDate}`,
          `আয়: ৳${banglaIncome}`,
          `ব্যয়: ৳${banglaExpense}`,
          `অবশিষ্ট: ৳${banglaBalance}`
        ],
        textAlign: 'left',
        position: { x: 'start', y: 'start' }
      },
      selectedLine: {
        type: 'line',
        xMin: date,
        xMax: date,
        borderColor: 'yellow',
        borderWidth: 3,
        borderDash: [2]
      }
    };

    lineChartInstance.update();
  });

  newSlider.value = 0;
  newSlider.dispatchEvent(new Event('input'));
}

// ============================================
// ✅ drawFuelGauge
// ============================================
let fuelGaugeInstance = null;

function drawFuelGauge(savingRate) {
  function getColor(rate) {
    if (rate <= 5) return "#b71c1c";
    else if (rate <= 11) return "#D63029";
    else if (rate <= 17) return "#f44336";
    else if (rate <= 23) return "#FA6E1B";
    else if (rate <= 30) return "#ff9800";
    else if (rate <= 37) return "#E6BA1D";
    else if (rate <= 44) return "#DACB2B";
    else if (rate <= 51) return "#cddc39";
    else if (rate <= 58) return "#ADD13F";
    else if (rate <= 65) return "#9DCC42";
    else if (rate <= 72) return "#8DC645";
    else if (rate <= 79) return "#5EA23C";
    else if (rate <= 84) return "#469037";
    else if (rate <= 90) return "#3A8735";
    else if (rate <= 95) return "#348234";
    else return "#2e7d32";
  }

  const color = getColor(savingRate);
  const container = document.querySelector("#fuel-gauge");
  if (!container) return;

  container.innerHTML = '';
  if (fuelGaugeInstance) {
    try { fuelGaugeInstance.destroy(); } catch (e) {}
    fuelGaugeInstance = null;
  }

  const options = {
    chart: {
      height: 300,
      type: "radialBar"
    },
    series: [savingRate],
    labels: ["সঞ্চয় হার (%)"],
    colors: [color],
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        hollow: { size: "50%" },
        track: {
          background: "rgba(0, 0, 0, 0.1)",
          startAngle: -135,
          endAngle: 135
        },
        dataLabels: {
          name: {
            fontSize: "16px",
            color: "#000",
            offsetY: 30
          },
          value: {
            offsetY: -20,
            fontSize: "22px",
            color: "#000",
            formatter: function (val) {
              return toBanglaNumber(val.toFixed(0)) + " %";
            }
          }
        }
      }
    },
    fill: { type: "solid" },
    stroke: { lineCap: "round" }
  };

  fuelGaugeInstance = new ApexCharts(container, options);
  fuelGaugeInstance.render();
}

// ============================================
// Utility Functions
// ============================================
function toBanglaNumber(number) {
  if (typeof number !== "number") number = parseFloat(number) || 0;
  return number.toLocaleString('bn-BD', { maximumFractionDigits: 2 });
}

function convertToBanglaNumber(input) {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return input.toString().replace(/\d/g, d => banglaDigits[d]);
}