import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

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
        console.log("Signing in as member abc123@yahoo.com...");
        const userCredential = await signInWithEmailAndPassword(auth, "abc123@yahoo.com", "Password123!");
        const uid = userCredential.user.uid;
        console.log(`Signed in successfully! UID: ${uid}`);

        const tenantId = "T10002";
        const contactId = "M10002";

        // 1. Try reading deals (Allowed for all tenant members)
        try {
            console.log("\n1. Querying deals...");
            const dealsSnap = await getDocs(collection(db, "tenants", tenantId, "deals"));
            console.log(`Success! Found ${dealsSnap.size} deals.`);
            dealsSnap.forEach(doc => console.log(`  Deal: ${doc.id} - ${doc.data().deal_name}`));
        } catch (e) {
            console.error("Failed querying deals:", e.message);
        }

        // 2. Try reading own contacts with filter (Allowed)
        try {
            console.log("\n2. Querying own contact (filtered by auth_uid)...");
            const contactQuery = query(
                collection(db, "tenants", tenantId, "contacts"),
                where("auth_uid", "==", uid)
            );
            const contactsSnap = await getDocs(contactQuery);
            console.log(`Success! Found ${contactsSnap.size} contact records.`);
            contactsSnap.forEach(doc => console.log(`  Contact: ${doc.id} - ${doc.data().contact_name}`));
        } catch (e) {
            console.error("Failed querying own contact:", e.message);
        }

        // 3. Try reading contacts without filter (Should be blocked due to rule requirements)
        try {
            console.log("\n3. Querying all contacts (no filter)...");
            const allContactsSnap = await getDocs(collection(db, "tenants", tenantId, "contacts"));
            console.log(`WARNING: Allowed query of all contacts! Found ${allContactsSnap.size} docs.`);
        } catch (e) {
            console.log("Expected Block: Querying all contacts blocked:", e.message);
        }

        // 4. Try reading own investments with filter (Allowed)
        try {
            console.log("\n4. Querying own investments (filtered by contact_id)...");
            const invQuery = query(
                collection(db, "tenants", tenantId, "investments"),
                where("contact_id", "==", contactId)
            );
            const invSnap = await getDocs(invQuery);
            console.log(`Success! Found ${invSnap.size} investments.`);
            invSnap.forEach(doc => console.log(`  Investment: ${doc.id} - ${doc.data().investment_name} - ${doc.data().amount}`));
        } catch (e) {
            console.error("Failed querying own investments:", e.message);
        }

        // 5. Try reading own paymentSchedules with filter (Allowed)
        try {
            console.log("\n5. Querying own paymentSchedules (filtered by contact_id)...");
            const schedQuery = query(
                collection(db, "tenants", tenantId, "paymentSchedules"),
                where("contact_id", "==", contactId)
            );
            const schedSnap = await getDocs(schedQuery);
            console.log(`Success! Found ${schedSnap.size} schedules.`);
        } catch (e) {
            console.error("Failed querying own schedules:", e.message);
        }

        // 6. Try reading own payments with filter (Allowed)
        try {
            console.log("\n6. Querying own payments (filtered by contact_id)...");
            const payQuery = query(
                collection(db, "tenants", tenantId, "payments"),
                where("contact_id", "==", contactId)
            );
            const paySnap = await getDocs(payQuery);
            console.log(`Success! Found ${paySnap.size} payments.`);
        } catch (e) {
            console.error("Failed querying own payments:", e.message);
        }

        // 7. Try reading admin fees collection (Should be blocked)
        try {
            console.log("\n7. Querying fees...");
            const feesSnap = await getDocs(collection(db, "tenants", tenantId, "fees"));
            console.log(`WARNING: Allowed query of fees! Found ${feesSnap.size} docs.`);
        } catch (e) {
            console.log("Expected Block: Querying fees blocked:", e.message);
        }

        // 8. Try reading admin ledger collection (Should be blocked)
        try {
            console.log("\n8. Querying ledger...");
            const ledgerSnap = await getDocs(collection(db, "tenants", tenantId, "ledger"));
            console.log(`WARNING: Allowed query of ledger! Found ${ledgerSnap.size} docs.`);
        } catch (e) {
            console.log("Expected Block: Querying ledger blocked:", e.message);
        }

        process.exit(0);
    } catch (err) {
        console.error("Error running test:", err);
        process.exit(1);
    }
}

run();
