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
  updateDoc,
  addDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// LOGIN WITH GOOGLE
const googleBtn = document.getElementById("googleLogin");

if (googleBtn) {
  googleBtn.onclick = async () => {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    await setDoc(
      doc(db, "users", user.uid),
      {
        name: user.displayName,
        email: user.email,
        photo: user.photoURL,
        online: true
      },
      { merge: true }
    );

    window.location.href = "chat.html";
  };
}

// GLOBALS
const usersList = document.getElementById("usersList");
const chatBox = document.getElementById("chatBox");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearChat");

let currentUser = null;
let chatID = null;
let currentChatUser = null;

// AUTH STATE
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  currentUser = user;

  await updateDoc(doc(db, "users", user.uid), { online: true });

  window.addEventListener("beforeunload", async () => {
    await updateDoc(doc(db, "users", user.uid), { online: false });
  });

  if (usersList) loadUsers();
});

// LOAD USERS LIST
async function loadUsers() {
  usersList.innerHTML = "";
  const snapshot = await getDocs(collection(db, "users"));

  snapshot.forEach((docu) => {
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

    div.onclick = () => openChat(docu.id, user.name);

    usersList.appendChild(div);

    listenUnread(docu.id);
  });
}

// OPEN CHAT
function openChat(uid, name) {
  document.getElementById("chatUser").innerText = name;

  currentChatUser = uid;
  chatID = [currentUser.uid, uid].sort().join("_");

  // Update last read timestamp
  setDoc(doc(db, "lastRead", chatID + "_" + currentUser.uid), {
    time: Date.now()
  });

  listenMessages();
  listenTyping();
}

// LISTEN TO MESSAGES
function listenMessages() {
  chatBox.innerHTML = "";

  const messagesQuery = query(
    collection(db, "chats", chatID, "messages"),
    orderBy("time", "asc")
  );

  onSnapshot(messagesQuery, async (snapshot) => {
    chatBox.innerHTML = ""; // clear DOM but messages remain in Firestore

    snapshot.forEach(async (docu) => {
      const msg = docu.data();

      const row = document.createElement("div");
      const bubble = document.createElement("div");

      if (msg.sender === currentUser.uid) bubble.className = "sender";
      else bubble.className = "receiver";

      if (msg.text) bubble.innerText = msg.text;

      if (msg.sender === currentUser.uid) {
        const tick = document.createElement("span");
        tick.className = "tick";
        tick.innerText = msg.seen ? "✔✔" : "✔";
        bubble.appendChild(tick);
      } else {
        // Mark as seen
        if (!msg.seen) {
          await updateDoc(
            doc(db, "chats", chatID, "messages", docu.id),
            { seen: true }
          );
        }
      }

      // Timestamp
      const time = document.createElement("div");
      time.className = "time";
      const date = new Date(msg.time);
      time.innerText =
        date.getHours() + ":" + String(date.getMinutes()).padStart(2, "0");
      bubble.appendChild(time);

      row.appendChild(bubble);
      chatBox.appendChild(row);
    });

    // Scroll to bottom
    chatBox.scrollTop = chatBox.scrollHeight;
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

  await setDoc(doc(db, "typing", chatID), { user: null });
  input.value = "";
}

if (sendBtn) sendBtn.onclick = sendMessage;

if (input) {
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  input.addEventListener("input", async () => {
    if (!chatID) return;
    await setDoc(doc(db, "typing", chatID), { user: currentUser.uid });
  });
}

// TYPING INDICATOR
function listenTyping() {
  const typingRef = doc(db, "typing", chatID);

  onSnapshot(typingRef, (snapshot) => {
    const data = snapshot.data();
    let typingDiv = document.getElementById("typingIndicator");

    if (!typingDiv) {
      typingDiv = document.createElement("div");
      typingDiv.id = "typingIndicator";
      typingDiv.style.fontSize = "12px";
      typingDiv.style.opacity = "0.7";
      document.querySelector(".chatArea").appendChild(typingDiv);
    }

    if (data && data.user && data.user !== currentUser.uid) typingDiv.innerText = "Typing...";
    else typingDiv.innerText = "";
  });
}

// UNREAD MESSAGE COUNTER
function listenUnread(uid) {
  const id = [currentUser.uid, uid].sort().join("_");

  const messagesQuery = query(
    collection(db, "chats", id, "messages"),
    orderBy("time", "asc")
  );

  onSnapshot(messagesQuery, async (snapshot) => {
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
  });
}

// CLEAR CHAT BUTTON
if (clearBtn) {
  clearBtn.onclick = async () => {
    if (!chatID) return;
    const confirmDelete = confirm("Clear all messages in this chat?");
    if (!confirmDelete) return;

    const messagesRef = collection(db, "chats", chatID, "messages");
    const snapshot = await getDocs(messagesRef);
    snapshot.forEach(async (docu) => {
      await deleteDoc(doc(db, "chats", chatID, "messages", docu.id));
    });
  };
}
