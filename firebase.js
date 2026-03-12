// Replace with your Firebase config
export const firebaseConfig = {
  apiKey: "AIzaSyAxt94UyMn8AP8PFaSHPJ29JnZQ2KI3kZw",
  authDomain: "chatgithub-e838d.firebaseapp.com",
  projectId: "chatgithub-e838d",
  storageBucket: "chatgithub-e838d.firebasestorage.app",
  messagingSenderId: "755589384017",
  appId: "1:755589384017:web:6af4c6d223d646cf36f570"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
