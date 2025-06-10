// ফর্ম টগল
function showForm(type) {
  document.querySelectorAll('.form').forEach(f => f.classList.remove('active'));
  document.getElementById(type + 'Form')?.classList.add('active');
  document.getElementById('resetSection').style.display = 'none';
}

// রেজিস্টার
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const gender = document.getElementById('regGender').value;
  const dob = document.getElementById('regDob').value;
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const retype = document.getElementById('regRetypePassword').value;
  const msgEl = document.getElementById('registerMessage');

  msgEl.style.color = '#fff';
  msgEl.textContent = 'রেজিস্টার করা হচ্ছে...';

  if (password !== retype) {
    msgEl.style.color = 'red';
    msgEl.textContent = 'পাসওয়ার্ড দুটি মেলেনি।';
    return;
  }

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    await db.collection('users').doc(user.uid).set({
      uid: user.uid,
      name, gender, dob, email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    msgEl.style.color = 'limegreen';
    msgEl.textContent = 'রেজিস্ট্রেশন সফল হয়েছে!';
    setTimeout(() => showForm('login'), 2000);
  } catch (err) {
    msgEl.style.color = 'red';
    msgEl.textContent = 'ত্রুটি: ' + err.message;
  }
});

// লগইন
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    await auth.signInWithEmailAndPassword(email, password);
    alert('লগইন সফল হয়েছে!');
    window.location.href = 'index.html';
  } catch (err) {
    alert('লগইন ব্যর্থ: ' + err.message);
  }
});

// রিসেট সেকশন টগল
function toggleResetSection() {
  const section = document.getElementById('resetSection');
  section.style.display = section.style.display === 'none' ? 'block' : 'none';
}

// রিসেট পাসওয়ার্ড
async function resetPassword() {
  const email = document.getElementById('resetEmail').value.trim();
  const dob = document.getElementById('resetDob').value;
  const msgEl = document.getElementById('resetMessage');

  msgEl.style.color = '#fff';
  msgEl.textContent = 'তথ্য যাচাই করা হচ্ছে...';

  try {
    const snapshot = await db.collection('users').where('email', '==', email).get();
    if (snapshot.empty) {
      msgEl.style.color = 'red';
      msgEl.textContent = 'এই ইমেইল পাওয়া যায়নি।';
      return;
    }

    let matched = false;
    snapshot.forEach(doc => {
      if (doc.data().dob === dob) matched = true;
    });

    if (!matched) {
      msgEl.style.color = 'red';
      msgEl.textContent = 'জন্ম তারিখ মিলছে না।';
      return;
    }

    await auth.sendPasswordResetEmail(email);
    msgEl.style.color = 'limegreen';
    msgEl.textContent = 'রিসেট লিঙ্ক পাঠানো হয়েছে! ইমেইল চেক করুন।';
  } catch (err) {
    msgEl.style.color = 'red';
    msgEl.textContent = 'ত্রুটি: ' + err.message;
  }
}
