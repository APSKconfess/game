import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { db } from './firebase.js';

// ---------------- Sidebar Toggle ----------------
document.getElementById("menu-btn").onclick = () => {
  const sidebar = document.getElementById("sidebar");
  if (sidebar.style.width === "250px") {
    sidebar.style.width = "0";
  } else {
    sidebar.style.width = "250px";
  }
};

document.getElementById("close-btn").onclick = () => {
  document.getElementById("sidebar").style.width = "0";
};

// ---------------- Chat Logic ----------------
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

// Keep chat messages in a collection "chatMessages"
const messagesRef = collection(db, "chatMessages");

// Listen for messages in real-time
const q = query(messagesRef, orderBy("timestamp", "asc"), limit(50));
onSnapshot(q, (snapshot) => {
  messagesDiv.innerHTML = "";
  snapshot.forEach((doc) => {
    const data = doc.data();
    const msgEl = document.createElement("div");
    msgEl.className = "chat-message";
    msgEl.textContent = data.text || "";
    messagesDiv.appendChild(msgEl);
  });

  // Scroll to bottom after loading
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// Send a new message
sendBtn.onclick = async () => {
  const text = messageInput.value.trim();
  if (!text) return;
  
  await addDoc(messagesRef, {
    text,
    timestamp: serverTimestamp()
  });

  messageInput.value = "";
};

// Press Enter to send
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendBtn.click();
  }
});

// ---------------- Quota Optimization: Delete Old Messages ----------------
async function cleanupOldMessages() {
  const oldMessagesQuery = query(messagesRef, orderBy("timestamp", "asc"));
  const snapshot = await getDocs(oldMessagesQuery);
  
  if (snapshot.size > 50) {
    let toDelete = snapshot.size - 50;
    for (let docSnap of snapshot.docs) {
      if (toDelete <= 0) break;
      await deleteDoc(docSnap.ref);
      toDelete--;
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupOldMessages, 300000);
