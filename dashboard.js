function loadDashboardSummary() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <h2 class="titel">ড্যাশবোর্ড</h2>

    <div id="summary" class="summary-container">
            <div class="summary-card income">
                <div class="summary-icon">
                    <i class="fas fa-money-bill-wave"></i>
                </div>
                <h3>মোট আয়</h3>
                <p><span id="totalIncome">৮৫,৬৫০</span> টাকা</p>
            </div>
            
            <div class="summary-card expense">
                <div class="summary-icon">
                    <i class="fas fa-credit-card"></i>
                </div>
                <h3>মোট ব্যয়</h3>
                <p><span id="totalExpense">৬২,৪২০</span> টাকা</p>
            </div>
            
            <div class="summary-card balance">
                <div class="summary-icon">
                    <i class="fas fa-wallet"></i>
                </div>
                <h3>বর্তমান ব্যালেন্স</h3>
                <p><span id="balance">২৩,২৩০</span> টাকা</p>
            </div>
    </div>

    <div class="chartstyle">
  										<div id="fuel-gauge"></div>
      <canvas id="summaryChart"></canvas>
    </div>
  </br>
   <div class="chartstyle">
  													<div class="chart-wrapper" style="max-width: 800px; margin: auto;">

  <!-- Chart container -->
  <div id="chartContainer" style="position: relative; width: 100%;">
    <canvas id="lineChart" height="300"></canvas>
  </div>

  <!-- Slider (middle center under chart) -->
  <div style="display: flex; justify-content: center; margin-top: 20px;">
    <input 
      type="range" 
      id="dateSlider" 
      min="0" 
      max="0" 
      value="0" 
      step="1"
      style="
        width: 60%;
        height: 16px;
        appearance: none;
        -webkit-appearance: none;
        background: #ccc;
        border-radius: 10px;
        outline: none;
        cursor: pointer;
      "
    />
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
  backgroundColor: colors, // ← এখানে কমা দরকার ছিল
  borderWidth: 2,
  hoverOffset: 30,
  borderColor: '#fff'
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
let lineChartInstance;

function drawLineChart(dateData) {
  const ctx = document.getElementById('lineChart').getContext('2d');
  const sortedDates = Object.keys(dateData).sort();

  const incomeData = sortedDates.map(date => dateData[date].income || 0);
  const expenseData = sortedDates.map(date => dateData[date].expense || 0);

  if (lineChartInstance) {
    lineChartInstance.destroy();
  }

  lineChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: sortedDates,
      datasets: [
        {
          label: 'আয়',
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
          annotations: {} // Initial empty
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
            callback: function(value) {
              return value + ' টাকা';
            }
          },
          grid: { color: 'rgba(255, 255, 255, 0.2)' }
        }
      }
    }
  });

  // স্লাইডার সেটআপ কল করো
  setupSlider(dateData, sortedDates);
}

function convertToBanglaNumber(input) {
  const banglaDigits = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
  return input.toString().replace(/\d/g, d => banglaDigits[d]);
}

function setupSlider(dateData, sortedDates) {
  const slider = document.getElementById('dateSlider');
  slider.max = sortedDates.length - 1;

  slider.addEventListener('input', function () {
    const index = parseInt(this.value);
    const date = sortedDates[index];
    const income = dateData[date].income || 0;
    const expense = dateData[date].expense || 0;
    const balance = income - expense;

    const banglaDate = convertToBanglaNumber(date);
    const banglaIncome = convertToBanglaNumber(income);
    const banglaExpense = convertToBanglaNumber(expense);
    const banglaBalance = convertToBanglaNumber(balance);

    // ✅ annotations reset করে দুইটি বসাও
    lineChartInstance.options.plugins.annotation.annotations = {
      // ১. ফিক্সড লেবেল
      infoLabel: {
        type: 'label',
        xValue: sortedDates[0], // প্রথম দিনেই রাখবো যাতে ফিক্সড থাকে
        yValue: lineChartInstance.scales.y.max,
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        color: '#fff',
        font: {
          size: 14,
          weight: 'bold'
        },
        padding: 4,
        content: [
          `তারিখ: ${banglaDate}`,
          `আয়: ৳${banglaIncome}`,
          `ব্যয়: ৳${banglaExpense}`,
          `অবশিষ্ট: ৳${banglaBalance}`
        ],
        textAlign: 'left',
        position: {
          x: 'start',
          y: 'start'
        }
      },

      // ২. চলন্ত রেখা
      selectedLine: {
        type: 'line',
        xMin: date,
        xMax: date,
        borderColor: 'yellow',
        borderWidth: 3,
        borderDash: [2] // যদি চাও ড্যাশড লাইন
      }
    };

    lineChartInstance.update();
  });

  // প্রথম দিন দেখাও
  slider.value = 0;
  slider.dispatchEvent(new Event('input'));
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
 
function loadBarChartByDate() {
  const db = firebase.firestore();
  db.collection("users").doc(currentUser.uid).collection("transactions")
    .get()
    .then(snapshot => {
      const dateWise = {};

      snapshot.forEach(doc => {
        const data = doc.data();
        const date = data.date;
        const type = data.type;
        const amount = parseFloat(data.amount || 0);

        if (!dateWise[date]) {
          dateWise[date] = { income: 0, expense: 0 };
        }

        if (type === "income") {
          dateWise[date].income += amount;
        } else if (type === "expense") {
          dateWise[date].expense += amount;
        }
      });

      const sortedDates = Object.keys(dateWise).sort();

      const incomeData = sortedDates.map(date => dateWise[date].income);
      const expenseData = sortedDates.map(date => dateWise[date].expense);
      const balanceData = sortedDates.map(date => dateWise[date].income - dateWise[date].expense);

      const ctx = document.getElementById("barChartByDate").getContext("2d");

      new Chart(ctx, {
        type: "bar",
        data: {
          labels: sortedDates,
          datasets: [
            {
              label: "আয়",
              data: incomeData,
              backgroundColor: "#4caf50"
            },
            {
              label: "ব্যয়",
              data: expenseData,
              backgroundColor: "#f44336"
            },
            {
              label: "মোট টাকা",
              data: balanceData,
              backgroundColor: "#2196f3"
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  return context.dataset.label + ": ৳" + toBanglaNumber(context.parsed.y);
                }
              }
            },
            legend: {
              labels: {
                font: { size: 18 },
                color: "#ffffff"
              }
            }
          },
          scales: {
            x: {
              ticks: {
                color: "#ffffff",
                font: { size: 16 }
              },
              grid: { display: false }
            },
            y: {
              beginAtZero: true,
              ticks: {
                color: "#ffffff",
                callback: function(value) {
                  return toBanglaNumber(value) + ' টাকা';
                }
              },
              grid: {
                color: 'rgba(255,255,255,0.2)'
              }
            }
          }
        }
      });
    });
}
