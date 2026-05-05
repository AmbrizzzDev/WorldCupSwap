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
const storageKey = `stickers_${userId}`;

const countryNames = {
    "FWC": "FIFA World Cup", "MEX": "México", "RSA": "Sudáfrica", "KOR": "Corea del Sur", 
    "CZE": "Rep. Checa", "CAN": "Canadá", "BIH": "Bosnia", "QAT": "Qatar", "SUI": "Suiza", 
    "BRA": "Brasil", "MAR": "Marruecos", "HAI": "Haití", "SCO": "Escocia", "USA": "Estados Unidos", 
    "PAR": "Paraguay", "AUS": "Australia", "TUR": "Turquía", "GER": "Alemania", "CUW": "Curazao", 
    "CIV": "Costa de Marfil", "ECU": "Ecuador", "NED": "Países Bajos", "JPN": "Japón", "SWE": "Suecia", 
    "TUN": "Túnez", "BEL": "Bélgica", "EGY": "Egipto", "IRN": "Irán", "NZL": "Nueva Zelanda", 
    "ESP": "España", "CPV": "Cabo Verde", "KSA": "Arabia Saudita", "URU": "Uruguay", "FRA": "Francia", 
    "SEN": "Senegal", "IRQ": "Irak", "NOR": "Noruega", "ARG": "Argentina", "ALG": "Argelia", 
    "AUT": "Austria", "JOR": "Jordania", "POR": "Portugal", "COD": "RD Congo", "UZB": "Uzbekistán", 
    "COL": "Colombia", "ENG": "Inglaterra", "CRO": "Croacia", "GHA": "Ghana", "PAN": "Panamá", "CC": "Coca-Cola Collection"
};
const teams = ["MEX ", "RSA ", "KOR ", "CZE ", "CAN ", "BIH ", "QAT ", "SUI ", "BRA ", "MAR ", "HAI ", "SCO ", "USA ", "PAR ", "AUS ", "TUR ", "GER ", "CUW ", "CIV ", "ECU ", "NED ", "JPN ", "SWE ", "TUN ", "CC","BEL ", "EGY ", "IRN ", "NZL ", "ESP ", "CPV ", "KSA ", "URU ", "FRA ", "SEN ", "IRQ ", "NOR ", "ARG ", "ALG ", "AUT ", "JOR ", "POR ", "COD ", "UZB ", "COL ", "ENG ", "CRO ", "GHA ", "PAN "];
const pages = ["FWC", ...teams];
let currentPageIndex = 0;

const stickerIds = [];

pages.forEach(page => {
    if (page === "CC") {
        for (let i = 1; i <= 14; i++) {
            stickerIds.push(`${page}${i}`);
        }
    } else if (page === "FWC") {
        stickerIds.push("00");
        for (let i = 1; i <= 19; i++) {
            stickerIds.push(`${page}${i}`);
        }
    } else {
        for (let i = 1; i <= 20; i++) {
            stickerIds.push(`${page}${i}`);
        }
    }
});

const totalStickers = stickerIds.length;
let userStickers = {};
let syncTimeout = null;
let currentFilter = 'all';

const tradeModal = document.getElementById('tradeModal');
const requestsList = document.getElementById('requestsList');
const notifBadge = document.getElementById('notifBadge');
const pageTitle = document.getElementById('pageTitle');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');

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
        localStorage.setItem(storageKey, JSON.stringify(userStickers));
        renderGrid();
        alert("¡Intercambio completado!");
    } catch (e) {
        alert("Error al procesar el intercambio.");
    }
};

async function loadAlbum() {
    const cached = localStorage.getItem(storageKey);
    if (cached) {
        userStickers = JSON.parse(cached);
        renderGrid();
    } else {
        renderGrid();
    }

    const docRef = doc(db, "albums", userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const remoteStickers = docSnap.data().stickers || {};
        if (JSON.stringify(remoteStickers) !== JSON.stringify(userStickers)) {
            userStickers = remoteStickers;
            localStorage.setItem(storageKey, JSON.stringify(userStickers));
            renderGrid();
        }
    }
}

function updateCounters() {
    const collected = Object.keys(userStickers).length;
    let duplicates = 0;
    
    for (const key in userStickers) {
        if (userStickers[key] > 1) {
            duplicates += (userStickers[key] - 1);
        }
    }
    
    document.getElementById('ownedCount').innerText = collected;
    document.getElementById('missingCount').innerText = totalStickers - collected;
    document.getElementById('duplicatesCount').innerText = duplicates;
}

function updatePaginationUI() {
    const teamCode = pages[currentPageIndex].trim();
    const fullName = countryNames[teamCode] || teamCode;

    if (teamCode === "FWC" || teamCode === "CC") {
        pageTitle.innerHTML = fullName;
    } else {
        pageTitle.innerHTML = `<img src="https://api.fifa.com/api/v3/picture/flags-sq-4/${teamCode}" class="team-flag"> ${fullName}`;
    }

    prevPageBtn.disabled = currentPageIndex === 0;
    nextPageBtn.disabled = currentPageIndex === pages.length - 1;
    
    prevPageBtn.style.opacity = currentPageIndex === 0 ? '0.5' : '1';
    nextPageBtn.style.opacity = currentPageIndex === pages.length - 1 ? '0.5' : '1';
}

prevPageBtn.addEventListener('click', () => {
    if (currentPageIndex > 0) {
        currentPageIndex--;
        renderGrid();
    }
});

nextPageBtn.addEventListener('click', () => {
    if (currentPageIndex < pages.length - 1) {
        currentPageIndex++;
        renderGrid();
    }
});

function renderGrid() {
    const grid = document.getElementById('stickerGrid');
    grid.innerHTML = '';
    const fragment = document.createDocumentFragment();

    let stickersToRender = [];

    if (currentFilter === 'all') {
        const currentPagePrefix = pages[currentPageIndex];
        stickersToRender = stickerIds.filter(id => {
            if (currentPagePrefix === "FWC" && id === "00") return true;
            return id.startsWith(currentPagePrefix);
        });
        document.querySelector('.pagination').style.display = 'flex';
    } else {
        document.querySelector('.pagination').style.display = 'none';
        stickersToRender = stickerIds.filter(id => {
            const count = userStickers[id] || 0;
            if (currentFilter === 'missing') return count === 0;
            if (currentFilter === 'owned') return count > 0;
            if (currentFilter === 'extras') return count > 1;
            return true;
        });
    }

    stickersToRender.forEach(stickerId => {
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
    });

    grid.appendChild(fragment);
    
    if (currentFilter === 'all') {
        updatePaginationUI();
    }
    updateCounters();
}

function applyFilter(filter) {
    currentFilter = filter;

    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if (filter === 'all') document.getElementById('filterAll').classList.add('active');
    if (filter === 'owned') document.getElementById('filterOwned').classList.add('active');
    if (filter === 'missing') document.getElementById('filterMissing').classList.add('active');
    if (filter === 'extras') document.getElementById('filterExtras').classList.add('active');

    const downloadBtn = document.getElementById('downloadBtn');
    if (filter === 'all') {
        downloadBtn.style.display = 'none';
    } else {
        downloadBtn.style.display = 'inline-block';
    }

    renderGrid();
}

document.getElementById('filterAll').addEventListener('click', () => applyFilter('all'));
document.getElementById('filterOwned').addEventListener('click', () => applyFilter('owned'));
document.getElementById('filterMissing').addEventListener('click', () => applyFilter('missing'));
document.getElementById('filterExtras').addEventListener('click', () => applyFilter('extras'));

document.getElementById('downloadBtn').addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    let items = [];
    stickerIds.forEach(id => {
        const count = userStickers[id] || 0;
        
        if (currentFilter === 'missing' && count === 0) {
            items.push(id);
        }
        
        if (currentFilter === 'owned' && count > 0) {
            if (count === 1) {
                items.push(id);
            } else {
                items.push(`${id} (x${count})`);
            }
        }
        
        if (currentFilter === 'extras' && count > 1) {
            const extraCount = count - 1;
            if (extraCount === 1) {
                items.push(id);
            } else {
                items.push(`${id} (x${extraCount})`);
            }
        }
    });

    const columnas = 8;
    let tableData = [];
    for (let i = 0; i < items.length; i += columnas) {
        let fila = items.slice(i, i + columnas);
        while (fila.length < columnas) fila.push(""); 
        tableData.push(fila);
    }

    const titulos = {
        'owned': 'Estampas Obtenidas',
        'missing': 'Estampas Faltantes',
        'extras': 'Estampas Sobrantes'
    };

    doc.setFontSize(16);
    doc.text(titulos[currentFilter] || 'Lista de Estampas', 14, 15);

    doc.autoTable({
        startY: 20,
        body: tableData,
        theme: 'grid',
        styles: { halign: 'center', valign: 'middle', fontSize: 9, minCellHeight: 12 },
        margin: { left: 10, right: 10 }
    });
    
    doc.save(`WorldCupSwap_${currentFilter}.pdf`);
});

function updateStickerUI(stickerId, count) {
    renderGrid();
}

function queueSync() {
    localStorage.setItem(storageKey, JSON.stringify(userStickers));
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
    const value = e.target.value.trim().toUpperCase();

    if (currentFilter === 'all') {
        if (value === "") {
            currentPageIndex = 0;
            renderGrid();
            return;
        }

        const matchedSticker = stickerIds.find(id => id.includes(value));
        if (matchedSticker) {
            let prefix;
            if (matchedSticker === "00") {
                prefix = "FWC";
            } else {
                prefix = matchedSticker.replace(/[0-9]/g, '');
            }
            const index = pages.indexOf(prefix);
            
            if (index !== -1 && currentPageIndex !== index) {
                currentPageIndex = index;
                renderGrid();
            }
        }

        const currentPagePrefix = pages[currentPageIndex];
        const stickersInThisPage = stickerIds.filter(id => {
            if (currentPagePrefix === "FWC" && id === "00") return true;
            return id.startsWith(currentPagePrefix);
        });

        stickersInThisPage.forEach(stickerId => {
            const div = document.getElementById(`sticker-${stickerId}`);
            if (!div) return;

            if (stickerId.includes(value)) {
                div.style.display = 'flex';
            } else {
                div.style.display = 'none';
            }
        });
    } else {
        document.querySelectorAll('.sticker').forEach(div => {
            if (div.id.replace('sticker-', '').includes(value)) {
                div.style.display = 'flex';
            } else {
                div.style.display = 'none';
            }
        });
    }
});

const quickAddInput = document.getElementById('quickAddInput');
const quickAddBtn = document.getElementById('quickAddBtn');

function handleQuickAdd() {
    let val = quickAddInput.value.trim().toUpperCase();
    if (stickerIds.includes(val)) {
        updateSticker(val);
        quickAddInput.value = '';
        quickAddInput.focus();
        return;
    }
    if (/^\d+$/.test(val)) {
        val = `${pages[currentPageIndex]}${val}`;
    }
    if (stickerIds.includes(val)) {
        updateSticker(val);
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
    let val = quickRemoveInput.value.trim().toUpperCase();
    if (stickerIds.includes(val)) {
        removeSticker(val);
        quickRemoveInput.value = '';
        quickRemoveInput.focus();
        return;
    }
    if (/^\d+$/.test(val)) {
        val = `${pages[currentPageIndex]}${val}`;
    }
    if (stickerIds.includes(val)) {
        removeSticker(val);
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

const tutorialSteps = [
    { 
        img: "/images/Frame 1.png", 
        text: "<b>Navega entre países:</b> Usa las flechas laterales para cambiar de selección rápidamente." 
    },
    { 
        img: "/images/Frame 2.png", 
        text: "<b>Búsqueda inteligente:</b> Busca por código completo(Ej:<b>MEX 1</b>) o escribe solo el <b>número</b> si ya estás en la página del país." 
    },
    { 
        img: "/images/Frame 3.png", 
        text: "<b>Añade estampas:</b> Haz clic en la tarjeta o usa el recuadro <b>'Agregar'</b> (acepta código o solo el número)." 
    },
    { 
        img: "/images/Frame 4.png", 
        text: "<b>Gestiona repetidas:</b> Usa el recuadro <b>'Quitar'</b> para eliminar sobrantes usando el código o el número." 
    }
];

let currentTutorialStep = 0;

function updateTutorialUI() {
    const modal = document.getElementById('tutorialModal');
    const title = document.getElementById('tutorialTitle');
    const image = document.getElementById('tutorialImage');
    const text = document.getElementById('tutorialText');
    const prevBtn = document.getElementById('prevTutorialBtn');
    const nextBtn = document.getElementById('nextTutorialBtn');
    const finishBtn = document.getElementById('closeTutorialBtn');

    title.innerText = `Paso ${currentTutorialStep + 1} de ${tutorialSteps.length}`;
    image.src = tutorialSteps[currentTutorialStep].img;
    text.innerHTML = tutorialSteps[currentTutorialStep].text;

    prevBtn.disabled = currentTutorialStep === 0;

    if (currentTutorialStep === tutorialSteps.length - 1) {
        nextBtn.style.display = 'none';
        finishBtn.style.display = 'block';
    } else {
        nextBtn.style.display = 'block';
        finishBtn.style.display = 'none';
    }
}

function showTutorial() {
    const tutorialKey = `tutorial_seen_${userId}`;
    const modal = document.getElementById('tutorialModal');

    if (!localStorage.getItem(tutorialKey)) {
        modal.style.display = 'flex';
        updateTutorialUI();

        document.getElementById('prevTutorialBtn').onclick = () => {
            if (currentTutorialStep > 0) {
                currentTutorialStep--;
                updateTutorialUI();
            }
        };

        document.getElementById('nextTutorialBtn').onclick = () => {
            if (currentTutorialStep < tutorialSteps.length - 1) {
                currentTutorialStep++;
                updateTutorialUI();
            }
        };

        document.getElementById('closeTutorialBtn').onclick = () => {
            modal.style.display = 'none';
            localStorage.setItem(tutorialKey, 'true');
        };
    }
}

showTutorial();