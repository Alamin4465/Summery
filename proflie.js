// 🔹 Profile Style
const profileStyle = document.createElement('style');
profileStyle.textContent = `
.change-password-section { margin-top: 30px; text-align: center; }
.change-password-section input { padding: 8px 12px; border-radius: 6px; border: 1px solid #ccc; margin: 10px 0; font-size: 16px; width: 100%; max-width: 300px; }
.change-password-section button { padding: 8px 14px; border: none; border-radius: 6px; background-color: #ffc107; color: #000; font-size: 16px; cursor: pointer; }
.change-password-section button:hover { background-color: #e0a800; }
.profile-box { max-width: 500px; margin: 30px auto; padding: 20px; background-color: rgba(255, 255, 255, 0.2); border-radius: 12px; backdrop-filter: blur(10px); box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); font-family: 'SolaimanLipi', sans-serif; color: #fff; }
.profile-box h2 { text-align: center; margin-bottom: 20px; font-size: 24px; font-weight: bold; }
.profile-box .field-label { font-weight: bold; margin-top: 15px; margin-bottom: 5px; }
.profile-box .value { padding: 8px 12px; background-color: rgba(255,255,255,0.1); border-radius: 6px; margin-bottom: 10px; }
.profile-box input, .profile-box select { width: 100%; padding: 8px 12px; border-radius: 6px; border: 1px solid #ccc; margin-bottom: 15px; font-size: 16px; background-color: rgba(255,255,255,0.1); color: #fff; }
.profile-box .buttons { display: flex; justify-content: space-between; margin-top: 20px; }
.profile-box button { flex: 1; margin: 0 5px; padding: 10px 12px; border: none; border-radius: 6px; background-color: #007bff; color: white; font-size: 16px; cursor: pointer; }
.profile-box button:hover { background-color: #0056b3; }
#message { margin-top: 15px; text-align: center; font-weight: bold; font-size: 15px; color: lightgreen; }
.logout-btn { display: block; margin: 25px auto 0; padding: 10px 16px; background-color: #dc3545; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; }
.logout-btn:hover { background-color: #b02a37; }
`;
document.head.appendChild(profileStyle);

// 🔹 Load Profile Info
async function loadProfileInfo() {
  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="profile-box">
      <h2>প্রোফাইল তথ্য</h2>
      <div>
        <div class="field-label">নাম:</div>
        <div class="value" id="nameDisplay">লোড হচ্ছে...</div>
        <input type="text" id="nameInput" style="display:none" />
      </div>
      <div>
        <div class="field-label">ইমেইল:</div>
        <div class="value" id="emailDisplay">লোড হচ্ছে...</div>
      </div>
      <div>
        <div class="field-label">লিঙ্গ:</div>
        <div class="value" id="genderDisplay">লোড হচ্ছে...</div>
        <select id="genderInput" style="display:none">
          <option value="">-- নির্বাচন করুন --</option>
          <option value="পুরুষ">পুরুষ</option>
          <option value="মহিলা">মহিলা</option>
          <option value="অন্যান্য">অন্যান্য</option>
        </select>
      </div>
      <div>
        <div class="field-label">জন্মতারিখ:</div>
        <div class="value" id="dobDisplay">লোড হচ্ছে...</div>
        <input type="date" id="dobInput" style="display:none" />
      </div>
      <div class="buttons">
        <button id="editBtn">এডিট করুন</button>
        <button id="saveBtn" style="display:none">সংরক্ষণ করুন</button>
        <button id="cancelBtn" style="display:none">বাতিল করুন</button>
      </div>
      <div id="message"></div>
      <button id="logout-button" class="logout-btn">লগআউট</button>

      <div class="change-password-section">
        <button id="togglePasswordFormBtn">🔐 পাসওয়ার্ড পরিবর্তন করুন</button>
        <div id="passwordForm" style="display: none;">
          <input type="password" id="newPassword" placeholder="নতুন পাসওয়ার্ড দিন" />
          <br />
          <button id="changePasswordBtn">আপডেট করুন</button>
          <div id="passwordMessage"></div>
        </div>
      </div>
    </div>
  `;

  const user = firebase.auth().currentUser;
  if (!user) {
    document.getElementById("message").innerText = "লগইন পাওয়া যায়নি! আবার লগইন করুন।";
    document.getElementById("message").style.color = "red";
    return;
  }

  const uid = user.uid;
  const db = firebase.firestore();

  try {
    // ১. শুধুমাত্র আপনার বর্তমান UID দিয়ে ডাটা খোঁজা
    const doc = await db.collection("users").doc(uid).get();
    
    if (doc.exists && doc.data().name) {
      const data = doc.data();
      document.getElementById("nameDisplay").innerText = data.name || "—";
      document.getElementById("emailDisplay").innerText = data.email || user.email || "—";
      document.getElementById("genderDisplay").innerText = data.gender || "—";
      document.getElementById("dobDisplay").innerText = data.dob || "—";

      document.getElementById("nameInput").value = data.name || "";
      document.getElementById("genderInput").value = data.gender || "";
      document.getElementById("dobInput").value = data.dob || "";
    } else {
      // ২. ডাটা না থাকলে নতুন ডকুমেন্ট তৈরি
      document.getElementById("nameDisplay").innerText = "—";
      document.getElementById("emailDisplay").innerText = user.email || "—";
      document.getElementById("genderDisplay").innerText = "—";
      document.getElementById("dobDisplay").innerText = "—";
      
      await db.collection("users").doc(uid).set({
        name: "",
        email: user.email || "",
        gender: "",
        dob: "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      document.getElementById("message").innerText = "নতুন প্রোফাইল তৈরি হয়েছে। এডিট করে তথ্য দিন।";
      document.getElementById("message").style.color = "orange";
    }

  } catch (error) {
    console.error("Firebase Error:", error);
    document.getElementById("nameDisplay").innerText = "—";
    document.getElementById("emailDisplay").innerText = user.email || "—";
    document.getElementById("genderDisplay").innerText = "—";
    document.getElementById("dobDisplay").innerText = "—";
    document.getElementById("message").innerText = "লোডে সমস্যা: " + error.message;
    document.getElementById("message").style.color = "red";
  }

  // Edit, Save, Cancel
  document.getElementById("editBtn").addEventListener("click", () => toggleEditMode(true));
  document.getElementById("cancelBtn").addEventListener("click", () => toggleEditMode(false));
  document.getElementById("saveBtn").addEventListener("click", async () => {
    const name = document.getElementById("nameInput").value.trim();
    const gender = document.getElementById("genderInput").value;
    const dob = document.getElementById("dobInput").value;

    try {
      await db.collection("users").doc(uid).update({ name, gender, dob });
      document.getElementById("message").innerText = "তথ্য সংরক্ষণ হয়েছে!";
      document.getElementById("message").style.color = "lightgreen";

      const userNameDiv = document.getElementById("user-name");
      if (userNameDiv && name) {
        userNameDiv.innerHTML = `<span style="font-size:0.85rem; opacity:0.85; font-weight:600;">ইউজার:</span> <strong style="font-size:1.1rem;">${name}</strong>`;
      }

      toggleEditMode(false);
      loadProfileInfo();
    } catch (err) {
      document.getElementById("message").innerText = "সংরক্ষণে সমস্যা: " + err.message;
      document.getElementById("message").style.color = "red";
    }
  });

  // Logout
  document.getElementById("logout-button").addEventListener("click", () => {
    firebase.auth().signOut().then(() => { window.location.href = "login.html"; });
  });

  // Password Toggle
  document.getElementById("togglePasswordFormBtn").addEventListener("click", () => {
    const form = document.getElementById("passwordForm");
    form.style.display = form.style.display === "none" ? "block" : "none";
    document.getElementById("passwordMessage").innerText = "";
  });

  // Password Change
  document.getElementById("changePasswordBtn").addEventListener("click", () => {
    const newPassword = document.getElementById("newPassword").value.trim();
    const messageBox = document.getElementById("passwordMessage");

    if (newPassword.length < 6) {
      messageBox.style.color = "red";
      messageBox.innerText = "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে!";
      return;
    }

    firebase.auth().currentUser.updatePassword(newPassword)
      .then(() => {
        messageBox.style.color = "lightgreen";
        messageBox.innerText = "পাসওয়ার্ড পরিবর্তন সফল হয়েছে!";
        document.getElementById("newPassword").value = "";
      })
      .catch(error => {
        messageBox.style.color = "red";
        if (error.code === 'auth/requires-recent-login') {
          messageBox.innerText = "অনুগ্রহ করে আবার লগইন করে চেষ্টা করুন।";
        } else {
          messageBox.innerText = "সমস্যা হয়েছে! " + error.message;
        }
      });
  });
}

// 🔹 Toggle Edit Mode
function toggleEditMode(enable) {
  document.getElementById("nameDisplay").style.display = enable ? "none" : "block";
  document.getElementById("nameInput").style.display = enable ? "block" : "none";
  document.getElementById("genderDisplay").style.display = enable ? "none" : "block";
  document.getElementById("genderInput").style.display = enable ? "block" : "none";
  document.getElementById("dobDisplay").style.display = enable ? "none" : "block";
  document.getElementById("dobInput").style.display = enable ? "block" : "none";

  document.getElementById("editBtn").style.display = enable ? "none" : "inline-block";
  document.getElementById("saveBtn").style.display = enable ? "inline-block" : "none";
  document.getElementById("cancelBtn").style.display = enable ? "inline-block" : "none";
}