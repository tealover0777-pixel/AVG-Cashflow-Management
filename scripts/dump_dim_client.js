import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAD8G1WvI0SniOw5qvt_RrYIy5PkhF01Js",
  authDomain: "avg-cashflow-management.firebaseapp.com",
  projectId: "avg-cashflow-management",
  storageBucket: "avg-cashflow-management.firebasestorage.app",
  messagingSenderId: "807377679425",
  appId: "1:807377679425:web:0008a3fe0f4ac6c3ffc2c0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
  try {
    await signInWithEmailAndPassword(auth, "kyuahn@yahoo.com", "Citib@nk2");
    
    console.log("Fetching dimensions...");
    const snap = await getDocs(collection(db, "dimensions"));
    console.log(`Found ${snap.size} dimensions.`);
    snap.forEach(doc => {
      console.log(doc.id, "=>", JSON.stringify(doc.data()));
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
