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
