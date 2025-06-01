const firebaseConfig = {
  apiKey: "AIzaSyAARMOWfVK5HNtoUkSd0rTXHvx_pLUG9pw",
  authDomain: "income-expenses-fe526.firebaseapp.com",
  projectId: "income-expenses-fe526",
  storageBucket: "income-expenses-fe526.firebasestorage.app",
  messagingSenderId: "1095511426817",
  appId: "1:1095511426817:web:117d3f6748ace7dfb0fd00"
};


// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
 
