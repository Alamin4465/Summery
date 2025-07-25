function transactionFilter() {
  const content = document.getElementById('content');
  content.innerHTML = `
   <h2 class="titel">লেনদেন ফিল্টার</h2>
<div class="tabs">
  <button class="tab-btn active" onclick="showTab(event, 'dateFilterTab')">তারিখ/মাস ফিল্টার</button>
  <button class="tab-btn" onclick="showTab(event, 'typeFilterTab')">টাইপ/ক্যাটাগরি ফিল্টার</button>
</div>

<!-- তারিখ/মাস ফিল্টার ট্যাব -->
<div id="dateFilterTab" class="tab-content">
<div class="Filter-monthday">
      <div class="monthday">
    <h2>মাস ও তারিখ ফিল্টার</h2>

    <div class="filter-row">
      <div class="filter-group">
        <label for="dateFilter">তারিখ নির্বাচন করুন:</label>
        <input type="date" id="dateFilter" />
      </div>

      <div class="filter-group">
        <label for="monthFilter">মাস নির্বাচন করুন:</label>
        <input type="month" id="monthFilter" />
      </div>

      <div class="reset-group">
        <button id="resetFilterBtn">রিসেট</button>
      </div>
    </div>
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
</div>

<!-- টাইপ/ক্যাটাগরি ফিল্টার ট্যাব -->
<div id="typeFilterTab" class="tab-content" style="display: none;">
  <div class="Filter-monthday">
<div class="monthday">
  <h2>টাইপ/ক্যাটাগরি ফিল্টার</h2>

  <label for="typeSelector">টাইপ:</label>
  <select id="typeSelector">
    <option value="">-- নির্বাচন করুন --</option>
    <option value="income">আয়</option>
    <option value="expense">ব্যয়</option>
  </select>

  <label for="categorySelector">ক্যাটাগরি:</label>
  <select id="categorySelector" disabled>
    <option value="">প্রথমে টাইপ নির্বাচন করুন</option>
  </select>
</div>
    <div class="table-section">
      <table id="typeFilteredTable" border="1" style="width: 100%; margin-top: 10px;">
  <thead>
    <tr>
      <th>তারিখ</th>
      <th>ক্যাটাগরি</th>
      <th>টাকা</th>
    </tr>
  </thead>
  <tbody id="typeFilteredTbody">
    <tr>
      <td colspan="3" class="message">টাইপ নির্বাচন করুন</td>
    </tr>
  </tbody>
</table>
    </div>
  <canvas id="typeCategoryChart" width="400" height="400"></canvas>
</div>
  </div>
  
  `;

  let filterSummaryChart = null;
  let currentUser = null;

  firebase.auth().onAuthStateChanged((user) => {
    if (user) currentUser = user;
  });

  function formatTaka(amount) {
    return new Intl.NumberFormat("bn-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  }

  window.showTab = function (event, tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId).style.display = 'block';
    if (event) event.currentTarget.classList.add('active');
  };

  const dateFilter = document.getElementById("dateFilter");
  const monthFilter = document.getElementById("monthFilter");
  const resetBtn = document.getElementById("resetFilterBtn");
  const filteredTable = document.querySelector("#filteredTable tbody");
  const summaryEl = document.getElementById("monthlySummary");

  resetBtn.addEventListener("click", () => {
    dateFilter.value = "";
    monthFilter.value = "";
    filteredTable.innerHTML = "<tr><td colspan='4' class='message'>ফিল্টার প্রয়োগ করুন</td></tr>";
    summaryEl.style.display = "none";
    if (filterSummaryChart) {
      filterSummaryChart.destroy();
      filterSummaryChart = null;
    }
  });

  dateFilter.addEventListener("change", () => {
    monthFilter.value = "";
    if (dateFilter.value) filterByDate(dateFilter.value);
  });

  monthFilter.addEventListener("change", () => {
    dateFilter.value = "";
    if (monthFilter.value) filterByMonth(monthFilter.value);
  });

  initTypeFilter();
  

let typeCategoryChart = null;

function initTypeFilter() {
  const typeSelector = document.getElementById("typeSelector");
  const categorySelector = document.getElementById("categorySelector");

  const incomeCategories = ["বেতন", "ব্যবসা", "অন্যান্য", "বাইক"];
  const expenseCategories = [
    "বাসা ভাড়া", "মোবাইল রিচার্জ", "বিদ্যুৎ বিল", "পরিবহন", "দোকান বিল",
    "কেনাকাটা", "গাড়ির খরচ", "কাচা বাজার", "বাড়ি", "হাস্পাতাল",
    "ব্যক্তিগত", "অন্যান্য", "গাড়ির তেল", "নাস্তা", "খাওয়া",
    "চুলকাটানো", "লাইফ স্টাইল", "সঞ্চয়"
  ];

  function initCategories() {
    const selectedType = typeSelector.value;
    categorySelector.disabled = !selectedType;
    categorySelector.innerHTML = selectedType
      ? '<option value="">-- সব ক্যাটাগরি --</option>'
      : '<option value="">প্রথমে টাইপ নির্বাচন করুন</option>';

    if (selectedType) {
      const categories = selectedType === "income" ? incomeCategories : expenseCategories;
      categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categorySelector.appendChild(option);
      });
    }
  }

  typeSelector.addEventListener("change", () => {
    initCategories();
    loadFilteredTransactionsAndDrawChart();
  });

  categorySelector.addEventListener("change", loadFilteredTransactionsAndDrawChart);

  initCategories();
  loadFilteredTransactionsAndDrawChart();
}

async function loadFilteredTransactionsAndDrawChart() {
  const typeSelector = document.getElementById("typeSelector");
  const categorySelector = document.getElementById("categorySelector");
  const tbody = document.querySelector("#typeFilteredTable tbody");

  const selectedType = typeSelector.value;
  const selectedCategory = categorySelector.value;

  tbody.innerHTML = '<tr><td colspan="3" class="message">লোড হচ্ছে...</td></tr>';

  if (!currentUser) {
    tbody.innerHTML = '<tr><td colspan="3" class="error">অনুগ্রহ করে লগইন করুন</td></tr>';
    clearChart();
    return;
  }

  if (!selectedType) {
    tbody.innerHTML = '<tr><td colspan="3" class="message">টাইপ নির্বাচন করুন</td></tr>';
    clearChart();
    return;
  }

  try {
    let query = db.collection("users").doc(currentUser.uid).collection("transactions").where("type", "==", selectedType);
    if (selectedCategory) {
      query = query.where("category", "==", selectedCategory);
    }

    const snapshot = await query.get();
    const transactions = snapshot.docs.map(doc => doc.data()).sort((a, b) => b.timestamp - a.timestamp);

    tbody.innerHTML = "";

    if (transactions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="message">কোনো লেনদেন পাওয়া যায়নি</td></tr>';
      clearChart();
      return;
    }

    let totalAmount = 0;
    transactions.forEach(tx => {
      totalAmount += Number(tx.amount);
      const tr = document.createElement("tr");
      tr.classList.add(tx.type === "income" ? "income-row" : "expense-row");
      tr.innerHTML = `
        <td>${tx.date || "N/A"}</td>
        <td>${tx.category || "N/A"}</td>
        <td>${formatTaka(tx.amount)}</td>
      `;
      tbody.appendChild(tr);
    });

    const totalRow = document.createElement("tr");
    totalRow.classList.add("total-row");
    totalRow.innerHTML = `
      <td colspan="2" style="text-align:left;"><strong>মোট টাকা</strong></td>
      <td><strong>${formatTaka(totalAmount)}</strong></td>
    `;
    tbody.appendChild(totalRow);

    drawTypeCategoryChart(selectedType, transactions, selectedCategory);
  } catch (error) {
    console.error("Firestore Error:", error);
    tbody.innerHTML = `<tr><td colspan="3" class="error">ডেটা লোডে সমস্যা হয়েছে</td></tr>`;
    clearChart();
  }
}
function drawTypeCategoryChart(type, transactions, selectedCategory = '') {
  const ctx = document.getElementById("typeCategoryChart").getContext("2d");

  if (typeCategoryChart) {
    typeCategoryChart.destroy();
  }

  const categoryTotals = {};
  transactions.forEach(tx => {
    if (!categoryTotals[tx.category]) {
      categoryTotals[tx.category] = 0;
    }
    categoryTotals[tx.category] += Number(tx.amount);
  });

  let labels = Object.keys(categoryTotals);
  let data = labels.map(label => categoryTotals[label]);

  if (selectedCategory && labels.includes(selectedCategory)) {
    labels = [selectedCategory];
    data = [categoryTotals[selectedCategory]];
  }

  const totalSum = data.reduce((a, b) => a + b, 0);

  let colors = [];
  if (selectedCategory && labels.length === 1) {
    colors = type === "income"
      ? generateGreenShades(1)
      : generateRedShades(1);
  } else {
    colors = type === "income"
      ? generateGreenShades(labels.length)
      : generateRedShades(labels.length);
  }

  typeCategoryChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderWidth: 1,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      animation: {
        animateRotate: true,
        duration: 1500,
        easing: 'easeOutBounce',
      },
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#fff', // ✅ সাদা লেখা
            font: {
              size: 14,
              weight: 'bold'
            }
          }
        },
        datalabels: {
          color: "#fff",
          font: {
            weight: 'bold',
            size: 14
          },
          formatter: (value) => {
            const percent = (value / totalSum) * 100;
            return formatBanglaPercent(percent);
          }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || '';
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${formatTaka(value)} (${percentage}%)`;
            }
          }
        },
        title: {
          display: true,
          text: type === "income" ? "আয়ের ক্যাটাগরি পাই চার্ট" : "ব্যয়ের ক্যাটাগরি পাই চার্ট",
          font: {
            size: 18,
            weight: 'bold'
          },
          color: "#fff"
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}
function generateGreenShades(count) {
  const shades = [];
  const baseHue = 120; // Green Hue
  const saturation = 70;
  const lightnessStart = 35;
  const lightnessEnd = 65;

  for (let i = 0; i < count; i++) {
    const lightness = lightnessStart + ((lightnessEnd - lightnessStart) / (count - 1 || 1)) * i;
    shades.push(`hsl(${baseHue}, ${saturation}%, ${lightness}%)`);
  }

  return shades;
}

function generateRedShades(count) {
  const shades = [];
  const baseHue = 0; // Red Hue
  const saturation = 80;
  const lightnessStart = 40;
  const lightnessEnd = 70;

  for (let i = 0; i < count; i++) {
    const lightness = lightnessStart + ((lightnessEnd - lightnessStart) / (count - 1 || 1)) * i;
    shades.push(`hsl(${baseHue}, ${saturation}%, ${lightness}%)`);
  }

  return shades;
}

function formatTaka(amount) {
  return Number(amount).toLocaleString("bn-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 0
  });
}

function formatBanglaPercent(value) {
  return value.toFixed(1).toLocaleString("bn-BD") + "%";
}

function clearChart() {
  if (typeCategoryChart) {
    typeCategoryChart.destroy();
    typeCategoryChart = null;
  }
}

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

        const row = document.createElement("tr");

        // income বা expense অনুযায়ী ক্লাস সেট
        if (data.type === "income") {
          row.classList.add("income-row");
        } else if (data.type === "expense") {
          row.classList.add("expense-row");
        }

        // লোন ক্যাটাগরি অনুযায়ী অতিরিক্ত ক্লাস যোগ
        if (data.category === "লোন গ্রহণ") {
          row.classList.add("loan-taken");
        } else if (data.category === "লোন পরিশোধ") {
          row.classList.add("loan-repaid");
        }

        row.innerHTML = `
          <td>${data.date || ""}</td>
          <td>${data.category || ""}</td>
          <td>${income}</td>
          <td>${expense}</td>
        `;
        tbody.appendChild(row);
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

        const row = document.createElement("tr");

        // income বা expense অনুযায়ী ক্লাস সেট
        if (data.type === "income") {
          row.classList.add("income-row");
        } else if (data.type === "expense") {
          row.classList.add("expense-row");
        }

        // লোন ক্যাটাগরি অনুযায়ী অতিরিক্ত ক্লাস যোগ
        if (data.category === "লোন গ্রহণ") {
          row.classList.add("loan-taken");
        } else if (data.category === "লোন পরিশোধ") {
          row.classList.add("loan-repaid");
        }

        row.innerHTML = `
          <td>${data.date || ""}</td>
          <td>${data.category || ""}</td>
          <td>${income}</td>
          <td>${expense}</td>
        `;
        tbody.appendChild(row);
      });
    });
}
// Helper function to format currency (example)
function formatTaka(amount) {
  return '৳' + Number(amount).toLocaleString('bn-BD');
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
      
      const daytotal =income - expense;
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
            <td>${formatTaka(daytotal)}</td>
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
      const monthtotal =income - expense;
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
            <td>${formatTaka(monthtotal)}</td>
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
  let summaryChart = null;

function formatBanglaPercent(value) {
  const banglaDigits = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
  let str = value.toFixed(1) + '%';
  return str.replace(/\d/g, d => banglaDigits[d]);
}

function drawFilterSummaryChart(title, income, expense) {
  const total = income - expense;
  const ctx = document.getElementById("filterSummaryChart").getContext("2d");

  if (summaryChart) {
    summaryChart.destroy();
  }

  const dataValues = [income, expense, Math.abs(total)];
  const totalSum = dataValues.reduce((a,b) => a + b, 0);

  summaryChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["আয়", "ব্যয়", "মোট টাকা"],
      datasets: [{
        data: dataValues,
        backgroundColor: ["green", "red", "blue"],
        borderColor: '#fff',
        borderWidth: 2,
        hoverOffset: 30,
      }]
    },
    options: {
      responsive: true,
      animation: {
        animateRotate: true,
        duration: 1500,
        easing: 'easeOutBounce',
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            font: {
              size: 14,
              weight: 'bold',
            },
            color: "#fff"
          }
        },
        datalabels: {
          color: "#fff",
          font: {
            weight: 'bold',
            size: 14
          },
          formatter: (value) => {
            const percent = (value / totalSum) * 100;
            return formatBanglaPercent(percent);
          }
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              let label = context.label;
              let val = context.raw;
              if (label === "মোট টাকা" && total < 0) {
                val = -val;
              }
              return `${label}: ৳${val.toLocaleString("bn-BD")}`;
            }
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}

}
