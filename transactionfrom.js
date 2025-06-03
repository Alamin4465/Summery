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


//Income ও Expense ক্যাটাগরি তালিকা (প্রয়োজন অনুযায়ী পরিবর্তন করো)
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

  
// Helper: Convert English number to Bangla
function toBanglaNumber(input) {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return input
    .toString()
    .split('')
    .map(d => (/\d/.test(d) ? banglaDigits[parseInt(d)] : d))
    .join('');
}

