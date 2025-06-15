
function transactionFilter() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <h2 class="titel">লেনদেন ফিল্টার</h2>
    <div class="Filter-monthday">
      <div class="monthday">
        <h2>মাস ও তারিখ ফিল্টার</h2>
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

        <table id="monthlySummary" border="1" style="margin-top: 10px; width: 100%; display: none;"></table>
      </div>

      <canvas id="filterSummaryChart" width="400" height="250" style="margin-top: 20px;"></canvas>
    </div>
  `;

let filterSummaryChart = null;

// বাংলা টাকা ফরম্যাট
function formatTaka(amount) {
  return new Intl.NumberFormat("bn-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

// ইংরেজি → বাংলা সংখ্যায় রূপান্তর
function toBanglaNumber(number) {
  const en = '0123456789';
  const bn = '০১২৩৪৫৬৭৮৯';
  return number.toString().replace(/[0-9]/g, d => bn[en.indexOf(d)]);
}

function drawFilterSummaryChart(label, income, expense) {
  const ctx = document.getElementById('filterSummaryChart')?.getContext('2d');
  if (!ctx) return;

  if (filterSummaryChart) {
    filterSummaryChart.destroy();
  }

  // Pie Chart accepts only positive numbers
  const safeIncome = Math.max(income, 0.01);
  const safeExpense = Math.max(expense, 0.01);
  const net = income - expense;
  const safeTotal = Math.max(Math.abs(net), 0.01);

  const data = [safeIncome, safeExpense, safeTotal];
  const totalSum = data.reduce((a, b) => a + b, 0);

  filterSummaryChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['আয়', 'ব্যয়', 'মোট টাকা'],
      datasets: [{
        label: label,
        data: data,
        backgroundColor: ['#4CAF50', '#F44336', '#2196F3'],
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: `${label} (মোট: ${formatTaka(net)})`,
          font: {
            size: 18,
            family: 'Noto Sans Bengali'
          },
          color: '#ffffff' // শিরোনাম সাদা
        },
        legend: {
          position: 'bottom',
          labels: {
            color: '#ffffff', // লেবেল সাদা
            font: {
              size: 14,
              family: 'Noto Sans Bengali'
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function (tooltipItem) {
              const label = tooltipItem.label || '';
              const value = tooltipItem.raw || 0;
              const percentage = ((value / totalSum) * 100).toFixed(1);
              return `${label}: ${formatTaka(value)} (${toBanglaNumber(percentage)}%)`;
            }
          }
        },
        datalabels: {
          color: '#ffffff', // ডাটা লেবেল সাদা
          font: {
            family: 'Noto Sans Bengali',
            weight: 'bold',
            size: 14
          },
          formatter: function (value, context) {
            const percent = ((value / totalSum) * 100).toFixed(1);
            return `${toBanglaNumber(percent)}%`;
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}

  document.getElementById("resetFilterBtn").addEventListener("click", () => {
    document.getElementById("dateFilter").value = "";
    document.getElementById("monthFilter").value = "";
    document.querySelector("#filteredTable tbody").innerHTML = "";
    document.getElementById("monthlySummary").style.display = "none";
    if (filterSummaryChart) {
      filterSummaryChart.destroy();
      filterSummaryChart = null;
    }
  });

  document.getElementById("dateFilter").addEventListener("change", () => {
    const date = document.getElementById("dateFilter").value;
    const user = firebase.auth().currentUser;
    if (user && date) {
      filterByDate(user.uid, date);
      calculateDailySummary(user.uid, date);
    }
  });

  document.getElementById("monthFilter").addEventListener("change", () => {
    const month = document.getElementById("monthFilter").value;
    const user = firebase.auth().currentUser;
    if (user && month) {
      filterByMonth(user.uid, month);
      calculateMonthlySummary(user.uid, month);
    }
  });

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

  function calculateDailySummary(userId, date) {
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);

    let income = 0, expense = 0, prevBalance = 0;

    const db = firebase.firestore();
    const ref = db.collection("users").doc(userId).collection("transactions");

    ref.where("timestamp", "<", selectedDate).get().then(snapshot => {
      snapshot.forEach(doc => {
        const d = doc.data();
        if (d.type === "income") prevBalance += d.amount || 0;
        else if (d.type === "expense") prevBalance -= d.amount || 0;
      });

      return ref.where("timestamp", ">=", selectedDate).where("timestamp", "<", nextDay).get();
    }).then(snapshot => {
      snapshot.forEach(doc => {
        const d = doc.data();
        if (d.type === "income") income += d.amount || 0;
        else if (d.type === "expense") expense += d.amount || 0;
      });

      const total = prevBalance + income - expense;
      const dateLabel = new Date(date).toLocaleDateString("bn-BD", { year: "numeric", month: "short", day: "numeric" });

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
            <td rowspan="4"><b>${dateLabel}</b></td>
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
      drawFilterSummaryChart(`${dateLabel} - আয় বনাম ব্যয়`, income, expense);
    });
  }

  function calculateMonthlySummary(userId, month) {
    const [year, mon] = month.split("-");
    const start = new Date(`${year}-${mon}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    let income = 0, expense = 0, prevBalance = 0;

    const db = firebase.firestore();
    const ref = db.collection("users").doc(userId).collection("transactions");

    ref.where("timestamp", "<", start).get().then(snapshot => {
      snapshot.forEach(doc => {
        const d = doc.data();
        if (d.type === "income") prevBalance += d.amount || 0;
        else if (d.type === "expense") prevBalance -= d.amount || 0;
      });

      return ref.where("timestamp", ">=", start).where("timestamp", "<", end).get();
    }).then(snapshot => {
      snapshot.forEach(doc => {
        const d = doc.data();
        if (d.type === "income") income += d.amount || 0;
        else if (d.type === "expense") expense += d.amount || 0;
      });

      const total = prevBalance + income - expense;
      const monthLabel = start.toLocaleString("bn-BD", { year: 'numeric', month: 'long' });

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
            <td rowspan="4"><b>${monthLabel}</b></td>
            <td colspan="3">শেষ টাকা</td>
            <td>${formatTaka(prevBalance)}</td>
          </tr>
          <tr>
            <td>মাসের আয়</td>
            <td>${formatTaka(income)}</td>
            <td></td>
            <td></td>
          </tr>
          <tr>
            <td>মাসের ব্যয়</td>
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
      drawFilterSummaryChart(`${monthLabel} - আয় বনাম ব্যয়`, income, expense);
    });
  }
}
