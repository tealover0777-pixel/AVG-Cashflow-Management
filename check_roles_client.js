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

        // Check "UserRoles" collection directly
        try {
            const snap1 = await getDocs(collection(db, 'UserRoles'));
            console.log(`Found ${snap1.size} docs in UserRoles collection.`);
            snap1.forEach(doc => {
                console.log("UserRoles doc:", doc.id, "=>", JSON.stringify(doc.data()));
            });
        } catch (e) { console.log("UserRoles error:", e.message); }

        // Check "userRoles" collection
        try {
            const snap2 = await getDocs(collection(db, 'userRoles'));
            console.log(`Found ${snap2.size} docs in userRoles collection.`);
            snap2.forEach(doc => {
                console.log("userRoles doc:", doc.id, "=>", JSON.stringify(doc.data()));
            });
        } catch (e) { console.log("userRoles error:", e.message); }

        // Check "roles" collection
        try {
            const snap3 = await getDocs(collection(db, 'roles'));
            console.log(`Found ${snap3.size} docs in roles collection.`);
            snap3.forEach(doc => {
                console.log("roles doc:", doc.id, "=>", JSON.stringify(doc.data()));
            });
        } catch (e) { console.log("roles error:", e.message); }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
