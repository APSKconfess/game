import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  onSnapshot,
  deleteDoc,
  doc,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { db } from './firebase.js';

// ----------------- Sidebar Toggle -----------------
document.getElementById("menu-btn").onclick = () => {
  const sidebar = document.getElementById("sidebar");
  sidebar.style.width = sidebar.style.width === "250px" ? "0" : "250px";
};
document.getElementById("close-btn").onclick = () => {
  document.getElementById("sidebar").style.width = "0";
};

// ----------------- Chat Logic -----------------
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const chatRef = collection(db, "chatMessages");

// Function to format time nicely
function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Function to delete old messages (> 24h)
async function cleanupOldMessages() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const oldMessagesQuery = query(chatRef, where("timestamp", "<", cutoff));
  const oldMessagesSnap = await getDocs(oldMessagesQuery);
  for (let docSnap of oldMessagesSnap.docs) {
    await deleteDoc(doc(db, "chatMessages", docSnap.id));
  }
}

// Load last 50 messages and listen for new ones
const q = query(chatRef, orderBy("timestamp", "asc"), limit(50));
onSnapshot(q, (snapshot) => {
  messagesDiv.innerHTML = "";
  snapshot.forEach((doc) => {
    const data = doc.data();
    const time = data.timestamp?.toDate ? formatTime(data.timestamp.toDate()) : "";
    const msgEl = document.createElement("div");
    msgEl.classList.add("message");
    msgEl.innerHTML = `<span class="time">[${time}]</span> ${data.text}`;
    messagesDiv.appendChild(msgEl);
  });
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// Send message
async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  await addDoc(chatRef, {
    text,
    timestamp: serverTimestamp()
  });

  messageInput.value = "";
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

// Periodically clean up old messages to save quota
setInterval(cleanupOldMessages, 60 * 60 * 1000); // every 1 hour
