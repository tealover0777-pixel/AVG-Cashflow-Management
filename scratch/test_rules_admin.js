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
        console.log("Signing in as admin kyuahn@yahoo.com...");
        const userCredential = await signInWithEmailAndPassword(auth, "kyuahn@yahoo.com", "Password123!");
        const uid = userCredential.user.uid;
        console.log(`Signed in successfully! UID: ${uid}`);

        const tenantId = "T10002";

        // 1. Querying deals (unfiltered)
        try {
            console.log("\n1. Querying deals...");
            const snap = await getDocs(collection(db, "tenants", tenantId, "deals"));
            console.log(`Success! Found ${snap.size} deals.`);
        } catch (e) {
            console.error("Failed querying deals:", e.message);
        }

        // 2. Querying contacts (unfiltered)
        try {
            console.log("\n2. Querying contacts...");
            const snap = await getDocs(collection(db, "tenants", tenantId, "contacts"));
            console.log(`Success! Found ${snap.size} contacts.`);
        } catch (e) {
            console.error("Failed querying contacts:", e.message);
        }

        // 3. Querying investments (unfiltered)
        try {
            console.log("\n3. Querying investments...");
            const snap = await getDocs(collection(db, "tenants", tenantId, "investments"));
            console.log(`Success! Found ${snap.size} investments.`);
        } catch (e) {
            console.error("Failed querying investments:", e.message);
        }

        // 4. Querying paymentSchedules (unfiltered)
        try {
            console.log("\n4. Querying paymentSchedules...");
            const snap = await getDocs(collection(db, "tenants", tenantId, "paymentSchedules"));
            console.log(`Success! Found ${snap.size} paymentSchedules.`);
        } catch (e) {
            console.error("Failed querying paymentSchedules:", e.message);
        }

        // 5. Querying payments (unfiltered)
        try {
            console.log("\n5. Querying payments...");
            const snap = await getDocs(collection(db, "tenants", tenantId, "payments"));
            console.log(`Success! Found ${snap.size} payments.`);
        } catch (e) {
            console.error("Failed querying payments:", e.message);
        }

        // 6. Querying fees (unfiltered)
        try {
            console.log("\n6. Querying fees...");
            const snap = await getDocs(collection(db, "tenants", tenantId, "fees"));
            console.log(`Success! Found ${snap.size} fees.`);
        } catch (e) {
            console.error("Failed querying fees:", e.message);
        }

        // 7. Querying ledger (unfiltered)
        try {
            console.log("\n7. Querying ledger...");
            const snap = await getDocs(collection(db, "tenants", tenantId, "ledger"));
            console.log(`Success! Found ${snap.size} ledger docs.`);
        } catch (e) {
            console.error("Failed querying ledger:", e.message);
        }

        process.exit(0);
    } catch (err) {
        console.error("Error running test:", err);
        process.exit(1);
    }
}

run();
