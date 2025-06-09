import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

// DOM elements
const form = document.getElementById('registerForm');
const submitBtn = document.getElementById('submitBtn');
const formMessage = document.getElementById('formMessage');

const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const dobInput = document.getElementById('dob');
const genderSelect = document.getElementById('gender');

const emailStatus = document.getElementById('emailStatus');
const emailError = document.getElementById('emailError');
const passStatus = document.getElementById('passStatus');
const passError = document.getElementById('passError');
const confirmStatus = document.getElementById('confirmStatus');
const confirmError = document.getElementById('confirmError');
const dobError = document.getElementById('dobError');
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

// Email validation
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

// Password validation
function validatePassword() {
  const val = passwordInput.value;
  if (val.length < 6) {
    setInvalid(passwordInput, passStatus, passError, 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষর');
    return false;
  }
  setValid(passwordInput, passStatus, passError);
  return true;
}

// Confirm password
function validateConfirmPassword() {
  if (confirmPasswordInput.value !== passwordInput.value) {
    setInvalid(confirmPasswordInput, confirmStatus, confirmError, 'পাসওয়ার্ড মেলেনি');
    return false;
  }
  setValid(confirmPasswordInput, confirmStatus, confirmError);
  return true;
}

// DOB validation
function calculateAgeFromDOB(dob) {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function validateDOB() {
  const dobVal = dobInput.value;
  if (!dobVal) {
    dobError.textContent = 'জন্মতারিখ দিন';
    dobInput.classList.add('invalid');
    dobInput.classList.remove('valid');
    return false;
  }

  const age = calculateAgeFromDOB(dobVal);
  if (age < 1 || age > 150) {
    dobError.textContent = 'বয়স ১ থেকে ১৫০ বছরের মধ্যে হতে হবে';
    dobInput.classList.add('invalid');
    dobInput.classList.remove('valid');
    return false;
  }

  dobError.textContent = '';
  dobInput.classList.add('valid');
  dobInput.classList.remove('invalid');
  return true;
}

// Gender validation
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

// Name validation
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

// Check all
function checkFormValidity() {
  const valid = validateName() &&
                validateEmail() &&
                validatePassword() &&
                validateConfirmPassword() &&
                validateDOB() &&
                validateGender();

  submitBtn.disabled = !valid;
}

// Real-time validation
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
dobInput.addEventListener('input', checkFormValidity);
genderSelect.addEventListener('change', checkFormValidity);

// Submit
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formMessage.textContent = '';

  if (!submitBtn.disabled) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'অপেক্ষা করুন...';

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        dob: dobInput.value,
        gender: genderSelect.value,
        createdAt: serverTimestamp()
      });

      formMessage.style.color = 'green';
      formMessage.textContent = 'নিবন্ধন সফল হয়েছে! লগইন পৃষ্ঠায় নিয়ে যাওয়া হচ্ছে...';

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

// Init state
checkFormValidity();
