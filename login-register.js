// login-register.js

// Firebase Auth এবং Firestore ব্যবহার
const auth = firebase.auth();
const db = firebase.firestore();

// রেজিস্ট্রেশন
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("regName").value;
    const gender = document.getElementById("regGender").value;
    const dob = document.getElementById("regDob").value;
    const email = document.getElementById("regEmail").value;
    const password = document.getElementById("regPassword").value;

    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const uid = userCredential.user.uid;

      // Firestore-এ ব্যবহারকারীর তথ্য সংরক্ষণ
      await db.collection("users").doc(uid).set({
        uid,
        name,
        gender,
        dob,
        email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      alert("রেজিস্ট্রেশন সফল হয়েছে!");
      window.location.href = "index.html";
    } catch (error) {
      console.error("রেজিস্ট্রেশন ত্রুটি:", error.message);
      alert("রেজিস্ট্রেশন ব্যর্থ: " + error.message);
    }
  });
}

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
