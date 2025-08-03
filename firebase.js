import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAzDUM_vivcTLN7dGMKEeBYMFR5Wp4dKH8",
  authDomain: "boporbaddie.firebaseapp.com",
  projectId: "boporbaddie",
  storageBucket: "boporbaddie.firebasestorage.app",
  messagingSenderId: "32915423043",
  appId: "1:32915423043:web:8ecb3ced9d82e122dc79f6"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
