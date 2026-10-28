function transactionFilter() {
  const content = document.getElementById('content');
  content.innerHTML = `
   <h2 class="titel">লেনদেন ফিল্টার</h2>
<div class="tabs">
  <button class="tab-btn active" onclick="showTab(event, 'dateFilterTab')">তারিখ/মাস ফিল্টার</button>
  <button class="tab-btn" onclick="showTab(event, 'typeFilterTab')">টাইপ/ক্যাটাগরি ফিল্টার</button>
</div>

<!-- তারিখ/মাস ফিল্টার ট্যাব -->
<div id="dateFilterTab" class="tab-content" style="display: block;">
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
      <table id="filteredTable">
        <thead>
          <tr>
            <th>তারিখ/মাস</th>
            <th>ক্যাটাগরি</th>
            <th>আয় টাকা</th>
            <th>ব্যয় টাকা</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
      <table id="monthlySummary"></table>
    </div>

    <div class="chart-container">
      <canvas id="filterSummaryChart"></canvas>
    </div>
  </div>
</div>

<!-- টাইপ/ক্যাটাগরি ফিল্টার ট্যাব -->
<div id="typeFilterTab" class="tab-content" style="display: none;">
  <div class="Filter-monthday">
    <div class="monthday">
      <h2>টাইপ/ক্যাটাগরি ফিল্টার</h2>
      <label for="typeSelector">টাইপ:</label>
      <select id="typeSelector" class="form-input">
        <option value="">-- নির্বাচন করুন --</option>
        <option value="income">আয়</option>
        <option value="expense">ব্যয়</option>
      </select>
      <label for="categorySelector">ক্যাটাগরি:</label>
      <select id="categorySelector" class="form-input" disabled>
        <option value="">প্রথমে টাইপ নির্বাচন করুন</option>
      </select>
    </div>

    <div class="table-section">
      <table id="typeFilteredTable">
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

    <div class="chart-container">
      <canvas id="typeCategoryChart"></canvas>
    </div>

    <div id="expenseChart" style="width:100%; max-width:400px; height:400px; display:none; margin: 0 auto;"></div>
  </div>
</div>
`;

  // ========================
  // Firebase DB & Auth Setup
  // ========================
  const db = firebase.firestore();
  let currentUser = null;

  firebase.auth().onAuthStateChanged((user) => {
    if (user) currentUser = user;
  });

  let filterSummaryChart = null;
  let typeCategoryChart = null;
  let expenseChart = null;

  // ============== Utility ==============
  function formatTaka(amount) {
    return Number(amount).toLocaleString("bn-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0
    });
  }

  function toBanglaNumber(num) {
    const bnNums = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
    return String(num).replace(/[0-9]/g, d => bnNums[d]);
  }

  function formatBanglaPercent(value) {
    const banglaDigits = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
    let str = value.toFixed(1) + '%';
    return str.replace(/\d/g, d => banglaDigits[d]);
  }

  // ============== Tabs ==============
  window.showTab = function (event, tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId).style.display = 'block';
    if (event) event.currentTarget.classList.add('active');
  };

  // ============== Date & Month Filter ==============
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
    const date = dateFilter.value;
    const user = firebase.auth().currentUser;
    if (user && date) {
      filterByDate(user.uid, date);
      calculateDailySummary(user.uid, date);
    }
  });

  monthFilter.addEventListener("change", () => {
    dateFilter.value = "";
    const month = monthFilter.value;
    const user = firebase.auth().currentUser;
    if (user && month) {
      filterByMonth(user.uid, month);
      calculateMonthlySummary(user.uid, month);
    }
  });

  initTypeFilter();

  function initTypeFilter() {
    const typeSelector = document.getElementById("typeSelector");
    const categorySelector = document.getElementById("categorySelector");
    let unsubscribeCategories = null;

    function setStatus(msg, isError = false) {
      console.log(msg);
    }

    function loadCategories(type) {
      if (!type) return;
      if (unsubscribeCategories) unsubscribeCategories();

      unsubscribeCategories = db.collection("users").doc(currentUser.uid)
        .collection("categories").where("type", "==", type)
        .onSnapshot(snapshot => {
          categorySelector.innerHTML = '<option value="">-- সব ক্যাটাগরি --</option>';
          categorySelector.disabled = snapshot.empty;

          if (snapshot.empty) {
            setStatus("এই টাইপে কোনো ক্যাটেগরি নেই");
            return;
          }

          snapshot.docs
            .sort((a, b) => a.data().name.localeCompare(b.data().name, "bn-BD"))
            .forEach(doc => {
              const opt = document.createElement("option");
              opt.value = doc.data().name;
              opt.textContent = doc.data().name;
              opt.dataset.docId = doc.id;
              categorySelector.appendChild(opt);
            });

          setStatus(`ক্যাটেগরি লোড হয়েছে (${snapshot.size})`);
        }, err => setStatus("ক্যাটেগরি লোডে সমস্যা: " + err.message, true));
    }

    typeSelector.addEventListener("change", () => {
      const selectedType = typeSelector.value;
      if (selectedType) {
        loadCategories(selectedType);
      } else {
        categorySelector.innerHTML = '<option value="">প্রথমে টাইপ নির্বাচন করুন</option>';
        categorySelector.disabled = true;
      }
      loadFilteredTransactionsAndDrawChart();
    });

    categorySelector.addEventListener("change", loadFilteredTransactionsAndDrawChart);

    categorySelector.innerHTML = '<option value="">প্রথমে টাইপ নির্বাচন করুন</option>';
    categorySelector.disabled = true;
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
      let query = db.collection("users").doc(currentUser.uid)
        .collection("transactions")
        .where("type", "==", selectedType);

      if (selectedCategory) {
        query = query.where("category", "==", selectedCategory);
      }

      const snapshot = await query.get();
      const transactions = snapshot.docs
        .map(doc => doc.data())
        .sort((a, b) => b.timestamp - a.timestamp);

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

      if (selectedType === "expense" && selectedCategory === "সঞ্চয়") {
        await drawExpenseChartFromFirebase(currentUser.uid);
      } else {
        drawTypeCategoryChart(selectedType, transactions, selectedCategory);
      }

    } catch (error) {
      console.error("Firestore Error:", error);
      tbody.innerHTML = `<tr><td colspan="3" class="error">ডেটা লোডে সমস্যা হয়েছে</td></tr>`;
      clearChart();
    }
  }

  // ============== Type Category Pie Chart (Improved) ==============
  function drawTypeCategoryChart(type, transactions, selectedCategory = '') {
    document.getElementById("expenseChart").style.display = "none";
    document.getElementById("typeCategoryChart").style.display = "block";

    const canvas = document.getElementById("typeCategoryChart");
    const ctx = canvas.getContext("2d");

    if (typeCategoryChart) typeCategoryChart.destroy();

    const categoryTotals = {};
    transactions.forEach(tx => {
      if (!categoryTotals[tx.category]) categoryTotals[tx.category] = 0;
      categoryTotals[tx.category] += Number(tx.amount);
    });

    let labels = Object.keys(categoryTotals);
    let data = labels.map(label => categoryTotals[label]);

    if (selectedCategory && labels.includes(selectedCategory)) {
      labels = [selectedCategory];
      data = [categoryTotals[selectedCategory]];
    }

    const totalSum = data.reduce((a, b) => a + b, 0);
    let colors = type === "income"
      ? generateGreenShades(labels.length)
      : generateRedShades(labels.length);

    typeCategoryChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: 15 },
        animation: { duration: 1000, easing: 'easeOutQuart' },
        plugins: {
          legend: {
            position: window.innerWidth < 480 ? "bottom" : "right",
            labels: {
              color: '#374151',
              font: { size: 13, weight: 'bold' },
              padding: 12,
              boxWidth: 14
            }
          },
          datalabels: {
            color: "#fff",
            font: { weight: 'bold', size: 13 },
            formatter: (value) => {
              if (totalSum === 0) return '০%';
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
                const percentage = total === 0 ? 0 : ((value / total) * 100).toFixed(1);
                return `${label}: ${formatTaka(value)} (${percentage}%)`;
              }
            }
          },
          title: {
            display: true,
            text: type === "income"
              ? "আয়ের ক্যাটাগরি পাই চার্ট"
              : "ব্যয়ের ক্যাটাগরি পাই চার্ট",
            font: { size: 16, weight: 'bold' },
            color: "#374151",
            padding: { bottom: 10 }
          }
        }
      },
      plugins: [ChartDataLabels]
    });
  }

  // ============== Saving Radial Chart ==============
  async function drawExpenseChartFromFirebase(userId) {
    document.getElementById("typeCategoryChart").style.display = "none";
    const expenseDiv = document.getElementById("expenseChart");
    expenseDiv.style.display = "block";

    if (expenseChart) expenseChart.destroy();

    try {
      let totalSaving = 0;
      const snapshot = await db.collection("users")
        .doc(userId)
        .collection("transactions")
        .where("category", "==", "সঞ্চয়")
        .get();

      snapshot.forEach(doc => {
        const data = doc.data();
        totalSaving += Number(data.amount) || 0;
      });

      drawAnimatedSavingChart(totalSaving);
    } catch (error) {
      console.error("Error fetching data for expense chart:", error);
    }
  }

  let currentSaving = 0;

  function drawAnimatedSavingChart(targetSaving) {
    const duration = 1000;
    const frameRate = 60;
    const totalSteps = (duration / 1000) * frameRate;
    const increment = (targetSaving - currentSaving) / totalSteps;

    let step = 0;

    const interval = setInterval(() => {
      step++;
      currentSaving += increment;

      if (step >= totalSteps || currentSaving >= targetSaving) {
        currentSaving = targetSaving;
        clearInterval(interval);
      }

      updateSavingChart(currentSaving);
    }, 1000 / frameRate);
  }

  function updateSavingChart(savingAmount) {
    const maxSaving = 10000;
    const savingPercent = Math.min((savingAmount / maxSaving) * 100, 100);
    const color = getColor(savingPercent);

    function getColor(percent) {
      percent = Math.max(0, Math.min(percent, 100));
      const hue = (percent * 100) / 100;
      return `hsl(${hue}, 80%, 40%)`;
    }

    const chartOptions = {
      chart: { height: 400, type: "radialBar" },
      series: [savingPercent],
      labels: ["সঞ্চয়"],
      colors: [color],
      plotOptions: {
        radialBar: {
          startAngle: -135,
          endAngle: 135,
          hollow: { size: "50%" },
          track: { background: "rgba(0, 0, 0, 0.1)" },
          dataLabels: {
            value: {
              show: true,
              offsetY: -10,
              fontSize: "24px",
              color: "#374151",
              formatter: function () {
                return toBanglaNumber(savingAmount.toFixed(0)) + " ৳";
              },
            },
            name: {
              show: true,
              offsetY: 30,
              fontSize: "18px",
              color: "#374151",
              formatter: function () {
                return toBanglaNumber(savingPercent.toFixed(0)) + "%";
              },
            },
          },
        },
      },
      fill: { type: "solid" },
      stroke: { lineCap: "round" },
    };

    if (expenseChart) {
      expenseChart.updateOptions(chartOptions);
    } else {
      expenseChart = new ApexCharts(document.getElementById("expenseChart"), chartOptions);
      expenseChart.render();
    }
  }

  function generateGreenShades(count) {
    const shades = [];
    const baseHue = 120;
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
    const baseHue = 0;
    const saturation = 80;
    const lightnessStart = 40;
    const lightnessEnd = 70;
    for (let i = 0; i < count; i++) {
      const lightness = lightnessStart + ((lightnessEnd - lightnessStart) / (count - 1 || 1)) * i;
      shades.push(`hsl(${baseHue}, ${saturation}%, ${lightness}%)`);
    }
    return shades;
  }

  function clearChart() {
    if (typeCategoryChart) {
      typeCategoryChart.destroy();
      typeCategoryChart = null;
    }
  }

  // ============== Table Filters ==============
  function filterByDate(userId, date) {
    const tbody = document.querySelector("#filteredTable tbody");
    tbody.innerHTML = "";

    db.collection("users").doc(userId)
      .collection("transactions")
      .where("date", "==", date)
      .get()
      .then(snapshot => {
        if (snapshot.empty) {
          tbody.innerHTML = "<tr><td colspan='4' class='message'>এই তারিখে কোনো লেনদেন নেই</td></tr>";
          return;
        }
        snapshot.forEach(doc => {
          const data = doc.data();
          const income = data.type === "income" ? formatTaka(data.amount) : "";
          const expense = data.type === "expense" ? formatTaka(data.amount) : "";

          const row = document.createElement("tr");
          if (data.type === "income") row.classList.add("income-row");
          else if (data.type === "expense") row.classList.add("expense-row");

          if (data.category === "লোন গ্রহণ") row.classList.add("loan-taken");
          else if (data.category === "লোন পরিশোধ") row.classList.add("loan-repaid");

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
    const tbody = document.querySelector("#filteredTable tbody");
    tbody.innerHTML = "";

    const [year, mon] = month.split("-");
    const start = new Date(`${year}-${mon}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    db.collection("users").doc(userId)
      .collection("transactions")
      .where("timestamp", ">=", start)
      .where("timestamp", "<", end)
      .orderBy("timestamp", "asc")
      .get()
      .then(snapshot => {
        if (snapshot.empty) {
          tbody.innerHTML = "<tr><td colspan='4' class='message'>এই মাসে কোনো লেনদেন নেই</td></tr>";
          return;
        }
        snapshot.forEach(doc => {
          const data = doc.data();
          const income = data.type === "income" ? formatTaka(data.amount) : "";
          const expense = data.type === "expense" ? formatTaka(data.amount) : "";

          const row = document.createElement("tr");
          if (data.type === "income") row.classList.add("income-row");
          else if (data.type === "expense") row.classList.add("expense-row");

          if (data.category === "লোন গ্রহণ") row.classList.add("loan-taken");
          else if (data.category === "লোন পরিশোধ") row.classList.add("loan-repaid");

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

  // ============== Daily Summary ==============
  function calculateDailySummary(userId, date) {
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);

    let income = 0, expense = 0, prevBalance = 0;
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

      const daytotal = income - expense;
      const total = prevBalance + income - expense;
      const dateLabel = new Date(date).toLocaleDateString("bn-BD", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });

      const summaryTable = document.getElementById("monthlySummary");
      summaryTable.innerHTML = `
        <thead>
          <tr>
            <th>তারিখ</th>
            <th>বিবরণ</th>
            <th>আয়</th>
            <th>ব্যয়</th>
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
            <td>আজকের আয়</td>
            <td>${formatTaka(income)}</td>
            <td></td>
            <td></td>
          </tr>
          <tr>
            <td>আজকের ব্যয়</td>
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
      drawFilterSummaryChart(`${dateLabel} — আয় / ব্যয় / নিট`, income, expense);
    });
  }

  // ============== Monthly Summary ==============
  function calculateMonthlySummary(userId, month) {
    const [year, mon] = month.split("-");
    const start = new Date(`${year}-${mon}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    let income = 0, expense = 0, prevBalance = 0;
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

      const monthtotal = income - expense;
      const total = prevBalance + income - expense;
      const monthLabel = start.toLocaleString("bn-BD", {
        year: 'numeric',
        month: 'long'
      });

      const summaryTable = document.getElementById("monthlySummary");
      summaryTable.innerHTML = `
        <thead>
          <tr>
            <th>মাস</th>
            <th>বিবরণ</th>
            <th>আয়</th>
            <th>ব্যয়</th>
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
            <td>মাসের আয়</td>
            <td>${formatTaka(income)}</td>
            <td></td>
            <td></td>
          </tr>
          <tr>
            <td>মাসের ব্যয়</td>
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
      drawFilterSummaryChart(`${monthLabel} — আয় / ব্যয় / নিট`, income, expense);
    });
  }

  // ============== Filter Summary Bar Chart (Fixed) ==============
  let summaryChart = null;

  function drawFilterSummaryChart(title, income, expense) {
    const total = income - expense;
    const canvas = document.getElementById("filterSummaryChart");
    const ctx = canvas.getContext("2d");

    if (summaryChart) {
      summaryChart.destroy();
      summaryChart = null;
    }

    summaryChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["আয়", "ব্যয়", "নিট টাকা"],
        datasets: [{
          label: "পরিমাণ",
          data: [income, expense, total],
          backgroundColor: [
            "#2ecc71",
            "#e74c3c",
            total >= 0 ? "#3498db" : "#f39c12"
          ],
          borderColor: "#fff",
          borderWidth: 2,
          borderRadius: 8,
          maxBarThickness: 80
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1000, easing: "easeOutQuart" },
        layout: { padding: { top: 20 } },
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: title,
            font: { size: 16, weight: "bold" },
            color: "#374151",
            padding: { bottom: 15 }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const v = ctx.raw;
                const sign = v < 0 ? "−" : "";
                return `${ctx.label}: ${sign}৳${Math.abs(v).toLocaleString("bn-BD")}`;
              }
            }
          },
          datalabels: {
            color: "#111827",
            font: { weight: "bold", size: 12 },
            anchor: (ctx) => ctx.dataset.data[ctx.dataIndex] < 0 ? "start" : "end",
            align: (ctx) => ctx.dataset.data[ctx.dataIndex] < 0 ? "bottom" : "top",
            offset: 6,
            formatter: (value) => {
              const sign = value < 0 ? "−" : "";
              return sign + "৳" + Math.abs(value).toLocaleString("bn-BD");
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: "rgba(0,0,0,0.06)" },
            ticks: {
              color: "#4b5563",
              callback: (v) => {
                const sign = v < 0 ? "−" : "";
                return sign + "৳" + Math.abs(v).toLocaleString("bn-BD");
              }
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              color: "#374151",
              font: { weight: "bold", size: 13 }
            }
          }
        }
      },
      plugins: [ChartDataLabels]
    });
  }
}