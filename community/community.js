import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getDatabase, ref, push, onValue, serverTimestamp, query, limitToLast } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBvQZbiFjhjWJXRxbhiP_dwdtbcAHU9qLg",
    authDomain: "worldcupswap.firebaseapp.com",
    projectId: "worldcupswap",
    databaseURL: "https://worldcupswap-default-rtdb.firebaseio.com/",
    storageBucket: "worldcupswap.firebasestorage.app",
    messagingSenderId: "990985355951",
    appId: "1:990985355951:web:0942dd293e529f1ab14a5a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore();
const rtdb = getDatabase();
const myId = localStorage.getItem('loggedInUserId');
let myUsername = "Usuario";

document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = '/home/home.html';
});

async function loadUser() {
    const docSnap = await getDoc(doc(db, "users", myId));
    if (docSnap.exists()) {
        myUsername = docSnap.data().username;
    }
}

function loadMessages() {
    const chatRef = query(ref(rtdb, 'community_chat'), limitToLast(50));
    onValue(chatRef, (snapshot) => {
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = '';
        
        snapshot.forEach((child) => {
            const data = child.val();
            const isMe = data.userId === myId;
            
            const div = document.createElement('div');
            div.className = `chat-msg ${isMe ? 'me' : ''}`;
            
            const sender = document.createElement('span');
            sender.className = 'msg-sender';
            sender.innerText = data.username;
            
            const text = document.createElement('span');
            text.className = 'msg-text';
            text.innerText = data.text;
            
            div.appendChild(sender);
            div.appendChild(text);
            chatMessages.appendChild(div);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (text === '') return;
    
    input.value = '';
    await push(ref(rtdb, 'community_chat'), {
        userId: myId,
        username: myUsername,
        text: text,
        timestamp: serverTimestamp()
    });
}

document.getElementById('sendBtn').addEventListener('click', sendMessage);
document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

loadUser().then(loadMessages);