import {
  collection, addDoc, serverTimestamp,
  query, orderBy, onSnapshot, limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase.js";

// Sidebar toggle
document.getElementById("menu-btn").onclick = () => {
  const sidebar = document.getElementById("sidebar");
  sidebar.style.width = (sidebar.style.width === "250px") ? "0" : "250px";
};
document.getElementById("close-btn").onclick = () => {
  document.getElementById("sidebar").style.width = "0";
};

// Persistent username
if (!localStorage.getItem("chatUsername")) {
  const randomNum = Math.floor(Math.random() * 1000);
  localStorage.setItem("chatUsername", `User ${randomNum}`);
}
const username = localStorage.getItem("chatUsername");

// DOM elements
const messagesDiv = document.getElementById("messages");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

// Send message
async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  await addDoc(collection(db, "messages"), {
    text,
    user: username,
    timestamp: serverTimestamp()
  });
  input.value = "";
}

// Enter key
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

// Send button
sendBtn.addEventListener("click", sendMessage);

// Live updates
const q = query(collection(db, "messages"), orderBy("timestamp", "asc"), limit(50));
onSnapshot(q, (snapshot) => {
  messagesDiv.innerHTML = "";
  let lastUser = "";
  snapshot.forEach(doc => {
    const data = doc.data();
    const isMe = data.user === username;

    const msgBlock = document.createElement("div");
    msgBlock.className = isMe ? "message me" : "message other";

    if (!isMe && data.user !== lastUser) {
      const nameTag = document.createElement("div");
      nameTag.className = "username";
      nameTag.innerText = data.user;
      msgBlock.appendChild(nameTag);
    }

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.innerText = data.text;
    msgBlock.appendChild(bubble);

    messagesDiv.appendChild(msgBlock);
    lastUser = data.user;
  });

  // Scroll to bottom
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});
