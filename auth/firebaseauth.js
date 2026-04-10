// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getFirestore, setDoc, doc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBvQZbiFjhjWJXRxbhiP_dwdtbcAHU9qLg",
  authDomain: "worldcupswap.firebaseapp.com",
  projectId: "worldcupswap",
  storageBucket: "worldcupswap.firebasestorage.app",
  messagingSenderId: "990985355951",
  appId: "1:990985355951:web:0942dd293e529f1ab14a5a",
  measurementId: "G-1LT2367QC0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

function showMessage(message, divId) {
  var messageDiv = document.getElementById(divId);
  messageDiv.style.display = "block";
  messageDiv.innerHTML = message;
  messageDiv.classList.remove('slide-out');

  setTimeout(function () {
    messageDiv.classList.add('slide-out');
    setTimeout(() => { messageDiv.style.display = "none"; }, 500);
  }, 5000);
}

const signUp = document.getElementById('submitSignup');
signUp.addEventListener('click', async (event) => {
  event.preventDefault();
  const email = document.getElementById('sEmail').value;
  const password = document.getElementById('sPassword').value;
  const username = document.getElementById('sUsername').value;

  const auth = getAuth();
  const db = getFirestore();

  const usersRef = collection(db, "users");
  const q = query(usersRef, where("username", "==", username));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    showMessage('Username Already Exists !!!', 'signUpMessage');
    return;
  }

  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      const userData = {
        email: email,
        username: username
      };
      showMessage('Account Created Successfully', 'signUpMessage');
      const docRef = doc(db, "users", user.uid);
      setDoc(docRef, userData)
        .then(() => {
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 2000);
        })
        .catch((error) => {
          console.error("error writing document", error);
        });
    })
    .catch((error) => {
      const errorCode = error.code;
      if (errorCode == 'auth/email-already-in-use') {
        showMessage('Email Address Already Exists !!!', 'signUpMessage');
      }
      else {
        showMessage('Unable to Create User', 'signUpMessage');
      }
    })
});

const signIn = document.getElementById('submitLogin');
signIn.addEventListener('click', (event) => {
  event.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const auth = getAuth();

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      showMessage('Log in is successful', 'signInMessage');
      const user = userCredential.user;
      localStorage.setItem('loggedInUserId', user.uid);
      window.location.href = 'home/index.html';
    })
    .catch((error) => {
      const errorCode = error.code;
      console.log("Actual Error Code:", errorCode);
      if (errorCode === 'auth/invalid-credential') {
        showMessage('Incorrect Email or Password', 'signInMessage');
      } else if (errorCode === 'auth/user-not-found') {
        showMessage('Account does not Exist', 'signInMessage');
      } else {
        showMessage('Error: ' + error.message, 'signInMessage');
      }
    });
})