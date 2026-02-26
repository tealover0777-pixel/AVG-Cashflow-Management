import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAD8G1WvI0SniOw5qvt_RrYIy5PkhF01Js",
    authDomain: "avg-cashflow-management.firebaseapp.com",
    databaseURL: "https://avg-cashflow-management-default-rtdb.firebaseio.com",
    projectId: "avg-cashflow-management",
    storageBucket: "avg-cashflow-management.firebasestorage.app",
    messagingSenderId: "807377679425",
    appId: "1:807377679425:web:0008a3fe0f4ac6c3ffc2c0",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const permissionsList = [
    "TENANT_CREATE", "TENANT_VIEW", "TENANT_UPDATE", "TENANT_DELETE",
    "USER_CREATE", "USER_INVITE", "USER_VIEW", "USER_UPDATE", "USER_DELETE",
    "PROJECT_CREATE", "PROJECT_VIEW", "PROJECT_UPDATE", "PROJECT_DELETE",
    "MEMBER_CREATE", "MEMBER_VIEW", "MEMBER_UPDATE", "MEMBER_DELETE",
    "CONTRACT_CREATE", "CONTRACT_VIEW", "CONTRACT_UPDATE", "CONTRACTS_DELETE",
    "PAYMENT_SCHEDULE_CREATE", "PAYMENT_SCHEDULE_VIEW", "PAYMENT_SCHEDULE_UPDATE", "PAYMENT_SCHEDULE_DELETE",
    "FEE_CREATE", "FEE_VIEW", "FEE_UPDATE", "FEE_DELETE",
    "DIMENTION_CREATE", "DIMENTION_VIEW", "DIMENTION_UPDATE", "DIMENTION_DELETE",
    "REPORT_CREATE", "REPORT_VIEW", "REPORT_EXPORT", "REPORT_UPDATE", "REPORT_DELETE",
    "PLATFORM_TENANT_CREATE", "PLATFORM_TENANT_DELETE", "PLATFORM_TENANT_VIEW", "PLATFORM_TENANT_UPDATE"
];

async function seed() {
    try {
        await setDoc(doc(db, "dimensions", "Permissions"), {
            name: "Permissions",
            items: permissionsList,
            category: "Permissions"
        });
        console.log("Successfully seeded Permissions dimension.");
        process.exit(0);
    } catch (error) {
        console.error("Error seeding:", error);
        process.exit(1);
    }
}

seed();
