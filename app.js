import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDocs, addDoc, updateDoc, onSnapshot, query, orderBy, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// FIREBASE CONFIG
export const firebaseConfig = {
apiKey: "AIzaSyAxt94UyMn8AP8PFaSHPJ29JnZQ2KI3kZw",
authDomain: "chatgithub-e838d.firebaseapp.com",
projectId: "chatgithub-e838d",
storageBucket: "chatgithub-e838d.firebasestorage.app",
messagingSenderId: "755589384017",
appId: "1:755589384017:web:6af4c6d223d646cf36f570"
};

// INIT FIREBASE
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// DOM ELEMENTS
const googleBtn = document.getElementById("googleLogin");
const usersList = document.getElementById("usersList");
const chatBox = document.getElementById("chatBox");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearChat");

const emojiBtn = document.getElementById("emojiBtn");
const emojiPicker = document.getElementById("emojiPicker");

let currentUser = null;
let chatID = null;
let currentChatUser = null;

// EMOJI LIST
const emojis = [
"😀","😁","😂","🤣","😃","😄","😅","😊","😍","😘",
"😎","😢","😭","😡","🤔","🤯","🥳","👍","👎","👏",
"🙏","🔥","❤️","💔","💯","🎉","✨","🌟","🍕","🍔"
];

// DOM READY
document.addEventListener("DOMContentLoaded", () => {

// LOGIN BUTTON
// LOGIN BUTTON
if (googleBtn) {

  googleBtn.addEventListener("click", async () => {

    try {

      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      console.log("Logged in user:", user);

      await setDoc(doc(db, "users", user.uid), {
        name: user.displayName,
        email: user.email,
        photo: user.photoURL || "",
        online: true
      }, { merge: true });

      // redirect after login
      window.location.href = "chat.html";

    } catch (error) {

      console.error("Login Error:", error);
      alert(error.message);

    }

  });

}

// AUTH STATE
onAuthStateChanged(auth, async (user) => {

```
if (!user) return;

currentUser = user;

await updateDoc(doc(db, "users", user.uid), { online: true });

window.addEventListener("beforeunload", async () => {
  await updateDoc(doc(db, "users", user.uid), { online: false });
});

if (usersList) loadUsers();
```

});

// SEND MESSAGE
if (sendBtn) sendBtn.addEventListener("click", sendMessage);

if (input) {
input.addEventListener("keypress", (e) => {
if (e.key === "Enter") sendMessage();
});
}

// CLEAR CHAT
if (clearBtn) clearBtn.addEventListener("click", clearChat);

// EMOJI PICKER BUILD
if (emojiPicker) {

```
emojis.forEach(e => {

  const span = document.createElement("span");
  span.className = "emoji";
  span.innerText = e;

  span.onclick = () => {
    input.value += e;
    input.focus();
  };

  emojiPicker.appendChild(span);

});
```

}

// TOGGLE EMOJI PICKER
if (emojiBtn) {

```
emojiBtn.onclick = () => {

  emojiPicker.style.display =
    emojiPicker.style.display === "flex" ? "none" : "flex";

};
```

}

});

// LOAD USERS
async function loadUsers() {

usersList.innerHTML = "";

const snapshot = await getDocs(collection(db, "users"));

snapshot.forEach((docu) => {

```
if (docu.id === currentUser.uid) return;

const user = docu.data();

const div = document.createElement("div");
div.className = "userRow";

const img = document.createElement("img");
img.src = user.photo || "";
img.className = "avatar";

const name = document.createElement("span");
name.innerText = user.name;

const status = document.createElement("span");
status.innerText = user.online ? "🟢" : "⚫";

const unread = document.createElement("span");
unread.className = "unreadBadge";
unread.id = "unread_" + docu.id;

div.appendChild(img);
div.appendChild(name);
div.appendChild(status);
div.appendChild(unread);

div.addEventListener("click", () => openChat(docu.id, user.name));

usersList.appendChild(div);

listenUnread(docu.id);
```

});

}

// OPEN CHAT
function openChat(uid, name) {

document.getElementById("chatUser").innerText = name;

currentChatUser = uid;

chatID = [currentUser.uid, uid].sort().join("_");

setDoc(doc(db, "lastRead", chatID + "_" + currentUser.uid), {
time: Date.now()
});

listenMessages();

}

// LISTEN MESSAGES
function listenMessages() {

chatBox.innerHTML = "";

const messagesQuery = query(
collection(db, "chats", chatID, "messages"),
orderBy("time", "asc")
);

onSnapshot(messagesQuery, async (snapshot) => {

```
chatBox.innerHTML = "";

snapshot.forEach(async (docu) => {

  const msg = docu.data();

  const bubble = document.createElement("div");

  bubble.className =
    msg.sender === currentUser.uid ? "sender" : "receiver";

  bubble.innerText = msg.text;

  if (msg.sender === currentUser.uid) {

    const tick = document.createElement("span");
    tick.className = "tick";
    tick.innerText = msg.seen ? "✔✔" : "✔";

    bubble.appendChild(tick);

  } else if (!msg.seen) {

    await updateDoc(
      doc(db, "chats", chatID, "messages", docu.id),
      { seen: true }
    );

  }

  const time = document.createElement("div");
  time.className = "time";

  const date = new Date(msg.time);

  time.innerText =
    date.getHours() + ":" +
    String(date.getMinutes()).padStart(2, "0");

  bubble.appendChild(time);

  chatBox.appendChild(bubble);

});

chatBox.scrollTop = chatBox.scrollHeight;
```

});

}

// SEND MESSAGE
async function sendMessage() {

if (!input.value || !chatID) return;

await addDoc(collection(db, "chats", chatID, "messages"), {
text: input.value,
sender: currentUser.uid,
time: Date.now(),
seen: false
});

input.value = "";

}

// CLEAR CHAT
async function clearChat() {

if (!chatID) return;

const confirmDelete = confirm("Clear all messages in this chat?");
if (!confirmDelete) return;

const messagesRef = collection(db, "chats", chatID, "messages");

const snapshot = await getDocs(messagesRef);

snapshot.forEach(async (docu) => {
await deleteDoc(doc(db, "chats", chatID, "messages", docu.id));
});

}

// UNREAD MESSAGES
function listenUnread(uid) {

const id = [currentUser.uid, uid].sort().join("_");

const messagesQuery = query(
collection(db, "chats", id, "messages"),
orderBy("time", "asc")
);

onSnapshot(messagesQuery, async (snapshot) => {

```
const lastReadDoc = await getDoc(
  doc(db, "lastRead", id + "_" + currentUser.uid)
);

let lastRead = 0;

if (lastReadDoc.exists()) lastRead = lastReadDoc.data().time;

let count = 0;

snapshot.forEach((docu) => {

  const msg = docu.data();

  if (msg.sender === uid && msg.time > lastRead) count++;

});

const badge = document.getElementById("unread_" + uid);

if (badge) badge.innerText = count > 0 ? count : "";
```

});

}
