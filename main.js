let currentFilter = "all";
let allTransactions = [];
let currentUser = null;
let unsubscribeTransaction = null;

// Firebase auth state চেক (লগইন না হলে রিডাইরেক্ট)
firebase.auth().onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    currentUser = user;
    userId = user.uid;
    activate(document.getElementById('nav-dashboard'), 'ড্যাশবোর্ড');
  }
});

// DOM লোড হলে মেনু বাটনগুলোতে ইভেন্ট লিসেনার লাগানো
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('nav-dashboard')?.addEventListener('click', () => activate(document.getElementById('nav-dashboard'), 'ড্যাশবোর্ড'));
  document.getElementById('nav-forms')?.addEventListener('click', () => activate(document.getElementById('nav-forms'), 'ফ্রমস'));
  document.getElementById('nav-submit')?.addEventListener('click', () => activate(document.getElementById('nav-submit'), 'ট্রানজেকশন'));
  document.getElementById('nav-filter')?.addEventListener('click', () => activate(document.getElementById('nav-filter'), 'ফিল্টার'));
  document.getElementById('nav-profile')?.addEventListener('click', () => activate(document.getElementById('nav-profile'), 'প্রোফাইল তথ্য'));
});

// সেকশন অ্যাকটিভেট করার ফাংশন
function activate(button, sectionName) {
  document.querySelectorAll('.menu-button').forEach(btn => btn.classList.remove('active'));
  button.classList.add('active');

  const content = document.getElementById('content');

  if (sectionName === 'প্রোফাইল তথ্য') {
    loadProfileInfo();
  } else if (sectionName === 'ড্যাশবোর্ড') {
    loadDashboardSummary();
  } else if (sectionName === 'ফ্রমস') {
    renderForm();
  } else if (sectionName === 'ফিল্টার') {
    transactionFilter();
  } else if (sectionName === 'ট্রানজেকশন') {
    loadTransactions();
  } else {
    content.innerHTML = `<p>এই অংশটি এখনো তৈরি হয়নি।</p>`;
  }
}

// বাংলা নম্বর রূপান্তর (কমা সহ)
function toBanglaNumber(number) {
  if (typeof number !== "number") number = parseFloat(number) || 0;
  return number.toLocaleString('bn-BD', { maximumFractionDigits: 2 });
}

// Income ও Expense ক্যাটাগরি তালিকা (প্রয়োজন অনুযায়ী পরিবর্তন করো)
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


// প্রোফাইল তথ্য লোডার (আপনি ডাটাবেজ অনুযায়ী আপডেট করবেন)
function loadProfileInfo() {
  const content = document.getElementById('content');
  content.innerHTML = `<h2>প্রোফাইল তথ্য</h2><p>এই অংশে ইউজারের প্রোফাইল তথ্য দেখাবে।</p>`;
}

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      transactionFilter();
      renderForm();
      loadDashboardSummary();
    } else {
      window.location.href = "login.html";
    }
  });
});

