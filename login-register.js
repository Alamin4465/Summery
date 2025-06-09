

// ---------------------- Login Logic ----------------------
document.getElementById('loginForm')?.addEventListener('submit', function (e) {
  e.preventDefault();

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      alert("লগইন সফল");
      window.location.href = "index.html";
    })
    .catch((error) => {
      alert("লগইন ব্যর্থ: " + error.message);
    });
});


// 🧠 ফর্ম এলিমেন্ট
const registerForm = document.getElementById("registerForm");
const submitBtn = document.getElementById("submitBtn");

const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passInput = document.getElementById("password");
const confirmInput = document.getElementById("confirmPassword");
const dobInput = document.getElementById("dob");
const genderInput = document.getElementById("gender");
const formMessage = document.getElementById("formMessage");

// ✅ পাসওয়ার্ড মিলছে কিনা দেখে সাবমিট বাটন অ্যাক্টিভ/ডিঅ্যাক্টিভ করা
function validateForm() {
  const isValid =
    nameInput.value &&
    emailInput.value &&
    passInput.value.length >= 6 &&
    confirmInput.value === passInput.value &&
    dobInput.value &&
    genderInput.value;

  submitBtn.disabled = !isValid;
}

registerForm.addEventListener("input", validateForm);

// ✅ সাবমিট ইভেন্ট
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = nameInput.value;
  const email = emailInput.value;
  const password = passInput.value;
  const dob = dobInput.value;
  const gender = genderInput.value;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // প্রোফাইল আপডেট (নাম সেট করা)
    await updateProfile(user, {
      displayName: name
    });

    // Firestore-এ ইউজারের অতিরিক্ত তথ্য সংরক্ষণ
    await setDoc(doc(db, "users", user.uid), {
      name,
      email,
      dob,
      gender,
      uid: user.uid,
      createdAt: new Date()
    });

    formMessage.style.color = "lightgreen";
    formMessage.innerText = "নিবন্ধন সফল হয়েছে!";

    // লগইন পেইজে রিডাইরেক্ট (৩ সেকেন্ড পর)
    setTimeout(() => {
      window.location.href = "login.html";
    }, 3000);
  } catch (error) {
    formMessage.style.color = "red";
    formMessage.innerText = `ত্রুটি: ${error.message}`;
  }
});
