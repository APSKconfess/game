import {
  collection, addDoc, serverTimestamp,
  query, orderBy, onSnapshot
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

  await addDoc(collection(db, "chatMessages"), {
    text,
    user: username,
    timestamp: serverTimestamp()
  });
  input.value = "";
}

// async function sendMessage() {
//   const text = input.value.trim();
//   if (!text) return;

//   // Add the new message first
//   await addDoc(collection(db, "chatMessages"), {
//     text,
//     user: username,
//     timestamp: serverTimestamp()
//   });

//   input.value = "";

//   // Now check the total number of messages
//   const snapshot = await getDocs(query(
//     collection(db, "chatMessages"),
//     orderBy("timestamp", "asc")
//   ));

//   const messages = snapshot.docs;

//   const maxMessages = 50;
//   if (messages.length > maxMessages) {
//     const extraMessages = messages.length - maxMessages;

//     // Delete the oldest messages
//     for (let i = 0; i < extraMessages; i++) {
//       await deleteDoc(messages[i].ref);
//     }
//   }
// }


// Enter key
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

// Send button
sendBtn.addEventListener("click", sendMessage);

// Live updates
const q = query(collection(db, "chatMessages"), orderBy("timestamp", "asc"));
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

window.sendChatMessage = async function(messageText) {
  if (!messageText) return console.error("Message cannot be empty");
  
  await addDoc(collection(db, "chatMessages"), {
    text: messageText,
    user: "Admin", // You can set anything here
    timestamp: serverTimestamp()
  });

  console.log(`Message sent: "${messageText}"`);
};
