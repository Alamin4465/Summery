// ========== AUTH CHECK ==========
firebase.auth().onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    currentUser = user;
    activate(document.getElementById('nav-dashboard'), 'ড্যাশবোর্ড');
    checkTodaySavingFromTransactions(user.uid);
    showUserName(user);
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

  // 🆕 ইউজার নেমে ক্লিক → প্রোফাইল
  document.getElementById('user-name')?.addEventListener('click', () => {
    document.querySelectorAll('.menu-button').forEach(btn => btn.classList.remove('active'));
    const content = document.getElementById('content');
    if (content) content.innerHTML = `<p>লোড হচ্ছে...</p>`;
    loadProfileInfo();
  });
});

// ========== SECTION ACTIVATION ==========
function activate(button, sectionName) {
  document.querySelectorAll('.menu-button').forEach(btn => btn.classList.remove('active'));
  if (button) button.classList.add('active');

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
      content.innerHTML = `<p>এই অংশটি এখনো তৈরি হয়নি।</p>`;
  }
}

// ========== আজকের সঞ্চয় চেক ==========
async function checkTodaySavingFromTransactions(uid) {
  const now = new Date();

  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const today = `${year}-${month}-${day}`;

  const todayFormattedForMsg = `${convertToBanglaNumber(day)}-${convertToBanglaNumber(month)}-${convertToBanglaNumber(year.toString().slice(2))}`;

  try {
    const transactionsRef = firebase.firestore()
      .collection("users")
      .doc(uid)
      .collection("transactions");

    const todaySnapshot = await transactionsRef
      .where("category", "==", "সঞ্চয়")
      .where("date", "==", today)
      .get();

    const statusDiv = document.getElementById('today-saving-status');
    if (!statusDiv) return;

    const totalSnapshot = await transactionsRef
      .where("category", "==", "সঞ্চয়")
      .get();
    const dayCount = totalSnapshot.size;

    if (!todaySnapshot.empty) {
      const todayDayNumber = dayCount;

      const tomorrowDate = new Date(now);
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrowFormatted = new Intl.DateTimeFormat('bn-BD', {
        year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(tomorrowDate);

      const tomorrowDayNumber = todayDayNumber + 1;
      const tomorrowSavingAmount = 2 * tomorrowDayNumber - 1;

      const tomorrowText = `আগামীকাল (${tomorrowFormatted}) - ${convertToBanglaNumber(tomorrowDayNumber)}তম দিন, সঞ্চয় হবে <strong>${convertToBanglaNumber(tomorrowSavingAmount)} টাকা</strong>।`;

      statusDiv.className = 'success';
      statusDiv.innerHTML = `<div class="scroll-text">✅ আজকের (${todayFormattedForMsg}) সঞ্চয় সম্পন্ন হয়েছে। ${tomorrowText}</div>`;
    } else {
      const todayDayNumber = dayCount + 1;
      const todaySavingAmount = 2 * todayDayNumber - 1;

      statusDiv.className = 'warning';
      statusDiv.innerHTML = `<div class="scroll-text">⚠️ ${todayFormattedForMsg} তারিখে সঞ্চয় জমা হয়নি। আজকের সঞ্চয়ের টাকা: <strong>${convertToBanglaNumber(todaySavingAmount)}</strong> টাকা।</div>`;
    }
  } catch (error) {
    console.error("সঞ্চয় চেক করতে সমস্যা:", error);
    const statusDiv = document.getElementById('today-saving-status');
    if (statusDiv) {
      statusDiv.className = 'error';
      statusDiv.innerHTML = `<div class="scroll-text">❌ সঞ্চয় স্ট্যাটাস লোড করতে সমস্যা হয়েছে।</div>`;
    }
  }
}

function convertToBanglaNumber(number) {
  const banglaDigits = '০১২৩৪৫৬৭৮৯';
  return number.toString().replace(/[0-9]/g, d => banglaDigits[d]);
}

// ========== ইউজার নাম দেখানো ==========
function showUserName(user) {
  const userNameDiv = document.getElementById('user-name');
  if (!userNameDiv) return;

  function setName(name) {
    const finalName = (name && name.trim()) ? name.trim() : 'অতিথি';
    userNameDiv.innerHTML = `<span style="font-size:0.85rem; opacity:0.85; font-weight:600;">ইউজার:</span> <strong style="font-size:1.1rem;">${finalName}</strong>`;
  }

  if (user.displayName) {
    setName(user.displayName);
  } else {
    firebase.firestore()
      .collection('users')
      .doc(user.uid)
      .get()
      .then(doc => {
        if (doc.exists && doc.data().name) {
          setName(doc.data().name);
        } else {
          setName('অতিথি');
        }
      })
      .catch(err => {
        console.error("নাম লোড করতে সমস্যা:", err);
        setName('অতিথি');
      });
  }
}



