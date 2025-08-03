import {
  doc, getDoc, setDoc, updateDoc, increment, collection,
  query, orderBy, onSnapshot, writeBatch, addDoc, serverTimestamp,
  deleteDoc, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { db } from './firebase.js';

// State variables
let allPeople = [], currentChoices = [], lastChoices = [], userDocRef = null;

// ----------------- Vote Reset Logic -----------------
function checkVoteReset() {
  let lastReset = parseInt(localStorage.getItem("lastVoteReset") || "0");
  let now = Date.now(), threeHours = 10800000;
  if (!lastReset || now - lastReset > threeHours) {
    localStorage.setItem("votesUsed", "0");
    localStorage.setItem("lastVoteReset", now.toString());
  }
}

function updateVoteCounter() {
  const used = parseInt(localStorage.getItem("votesUsed") || "0");
  document.getElementById("vote-counter").innerText = `Votes left: ${10 - used}/10`;
}

function updateResetTimer() {
  let lastReset = parseInt(localStorage.getItem("lastVoteReset") || "0");
  let diff = (lastReset + 10800000) - Date.now();
  let h = Math.floor(diff / 3600000),
      m = Math.floor((diff % 3600000) / 60000),
      s = Math.floor((diff % 60000) / 1000);
  document.getElementById("reset-timer").innerText = `Next reset in: ${h}h ${m.toString().padStart(2,"0")}m ${s.toString().padStart(2,"0")}s`;
}
setInterval(updateResetTimer, 1000);

async function checkGlobalVoteReset() {
  const ref = doc(db, "settings", "votesReset");
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const serverKey = snap.data().key;
    if (serverKey !== localStorage.getItem("votesResetKey")) {
      localStorage.setItem("votesUsed", "0");
      localStorage.setItem("lastVoteReset", Date.now().toString());
      localStorage.setItem("votesResetKey", serverKey);
    }
  }
}

async function resetAllVotes() {
  if (prompt("Enter admin reset code:") !== "secret123") return;
  const newKey = Date.now().toString();
  await setDoc(doc(db, "settings", "votesReset"), { key: newKey });
  alert("All votes reset!");
}

// ----------------- Init and Leaderboard -----------------
async function initScores() {
  const seed = ["Nidhi","Yachna","Poorvi","Liri","Eshanika","Diya","Aditi","Mehak"];
  for (let p of seed) {
    let r = doc(db, "leaderboard", p);
    if (!(await getDoc(r)).exists()) await setDoc(r, { name: p, votes: 0 });
  }
  checkVoteReset();
  await checkGlobalVoteReset();
  updateVoteCounter();
  joinPresence();
  listenOnlineUsers();
}

function updateLeaderboardLive() {
  const qy = query(collection(db, "leaderboard"), orderBy("votes", "desc"));
  onSnapshot(qy, snap => {
    let tbody = document.getElementById("leaderboard-body");
    tbody.innerHTML = "";
    let rank = 1;
    allPeople = [];
    snap.forEach(d => {
      let data = d.data();
      allPeople.push(data.name);
      let rowClass = "", medal = "";
      if (rank === 1) { rowClass = "gold"; medal = "🥇 "; }
      else if (rank === 2) { rowClass = "silver"; medal = "🥈 "; }
      else if (rank === 3) { rowClass = "bronze"; medal = "🥉 "; }
      tbody.innerHTML += `<tr class="${rowClass}"><td>${medal}${rank}</td><td>${data.name}</td><td>${data.votes}</td></tr>`;
      rank++;
    });
    if (!currentChoices.length) nextRound();
  });
}

// ----------------- Game Logic -----------------
function getRandomPerson(exclude = []) {
  let avail = allPeople.filter(p => !exclude.includes(p));
  return avail[Math.floor(Math.random() * avail.length)];
}

function nextRound() {
  if (allPeople.length < 2) return;

  // Reset backgrounds before loading new names
  const choice1El = document.getElementById("choice1");
  const choice2El = document.getElementById("choice2");
  choice1El.style.backgroundColor = "";
  choice2El.style.backgroundColor = "";

  let p1 = getRandomPerson(lastChoices);
  let p2 = getRandomPerson([...lastChoices, p1]);
  currentChoices = [p1, p2];
  lastChoices = [p1, p2];
  choice1El.innerText = p1;
  choice2El.innerText = p2;
}


function fadeInNextRound() {
  const choice1El = document.getElementById("choice1");
  const choice2El = document.getElementById("choice2");

  choice1El.style.opacity = 0;
  choice2El.style.opacity = 0;

  nextRound();

  setTimeout(() => {
    choice1El.style.transition = "opacity 0.25s ease";
    choice2El.style.transition = "opacity 0.25s ease";
    choice1El.style.opacity = 1;
    choice2El.style.opacity = 1;
  }, 10);
}

async function pick(i) {
  let used = parseInt(localStorage.getItem("votesUsed") || "0");
  if (used >= 10) return alert("Vote limit reached. Wait for reset.");
  localStorage.setItem("votesUsed", used + 1);
  updateVoteCounter();

  const colors = [
    "rgba(155, 0, 255, 0.4)",
    "rgba(0, 200, 255, 0.4)",
    "rgba(255, 105, 180, 0.4)",
    "rgba(138, 43, 226, 0.4)"
  ];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  const choice1El = document.getElementById("choice1");
  const choice2El = document.getElementById("choice2");

  choice1El.classList.add("shake");
  choice2El.classList.add("shake");
  document.getElementById(i === 0 ? "choice1" : "choice2").style.backgroundColor = randomColor;

  setTimeout(async () => {
    choice1El.style.backgroundColor = "";
    choice2El.style.backgroundColor = "";
    choice1El.classList.remove("shake");
    choice2El.classList.remove("shake");

    await updateDoc(doc(db, "leaderboard", currentChoices[i]), { votes: increment(1) });

    fadeInNextRound();
  }, 300);
}

function skipRound() {
  let used = parseInt(localStorage.getItem("votesUsed") || "0");
  if (used >= 10) {
    alert("Vote limit reached. Wait for reset.");
    return;
  }
  let newUsed = used + 2;
  if (newUsed > 10) newUsed = 10;
  localStorage.setItem("votesUsed", newUsed);
  updateVoteCounter();

  const colors = [
    "rgba(155, 0, 255, 0.4)",
    "rgba(0, 200, 255, 0.4)",
    "rgba(255, 105, 180, 0.4)",
    "rgba(138, 43, 226, 0.4)"
  ];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  const choice1El = document.getElementById("choice1");
  const choice2El = document.getElementById("choice2");

  choice1El.classList.add("shake");
  choice2El.classList.add("shake");
  choice1El.style.backgroundColor = randomColor;
  choice2El.style.backgroundColor = randomColor;

  setTimeout(() => {
    choice1El.style.backgroundColor = "";
    choice2El.style.backgroundColor = "";
    choice1El.classList.remove("shake");
    choice2El.classList.remove("shake");

    fadeInNextRound();
  }, 300);
}

// ----------------- Admin Tools -----------------
async function resetLeaderboard() {
  if (prompt("Enter admin reset code:") !== "secret123") return;
  const batch = writeBatch(db);
  allPeople.forEach(p => batch.update(doc(db, "leaderboard", p), { votes: 0 }));
  await batch.commit();
  alert("Leaderboard reset!");
}

async function suggestName() {
  const name = prompt("Enter name to suggest:");
  if (!name) return;
  await addDoc(collection(db, "suggestions"), { name: name.trim(), timestamp: serverTimestamp() });
  alert("Suggestion sent!");
}

async function reviewSuggestions() {
  if (prompt("Enter admin code:") !== "secret123") return;
  const panel = document.getElementById("suggestions-panel");
  panel.innerHTML = "<h3>Suggestions</h3>";

  const snap = await getDocs(collection(db, "suggestions"));
  if (snap.empty) {
    panel.innerHTML += "<p>No pending suggestions.</p>";
    return;
  }

  panel.innerHTML += `
    <div style="margin-bottom:10px;">
      <label><input type="checkbox" id="selectAllSuggestions"> Select All</label>
      <button onclick="approveSelectedSuggestions()">Approve Selected</button>
    </div>
  `;

  snap.forEach(d => {
    const n = d.data().name;
    panel.innerHTML += `
      <div>
        <label>
          <input type="checkbox" class="suggestionCheckbox" data-id="${d.id}" data-name="${n}">
          ${n}
        </label>
      </div>
    `;
  });

  document.getElementById("selectAllSuggestions").addEventListener("change", function() {
    const checkboxes = document.querySelectorAll(".suggestionCheckbox");
    checkboxes.forEach(cb => cb.checked = this.checked);
  });
}

async function approveSelectedSuggestions() {
  const selected = document.querySelectorAll(".suggestionCheckbox:checked");
  if (selected.length === 0) {
    alert("No suggestions selected.");
    return;
  }
  const batch = writeBatch(db);
  selected.forEach(cb => {
    const id = cb.getAttribute("data-id");
    const name = cb.getAttribute("data-name");
    batch.set(doc(db, "leaderboard", name), { name: name, votes: 0 });
    batch.delete(doc(db, "suggestions", id));
  });
  await batch.commit();
  alert(`Approved ${selected.length} suggestions!`);
  reviewSuggestions();
}

// ----------------- Online Presence -----------------
async function joinPresence() {
  let id = sessionStorage.getItem("presenceId");
  if (!id) {
    id = Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem("presenceId", id);
  }
  userDocRef = doc(db, "onlineUsers", id);
  await setDoc(userDocRef, { lastActive: serverTimestamp() });
  setInterval(async () => {
    await updateDoc(userDocRef, { lastActive: serverTimestamp() });
  }, 30000);
  window.addEventListener("beforeunload", async () => {
    await deleteDoc(userDocRef);
  });
}

function listenOnlineUsers() {
  onSnapshot(collection(db, "onlineUsers"), snap => {
    const now = Date.now();
    let count = 0;
    snap.forEach(d => {
      const data = d.data();
      if (data.lastActive?.toMillis && (now - data.lastActive.toMillis()) < 60000) count++;
    });
    document.getElementById("online-count").innerText = `Anonymous users online: ${count}`;
  });
}

// ----------------- Bind UI -----------------
document.getElementById("choice1").onclick = () => pick(0);
document.getElementById("choice2").onclick = () => pick(1);

window.skipRound = skipRound;
window.suggestName = suggestName;
window.reviewSuggestions = reviewSuggestions;
window.approveSelectedSuggestions = approveSelectedSuggestions;
window.resetLeaderboard = resetLeaderboard;
window.resetAllVotes = resetAllVotes;

// ----------------- Start -----------------
initScores().then(updateLeaderboardLive);

// ----------------- Purple Rain Animation -----------------
const rainCanvas = document.getElementById("rainCanvas");
const ctx = rainCanvas.getContext("2d");
let width, height;

function resizeCanvas() {
  width = rainCanvas.width = window.innerWidth;
  height = rainCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

class Raindrop {
  constructor() { this.reset(); }
  reset() {
    this.x = Math.random() * width;
    this.y = Math.random() * -height;
    this.length = Math.random() * 15 + 10;
    this.speed = Math.random() * 4 + 2;
    this.opacity = Math.random() * 0.2 + 0.1;
    this.color = "rgba(200, 0, 255,"; // Purple only
  }
  update() {
    this.y += this.speed;
    if (this.y > height) this.reset();
  }
  draw() {
    ctx.beginPath();
    ctx.strokeStyle = `${this.color} ${this.opacity})`;
    ctx.lineWidth = 1.2;
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x, this.y + this.length);
    ctx.shadowBlur = 8;
    ctx.shadowColor = `${this.color} 0.6)`;
    ctx.stroke();
  }
}
const drops = [];
for (let i = 0; i < 120; i++) drops.push(new Raindrop());
function animateRain() {
  ctx.clearRect(0, 0, width, height);
  drops.forEach(d => { d.update(); d.draw(); });
  requestAnimationFrame(animateRain);
}
animateRain();
