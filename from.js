function lonefrom() {
  firebase.auth().onAuthStateChanged(user => {
    if(!user) return;
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
              <option value="income">আয়</option>
              <option value="expense">ব্যয়</option>
            </select>
            <select class="form-input" id="category" required>
              <option value="">ক্যাটেগরি নির্বাচন করুন</option>
            </select>
            <input class="form-input" type="number" id="amount" placeholder="টাকার পরিমাণ" required>
            <button type="submit" class="form-button">সংরক্ষণ করুন</button>
          </form>

          <div style="margin-top:20px" class="form-column">
            <button type="button" id="showCategoryBtn" class="form-button" style="background-color:#2196f3; color:white;">ক্যাটেগরি ম্যানেজ</button>
            <div class="category-manage" style="display:none;">
              <select class="form-input" id="manageCatType" required>
                <option value="">টাইপ নির্বাচন করুন</option>
                <option value="income">আয়</option>
                <option value="expense">ব্যয়</option>
              </select>
              <input type="text" id="newCategory" class="form-input" placeholder="নতুন ক্যাটেগরি">
              <button type="button" id="addCategoryBtn">যোগ করুন</button>
              <button type="button" id="delCategoryBtn">ডিলিট করুন</button>
            </div>
          </div>
        </div>
        <div id="statusMsg"></div>
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

    const db = firebase.firestore();
    const showBtn = document.getElementById('showCategoryBtn');
    const typeSelect = document.getElementById("transType");      // Transaction type
    const categorySelect = document.getElementById("category");  // Category select
    const addCategoryBtn = document.getElementById("addCategoryBtn");
    const delCategoryBtn = document.getElementById("delCategoryBtn");
    const newCategoryInput = document.getElementById("newCategory");
    const manageCatType = document.getElementById("manageCatType"); // Category manage type
    const statusMsg = document.getElementById("statusMsg");
    const categoryDiv = document.querySelector('.category-manage');

    let unsubscribeCategories = null;

    function setStatus(msg, isError=false){
      statusMsg.textContent = msg;
      statusMsg.style.color = isError ? "red" : "green";
    }

    showBtn.addEventListener('click', () => {
      categoryDiv.style.display = categoryDiv.style.display === 'none' ? 'block' : 'none';
    });

    window.showTab = function(event, tabId){
      document.querySelectorAll(".tab-content").forEach(t => t.style.display="none");
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.getElementById(tabId).style.display="block";
      if(event) event.currentTarget.classList.add("active");
    }

    // ------------------ Real-time category load ------------------
    function loadCategories(type){
      if(!type) return;
      if(unsubscribeCategories) unsubscribeCategories();
      unsubscribeCategories = db.collection("users").doc(currentUser.uid)
        .collection("categories").where("type","==",type)
        .onSnapshot(snapshot=>{
          categorySelect.innerHTML='<option value="">ক্যাটেগরি নির্বাচন করুন</option>';
          if(snapshot.empty){ setStatus("এই টাইপে কোনো ক্যাটেগরি নেই"); return; }
          snapshot.docs.sort((a,b)=>a.data().name.localeCompare(b.data().name,'bn-BD'))
            .forEach(doc=>{
              const opt = document.createElement("option");
              opt.value=doc.data().name;
              opt.textContent=doc.data().name;
              opt.dataset.docId=doc.id;
              categorySelect.appendChild(opt);
          });
          setStatus(`ক্যাটেগরি লোড হয়েছে (${snapshot.size})`);
      }, err=>setStatus("ক্যাটেগরি লোডে সমস্যা: "+err.message,true));
    }

    typeSelect.addEventListener("change",()=>loadCategories(typeSelect.value));

    // ------------------ Add/Delete category ------------------
    addCategoryBtn.addEventListener("click",()=>{
      const newCat = newCategoryInput.value.trim();
      const type = manageCatType.value;
      if(!newCat) return alert("নতুন ক্যাটেগরি লিখুন!");
      if(!type) return alert("টাইপ নির্বাচন করুন!");

      db.collection("users").doc(currentUser.uid).collection("categories")
        .add({name:newCat,type:type})
        .then(()=>{ newCategoryInput.value=''; loadCategories(typeSelect.value); })
        .catch(err=>alert("ক্যাটেগরি যোগে সমস্যা: "+err.message));
    });

    delCategoryBtn.addEventListener("click",()=>{
      const selectedOpt = categorySelect.selectedOptions[0];
      if(!selectedOpt) return alert("ক্যাটেগরি সিলেক্ট করুন!");
      const docId = selectedOpt.dataset.docId;
      db.collection("users").doc(currentUser.uid).collection("categories").doc(docId)
        .delete()
        .then(()=>loadCategories(typeSelect.value))
        .catch(err=>alert("ক্যাটেগরি ডিলিটে সমস্যা: "+err.message));
    });

    // ------------------ Transactions ------------------
    document.getElementById("transactionForm").addEventListener("submit", e=>{
      e.preventDefault();
      const date=document.getElementById("date").value;
      const type=typeSelect.value;
      const category=categorySelect.value;
      const amount=parseFloat(document.getElementById("amount").value);
      if(!date || !type || !category || isNaN(amount) || amount<=0) return alert("সব ফিল্ড পূরণ করুন");

      db.collection("users").doc(currentUser.uid).collection("transactions")
        .add({date,type,category,amount,timestamp:firebase.firestore.FieldValue.serverTimestamp()})
        .then(()=>{ e.target.reset(); setStatus("লেনদেন সংরক্ষিত হয়েছে"); loadRecentTransactions(currentUser.uid); })
        .catch(err=>alert("লেনদেন সেভে সমস্যা: "+err.message));
    });

    function loadRecentTransactions(uid){
      db.collection("users").doc(uid).collection("transactions")
        .orderBy("timestamp","desc").limit(10)
        .onSnapshot(snapshot=>{
          let html=`<table class="transaction-table"><thead><tr><th>তারিখ</th><th>টাইপ</th><th>ক্যাটেগরি</th><th>পরিমাণ</th></tr></thead><tbody>`;
          snapshot.forEach(doc=>{
            const d=doc.data();
            if(!["income","expense"].includes(d.type)) return;
            const rowClass = d.type==="income"?"income-row":"expense-row";
            const typeLabel = d.type==="income"?"আয়":"ব্যয়";
            html+=`<tr class="${rowClass}"><td>${formatDateToBangla(d.date)}</td><td>${typeLabel}</td><td>${d.category}</td><td>${formatBanglaNumber(d.amount)} ৳</td></tr>`;
          });
          html+="</tbody></table>";
          document.getElementById("recent-transactions").innerHTML=html;
        });
    }

    // ------------------ Bangla formatting ------------------
    function formatBanglaNumber(number){
      const engToBn={0:'০',1:'১',2:'২',3:'৩',4:'৪',5:'৫',6:'৬',7:'৭',8:'৮',9:'৯'};
      return number.toString().replace(/[0-9]/g,d=>engToBn[d]);
    }
    function formatDateToBangla(dateStr){
      if(!dateStr) return "";
      const monthsBn=["জানুয়ারী","ফেব্রুয়ারী","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর"];
      const parts=dateStr.split("-");
      if(parts.length!==3) return dateStr;
      const year=formatBanglaNumber(parts[0]);
      const month=parseInt(parts[1],10)-1;
      const day=formatBanglaNumber(parts[2]);
      return `${day} ${monthsBn[month]} ${year}`;
    }

    // ------------------ Loan Section ------------------
    function renderLoanSection(){
      const container = document.getElementById('loanNameContainer');
      const typeSelect = document.getElementById('loanType');
      const dateInput = document.getElementById('loanDate');
      const amountInput = document.getElementById('loanAmount');
      let nameInput, nameSelect;

      function createNameInput(){
        container.innerHTML='';
        nameInput = document.createElement('input');
        nameInput.type='text'; nameInput.className='form-input'; nameInput.id='loanName'; nameInput.placeholder='নাম লিখুন';
        container.appendChild(nameInput);
      }

      function createNameSelect(options=[]){
        container.innerHTML='';
        nameSelect = document.createElement('select');
        nameSelect.className='form-input'; nameSelect.id='loanName';
        const defaultOption=document.createElement('option');
        defaultOption.value=''; defaultOption.textContent='নাম নির্বাচন করুন';
        nameSelect.appendChild(defaultOption);
        if(options.length===0){
          const opt=document.createElement('option'); opt.value=''; opt.textContent='অপর্যাপ্ত লোন অবশিষ্ট নেই'; nameSelect.appendChild(opt);
        } else {
          options.forEach(name=>{
            const opt=document.createElement('option'); opt.value=name; opt.textContent=name;
            nameSelect.appendChild(opt);
          });
        }
        container.appendChild(nameSelect);
      }

      async function updateLoanNames(){
        if(typeSelect.value==='loan'){ createNameInput(); }
        else if(typeSelect.value==='repayment'){
          const loanSnap = await db.collection("users").doc(currentUser.uid).collection("transactions").where("category","==","লোন গ্রহণ").get();
          const repaymentSnap = await db.collection("users").doc(currentUser.uid).collection("transactions").where("category","==","লোন পরিশোধ").get();
          const loanBalance={};
          loanSnap.forEach(doc=>{ const d=doc.data(); loanBalance[d.name]=(loanBalance[d.name]||0)+d.amount; });
          repaymentSnap.forEach(doc=>{ const d=doc.data(); if(loanBalance[d.name]) loanBalance[d.name]-=d.amount; });
          const remainingNames=Object.keys(loanBalance).filter(n=>loanBalance[n]>0);
          createNameSelect(remainingNames);
        }
      }

      typeSelect.addEventListener('change',updateLoanNames);

      document.getElementById('loanForm').addEventListener('submit',async e=>{
        e.preventDefault();
        const name = (typeSelect.value==='loan')? nameInput.value.trim() : nameSelect.value;
        const loanType = typeSelect.value;
        const amount = parseFloat(amountInput.value);
        const date = dateInput.value;
        if(!name || !loanType || isNaN(amount) || !date){ alert("সব ফিল্ড পূরণ করুন"); return; }
        const entryType = (loanType==='loan')?'income':'expense';
        const category = (loanType==='loan')?'লোন গ্রহণ':'লোন পরিশোধ';
        await db.collection("users").doc(currentUser.uid).collection("transactions")
          .add({name,type:entryType,category,amount,date,timestamp:firebase.firestore.FieldValue.serverTimestamp()});
        dateInput.value=''; amountInput.value=''; updateLoanNames();
      });

      updateLoanNames();
      loadLoansRealtime(currentUser.uid);
    }

    let loanChartInstance;
    function loadLoansRealtime(uid){
      db.collection("users").doc(uid).collection("transactions")
        .orderBy("timestamp","desc").onSnapshot(snapshot=>{
          const tbody=document.querySelector("#loanTable tbody");
          tbody.innerHTML='';
          let summaryByPerson={}, totalLoan=0,totalRepayment=0;
          snapshot.forEach(doc=>{
            const d=doc.data();
            if(!["লোন গ্রহণ","লোন পরিশোধ"].includes(d.category)) return;
            const tr=document.createElement('tr');
            const displayDate = d.date ? formatDateToBangla(d.date) : 'লোড হচ্ছে...';
            if(d.category==='লোন গ্রহণ'){ 
              tr.classList.add('loan-taken'); 
              totalLoan+=d.amount; 
              summaryByPerson[d.name]=summaryByPerson[d.name]||{taken:0,repaid:0}; 
              summaryByPerson[d.name].taken+=d.amount; 
            } else { 
              tr.classList.add('loan-repaid'); 
              totalRepayment+=d.amount; 
              summaryByPerson[d.name]=summaryByPerson[d.name]||{taken:0,repaid:0}; 
              summaryByPerson[d.name].repaid+=d.amount; 
            }
            tr.innerHTML=`<td>${displayDate}</td><td>${d.name}</td><td>${d.category}</td><td>${formatBanglaNumber(d.amount)} টাকা</td>`;
            tbody.appendChild(tr);
          });

          const summaryDiv=document.getElementById("loanSummary");
          let html=`<h3>📊 লোন সারসংক্ষেপ</h3><table class="transaction-table" style="width:100%; border-collapse: collapse;"><thead><tr class="loan-repaid"><th>নাম</th><th>লোন গ্রহণ</th><th>পরিশোধ</th><th>অবশিষ্ট</th></tr></thead><tbody>`;
          Object.keys(summaryByPerson).forEach(name=>{
            const taken=summaryByPerson[name].taken||0;
            const repaid=summaryByPerson[name].repaid||0;
            const remain=taken-repaid;
            html+=`<tr><td>${name}</td><td>${formatBanglaNumber(taken)} টাকা</td><td>${formatBanglaNumber(repaid)} টাকা</td><td>${formatBanglaNumber(remain)} টাকা</td></tr>`;
          });
          html+='</tbody></table>'; summaryDiv.innerHTML=html;

          const remaining=totalLoan-totalRepayment;
          const ctx=document.getElementById('loanChart').getContext('2d');
          if(loanChartInstance) loanChartInstance.destroy();
          loanChartInstance=new Chart(ctx,{
            type:'pie',
            data:{
              labels:['লোন গ্রহণ','পরিশোধ','বাকি'],
              datasets:[{data:[totalLoan,totalRepayment,remaining],backgroundColor:['#4caf50','#f44336','#2196f3'],hoverOffset:10}]
            },
            options:{
              plugins:{
                title:{display:true,text:'লোন গ্রহণ বনাম পরিশোধ (৳)',font:{size:18}},
                tooltip:{callbacks:{label:function(ctx){return `${ctx.label}: ${ctx.parsed.toLocaleString('bn-BD')} টাকা`;}}}
              }
            }
          });
        });
    }

    // ------------------ Initial Load ------------------
    typeSelect.value='income';
    manageCatType.value='income';
    loadCategories('income');
    loadRecentTransactions(currentUser.uid);
    renderLoanSection();
  });
}
