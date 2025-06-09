

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

// ---------------------- Registration Logic ----------------------
const form = document.getElementById('registerForm');
const submitBtn = document.getElementById('submitBtn');
const formMessage = document.getElementById('formMessage');

const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const ageInput = document.getElementById('age');
const genderSelect = document.getElementById('gender');

const emailStatus = document.getElementById('emailStatus');
const emailError = document.getElementById('emailError');
const passStatus = document.getElementById('passStatus');
const passError = document.getElementById('passError');
const confirmStatus = document.getElementById('confirmStatus');
const confirmError = document.getElementById('confirmError');
const ageError = document.getElementById('ageError');
const genderError = document.getElementById('genderError');

// Validation helpers
function setValid(input, statusEl, errorEl) {
  input.classList.add('valid');
  input.classList.remove('invalid');
  if (statusEl) statusEl.textContent = '✓';
  if (errorEl) errorEl.textContent = '';
}
function setInvalid(input, statusEl, errorEl, message) {
  input.classList.add('invalid');
  input.classList.remove('valid');
  if (statusEl) statusEl.textContent = '✗';
  if (errorEl) errorEl.textContent = message;
}

// Input Validations
function validateName() {
  const val = nameInput.value.trim();
  if (val.length < 3) {
    nameInput.classList.add('invalid');
    nameInput.classList.remove('valid');
    return false;
  }
  nameInput.classList.add('valid');
  nameInput.classList.remove('invalid');
  return true;
}
function validateEmail() {
  const val = emailInput.value.trim();
  if (!val) {
    setInvalid(emailInput, emailStatus, emailError, 'ইমেইল প্রয়োজন');
    return false;
  }
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(val)) {
    setInvalid(emailInput, emailStatus, emailError, 'সঠিক ইমেইল লিখুন');
    return false;
  }
  setValid(emailInput, emailStatus, emailError);
  return true;
}
function validatePassword() {
  const val = passwordInput.value;
  if (val.length < 6) {
    setInvalid(passwordInput, passStatus, passError, 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষর');
    return false;
  }
  setValid(passwordInput, passStatus, passError);
  return true;
}
function validateConfirmPassword() {
  const val = confirmPasswordInput.value;
  if (val !== passwordInput.value) {
    setInvalid(confirmPasswordInput, confirmStatus, confirmError, 'পাসওয়ার্ড মেলেনি');
    return false;
  }
  setValid(confirmPasswordInput, confirmStatus, confirmError);
  return true;
}
function validateAge() {
  const val = ageInput.value.trim();
  if (!val || isNaN(val) || val < 1 || val > 150) {
    ageError.textContent = 'বয়স ১ থেকে ১৫০ এর মধ্যে হতে হবে';
    ageInput.classList.add('invalid');
    ageInput.classList.remove('valid');
    return false;
  }
  ageError.textContent = '';
  ageInput.classList.add('valid');
  ageInput.classList.remove('invalid');
  return true;
}
function validateGender() {
  if (!genderSelect.value) {
    genderError.textContent = 'লিঙ্গ নির্বাচন করুন';
    genderSelect.classList.add('invalid');
    genderSelect.classList.remove('valid');
    return false;
  }
  genderError.textContent = '';
  genderSelect.classList.add('valid');
  genderSelect.classList.remove('invalid');
  return true;
}

// Combined validation
function checkFormValidity() {
  const valid = validateName() &&
    validateEmail() &&
    validatePassword() &&
    validateConfirmPassword() &&
    validateAge() &&
    validateGender();
  submitBtn.disabled = !valid;
}

// Event listeners for validation
nameInput.addEventListener('input', checkFormValidity);
emailInput.addEventListener('input', checkFormValidity);
passwordInput.addEventListener('input', () => {
  validatePassword();
  validateConfirmPassword();
  checkFormValidity();
});
confirmPasswordInput.addEventListener('input', () => {
  validateConfirmPassword();
  checkFormValidity();
});
ageInput.addEventListener('input', checkFormValidity);
genderSelect.addEventListener('change', checkFormValidity);

// Submit registration form
form?.addEventListener('submit', async e => {
  e.preventDefault();
  formMessage.textContent = '';

  if (!submitBtn.disabled) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'অপেক্ষা করুন...';

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        age: Number(ageInput.value),
        gender: genderSelect.value,
        createdAt: serverTimestamp()
      });

      formMessage.style.color = 'green';
      formMessage.textContent = 'নিবন্ধন সফল হয়েছে! লগইন পৃষ্ঠায় নিয়ে যাওয়া হচ্ছে...';

      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);

    } catch (error) {
      formMessage.style.color = 'red';
      if (error.code === 'auth/email-already-in-use') {
        formMessage.textContent = 'এই ইমেইল আগে থেকেই ব্যবহার করা হয়েছে।';
      } else if (error.code === 'auth/invalid-email') {
        formMessage.textContent = 'ইমেইল ঠিকমত নয়।';
      } else if (error.code === 'auth/weak-password') {
        formMessage.textContent = 'পাসওয়ার্ড দুর্বল।';
      } else {
        formMessage.textContent = error.message;
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'নিবন্ধন';
    }
  }
});

// Initial form state
checkFormValidity();
