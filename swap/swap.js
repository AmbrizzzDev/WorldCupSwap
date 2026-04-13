import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getFirestore, doc, getDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBvQZbiFjhjWJXRxbhiP_dwdtbcAHU9qLg",
    authDomain: "worldcupswap.firebaseapp.com",
    projectId: "worldcupswap",
    storageBucket: "worldcupswap.firebasestorage.app",
    messagingSenderId: "990985355951",
    appId: "1:990985355951:web:0942dd293e529f1ab14a5a",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore();
const myId = localStorage.getItem("loggedInUserId");
const urlParams = new URLSearchParams(window.location.search);
const friendId = urlParams.get("friendId");

if (!myId || !friendId) window.location.replace("/friends/friends.html");

let myStickers = {};
let friendStickers = {};
let selectedGive = new Set();
let selectedReceive = new Set();
let giveFilter = "match";
let receiveFilter = "match";
let currentSearch = "";

document.getElementById("backBtn").onclick = () =>
    (window.location.href = "/friends/friends.html");

const tradeBtn = document.getElementById("confirmTradeBtn");
tradeBtn.innerText = "SOLICITAR INTERCAMBIO";

async function loadSwapData() {
    const [mySnap, friendSnap] = await Promise.all([
        getDoc(doc(db, "albums", myId)),
        getDoc(doc(db, "albums", friendId)),
    ]);

    if (mySnap.exists()) myStickers = mySnap.data().stickers || {};
    if (friendSnap.exists()) friendStickers = friendSnap.data().stickers || {};

    renderGrids();
}

function renderGrids() {
    const giveGrid = document.getElementById("giveGrid");
    const receiveGrid = document.getElementById("receiveGrid");
    giveGrid.innerHTML = "";
    receiveGrid.innerHTML = "";

    for (let i = 1; i <= 980; i++) {
        const sId = i.toString();
        if (currentSearch && sId !== currentSearch) continue;

        const myCount = myStickers[sId] || 0;
        const friendCount = friendStickers[sId] || 0;

        let canGive = false;
        if (giveFilter === "match") canGive = myCount > 1 && friendCount === 0;
        else if (giveFilter === "allDups") canGive = myCount > 1;
        else if (giveFilter === "obtained") canGive = myCount >= 1;

        let canReceive = false;
        if (receiveFilter === "match")
            canReceive = friendCount > 1 && myCount === 0;
        else if (receiveFilter === "allDups") canReceive = friendCount > 1;
        else if (receiveFilter === "obtained") canReceive = friendCount >= 1;

        if (canGive)
            giveGrid.appendChild(createStickerEl(sId, "give", selectedGive.has(sId)));
        if (canReceive)
            receiveGrid.appendChild(
                createStickerEl(sId, "receive", selectedReceive.has(sId)),
            );
    }
}

function createStickerEl(id, type, isSelected) {
    const el = document.createElement("div");
    el.className = `sticker ${isSelected ? (type === "give" ? "selected-give" : "selected-receive") : ""}`;
    el.innerText = id;
    el.onclick = () => {
        if (type === "give") {
            selectedGive.has(id) ? selectedGive.delete(id) : selectedGive.add(id);
        } else {
            selectedReceive.has(id)
                ? selectedReceive.delete(id)
                : selectedReceive.add(id);
        }
        renderGrids();
        tradeBtn.disabled = selectedGive.size === 0 && selectedReceive.size === 0;
    };
    return el;
}

document.getElementById("giveFilterMatch").onclick = () => {
    giveFilter = "match";
    updateFiltersUI();
};
document.getElementById("giveFilterAll").onclick = () => {
    giveFilter = "allDups";
    updateFiltersUI();
};
document.getElementById("giveFilterObtained").onclick = () => {
    giveFilter = "obtained";
    updateFiltersUI();
};
document.getElementById("receiveFilterMatch").onclick = () => {
    receiveFilter = "match";
    updateFiltersUI();
};
document.getElementById("receiveFilterAll").onclick = () => {
    receiveFilter = "allDups";
    updateFiltersUI();
};
document.getElementById("receiveFilterObtained").onclick = () => {
    receiveFilter = "obtained";
    updateFiltersUI();
};

function updateFiltersUI() {
    document
        .querySelectorAll(".filter-btn")
        .forEach((btn) => btn.classList.remove("active"));
    document
        .getElementById(
            `giveFilter${giveFilter === "match" ? "Match" : giveFilter === "allDups" ? "All" : "Obtained"}`,
        )
        .classList.add("active");
    document
        .getElementById(
            `receiveFilter${receiveFilter === "match" ? "Match" : receiveFilter === "allDups" ? "All" : "Obtained"}`,
        )
        .classList.add("active");
    renderGrids();
}

document.getElementById("swapSearchInput").oninput = (e) => {
    currentSearch = e.target.value.trim();
    renderGrids();
};

tradeBtn.onclick = async () => {
    if (!confirm("¿Enviar esta solicitud de intercambio a tu amigo?")) return;
    tradeBtn.innerText = "ENVIANDO...";
    tradeBtn.disabled = true;

    try {
        await addDoc(collection(db, "trades"), {
            senderId: myId,
            receiverId: friendId,
            give: Array.from(selectedGive),
            receive: Array.from(selectedReceive),
            status: "pending",
            timestamp: new Date(),
        });

        alert(
            "¡Solicitud enviada! Avisa a tu amigo para que la revise en su sección de amigos.",
        );
        window.location.href = "../friends/friends.html";
    } catch (e) {
        console.error(e);
        alert("Error al enviar la solicitud.");
        tradeBtn.innerText = "SOLICITAR INTERCAMBIO";
        tradeBtn.disabled = false;
    }
};

loadSwapData();