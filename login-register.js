

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
