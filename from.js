function lonefrom() {
  firebase.auth().onAuthStateChanged(user => {
    if (!user) return;
    const currentUser = user;

    const content = document.getElementById('content');
    content.innerHTML = `
      <h2 class="titel">ফর্ম সেকশন</h2>
      <div class="tabs">
        <button class="tab-btn active" onclick="showTab(event, 'fromsaction')">লেনদেন ফর্ম</button>
        <button class="tab-btn" onclick="showTab(event, 'Lonesaction')">লোন ফর্ম</button>
      </div>

      <!-- লেনদেন ফর্ম -->
      <div id="fromsaction" class="tab-content active">
        <div class="transaction-container">
          <form id="transactionForm" class="form-column">
            <input class="form-input" type="date" id="date" required>
            <select class="form-input" id="transType" required>
              <option value="">টাইপ নির্বাচন করুন</option>
              <option value="income">আয়</option>
              <option value="expense">ব্যয়</option>
            </select>
            <select class="form-input" id="category" required>
              <option value="">ক্যাটেগরি নির্বাচন করুন</option>
            </select>
            <select class="form-input" id="walletSelect">
              <option value="">ওয়ালেট নির্বাচন করুন</option>
            </select>
            <input class="form-input" type="number" id="amount" placeholder="টাকার পরিমাণ" required>
            <button type="submit" class="form-button">সংরক্ষণ করুন</button>
          </form>

          <div style="margin-top:20px" class="form-column">
            <button type="button" id="showCategoryBtn" class="form-button" style="background-color:#2196f3; color:white;">ক্যাটেগরি ও ওয়ালেট ম্যানেজ</button>
            <div class="category-manage" style="display:none;">

              <div class="manage-tabs">
                <button type="button" id="manageTabCategoryBtn" class="manage-tab-btn active">ক্যাটেগরি</button>
                <button type="button" id="manageTabWalletBtn" class="manage-tab-btn">ওয়ালেট</button>
              </div>

              <div id="manageCategoryTab" style="display:block;">
                <h4 style="margin-top:0;">ক্যাটেগরি ম্যানেজ</h4>
                <select class="form-input" id="manageCatType" required>
                  <option value="">টাইপ নির্বাচন করুন</option>
                  <option value="income">আয়</option>
                  <option value="expense">ব্যয়</option>
                </select>
                <input type="text" id="newCategory" class="form-input" placeholder="নতুন ক্যাটেগরি">
                <button type="button" id="addCategoryBtn">যোগ করুন</button>
                <button type="button" id="delCategoryBtn">ডিলিট করুন</button>
              </div>

              <div id="manageWalletTab" style="display:none;">
                <h4 style="margin-top:0;">ওয়ালেট ম্যানেজ</h4>
                <input type="text" id="newWallet" class="form-input" placeholder="নতুন ওয়ালেটের নাম (যেমন: নগদ, বিকাশ)">
                <input type="number" id="newWalletBalance" class="form-input" placeholder="প্রাথমিক ব্যালেন্স (ঐচ্ছিক)">
                <button type="button" id="addWalletBtn">যোগ করুন</button>
                <select class="form-input" id="manageWalletSelect">
                  <option value="">ডিলিটের জন্য ওয়ালেট নির্বাচন</option>
                </select>
                <button type="button" id="delWalletBtn">ডিলিট করুন</button>
              </div>
            </div>
          </div>
        </div>

        <div id="statusMsg"></div>
        <div id="recent-transactions"></div>
      </div>

      <!-- লোন সেকশন -->
      <div id="Lonesaction" class="tab-content" style="display: none;">
        <h2 class="titel">লোন গৃহীত ও পরিশোধ</h2>
        <form id="loanForm">
          <input class="form-input" type="date" id="loanDate" required>
          <select class="form-input" id="loanType" required>
            <option value="">ধরণ নির্বাচন করুন</option>
            <option value="loan">লোন গ্রহণ</option>
            <option value="repayment">লোন পরিশোধ</option>
          </select>
          <div id="loanNameContainer"></div>
          <select class="form-input" id="loanWalletSelect" required>
            <option value="">ওয়ালেট নির্বাচন করুন</option>
          </select>
          <input class="form-input" type="number" id="loanAmount" placeholder="উদাহরণ: 5000" required>
          <button class="form-button" type="submit">এন্ট্রি যুক্ত করুন</button>
        </form>
        <table id="loanTable" class="transaction-table" style="margin-top:15px; width: 100%;">
          <thead>
            <tr><th>তারিখ</th><th>নাম</th><th>ধরণ</th><th>ওয়ালেট</th><th>টাকা</th></tr>
          </thead>
          <tbody></tbody>
        </table>
        <div id="loanSummary" class="loan-summary"></div>
        <canvas id="loanChart" width="400" height="200"></canvas>
      </div>
    `;

    const db = firebase.firestore();
    const showBtn = document.getElementById('showCategoryBtn');
    const typeSelect = document.getElementById("transType");
    const categorySelect = document.getElementById("category");
    const walletSelect = document.getElementById("walletSelect");
    const addCategoryBtn = document.getElementById("addCategoryBtn");
    const delCategoryBtn = document.getElementById("delCategoryBtn");
    const newCategoryInput = document.getElementById("newCategory");
    const manageCatType = document.getElementById("manageCatType");
    const statusMsg = document.getElementById("statusMsg");
    const categoryDiv = document.querySelector('.category-manage');

    const manageTabCategoryBtn = document.getElementById("manageTabCategoryBtn");
    const manageTabWalletBtn = document.getElementById("manageTabWalletBtn");
    const manageCategoryTab = document.getElementById("manageCategoryTab");
    const manageWalletTab = document.getElementById("manageWalletTab");

    const addWalletBtn = document.getElementById("addWalletBtn");
    const delWalletBtn = document.getElementById("delWalletBtn");
    const newWalletInput = document.getElementById("newWallet");
    const newWalletBalanceInput = document.getElementById("newWalletBalance");
    const manageWalletSelect = document.getElementById("manageWalletSelect");
    const loanWalletSelect = document.getElementById("loanWalletSelect");

    let unsubscribeCategories = null;
    let unsubscribeWallets = null;
    let allWallets = [];
    let lastTransactionsSnapshot = null;
    let lastLoanSnapshot = null;

    function setStatus(msg, isError = false) {
      statusMsg.textContent = msg;
      statusMsg.style.color = isError ? "red" : "green";
    }

    showBtn.addEventListener('click', () => {
      categoryDiv.style.display = categoryDiv.style.display === 'none' ? 'block' : 'none';
    });

    function setManageTab(which) {
      const isCat = which === 'category';
      manageCategoryTab.style.display = isCat ? 'block' : 'none';
      manageWalletTab.style.display = isCat ? 'none' : 'block';

      manageTabCategoryBtn.style.background = isCat ? '#2196f3' : '#e0e0e0';
      manageTabCategoryBtn.style.color = isCat ? '#fff' : '#333';
      manageTabWalletBtn.style.background = isCat ? '#e0e0e0' : '#2196f3';
      manageTabWalletBtn.style.color = isCat ? '#333' : '#fff';

      manageTabCategoryBtn.classList.toggle('active', isCat);
      manageTabWalletBtn.classList.toggle('active', !isCat);
    }
    manageTabCategoryBtn.addEventListener('click', () => setManageTab('category'));
    manageTabWalletBtn.addEventListener('click', () => setManageTab('wallet'));

    window.showTab = function (event, tabId) {
      document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.getElementById(tabId).style.display = "block";
      if (event) event.currentTarget.classList.add("active");
    };

    // ------------------ Bangla formatting ------------------
    function formatBanglaNumber(number) {
      const engToBn = { 0: '০', 1: '১', 2: '২', 3: '৩', 4: '৪', 5: '৫', 6: '৬', 7: '৭', 8: '৮', 9: '৯' };
      return number.toString().replace(/[0-9]/g, d => engToBn[d]);
    }
    function formatDateToBangla(dateStr) {
      if (!dateStr) return "";
      const monthsBn = ["জানুয়ারী", "ফেব্রুয়ারী", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
      const parts = dateStr.split("-");
      if (parts.length !== 3) return dateStr;
      const year = formatBanglaNumber(parts[0]);
      const month = parseInt(parts[1], 10) - 1;
      const day = formatBanglaNumber(parts[2]);
      return `${day} ${monthsBn[month]} ${year}`;
    }

    // ------------------ Categories ------------------
    function loadCategories(type) {
      if (!type) return;
      if (unsubscribeCategories) unsubscribeCategories();
      unsubscribeCategories = db.collection("users").doc(currentUser.uid)
        .collection("categories").where("type", "==", type)
        .onSnapshot(snapshot => {
          categorySelect.innerHTML = '<option value="">ক্যাটেগরি নির্বাচন করুন</option>';
          if (snapshot.empty) { setStatus("এই টাইপে কোনো ক্যাটেগরি নেই"); return; }
          snapshot.docs.sort((a, b) => a.data().name.localeCompare(b.data().name, 'bn-BD'))
            .forEach(doc => {
              const opt = document.createElement("option");
              opt.value = doc.data().name;
              opt.textContent = doc.data().name;
              opt.dataset.docId = doc.id;
              categorySelect.appendChild(opt);
            });
          setStatus(`ক্যাটেগরি লোড হয়েছে (${snapshot.size})`);
        }, err => setStatus("ক্যাটেগরি লোডে সমস্যা: " + err.message, true));
    }
    typeSelect.addEventListener("change", () => loadCategories(typeSelect.value));

    addCategoryBtn.addEventListener("click", () => {
      const newCat = newCategoryInput.value.trim();
      const type = manageCatType.value;
      if (!newCat) return alert("নতুন ক্যাটেগরি লিখুন!");
      if (!type) return alert("টাইপ নির্বাচন করুন!");
      db.collection("users").doc(currentUser.uid).collection("categories")
        .add({ name: newCat, type: type })
        .then(() => { newCategoryInput.value = ''; loadCategories(typeSelect.value); })
        .catch(err => alert("ক্যাটেগরি যোগে সমস্যা: " + err.message));
    });

    delCategoryBtn.addEventListener("click", () => {
      const selectedOpt = categorySelect.selectedOptions[0];
      if (!selectedOpt || !selectedOpt.dataset.docId) return alert("ক্যাটেগরি সিলেক্ট করুন!");
      db.collection("users").doc(currentUser.uid).collection("categories").doc(selectedOpt.dataset.docId)
        .delete()
        .then(() => loadCategories(typeSelect.value))
        .catch(err => alert("ক্যাটেগরি ডিলিটে সমস্যা: " + err.message));
    });

    // ------------------ Wallets (Real-time) ------------------
    function loadWallets() {
      if (unsubscribeWallets) unsubscribeWallets();
      unsubscribeWallets = db.collection("users").doc(currentUser.uid)
        .collection("wallets")
        .onSnapshot(snapshot => {
          const prevWalletSel = walletSelect.value;
          const prevManageSel = manageWalletSelect.value;
          const prevLoanWalletSel = loanWalletSelect.value;
          allWallets = [];

          walletSelect.innerHTML = '<option value="">ওয়ালেট নির্বাচন করুন</option>';
          manageWalletSelect.innerHTML = '<option value="">ডিলিটের জন্য ওয়ালেট নির্বাচন</option>';
          loanWalletSelect.innerHTML = '<option value="">ওয়ালেট নির্বাচন করুন</option>';

          snapshot.docs
            .sort((a, b) => (a.data().name || '').localeCompare(b.data().name || '', 'bn-BD'))
            .forEach(doc => {
              const data = doc.data();
              allWallets.push({ id: doc.id, ...data });

              const opt = document.createElement("option");
              opt.value = doc.id;
              opt.textContent = `${data.name} (${formatBanglaNumber(data.balance || 0)} ৳)`;
              walletSelect.appendChild(opt);

              const opt2 = document.createElement("option");
              opt2.value = doc.id;
              opt2.textContent = data.name;
              manageWalletSelect.appendChild(opt2);

              const opt3 = document.createElement("option");
              opt3.value = doc.id;
              opt3.textContent = `${data.name} (${formatBanglaNumber(data.balance || 0)} ৳)`;
              loanWalletSelect.appendChild(opt3);
            });

          if (prevWalletSel && [...walletSelect.options].some(o => o.value === prevWalletSel))
            walletSelect.value = prevWalletSel;
          if (prevManageSel && [...manageWalletSelect.options].some(o => o.value === prevManageSel))
            manageWalletSelect.value = prevManageSel;
          if (prevLoanWalletSel && [...loanWalletSelect.options].some(o => o.value === prevLoanWalletSel))
            loanWalletSelect.value = prevLoanWalletSel;

          renderTransactionsTable();
          renderLoans();
        }, err => setStatus("ওয়ালেট লোডে সমস্যা: " + err.message, true));
    }

    addWalletBtn.addEventListener("click", () => {
      const name = newWalletInput.value.trim();
      const balance = parseFloat(newWalletBalanceInput.value) || 0;
      if (!name) return alert("ওয়ালেটের নাম লিখুন!");
      db.collection("users").doc(currentUser.uid).collection("wallets")
        .add({ name, balance })
        .then(() => {
          newWalletInput.value = '';
          newWalletBalanceInput.value = '';
        })
        .catch(err => alert("ওয়ালেট যোগে সমস্যা: " + err.message));
    });

    delWalletBtn.addEventListener("click", () => {
      const selectedOpt = manageWalletSelect.selectedOptions[0];
      if (!selectedOpt || !selectedOpt.value) return alert("ওয়ালেট সিলেক্ট করুন!");
      if (!confirm("এই ওয়ালেট ডিলিট করবেন? এর সাথে যুক্ত লেনদেনগুলো থাকবে কিন্তু ওয়ালেট আর দেখাবে না।")) return;
      db.collection("users").doc(currentUser.uid).collection("wallets").doc(selectedOpt.value)
        .delete()
        .catch(err => alert("ওয়ালেট ডিলিটে সমস্যা: " + err.message));
    });

    // ------------------ Transactions ------------------
    document.getElementById("transactionForm").addEventListener("submit", e => {
      e.preventDefault();
      const date = document.getElementById("date").value;
      const type = typeSelect.value;
      const category = categorySelect.value;
      const amount = parseFloat(document.getElementById("amount").value);
      const walletId = walletSelect.value;

      if (!date || !type || !category || isNaN(amount) || amount <= 0)
        return alert("সব ফিল্ড পূরণ করুন");
      if (!walletId)
        return alert("ওয়ালেট নির্বাচন করুন! (ক্যাটেগরি ও ওয়ালেট ম্যানেজ থেকে ওয়ালেট যোগ করুন)");

      const batch = db.batch();

      const transRef = db.collection("users").doc(currentUser.uid)
        .collection("transactions").doc();
      batch.set(transRef, {
        date, type, category, amount, walletId,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });

      const walletRef = db.collection("users").doc(currentUser.uid)
        .collection("wallets").doc(walletId);
      const delta = type === 'income' ? amount : -amount;
      batch.update(walletRef, { balance: firebase.firestore.FieldValue.increment(delta) });

      batch.commit()
        .then(() => {
          e.target.reset();
          setStatus("লেনদেন সংরক্ষিত হয়েছে ও ওয়ালেট ব্যালেন্স আপডেট হয়েছে");
        })
        .catch(err => alert("লেনদেন সেভে সমস্যা: " + err.message));
    });

    function loadRecentTransactions(uid) {
      db.collection("users").doc(uid).collection("transactions")
        .orderBy("timestamp", "desc").limit(10)
        .onSnapshot(snapshot => {
          lastTransactionsSnapshot = snapshot;
          renderTransactionsTable();
        });
    }

    function renderTransactionsTable() {
      if (!lastTransactionsSnapshot) return;
      let html = `<table class="transaction-table"><thead><tr><th>তারিখ</th><th>টাইপ</th><th>ক্যাটেগরি</th><th>ওয়ালেট</th><th>পরিমাণ</th></tr></thead><tbody>`;
      lastTransactionsSnapshot.forEach(doc => {
        const d = doc.data();
        if (!["income", "expense"].includes(d.type)) return;
        const rowClass = d.type === "income" ? "income-row" : "expense-row";
        const typeLabel = d.type === "income" ? "আয়" : "ব্যয়";
        let walletName = '—';
        if (d.walletId) {
          const w = allWallets.find(x => x.id === d.walletId);
          if (w) walletName = w.name;
        }
        html += `<tr class="${rowClass}"><td>${formatDateToBangla(d.date)}</td><td>${typeLabel}</td><td>${d.category}</td><td>${walletName}</td><td>${formatBanglaNumber(d.amount)} ৳</td></tr>`;
      });
      html += "</tbody></table>";
      document.getElementById("recent-transactions").innerHTML = html;
    }

    // ------------------ Loan Section ------------------
    function renderLoanSection() {
      const container = document.getElementById('loanNameContainer');
      const typeSelectLoan = document.getElementById('loanType');
      const dateInput = document.getElementById('loanDate');
      const amountInput = document.getElementById('loanAmount');
      let nameInput, nameSelect;

      function createNameInput() {
        container.innerHTML = '';
        nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'form-input';
        nameInput.id = 'loanName';
        nameInput.placeholder = 'নাম লিখুন';
        container.appendChild(nameInput);
      }
      function createNameSelect(options = []) {
        container.innerHTML = '';
        nameSelect = document.createElement('select');
        nameSelect.className = 'form-input';
        nameSelect.id = 'loanName';
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'নাম নির্বাচন করুন';
        nameSelect.appendChild(defaultOption);
        if (options.length === 0) {
          const opt = document.createElement('option');
          opt.value = '';
          opt.textContent = 'অপর্যাপ্ত লোন অবশিষ্ট নেই';
          nameSelect.appendChild(opt);
        } else {
          options.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name; opt.textContent = name;
            nameSelect.appendChild(opt);
          });
        }
        container.appendChild(nameSelect);
      }
      async function updateLoanNames() {
        if (typeSelectLoan.value === 'loan') {
          createNameInput();
        } else if (typeSelectLoan.value === 'repayment') {
          const loanSnap = await db.collection("users").doc(currentUser.uid).collection("transactions").where("category", "==", "লোন গ্রহণ").get();
          const repaymentSnap = await db.collection("users").doc(currentUser.uid).collection("transactions").where("category", "==", "লোন পরিশোধ").get();
          const loanBalance = {};
          loanSnap.forEach(doc => { const d = doc.data(); loanBalance[d.name] = (loanBalance[d.name] || 0) + d.amount; });
          repaymentSnap.forEach(doc => { const d = doc.data(); if (loanBalance[d.name]) loanBalance[d.name] -= d.amount; });
          const remainingNames = Object.keys(loanBalance).filter(n => loanBalance[n] > 0);
          createNameSelect(remainingNames);
        }
      }
      typeSelectLoan.addEventListener('change', updateLoanNames);

      document.getElementById('loanForm').addEventListener('submit', async e => {
        e.preventDefault();
        const name = (typeSelectLoan.value === 'loan') ? nameInput.value.trim() : nameSelect.value;
        const loanType = typeSelectLoan.value;
        const amount = parseFloat(amountInput.value);
        const date = dateInput.value;
        const walletId = loanWalletSelect.value;

        if (!name || !loanType || isNaN(amount) || amount <= 0 || !date) {
          alert("সব ফিল্ড পূরণ করুন"); return;
        }
        if (!walletId) {
          alert("কোন ওয়ালেটে লোন নিচ্ছেন/পরিশোধ করছেন সেটি নির্বাচন করুন!"); return;
        }

        const entryType = (loanType === 'loan') ? 'income' : 'expense';
        const category = (loanType === 'loan') ? 'লোন গ্রহণ' : 'লোন পরিশোধ';

        const batch = db.batch();

        const transRef = db.collection("users").doc(currentUser.uid)
          .collection("transactions").doc();
        batch.set(transRef, {
          name, type: entryType, category, amount, date, walletId,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        const walletRef = db.collection("users").doc(currentUser.uid)
          .collection("wallets").doc(walletId);
        const delta = (loanType === 'loan') ? amount : -amount;
        batch.update(walletRef, { balance: firebase.firestore.FieldValue.increment(delta) });

        try {
          await batch.commit();
          dateInput.value = '';
          amountInput.value = '';
          updateLoanNames();
        } catch (err) {
          alert("লোন এন্ট্রি সেভে সমস্যা: " + err.message);
        }
      });
      updateLoanNames();
      loadLoansRealtime(currentUser.uid);
    }

    let loanChartInstance;
    function loadLoansRealtime(uid) {
      db.collection("users").doc(uid).collection("transactions")
        .orderBy("timestamp", "desc").onSnapshot(snapshot => {
          lastLoanSnapshot = snapshot;
          renderLoans();
        });
    }

    function renderLoans() {
      if (!lastLoanSnapshot) return;
      const tbody = document.querySelector("#loanTable tbody");
      tbody.innerHTML = '';
      let summaryByPerson = {}, totalLoan = 0, totalRepayment = 0;

      lastLoanSnapshot.forEach(doc => {
        const d = doc.data();
        if (!["লোন গ্রহণ", "লোন পরিশোধ"].includes(d.category)) return;
        const tr = document.createElement('tr');
        const displayDate = d.date ? formatDateToBangla(d.date) : 'লোড হচ্ছে...';

        if (d.category === 'লোন গ্রহণ') {
          tr.classList.add('loan-taken'); totalLoan += d.amount;
          summaryByPerson[d.name] = summaryByPerson[d.name] || { taken: 0, repaid: 0 };
          summaryByPerson[d.name].taken += d.amount;
        } else {
          tr.classList.add('loan-repaid'); totalRepayment += d.amount;
          summaryByPerson[d.name] = summaryByPerson[d.name] || { taken: 0, repaid: 0 };
          summaryByPerson[d.name].repaid += d.amount;
        }

        let walletName = '—';
        if (d.walletId) {
          const w = allWallets.find(x => x.id === d.walletId);
          if (w) walletName = w.name;
        }

        tr.innerHTML = `<td>${displayDate}</td><td>${d.name}</td><td>${d.category}</td><td>${walletName}</td><td>${formatBanglaNumber(d.amount)} টাকা</td>`;
        tbody.appendChild(tr);
      });

      const summaryDiv = document.getElementById("loanSummary");
      let html = `<h3>📊 লোন সারসংক্ষেপ</h3><table class="transaction-table" style="width:100%; border-collapse: collapse;"><thead><tr class="loan-repaid"><th>নাম</th><th>লোন গ্রহণ</th><th>পরিশোধ</th><th>অবশিষ্ট</th></tr></thead><tbody>`;
      Object.keys(summaryByPerson).forEach(name => {
        const taken = summaryByPerson[name].taken || 0;
        const repaid = summaryByPerson[name].repaid || 0;
        const remain = taken - repaid;
        html += `<tr><td>${name}</td><td>${formatBanglaNumber(taken)} টাকা</td><td>${formatBanglaNumber(repaid)} টাকা</td><td>${formatBanglaNumber(remain)} টাকা</td></tr>`;
      });
      html += '</tbody></table>';
      summaryDiv.innerHTML = html;

      const remaining = totalLoan - totalRepayment;
      const ctx = document.getElementById('loanChart').getContext('2d');
      if (loanChartInstance) loanChartInstance.destroy();
      loanChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: ['লোন গ্রহণ', 'পরিশোধ', 'বাকি'],
          datasets: [{ data: [totalLoan, totalRepayment, remaining], backgroundColor: ['#4caf50', '#f44336', '#2196f3'], hoverOffset: 10 }]
        },
        options: {
          plugins: {
            title: { display: true, text: 'লোন গ্রহণ বনাম পরিশোধ (৳)', font: { size: 18 } },
            tooltip: { callbacks: { label: function (ctx) { return `${ctx.label}: ${ctx.parsed.toLocaleString('bn-BD')} টাকা`; } } }
          }
        }
      });
    }

    // ------------------ Initial Load ------------------
    typeSelect.value = 'income';
    manageCatType.value = 'income';
    loadCategories('income');
    loadWallets();
    loadRecentTransactions(currentUser.uid);
    renderLoanSection();
  });
}

