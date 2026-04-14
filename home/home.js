import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getFirestore, getDoc, doc, collection, query, where, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBvQZbiFjhjWJXRxbhiP_dwdtbcAHU9qLg",
    authDomain: "worldcupswap.firebaseapp.com",
    projectId: "worldcupswap",
    storageBucket: "worldcupswap.firebasestorage.app",
    messagingSenderId: "990985355951",
    appId: "1:990985355951:web:0942dd293e529f1ab14a5a",
    measurementId: "G-1LT2367QC0",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();
const myId = localStorage.getItem("loggedInUserId");

const tradeModal = document.getElementById('tradeModal');
const requestsList = document.getElementById('requestsList');
const notifBadge = document.getElementById('notifBadge');

onAuthStateChanged(auth, (user) => {
    if (!user) {
        localStorage.removeItem('loggedInUserId');
        localStorage.removeItem('myUsername');
        window.location.replace('/auth/index.html');
        return;
    }

    if (myId) {
        const cachedUsername = localStorage.getItem('myUsername');
        if (cachedUsername) {
            document.getElementById("loggedUsersUsername").innerText = cachedUsername;
        }

        const docRef = doc(db, "users", myId);
        getDoc(docRef).then((docSnap) => {
            if (docSnap.exists()) {
                const freshUsername = docSnap.data().username;
                document.getElementById("loggedUsersUsername").innerText = freshUsername;
                localStorage.setItem('myUsername', freshUsername);
            }
        });

        const qTrades = query(collection(db, "trades"), where("receiverId", "==", myId), where("status", "==", "pending"));
        onSnapshot(qTrades, (snapshot) => {
            notifBadge.innerText = snapshot.size;
            notifBadge.style.display = snapshot.size > 0 ? 'block' : 'none';
            requestsList.innerHTML = snapshot.empty ? '<p style="text-align:center; padding: 20px;">No hay solicitudes pendientes.</p>' : '';

            snapshot.forEach(async (tradeDoc) => {
                const trade = tradeDoc.data();
                const senderSnap = await getDoc(doc(db, "users", trade.senderId));
                const senderName = senderSnap.exists() ? senderSnap.data().username : "Usuario";

                const div = document.createElement('div');
                div.className = 'trade-request-item';
                div.innerHTML = `
                    <p><strong>De:</strong> ${senderName}</p>
                    <p style="color: #7bad49"><strong>Te da:</strong> ${trade.give.join(', ')}</p>
                    <p style="color: #003366"><strong>Le das:</strong> ${trade.receive.join(', ')}</p>
                    <div class="trade-btn-group">
                        <button class="accept-btn" onclick="handleTrade('${tradeDoc.id}', 'accept')">ACEPTAR</button>
                        <button class="reject-btn" onclick="handleTrade('${tradeDoc.id}', 'reject')">RECHAZAR</button>
                    </div>
                `;
                requestsList.appendChild(div);
            });
        });
    }
});

window.handleTrade = async (tradeId, action) => {
    const tradeRef = doc(db, "trades", tradeId);
    if (action === 'reject') {
        if (confirm("¿Rechazar solicitud?")) await updateDoc(tradeRef, { status: 'rejected' });
        return;
    }

    if (!confirm("¿Aceptar intercambio? Se actualizarán los álbumes.")) return;

    try {
        const tradeSnap = await getDoc(tradeRef);
        const trade = tradeSnap.data();
        const myAlbumRef = doc(db, "albums", myId);
        const friendAlbumRef = doc(db, "albums", trade.senderId);

        const [myAlb, frAlb] = await Promise.all([getDoc(myAlbumRef), getDoc(friendAlbumRef)]);
        let myStickers = myAlb.data().stickers;
        let frStickers = frAlb.data().stickers;

        trade.give.forEach(id => {
            frStickers[id] = (frStickers[id] || 0) - 1;
            myStickers[id] = (myStickers[id] || 0) + 1;
        });

        trade.receive.forEach(id => {
            myStickers[id] = (myStickers[id] || 0) - 1;
            frStickers[id] = (frStickers[id] || 0) + 1;
        });

        await Promise.all([
            updateDoc(myAlbumRef, { stickers: myStickers }),
            updateDoc(friendAlbumRef, { stickers: frStickers }),
            updateDoc(tradeRef, { status: 'accepted' })
        ]);
        alert("¡Intercambio completado!");
    } catch (e) {
        alert("Error al procesar el intercambio.");
    }
};

document.getElementById('notifBtn').onclick = () => tradeModal.style.display = 'flex';
document.getElementById('closeTradeModalBtn').onclick = () => tradeModal.style.display = 'none';

document.getElementById('logout').addEventListener('click', () => {
    localStorage.removeItem('loggedInUserId');
    localStorage.removeItem('myUsername');
    signOut(auth).then(() => window.location.href = '/auth/index.html');
});

document.getElementById('myalbum').addEventListener('click', () => window.location.href = '/myalbum/myalbum.html');
document.getElementById('friends').addEventListener('click', () => window.location.href = '/friends/friends.html');
document.getElementById('community').addEventListener('click', () => window.location.href = '/community/community.html')