import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getFirestore, getDoc, doc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBvQZbiFjhjWJXRxbhiP_dwdtbcAHU9qLg",
    authDomain: "worldcupswap.firebaseapp.com",
    projectId: "worldcupswap",
    storageBucket: "worldcupswap.firebasestorage.app",
    messagingSenderId: "990985355951",
    appId: "1:990985355951:web:0942dd293e529f1ab14a5a",
    measurementId: "G-1LT2367QC0",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth();
const db = getFirestore();

onAuthStateChanged(auth, (user) => {
    if (!user) {
        localStorage.removeItem('loggedInUserId');
        window.location.replace('../auth/index.html');
        return;
    }

    const loggedInUserId = localStorage.getItem("loggedInUserId");
    if (loggedInUserId) {
        const docRef = doc(db, "users", loggedInUserId);
        getDoc(docRef)
            .then((docSnap) => {
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    document.getElementById("loggedUsersUsername").innerText =
                        userData.username;
                    document.getElementById("loggedUserEmail").innerText = userData.email;
                } else {
                    console.log("no document found matching id");
                }
            })
            .catch((error) => {
                console.log("Error getting document", error);
            });
    } else {
        console.log("User Id not Found in Local Storage");
    }
});

const logoutButton=document.getElementById('logout');
const myalbumButton=document.getElementById('myalbum');

logoutButton.addEventListener('click', ()=>{
    localStorage.removeItem('loggedInUserId');
    signOut(auth)
    .then(()=>{
        window.location.href='../auth/index.html'
    })
    .catch((error)=>{
        console.error('Error Signing out:', error)
    })
})

myalbumButton.addEventListener('click', ()=>{
    window.location.href='../myalbum/myalbum.html'
})