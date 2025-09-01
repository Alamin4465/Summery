function lonefrom() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <h2 class="titel">ফ্রম সেকশন</h2>
    <div class="tabs">
      <button class="tab-btn active" onclick="showTab(event, 'fromsaction')">লেনদেন ফ্রম</button>
      <button class="tab-btn" onclick="showTab(event, 'Lonesaction')">লোন ফ্রম</button>
    </div>

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
        <input class="form-input" type="number" id="loanAmount" placeholder="উদাহরণ: 5000" required>
        <button class="form-button" type="submit">এন্ট্রি যুক্ত করুন</button>
      </form>

      <table id="loanTable" class="transaction-table" style="margin-top:15px; width: 100%;">
        <thead>
          <tr>
            <th>তারিখ</th>
            <th>নাম</th>
            <th>ধরণ</th>
            <th>টাকা</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>

      <div id="loanSummary" class="loan-summary"></div>
      <canvas id="loanChart" width="400" height="200"></canvas>
    </div>
  `;

  // ---------------- ট্যাব ফাংশন ----------------
  window.showTab = function(event, tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId).style.display = 'block';
    if(event) event.currentTarget.classList.add('active');
  };

  // ---------------- লেনদেন ফর্ম ----------------
  function submitHandler(e) {
    e.preventDefault();
    const user = firebase.auth().currentUser;
    if(!user) return;

    const date = document.getElementById("date").value;
    const type = document.getElementById("type").value;
    const category = document.getElementById("category").value;
    const amount = parseFloat(document.getElementById("amount").value);

    firebase.firestore().collection("users").doc(user.uid).collection("transactions")
      .add({ date, type, category, amount, timestamp: firebase.firestore.FieldValue.serverTimestamp() })
      .then(()=>{ document.getElementById("transactionForm").reset(); loadRecentTransactions(user.uid); })
      .catch(error => console.error("সংরক্ষণ করতে সমস্যা হয়েছে:", error));
  }

  function renderForm() {
    const incomeCategories = ["বেতন","ব্যবসা","অন্যান্য","বাইক"];
    const expenseCategories = ["বাসা ভাড়া","মোবাইল রিচার্জ","বিদ্যুৎ বিল","পরিবহন","দোকান বিল","কেনাকাটা","গাড়ির খরচ","কাচা বাজার","বাড়ি","হাস্পাতাল","ব্যক্তিগত","অন্যান্য","গাড়ির তেল","নাস্তা","খাওয়া","চুলকাটানো","লাইফ স্টাইল","সঞ্চয়"];

    document.getElementById("type").addEventListener("change", function(){
      const categorySelect = document.getElementById("category");
      categorySelect.innerHTML = '<option value="">ক্যাটেগরি নির্বাচন করুন</option>';
      const categories = this.value==="income"?incomeCategories:this.value==="expense"?expenseCategories:[];
      categories.forEach(cat=>{ const option=document.createElement("option"); option.value=cat; option.textContent=cat; categorySelect.appendChild(option); });
    });

    document.getElementById("transactionForm").addEventListener("submit", submitHandler);

    const user = firebase.auth().currentUser;
    if(user) loadRecentTransactions(user.uid);
  }

  function loadRecentTransactions(uid) {
    firebase.firestore().collection("users").doc(uid).collection("transactions")
      .orderBy("timestamp","desc").limit(10).get()
      .then(snapshot=>{
        let html = `<table class="transaction-table"><thead><tr><th>তারিখ</th><th>টাইপ</th><th>ক্যাটেগরি</th><th>পরিমাণ</th></tr></thead><tbody>`;
        snapshot.forEach(doc=>{
          const data=doc.data();
          if(!["income","expense"].includes(data.type)) return;
          const rowClass = data.type==="income"?"income-row":"expense-row";
          const iconClass = data.type==="income"?"income-icon":"expense-icon";
          const date = data.date||"";
          const category = data.category||"";
          const amount = data.amount?.toLocaleString('bn-BD')||0;
          const typeLabel = data.type==="income"?"আয়":"ব্যয়";
          html+=`<tr class="${rowClass}"><td>${date}</td><td class="${iconClass}">${typeLabel}</td><td>${category}</td><td>${amount} ৳</td></tr>`;
        });
        html+=`</tbody></table>`;
        document.getElementById("recent-transactions").innerHTML=html;
      });
  }

  // ---------------- লোন ফাংশন ----------------
  function formatBanglaNumber(number){ const engToBn={0:'০',1:'১',2:'২',3:'৩',4:'৪',5:'৫',6:'৬',7:'৭',8:'৮',9:'৯'}; return number.toString().replace(/[0-9]/g,d=>engToBn[d]); }
  function formatDateToBangla(dateStr){ if(!dateStr) return ""; const monthsBn=["জানুয়ারী","ফেব্রুয়ারী","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর"]; const parts=dateStr.split("-"); if(parts.length!==3) return dateStr; const year=formatBanglaNumber(parts[0]); const month=parseInt(parts[1],10)-1; const day=formatBanglaNumber(parts[2]); return `${day} ${monthsBn[month]} ${year}`; }

  function renderLoanSection() {
    const container = document.getElementById('loanNameContainer');
    const typeSelect = document.getElementById('loanType');
    const dateInput = document.getElementById('loanDate');
    const amountInput = document.getElementById('loanAmount');

    const user = firebase.auth().currentUser;
    if(!user) return;

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

    function createNameSelect(options=[]) {
      container.innerHTML = '';
      nameSelect = document.createElement('select');
      nameSelect.className = 'form-input';
      nameSelect.id = 'loanName';
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = 'নাম নির্বাচন করুন';
      nameSelect.appendChild(defaultOption);
      options.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        nameSelect.appendChild(opt);
      });
      container.appendChild(nameSelect);
    }

    async function updateLoanNames() {
      if(typeSelect.value==='loan') {
        createNameInput();
      } else if(typeSelect.value==='repayment') {
        const loanSnap = await firebase.firestore().collection("users").doc(user.uid).collection("transactions")
          .where("category","==","লোন গ্রহণ").get();
        const repaymentSnap = await firebase.firestore().collection("users").doc(user.uid).collection("transactions")
          .where("category","==","লোন পরিশোধ").get();

        const loanBalance = {};
        loanSnap.forEach(doc=>{ const data = doc.data(); loanBalance[data.name] = (loanBalance[data.name]||0)+data.amount; });
        repaymentSnap.forEach(doc=>{ const data = doc.data(); if(loanBalance[data.name]) loanBalance[data.name]-=data.amount; });

        const remainingNames = Object.keys(loanBalance).filter(name=>loanBalance[name]>0);
        createNameSelect(remainingNames);
      }
    }

    typeSelect.addEventListener('change', updateLoanNames);

    document.getElementById('loanForm').addEventListener('submit', async (e)=>{
      e.preventDefault();
      const name = (typeSelect.value==='loan') ? nameInput.value.trim() : nameSelect.value;
      const loanType = typeSelect.value;
      const amount = parseFloat(amountInput.value);
      const date = dateInput.value;
      if(!name || !loanType || isNaN(amount) || !date){ alert("সব ফিল্ড পূরণ করুন"); return; }

      const entryType = (loanType==="loan") ? "income" : "expense";
      const category = (loanType==="loan") ? "লোন গ্রহণ" : "লোন পরিশোধ";

      await firebase.firestore().collection("users").doc(user.uid).collection("transactions")
        .add({name,type:entryType,category,amount,date,timestamp:firebase.firestore.FieldValue.serverTimestamp()});

      dateInput.value=''; amountInput.value=''; updateLoanNames();
    });

    updateLoanNames();
    loadLoansRealtime(user.uid);
  }

  let loanChartInstance;
  function loadLoansRealtime(uid){
    firebase.firestore().collection("users").doc(uid).collection("transactions")
      .orderBy("timestamp","desc").onSnapshot(snapshot=>{
        const tbody=document.querySelector("#loanTable tbody");
        tbody.innerHTML="";
        let summaryByPerson={}, totalLoan=0,totalRepayment=0;

        snapshot.forEach(doc=>{
          const data=doc.data();
          if(!["লোন গ্রহণ","লোন পরিশোধ"].includes(data.category)) return;
          let tr=document.createElement("tr");
          let displayDate=data.date ? formatDateToBangla(data.date) : "লোড হচ্ছে...";
          if(data.category==="লোন গ্রহণ"){ tr.classList.add("loan-taken"); totalLoan+=data.amount; summaryByPerson[data.name]=summaryByPerson[data.name]||{taken:0,repaid:0}; summaryByPerson[data.name].taken+=data.amount; }
          else { tr.classList.add("loan-repaid"); totalRepayment+=data.amount; summaryByPerson[data.name]=summaryByPerson[data.name]||{taken:0,repaid:0}; summaryByPerson[data.name].repaid+=data.amount; }
          tr.innerHTML=`<td>${displayDate}</td><td>${data.name}</td><td>${data.category}</td><td>${formatBanglaNumber(data.amount)} টাকা</td>`;
          tbody.appendChild(tr);
        });

        // সারসংক্ষেপ
        const summaryDiv=document.getElementById("loanSummary");
        let html=`<h3>📊 লোন সারসংক্ষেপ</h3>
        <table class="transaction-table" style="width:100%; border-collapse: collapse;">
        <thead>
        <tr class="loan-repaid">
        <th>নাম</th>
        <th>লোন গ্রহণ</th>
        <th>পরিশোধ</th>
        <th>অবশিষ্ট</th>
        </tr>
        </thead><tbody>`;
        Object.keys(summaryByPerson).forEach(name=>{
          const taken=summaryByPerson[name].taken||0;
          const repaid=summaryByPerson[name].repaid||0;
          const remain=taken-repaid;
          html+=`<tr><td>${name}</td><td>${formatBanglaNumber(taken)} টাকা</td><td>${formatBanglaNumber(repaid)} টাকা</td><td>${formatBanglaNumber(remain)} টাকা</td></tr>`;
        });
        html+=`</tbody></table>`;
        summaryDiv.innerHTML=html;

        // চার্ট
        const remaining = totalLoan-totalRepayment;
        const ctx=document.getElementById('loanChart').getContext('2d');
        if(loanChartInstance) loanChartInstance.destroy();
        loanChartInstance=new Chart(ctx,{type:'pie',data:{labels:['লোন গ্রহণ','পরিশোধ','বাকি'],datasets:[{data:[totalLoan,totalRepayment,remaining],backgroundColor:['#4caf50','#f44336','#2196f3'],hoverOffset:10}]},options:{plugins:{title:{display:true,text:'লোন গ্রহণ বনাম পরিশোধ (৳)',font:{size:18}},tooltip:{callbacks:{label:function(context){return `${context.label}: ${context.parsed.toLocaleString('bn-BD')} টাকা`;}}}}}});
      });
  }

  // ---------------- রেন্ডার ----------------
  setTimeout(()=>{ renderForm(); renderLoanSection(); },0);
}
