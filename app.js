import {
  doc, getDoc, setDoc, updateDoc, increment, collection,
  query, orderBy, onSnapshot, writeBatch, addDoc, serverTimestamp,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { db } from './firebase.js';

let allPeople = [], currentChoices = [], lastChoices = [];
const defaultChoiceBG = "rgba(30, 30, 47, 0.9)";

// ----------------- Vote Reset -----------------
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
  const vc = document.getElementById("vote-counter");
  if (vc) vc.innerText = `Votes left: ${10 - used}/10`;
}

function updateResetTimer() {
  let lastReset = parseInt(localStorage.getItem("lastVoteReset") || "0");
  let diff = (lastReset + 10800000) - Date.now();
  let h = Math.floor(diff / 3600000),
      m = Math.floor((diff % 3600000) / 60000),
      s = Math.floor((diff % 60000) / 1000);
  const rt = document.getElementById("reset-timer");
  if (rt) rt.innerText = `Next reset in: ${h}h ${m.toString().padStart(2,"0")}m ${s.toString().padStart(2,"0")}s`;
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

// ----------------- Init & Leaderboard -----------------
async function initScores() {
  const seed = ["Nidhi","Yachna","Poorvi","Liri","Eshanika","Diya","Aditi","Mehak"];
  for (let p of seed) {
    let r = doc(db, "leaderboard", p);
    if (!(await getDoc(r)).exists()) await setDoc(r, { name: p, votes: 0 });
  }
  checkVoteReset();
  await checkGlobalVoteReset();
  updateVoteCounter();
}

function updateLeaderboardLive() {
  const qy = query(collection(db, "leaderboard"), orderBy("votes", "desc"));
  onSnapshot(qy, snap => {
    const tbody = document.getElementById("leaderboard-body");
    if (!tbody) return;
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
  const choice1El = document.getElementById("choice1");
  const choice2El = document.getElementById("choice2");
  if (!choice1El || !choice2El) return;

  choice1El.style.backgroundColor = defaultChoiceBG;
  choice2El.style.backgroundColor = defaultChoiceBG;

  if (allPeople.length < 2) return;
  let p1 = getRandomPerson(lastChoices);
  let p2 = getRandomPerson([...lastChoices, p1]);
  currentChoices = [p1, p2];
  lastChoices = [p1, p2];
  choice1El.innerText = p1;
  choice2El.innerText = p2;
}

async function pick(i) {
  let used = parseInt(localStorage.getItem("votesUsed") || "0");
  if (used >= 10) return alert("Vote limit reached. Wait for reset.");
  localStorage.setItem("votesUsed", used + 1);
  updateVoteCounter();
  await updateDoc(doc(db, "leaderboard", currentChoices[i]), { votes: increment(1) });
  nextRound();
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
  nextRound();
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
  if (!panel) return;
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

// ----------------- Sidebar Toggle -----------------
const menuBtn = document.getElementById("menu-btn");
const closeBtn = document.getElementById("close-btn");

if (menuBtn && closeBtn) {
  menuBtn.onclick = () => {
    document.getElementById("sidebar").style.width = "250px";
  };
  closeBtn.onclick = () => {
    document.getElementById("sidebar").style.width = "0";
  };
}

// ----------------- Bind UI -----------------
const choice1El = document.getElementById("choice1");
const choice2El = document.getElementById("choice2");

if (choice1El && choice2El) {
  choice1El.onclick = () => pick(0);
  choice2El.onclick = () => pick(1);
}

window.skipRound = skipRound;
window.suggestName = suggestName;
window.reviewSuggestions = reviewSuggestions;
window.approveSelectedSuggestions = approveSelectedSuggestions;
window.resetLeaderboard = resetLeaderboard;
window.resetAllVotes = resetAllVotes;

// ----------------- Start -----------------
initScores().then(updateLeaderboardLive);
