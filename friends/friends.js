import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getFirestore, doc, updateDoc, arrayUnion, arrayRemove, getDoc, collection, query, where, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBvQZbiFjhjWJXRxbhiP_dwdtbcAHU9qLg",
    authDomain: "worldcupswap.firebaseapp.com",
    projectId: "worldcupswap",
    storageBucket: "worldcupswap.firebasestorage.app",
    messagingSenderId: "990985355951",
    appId: "1:990985355951:web:0942dd293e529f1ab14a5a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore();
const myId = localStorage.getItem('loggedInUserId');

if (!myId) window.location.replace('/auth/index.html');

const searchModal = document.getElementById('searchModal');
const tradeModal = document.getElementById('tradeModal');

document.getElementById('openModalBtn').onclick = () => searchModal.style.display = 'flex';
document.getElementById('closeModalBtn').onclick = () => searchModal.style.display = 'none';
document.getElementById('notifBtn').onclick = () => tradeModal.style.display = 'flex';
document.getElementById('closeTradeModalBtn').onclick = () => tradeModal.style.display = 'none';
document.getElementById('backBtn').onclick = () => window.location.href = '../home/home.html';

const qTrades = query(collection(db, "trades"), where("receiverId", "==", myId), where("status", "==", "pending"));

onSnapshot(qTrades, (snapshot) => {
    const badge = document.getElementById('notifBadge');
    badge.innerText = snapshot.size;
    badge.style.display = snapshot.size > 0 ? 'block' : 'none';

    const list = document.getElementById('requestsList');
    list.innerHTML = snapshot.empty ? '<p style="text-align:center; padding: 20px;">No tienes solicitudes pendientes.</p>' : '';

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
        list.appendChild(div);
    });
});

window.handleTrade = async (tradeId, action) => {
    const tradeRef = doc(db, "trades", tradeId);

    if (action === 'reject') {
        if (confirm("¿Rechazar esta solicitud de intercambio?")) {
            await updateDoc(tradeRef, { status: 'rejected' });
        }
        return;
    }

    if (!confirm("¿Aceptar intercambio? Se actualizarán automáticamente los álbumes de ambos.")) return;

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
        console.error(e);
        alert("Error al procesar el intercambio.");
    }
};

document.getElementById('doSearchBtn').onclick = async () => {
    const term = document.getElementById('searchInput').value.trim();
    if (!term) return;
    const resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = '<p>Buscando...</p>';
    try {
        const qUserName = query(collection(db, "users"), where("username", "==", term));
        const qEmail = query(collection(db, "users"), where("email", "==", term));
        const [snapName, snapEmail] = await Promise.all([getDocs(qUserName), getDocs(qEmail)]);
        resultsDiv.innerHTML = '';
        const foundUsers = new Map();
        snapName.forEach(d => foundUsers.set(d.id, d.data()));
        snapEmail.forEach(d => foundUsers.set(d.id, d.data()));
        if (foundUsers.size === 0) {
            resultsDiv.innerHTML = '<p>No se encontró a nadie.</p>';
            return;
        }
        foundUsers.forEach((data, id) => {
            if (id === myId) return;
            const div = document.createElement('div');
            div.className = 'result-item';
            div.innerHTML = `
                <span>${data.username}</span>
                <button class="add-btn" data-id="${id}" style="background:#7bad49; border:2px solid #000; color:white; font-weight:bold; cursor:pointer; padding:5px 10px;">AÑADIR</button>
            `;
            resultsDiv.appendChild(div);
        });
        document.querySelectorAll('.add-btn').forEach(btn => {
            btn.onclick = (e) => addFriendReciprocal(e.target.dataset.id, e.target);
        });
    } catch (err) {
        resultsDiv.innerHTML = '<p style="color:red">Error en la búsqueda.</p>';
    }
};

async function addFriendReciprocal(friendId, btn) {
    btn.innerText = '...'; btn.disabled = true;
    try {
        const myRef = doc(db, "users", myId);
        const friendRef = doc(db, "users", friendId);
        await Promise.all([
            updateDoc(myRef, { friends: arrayUnion(friendId) }),
            updateDoc(friendRef, { friends: arrayUnion(myId) })
        ]);
        btn.innerText = 'LISTO'; btn.style.background = '#ccc';
        loadFriends();
    } catch (e) { btn.innerText = 'ERROR'; btn.disabled = false; }
}

async function removeFriendReciprocal(friendId) {
    if (!confirm("¿Seguro que quieres eliminar a este amigo?")) return;
    try {
        const myRef = doc(db, "users", myId);
        const friendRef = doc(db, "users", friendId);
        await Promise.all([
            updateDoc(myRef, { friends: arrayRemove(friendId) }),
            updateDoc(friendRef, { friends: arrayRemove(myId) })
        ]);
        loadFriends();
    } catch (e) { alert("No se pudo eliminar al amigo."); }
}

const CACHE_KEY = `friends_cache_${myId}`;

function renderFriendsList(friendsData, grid) {
    grid.innerHTML = '';
    if (friendsData.length === 0) {
        grid.innerHTML = `<div class="empty-msg"><p>¡Estás muy solo!</p></div>`;
        return;
    }

    friendsData.forEach(friend => {
        const card = document.createElement('div');
        card.className = 'friend-card';
        card.innerHTML = `
            <div class="friend-avatar">${friend.name.charAt(0).toUpperCase()}</div>
            <div style="font-weight:900; text-transform:uppercase; margin-bottom:10px;">${friend.name}</div>
            <button class="swap-friend-btn" data-id="${friend.id}">Intercambiar</button>
            <button class="delete-friend-btn" data-id="${friend.id}">Eliminar</button>
        `;
        grid.appendChild(card);
    });

    document.querySelectorAll('.swap-friend-btn').forEach(btn => {
        btn.onclick = (e) => { window.location.href = `../swap/swap.html?friendId=${e.target.dataset.id}`; };
    });
    document.querySelectorAll('.delete-friend-btn').forEach(btn => {
        btn.onclick = (e) => removeFriendReciprocal(e.target.dataset.id);
    });
}

async function loadFriends() {
    const grid = document.getElementById('friendsGrid');
    const cachedFriends = localStorage.getItem(CACHE_KEY);
    
    if (cachedFriends) {
        renderFriendsList(JSON.parse(cachedFriends), grid);
    } else {
        grid.innerHTML = '<div class="empty-msg">Cargando amigos...</div>';
    }

    try {
        const myDoc = await getDoc(doc(db, "users", myId));
        if (myDoc.exists() && myDoc.data().friends && myDoc.data().friends.length > 0) {
            const ids = myDoc.data().friends;
            const friendsData = [];
            
            for (const id of ids) {
                const fDoc = await getDoc(doc(db, "users", id));
                if (fDoc.exists()) {
                    friendsData.push({ id: id, name: fDoc.data().username || 'Usuario' });
                }
            }
            
            localStorage.setItem(CACHE_KEY, JSON.stringify(friendsData));
            renderFriendsList(friendsData, grid);
            
        } else {
            localStorage.removeItem(CACHE_KEY);
            grid.innerHTML = `<div class="empty-msg"><p>¡Estás muy solo!</p></div>`;
        }
    } catch (error) { 
        if (!cachedFriends) {
            grid.innerHTML = '<div class="empty-msg">Error al cargar amigos</div>'; 
        }
    }
}

loadFriends();