// login-register.js// login-register.js

// Firebase config is already loaded via firebase-config.js

// Initialize Firestore
const auth = firebase.auth();
const db = firebase.firestore();

// রেজিস্ট্রেশন ফর্ম হ্যান্ডলিং
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('regName').value.trim();
  const gender = document.getElementById('regGender').value;
  const dob = document.getElementById('regDob').value;
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const messageEl = document.getElementById('registerMessage');

  messageEl.style.color = '#fff';
  messageEl.textContent = 'রেজিস্টার করা হচ্ছে...';

  try {
    // Create user with email & password
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Save additional info to Firestore
    await db.collection('users').doc(user.uid).set({
      uid: user.uid,
      name: name,
      gender: gender,
      dob: dob,
      email: email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    messageEl.style.color = '#00ffcc';
    messageEl.textContent = 'রেজিস্ট্রেশন সফল হয়েছে! লগইন পেজে নিয়ে যাওয়া হচ্ছে...';

    setTimeout(() => {
      window.location.href = 'login.html';
    }, 2000);
  } catch (error) {
    console.error(error);
    messageEl.style.color = '#ffaaaa';
    if (error.code === 'auth/email-already-in-use') {
      messageEl.textContent = 'এই ইমেইলটি ইতোমধ্যে ব্যবহৃত হয়েছে।';
    } else if (error.code === 'auth/weak-password') {
      messageEl.textContent = 'পাসওয়ার্ডটি অন্তত ৬ অক্ষরের হতে হবে।';
    } else {
      messageEl.textContent = 'রেজিস্ট্রেশনে সমস্যা হয়েছে: ' + error.message;
    }
  }
});

// লগইন
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
      await auth.signInWithEmailAndPassword(email, password);
      alert("লগইন সফল হয়েছে!");
      window.location.href = "index.html";
    } catch (error) {
      console.error("লগইন ত্রুটি:", error.message);
      alert("লগইন ব্যর্থ: " + error.message);
    }
  });
}
