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

// 

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
      loadTransactions();
    } else {
      window.location.href = "login.html";
    }
  });
});

