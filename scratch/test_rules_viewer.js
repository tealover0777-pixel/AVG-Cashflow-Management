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

const collectionsToTest = [
    "users",
    "paymentSchedules",
    "ledger",
    "investments",
    "contacts",
    "achBatches",
    "payments",
    "marketingEmails",
    "fees",
    "deals"
];

async function run() {
    const email = "soulmate0220@gmail.com";
    let password = "Password123!";
    
    console.log(`Signing in as ${email}...`);
    let userCredential;
    try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
        console.warn(`Failed with Password123!: ${err.message}. Trying Citibank2...`);
        try {
            userCredential = await signInWithEmailAndPassword(auth, email, "Citibank2");
            password = "Citibank2";
        } catch (err2) {
            console.warn(`Failed with Citibank2: ${err2.message}. Trying Citib@nk2...`);
            userCredential = await signInWithEmailAndPassword(auth, email, "Citib@nk2");
            password = "Citib@nk2";
        }
    }
    
    const uid = userCredential.user.uid;
    console.log(`Signed in successfully! UID: ${uid} with password: ${password}`);

    const tenantId = "T10001";

    for (const collName of collectionsToTest) {
        try {
            console.log(`\nQuerying ${collName} under tenants/${tenantId}...`);
            const snap = await getDocs(collection(db, "tenants", tenantId, collName));
            console.log(`  Success! Found ${snap.size} documents.`);
        } catch (e) {
            console.error(`  Failed: ${e.message}`);
        }
    }
    process.exit(0);
}

run().catch(console.error);
