import { auth, provider, db } from "./firebase.js";

import {
signInWithPopup,
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

import {
collection,
getDocs,
doc,
setDoc,
addDoc,
onSnapshot,
query,
orderBy
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const googleBtn = document.getElementById("googleLogin");

if (googleBtn) {
googleBtn.onclick = async () => {

const result = await signInWithPopup(auth, provider);
const user = result.user;

await setDoc(doc(db, "users", user.uid), {
name: user.displayName,
email: user.email
});

window.location.href = "chat.html";

};
}

const usersList = document.getElementById("usersList");
const chatBox = document.getElementById("chatBox");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

let currentUser = null;
let chatID = null;

onAuthStateChanged(auth, async (user) => {

if (!user) return;

currentUser = user;

if (usersList) {
loadUsers();
}

});

async function loadUsers() {

usersList.innerHTML = "";

const snapshot = await getDocs(collection(db, "users"));

snapshot.forEach((docu) => {

if (docu.id === currentUser.uid) return;

const user = docu.data();

const div = document.createElement("div");
div.innerText = user.name;

div.onclick = () => openChat(docu.id, user.name);

usersList.appendChild(div);

});

}

function openChat(uid, name) {

document.getElementById("chatUser").innerText = name;

chatID = [currentUser.uid, uid].sort().join("_");

listenMessages();

}

function listenMessages() {

chatBox.innerHTML = "";

const messagesQuery = query(
collection(db, "chats", chatID, "messages"),
orderBy("time", "asc")
);

onSnapshot(messagesQuery, (snapshot) => {

chatBox.innerHTML = "";

snapshot.forEach((docu) => {

const msg = docu.data();

const bubble = document.createElement("div");

if (msg.sender === currentUser.uid) {
bubble.className = "sender";
} else {
bubble.className = "receiver";
}

bubble.innerText = msg.text;

chatBox.appendChild(bubble);

});

chatBox.scrollTop = chatBox.scrollHeight;

});

}

async function sendMessage() {

if (!input.value || !chatID) return;

await addDoc(collection(db, "chats", chatID, "messages"), {
text: input.value,
sender: currentUser.uid,
time: Date.now()
});

input.value = "";

}

if (sendBtn) {
sendBtn.onclick = sendMessage;
}

if (input) {
input.addEventListener("keypress", (e) => {

if (e.key === "Enter") {
sendMessage();
}

});
}
