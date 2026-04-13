import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

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
const db = getFirestore();
const userId = localStorage.getItem('loggedInUserId');
const totalStickers = 980;
let userStickers = {};
let syncTimeout = null;
let currentFilter = 'all';

const tradeModal = document.getElementById('tradeModal');
const requestsList = document.getElementById('requestsList');
const notifBadge = document.getElementById('notifBadge');

document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = '/home/home.html';
});

document.getElementById('notifBtn').onclick = () => tradeModal.style.display = 'flex';
document.getElementById('closeTradeModalBtn').onclick = () => tradeModal.style.display = 'none';

const qTrades = query(collection(db, "trades"), where("receiverId", "==", userId), where("status", "==", "pending"));

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
        const myAlbumRef = doc(db, "albums", userId);
        const friendAlbumRef = doc(db, "albums", trade.senderId);

        const [myAlb, frAlb] = await Promise.all([getDoc(myAlbumRef), getDoc(friendAlbumRef)]);
        let myStickersData = myAlb.data().stickers;
        let frStickersData = frAlb.data().stickers;

        trade.give.forEach(id => {
            frStickersData[id] = (frStickersData[id] || 0) - 1;
            myStickersData[id] = (myStickersData[id] || 0) + 1;
        });

        trade.receive.forEach(id => {
            myStickersData[id] = (myStickersData[id] || 0) - 1;
            frStickersData[id] = (frStickersData[id] || 0) + 1;
        });

        await Promise.all([
            updateDoc(myAlbumRef, { stickers: myStickersData }),
            updateDoc(friendAlbumRef, { stickers: frStickersData }),
            updateDoc(tradeRef, { status: 'accepted' })
        ]);
        
        userStickers = myStickersData;
        renderGrid();
        alert("¡Intercambio completado!");
    } catch (e) {
        alert("Error al procesar el intercambio.");
    }
};

async function loadAlbum() {
    const docRef = doc(db, "albums", userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        userStickers = docSnap.data().stickers || {};
    }
    renderGrid();
}

function updateCounters() {
    const collected = Object.keys(userStickers).length;
    document.getElementById('ownedCount').innerText = collected;
    document.getElementById('missingCount').innerText = totalStickers - collected;
}

function renderGrid() {
    const grid = document.getElementById('stickerGrid');
    grid.innerHTML = '';
    const fragment = document.createDocumentFragment();

    for (let i = 1; i <= totalStickers; i++) {
        const stickerId = i.toString();
        const count = userStickers[stickerId] || 0;

        const div = document.createElement('div');
        div.className = 'sticker';
        div.id = `sticker-${stickerId}`;

        if (count > 0) div.classList.add('owned');
        div.innerText = stickerId;

        if (count > 1) {
            const badge = document.createElement('div');
            badge.className = 'sticker-badge';
            badge.innerText = `x${count}`;
            div.appendChild(badge);
        }

        div.addEventListener('click', () => updateSticker(stickerId));
        fragment.appendChild(div);
    }

    grid.appendChild(fragment);
    updateCounters();
    applyFilter(currentFilter);
}

function updateVisibility(div, count) {
    if (currentFilter === 'missing' && count > 0) {
        div.style.display = 'none';
    } else if (currentFilter === 'extras' && count <= 1) {
        div.style.display = 'none';
    } else if (currentFilter === 'owned' && count === 0) {
        div.style.display = 'none';
    } else {
        div.style.display = 'flex';
    }
}

function applyFilter(filter) {
    currentFilter = filter;

    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if (filter === 'all') document.getElementById('filterAll').classList.add('active');
    if (filter === 'owned') document.getElementById('filterOwned').classList.add('active');
    if (filter === 'missing') document.getElementById('filterMissing').classList.add('active');
    if (filter === 'extras') document.getElementById('filterExtras').classList.add('active');

    for (let i = 1; i <= totalStickers; i++) {
        const stickerId = i.toString();
        const count = userStickers[stickerId] || 0;
        const div = document.getElementById(`sticker-${stickerId}`);
        if (div) updateVisibility(div, count);
    }
}

document.getElementById('filterAll').addEventListener('click', () => applyFilter('all'));
document.getElementById('filterOwned').addEventListener('click', () => applyFilter('owned'));
document.getElementById('filterMissing').addEventListener('click', () => applyFilter('missing'));
document.getElementById('filterExtras').addEventListener('click', () => applyFilter('extras'));

function updateStickerUI(stickerId, count) {
    const div = document.getElementById(`sticker-${stickerId}`);
    if (!div) return;

    if (count > 0) {
        div.classList.add('owned');
    } else {
        div.classList.remove('owned');
    }

    // Cambia el selector aquí también
    let badge = div.querySelector('.sticker-badge'); 
    if (count > 1) {
        if (!badge) {
            badge = document.createElement('div');
            badge.className = 'sticker-badge'; // Cambiado
            div.appendChild(badge);
        }
        badge.innerText = `x${count}`;
    } else if (badge) {
        badge.remove();
    }

    updateVisibility(div, count);
}

function queueSync() {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        const docRef = doc(db, "albums", userId);
        setDoc(docRef, { stickers: userStickers });
    }, 1000);
}

async function updateSticker(stickerId) {
    const currentCount = userStickers[stickerId] || 0;
    const newCount = currentCount + 1;
    userStickers[stickerId] = newCount;

    updateStickerUI(stickerId, newCount);
    updateCounters();
    queueSync();
}

async function removeSticker(stickerId) {
    const currentCount = userStickers[stickerId] || 0;
    if (currentCount <= 0) return;

    const newCount = currentCount - 1;
    if (newCount === 0) {
        delete userStickers[stickerId];
    } else {
        userStickers[stickerId] = newCount;
    }

    updateStickerUI(stickerId, newCount);
    updateCounters();
    queueSync();
}

const searchInput = document.getElementById('searchInput');

searchInput.addEventListener('input', (e) => {
    const value = e.target.value;

    for (let i = 1; i <= totalStickers; i++) {
        const stickerId = i.toString();
        const div = document.getElementById(`sticker-${stickerId}`);

        if (!div) continue;

        if (value === "") {
            const count = userStickers[stickerId] || 0;
            updateVisibility(div, count);
        } else {
            if (stickerId === value) {
                div.style.display = 'flex';
            } else {
                div.style.display = 'none';
            }
        }
    }
});

const quickAddInput = document.getElementById('quickAddInput');
const quickAddBtn = document.getElementById('quickAddBtn');

function handleQuickAdd() {
    const num = quickAddInput.value;
    if (num >= 1 && num <= totalStickers) {
        updateSticker(num.toString());
        quickAddInput.value = '';
        quickAddInput.focus();
    }
}

quickAddBtn.addEventListener('click', handleQuickAdd);
quickAddInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleQuickAdd();
});

const quickRemoveInput = document.getElementById('quickRemoveInput');
const quickRemoveBtn = document.getElementById('quickRemoveBtn');

function handleQuickRemove() {
    const num = quickRemoveInput.value;
    if (num >= 1 && num <= totalStickers) {
        removeSticker(num.toString());
        quickRemoveInput.value = '';
        quickRemoveInput.focus();
    }
}

quickRemoveBtn.addEventListener('click', handleQuickRemove);
quickRemoveInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleQuickRemove();
});

const topBtn = document.getElementById("scrollToTopBtn");

window.onscroll = function () {
    if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
        topBtn.style.display = "block";
    } else {
        topBtn.style.display = "none";
    }
};

topBtn.addEventListener("click", () => {
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});

loadAlbum();