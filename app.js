// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDocs, addDoc, updateDoc, onSnapshot, query, orderBy, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// GLOBALS
const googleBtn = document.getElementById("googleLogin");
const usersList = document.getElementById("usersList");
const chatBox = document.getElementById("chatBox");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearChat");

let currentUser = null;
let chatID = null;
let currentChatUser = null;

// ENSURE DOM IS LOADED BEFORE ATTACHING EVENT
document.addEventListener("DOMContentLoaded", () => {
  // LOGIN BUTTON
  if (googleBtn) {
    googleBtn.addEventListener("click", async () => {
      try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Save user in Firestore
        await setDoc(doc(db, "users", user.uid), {
          name: user.displayName,
          email: user.email,
          photo: user.photoURL || "",
          online: true
        }, { merge: true });

        // Redirect to chat page
        window.location.href = "chat.html";
      } catch (error) {
        console.error("Google sign-in error:", error);
        alert("Login failed. Please try again.");
      }
    });
  }

  // AUTH STATE CHANGE
  onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    currentUser = user;

    // Mark user online
    await updateDoc(doc(db, "users", user.uid), { online: true });

    // Handle user going offline
    window.addEventListener("beforeunload", async () => {
      await updateDoc(doc(db, "users", user.uid), { online: false });
    });

    if (usersList) loadUsers();
  });

  // SEND MESSAGE
  if (sendBtn) {
    sendBtn.addEventListener("click", sendMessage);
  }

  if (input) {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendMessage();
    });
  }

  // CLEAR CHAT
  if (clearBtn) {
    clearBtn.addEventListener("click", clearChat);
  }
});

// ===== FUNCTIONS =====
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

    div.addEventListener("click", () => openChat(docu.id, user.name));

    usersList.appendChild(div);
    listenUnread(docu.id);
  });
}

function openChat(uid, name) {
  document.getElementById("chatUser").innerText = name;
  currentChatUser = uid;
  chatID = [currentUser.uid, uid].sort().join("_");

  // Update last read
  setDoc(doc(db, "lastRead", chatID + "_" + currentUser.uid), { time: Date.now() });

  listenMessages();
  listenTyping();
}

function listenMessages() {
  chatBox.innerHTML = "";
  const messagesQuery = query(collection(db, "chats", chatID, "messages"), orderBy("time", "asc"));

  onSnapshot(messagesQuery, async (snapshot) => {
    chatBox.innerHTML = "";
    snapshot.forEach(async (docu) => {
      const msg = docu.data();
      const row = document.createElement("div");
      const bubble = document.createElement("div");
      bubble.className = msg.sender === currentUser.uid ? "sender" : "receiver";
      if (msg.text) bubble.innerText = msg.text;

      // Seen ticks
      if (msg.sender === currentUser.uid) {
        const tick = document.createElement("span");
        tick.className = "tick";
        tick.innerText = msg.seen ? "✔✔" : "✔";
        bubble.appendChild(tick);
      } else {
        if (!msg.seen) {
          await updateDoc(doc(db, "chats", chatID, "messages", docu.id), { seen: true });
        }
      }

      // Timestamp
      const time = document.createElement("div");
      time.className = "time";
      const date = new Date(msg.time);
      time.innerText = date.getHours() + ":" + String(date.getMinutes()).padStart(2, "0");
      bubble.appendChild(time);

      row.appendChild(bubble);
      chatBox.appendChild(row);
    });

    chatBox.scrollTop = chatBox.scrollHeight;
  });
}

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
    typingDiv.innerText = data && data.user && data.user !== currentUser.uid ? "Typing..." : "";
  });
}

function listenUnread(uid) {
  const id = [currentUser.uid, uid].sort().join("_");
  const messagesQuery = query(collection(db, "chats", id, "messages"), orderBy("time", "asc"));

  onSnapshot(messagesQuery, async (snapshot) => {
    const lastReadDoc = await getDoc(doc(db, "lastRead", id + "_" + currentUser.uid));
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
