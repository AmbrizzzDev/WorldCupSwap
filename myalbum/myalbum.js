import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

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

document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = '/home/index.html';
});

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
            badge.className = 'badge';
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

    let badge = div.querySelector('.badge');
    if (count > 1) {
        if (!badge) {
            badge = document.createElement('div');
            badge.className = 'badge';
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
let searchTimeout = null;

searchInput.addEventListener('input', (e) => {
    const num = e.target.value;
    document.querySelectorAll('.sticker.highlight').forEach(el => el.classList.remove('highlight'));

    if (searchTimeout) clearTimeout(searchTimeout);

    searchTimeout = setTimeout(() => {
        if (num >= 1 && num <= totalStickers) {
            const el = document.getElementById(`sticker-${num}`);
            if (el) {
                if (el.style.display === 'none') {
                    applyFilter('all');
                }
                el.classList.add('highlight');
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, 400);
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

loadAlbum();