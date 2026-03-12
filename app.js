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
where
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";


const googleBtn = document.getElementById("googleLogin");

if (googleBtn) {

googleBtn.onclick = async () => {

const result = await signInWithPopup(auth, provider);
const user = result.user;

await setDoc(doc(db,"users",user.uid),{
name:user.displayName,
email:user.email,
online:true
},{merge:true});

window.location.href="chat.html";

};

}


const usersList = document.getElementById("usersList");
const chatBox = document.getElementById("chatBox");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

let currentUser=null;
let chatID=null;
let currentChatUser=null;



onAuthStateChanged(auth, async(user)=>{

if(!user) return;

currentUser=user;

await updateDoc(doc(db,"users",user.uid),{
online:true
});

window.addEventListener("beforeunload", async ()=>{
await updateDoc(doc(db,"users",user.uid),{
online:false
});
});

if(usersList){
loadUsers();
}

});



async function loadUsers(){

usersList.innerHTML="";

const snapshot = await getDocs(collection(db,"users"));

snapshot.forEach((docu)=>{

if(docu.id===currentUser.uid) return;

const user=docu.data();

const div=document.createElement("div");

div.style.display="flex";
div.style.justifyContent="space-between";

const name=document.createElement("span");
name.innerText=user.name;

const status=document.createElement("span");
status.innerText=user.online?"🟢":"⚫";

div.appendChild(name);
div.appendChild(status);

div.onclick=()=>openChat(docu.id,user.name);

usersList.appendChild(div);

});

}



function openChat(uid,name){

document.getElementById("chatUser").innerText=name;

currentChatUser=uid;

chatID=[currentUser.uid,uid].sort().join("_");

listenMessages();
listenTyping();

}



function listenMessages(){

chatBox.innerHTML="";

const messagesQuery=query(
collection(db,"chats",chatID,"messages"),
orderBy("time","asc")
);

onSnapshot(messagesQuery,(snapshot)=>{

chatBox.innerHTML="";

snapshot.forEach(async(docu)=>{

const msg=docu.data();

const bubble=document.createElement("div");

if(msg.sender===currentUser.uid){
bubble.className="sender";
}else{
bubble.className="receiver";

if(!msg.seen){
await updateDoc(doc(db,"chats",chatID,"messages",docu.id),{
seen:true
});
}

}

bubble.innerText=msg.text;

if(msg.sender===currentUser.uid){

const tick=document.createElement("span");

tick.style.fontSize="10px";
tick.style.marginLeft="6px";

tick.innerText=msg.seen?"✔✔":"✔";

bubble.appendChild(tick);

}

chatBox.appendChild(bubble);

});

chatBox.scrollTop=chatBox.scrollHeight;

});

}



async function sendMessage(){

if(!input.value || !chatID) return;

await addDoc(collection(db,"chats",chatID,"messages"),{

text:input.value,
sender:currentUser.uid,
time:Date.now(),
seen:false

});

await setDoc(doc(db,"typing",chatID),{
user:null
});

input.value="";

}



if(sendBtn){
sendBtn.onclick=sendMessage;
}



if(input){

input.addEventListener("keypress",(e)=>{

if(e.key==="Enter"){
sendMessage();
}

});

input.addEventListener("input",async()=>{

if(!chatID) return;

await setDoc(doc(db,"typing",chatID),{
user:currentUser.uid
});

});

}



function listenTyping(){

const typingRef=doc(db,"typing",chatID);

onSnapshot(typingRef,(snapshot)=>{

const data=snapshot.data();

let typingDiv=document.getElementById("typingIndicator");

if(!typingDiv){

typingDiv=document.createElement("div");
typingDiv.id="typingIndicator";
typingDiv.style.fontSize="12px";
typingDiv.style.opacity="0.7";

document.querySelector(".chatArea").appendChild(typingDiv);

}

if(data && data.user && data.user!==currentUser.uid){

typingDiv.innerText="Typing...";

}else{

typingDiv.innerText="";

}

});

}
