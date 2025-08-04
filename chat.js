import { db } from './firebase.js';
import {
  collection, addDoc, serverTimestamp,
  query, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Sidebar toggle
document.getElementById("menu-btn").onclick = () => {
  const sidebar = document.getElementById("sidebar");
  sidebar.style.width = sidebar.style.width === "250px" ? "0" : "250px";
};
document.getElementById("close-btn").onclick = () => {
  document.getElementById("sidebar").style.width = "0";
};

// Generate unique ID for this user
if (!localStorage.getItem("chatUserId")) {
  localStorage.setItem("chatUserId", Math.random().toString(36).substr(2, 9));
}
const userId = localStorage.getItem("chatUserId");

const messagesRef = collection(db, "chatMessages");

// Send message
document.getElementById("sendBtn").addEventListener("click", async () => {
  const text = document.getElementById("messageInput").value.trim();
  if (!text) return;
  await addDoc(messagesRef, {
    text,
    userId,
    timestamp: serverTimestamp()
  });
  document.getElementById("messageInput").value = "";
});

// Listen for messages
const q = query(messagesRef, orderBy("timestamp", "asc"));
onSnapshot(q, snapshot => {
  const messagesDiv = document.getElementById("messages");
  messagesDiv.innerHTML = "";
  snapshot.forEach(doc => {
    const msg = doc.data();
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message");
    msgDiv.classList.add(msg.userId === userId ? "own" : "other");
    msgDiv.textContent = msg.text;
    messagesDiv.appendChild(msgDiv);
  });
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});
