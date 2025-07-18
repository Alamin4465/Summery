function lonefrom() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <h2 class="titel">ফ্রম সেকশন</h2>
    <div class="tabs">
      <button class="tab-btn active" onclick="showTab(event, 'fromsaction')">লেনদেন ফ্রম</button>
      <button class="tab-btn" onclick="showTab(event, 'Lonesaction')">লোন ফ্রম</button>
    </div>

    <!-- তারিখ/মাস ফিল্টার ট্যাব -->
    <div id="fromsaction" class="tab-content">
      <h2 class="titel">লেনদেন ফর্ম</h2>
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
  
      <div id="recent-transactions"></div>
    </div>

    <!-- টাইপ/ক্যাটাগরি ফিল্টার ট্যাব -->
    <div id="Lonesaction" class="tab-content" style="display: none;">
      <h2 class="titel">লোন গৃহীত ও পরিশোধ</h2>
      <form id="loanForm">
  <input class="form-input" type="date" id="loanDate" required>
  
  <select class="form-input" id="loanType" required>
    <option value="">ধরণ নির্বাচন করুন</option>
    <option value="loan">লোন গ্রহণ</option>
    <option value="repayment">লোন পরিশোধ</option>
  </select>
  
  <input class="form-input" type="text" id="loanName" placeholder="লোন দাতার নাম লিখুন" required>
  
  <input class="form-input" type="number" id="loanAmount" placeholder="উদাহরণ: 5000" required>
  
  <button class="form-button" type="submit">এন্ট্রি যুক্ত করুন</button>
</form>

      <table id="loanTable" class="transaction-table" style="margin-top:15px; width: 100%;">
        <thead>
          <tr>
            <th>তারিখ</th>
            <th>নাম</th>
            <th>ধরণ</th>
            <th>ক্যাটাগরি</th>
            <th>টাকা</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
  <canvas id="loanChart" width="400" height="200"></canvas>
    </div>
  `;

  // ⏹️ ট্যাব ফাংশন
  window.showTab = function (event, tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId).style.display = 'block';
    if (event) event.currentTarget.classList.add('active');
  };

  // ✅ রেন্ডার ফর্ম ও লোন সেকশন
  setTimeout(() => {
    renderForm();
    renderLoanSection();
  }, 0);

  // ✅ লেনদেন ফর্ম সাবমিট হ্যান্ডলার
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
        loadRecentTransactions(user.uid);
      })
      .catch((error) => {
        console.error("সংরক্ষণ করতে সমস্যা হয়েছে:", error);
      });
  }

  function renderForm() {
    const incomeCategories = ["বেতন", "ব্যবসা", "অন্যান্য", "বাইক"];
    const expenseCategories = [
      "বাসা ভাড়া", "মোবাইল রিচার্জ", "বিদ্যুৎ বিল", "পরিবহন", "দোকান বিল",
      "কেনাকাটা", "গাড়ির খরচ", "কাচা বাজার", "বাড়ি", "হাস্পাতাল",
      "ব্যক্তিগত", "অন্যান্য", "গাড়ির তেল", "নাস্তা", "খাওয়া", "চুলকাটানো", "লাইফ স্টাইল", "সঞ্চয়"
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

    document.getElementById("transactionForm").addEventListener("submit", submitHandler);

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
          if (!["income", "expense"].includes(data.type)) return;
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

  function renderLoanSection() {
    const nameInput = document.getElementById('loanName');
    const typeSelect = document.getElementById('loanType');
    const dateInput = document.getElementById('loanDate');

    typeSelect.addEventListener('change', () => {
      const user = firebase.auth().currentUser;
      if (!user || typeSelect.value !== "repayment") {
        nameInput.value = "";
        return;
      }

      firebase.firestore()
        .collection("users")
        .doc(user.uid)
        .collection("transactions")
        .orderBy("timestamp", "desc")
        .limit(10)
        .get()
        .then(snapshot => {
          const loan = snapshot.docs.find(doc => doc.data().type === "income" && doc.data().category === "লোন গ্রহণ" && doc.data().name);
          if (loan) {
            nameInput.value = loan.data().name;
          }
        });
    });

    document.getElementById("loanForm").addEventListener("submit", async (e) => {
      e.preventDefault();

      const user = firebase.auth().currentUser;
      if (!user) {
        alert("লগইন করুন");
        return;
      }

      const name = nameInput.value.trim();
      const loanType = typeSelect.value;
      const amount = parseFloat(document.getElementById("loanAmount").value);
      const date = dateInput.value;

      if (!name || isNaN(amount) || !date) {
        alert("সব ফিল্ড সঠিকভাবে পূরণ করুন");
        return;
      }

      const entryType = (loanType === "loan") ? "income" : "expense";
      const category = (loanType === "loan") ? "লোন গ্রহণ" : "লোন পরিশোধ";

      try {
        await firebase.firestore()
          .collection("users")
          .doc(user.uid)
          .collection("transactions")
          .add({
            name,
            type: entryType,
            category,
            amount,
            date,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          });

        nameInput.value = "";
        document.getElementById("loanAmount").value = "";
        dateInput.value = "";

        loadLoans(user.uid);

      } catch (error) {
        alert("ডাটা সংরক্ষণে সমস্যা হয়েছে: " + error.message);
      }
    });

    function formatBanglaNumber(number) {
      const engToBn = {0:'০',1:'১',2:'২',3:'৩',4:'৪',5:'৫',6:'৬',7:'৭',8:'৮',9:'৯'};
      return number.toString().replace(/[0-9]/g, d => engToBn[d]);
    }

    function formatDateToBangla(dateStr) {
      if (!dateStr) return "";
      const monthsBn = ["জানুয়ারী","ফেব্রুয়ারী","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর"];
      const parts = dateStr.split("-");
      if (parts.length !== 3) return dateStr;

      const year = formatBanglaNumber(parts[0]);
      const month = parseInt(parts[1], 10) - 1;
      const day = formatBanglaNumber(parts[2]);

      return `${day} ${monthsBn[month]} ${year}`;
    }

    function loadLoans(uid) {
      firebase.firestore()
        .collection("users")
        .doc(uid)
        .collection("transactions")
        .orderBy("timestamp", "desc")
        .onSnapshot(snapshot => {
          const tbody = document.querySelector("#loanTable tbody");
          tbody.innerHTML = "";

          snapshot.forEach(doc => {
            const data = doc.data();
            if (data.category !== "লোন গ্রহণ" && data.category !== "লোন পরিশোধ") return;

            let displayDate = data.date;
            if (!displayDate && data.timestamp) {
              displayDate = data.timestamp.toDate().toLocaleDateString('bn-BD');
            } else if (displayDate) {
              displayDate = formatDateToBangla(displayDate);
            } else {
              displayDate = "লোড হচ্ছে...";
            }

            const tr = document.createElement("tr");
            tr.innerHTML = `
              <td>${displayDate}</td>
              <td>${data.name}</td>
              <td>${data.category === "লোন গ্রহণ" ? "লোন গ্রহণ" : "লোন পরিশোধ"}</td>
              <td>${data.category}</td>
              <td>${formatBanglaNumber(data.amount)} টাকা</td>
            `;
            tbody.appendChild(tr);
          });
        });
    }

    const user = firebase.auth().currentUser;
    if (user) {
  loadLoans(user.uid);
  renderLoanPieChart(user.uid); // ✅ Pie chart call
}
  }
  function renderLoanPieChart(uid) {
  firebase.firestore()
    .collection("users")
    .doc(uid)
    .collection("transactions")
    .where("category", "in", ["লোন গ্রহণ", "লোন পরিশোধ"])
    .get()
    .then(snapshot => {
      let totalLoan = 0;
      let totalRepayment = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.category === "লোন গ্রহণ") {
          totalLoan += data.amount || 0;
        } else if (data.category === "লোন পরিশোধ") {
          totalRepayment += data.amount || 0;
        }
      });

      const remaining = totalLoan - totalRepayment;

      const ctx = document.getElementById('loanChart').getContext('2d');

      new Chart(ctx, {
        type: 'pie',
        data: {
          labels: ['লোন গ্রহণ', 'পরিশোধ', 'বাকি'],
          datasets: [{
            data: [totalLoan, totalRepayment, remaining],
            backgroundColor: ['#4caf50', '#f44336', '#2196f3'],
            hoverOffset: 10
          }]
        },
        options: {
          plugins: {
            title: {
              display: true,
              text: 'লোন গ্রহণ বনাম পরিশোধ (৳)',
              font: {
                size: 18
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const value = context.parsed;
                  const label = context.label;
                  return `${label}: ${value.toLocaleString('bn-BD')} টাকা`;
                }
              }
            }
          }
        }
      });
    })
    .catch(err => {
      console.error("চার্ট লোডে সমস্যা:", err);
    });
}
}
