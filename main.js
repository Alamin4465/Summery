let currentFilter = "all";
let allTransactions = [];
let currentUser = null;
let unsubscribeTransaction = null;

// ========== AUTH CHECK ==========
firebase.auth().onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    currentUser = user;
    activate(document.getElementById('nav-dashboard'), 'ড্যাশবোর্ড');
    checkTodaySavingFromTransactions(user.uid);  // আজকের সঞ্চয় চেক
    showUserName(user);                          // ইউজার নাম দেখাও
  }
});

document.addEventListener('DOMContentLoaded', function () {
  const cards = document.querySelectorAll('.summary-card');
  cards.forEach((card, index) => {
    setTimeout(() => {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 300 * index);
  });

  document.getElementById('nav-dashboard')?.addEventListener('click', () => activate(document.getElementById('nav-dashboard'), 'ড্যাশবোর্ড'));
  document.getElementById('nav-forms')?.addEventListener('click', () => activate(document.getElementById('nav-forms'), 'ফ্রমস'));
  document.getElementById('nav-submit')?.addEventListener('click', () => activate(document.getElementById('nav-submit'), 'ট্রানজেকশন'));
  document.getElementById('nav-filter')?.addEventListener('click', () => activate(document.getElementById('nav-filter'), 'ফিল্টার'));
  document.getElementById('nav-profile')?.addEventListener('click', () => activate(document.getElementById('nav-profile'), 'প্রোফাইল তথ্য'));
});

// ========== SECTION ACTIVATION ==========
function activate(button, sectionName) {
  document.querySelectorAll('.menu-button').forEach(btn => btn.classList.remove('active'));
  button.classList.add('active');

  const content = document.getElementById('content');
  content.innerHTML = `<p>লোড হচ্ছে...</p>`;

  switch (sectionName) {
    case 'প্রোফাইল তথ্য':
      loadProfileInfo();
      break;
    case 'ড্যাশবোর্ড':
      loadDashboardSummary();
      break;
    case 'ফ্রমস':
      lonefrom();
      break;
    case 'ফিল্টার':
      transactionFilter();
      break;
    case 'ট্রানজেকশন':
      loadTransactions();
      break;
    default:
      content.innerHTML = `<p>এই অংশটি এখনো তৈরি হয়নি।</p>`;
  }
}

// ========== আজকের সঞ্চয় চেক ==========
async function checkTodaySavingFromTransactions(uid) {
  const now = new Date();
  const today = now.toISOString().split('T')[0]; // yyyy-mm-dd

  try {
    const snapshot = await firebase.firestore()
      .collection("users")
      .doc(uid)
      .collection("transactions")
      .where("category", "==", "সঞ্চয়")
      .where("date", "==", today)
      .get();

    const statusDiv = document.getElementById('today-saving-status');
    if (!statusDiv) return;

    if (!snapshot.empty) {
      statusDiv.className = 'success';
      statusDiv.innerHTML = `<span>আজকের (${today}) সঞ্চয় করা হয়েছে ✅</span>`;
      setTimeout(() => {
        statusDiv.innerHTML = '';
        statusDiv.className = '';
      }, 600000); // 10 মিনিট পর লুকানো হবে

    } else {
      statusDiv.className = 'warning';
      statusDiv.innerHTML = `<span>আজকের (${today}) সঞ্চয় হয়নি ⚠️</span>`;
    }
  } catch (error) {
    console.error("সঞ্চয় চেক করতে সমস্যা:", error);
    const statusDiv = document.getElementById('today-saving-status');
    if (statusDiv) {
      statusDiv.className = 'error';
      statusDiv.innerHTML = `স্ট্যাটাস লোড করতে সমস্যা হয়েছে ❌`;
    }
  }
}

// ========== ইউজার নাম দেখানো ==========
function showUserName(user) {
  const userNameDiv = document.getElementById('user-name');

  if (!userNameDiv) return; // যদি div না থাকে

  if (user.displayName) {
    userNameDiv.textContent = `স্বাগতম, ${user.displayName} 🙌`;
  } else {
    firebase.firestore()
      .collection('users')
      .doc(user.uid)
      .get()
      .then(doc => {
        if (doc.exists && doc.data().name) {
          userNameDiv.textContent = `স্বাগতম, ${doc.data().name} 🙌`;
        } else {
          userNameDiv.textContent = `স্বাগতম, ইউজার 🙌`;
        }
      })
      .catch(err => {
        console.error("নাম লোড করতে সমস্যা:", err);
        userNameDiv.textContent = `স্বাগতম, ইউজার 🙌`;
      });
  }
}
