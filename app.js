
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
orderBy
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const googleBtn = document.getElementById("googleLogin");

if (googleBtn) {

googleBtn.onclick = async () => {

const result = await signInWithPopup(auth, provider);
const user = result.user;

await setDoc(doc(db,"users",user.uid),{
name:user.displayName,
email:user.email,
photo:user.photoURL,
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

window.addEventListener("beforeunload",async()=>{
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

const user = docu.data();

const div=document.createElement("div");
div.className="userRow";

const img=document.createElement("img");
img.src=user.photo;
img.className="avatar";

const name=document.createElement("span");
name.innerText=user.name;

const status=document.createElement("span");
status.innerText=user.online?"🟢":"⚫";

const unread=document.createElement("span");
unread.className="unreadBadge";
unread.id="unread_"+docu.id;

div.appendChild(img);
div.appendChild(name);
div.appendChild(status);
div.appendChild(unread);

div.onclick=()=>openChat(docu.id,user.name);

usersList.appendChild(div);

listenUnread(docu.id);

});

}

function openChat(uid,name){

document.getElementById("chatUser").innerText=name;

currentChatUser=uid;

chatID=[currentUser.uid,uid].sort().join("_");

setDoc(doc(db,"lastRead",chatID+"_"+currentUser.uid),{
time:Date.now()
});

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

const row=document.createElement("div");

const bubble=document.createElement("div");

if(msg.sender===currentUser.uid){
bubble.className="sender";
}else{
bubble.className="receiver";
}

bubble.innerText=msg.text;

const time=document.createElement("div");
time.className="time";

const date=new Date(msg.time);
time.innerText=date.getHours()+":"+String(date.getMinutes()).padStart(2,'0');

bubble.appendChild(time);

if(msg.sender===currentUser.uid){

const tick=document.createElement("span");
tick.className="tick";

tick.innerText=msg.seen?"✔✔":"✔";

bubble.appendChild(tick);

}else{

if(!msg.seen){

await updateDoc(doc(db,"chats",chatID,"messages",docu.id),{
seen:true
});

}

}

row.appendChild(bubble);

chatBox.appendChild(row);

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

document.querySelector(".chatArea").appendChild(typingDiv);

}

if(data && data.user && data.user!==currentUser.uid){

typingDiv.innerText="Typing...";

}else{

typingDiv.innerText="";

}

});

}

function listenUnread(uid){

const id=[currentUser.uid,uid].sort().join("_");

const messagesQuery=query(
collection(db,"chats",id,"messages"),
orderBy("time","asc")
);

onSnapshot(messagesQuery,async(snapshot)=>{

const lastReadDoc=await getDoc(doc(db,"lastRead",id+"_"+currentUser.uid));

let lastRead=0;

if(lastReadDoc.exists()){
lastRead=lastReadDoc.data().time;
}

let count=0;

snapshot.forEach((docu)=>{

const msg=docu.data();

if(msg.sender===uid && msg.time>lastRead){
count++;
}

});

const badge=document.getElementById("unread_"+uid);

if(badge){
badge.innerText=count>0?count:"";
}

});

}
