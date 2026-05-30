import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, deleteDoc } from "firebase/firestore";

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

const richPaymentTypes = [
  { value: "INVESTOR_PRINCIPAL_DEPOSIT", label: "Investor Principal Deposit", direction: "IN" },
  { value: "INVESTOR_ROLLOVER", label: "Investor Rollover", direction: "IN" },
  { value: "FEE", label: "Fee", direction: "IN" },
  { value: "BORROWER_PRINCIPAL_RECEIVED", label: "Borrower Principal Received", direction: "IN" },
  { value: "BORROWER_INTEREST_PAYMENT", label: "Borrower Interest Payment", direction: "IN" },
  
  { value: "INVESTOR_WITHDRAWAL", label: "Investor Withdrawal", direction: "OUT" },
  { value: "INVESTOR_INTEREST_PAYMENT", label: "Investor Interest Payment", direction: "OUT" },
  { value: "INVESTOR_PRINCIPAL_PAYMENT", label: "Investor Principal Payment", direction: "OUT" },
  { value: "BORROWER_DISBURSEMENT", label: "Borrower Disbursement", direction: "OUT" },
  
  { value: "INVESTOR_INTEREST_ACCRUAL", label: "Investor Interest Accrual", direction: "BOTH" },
  { value: "BORROWER_INTEREST_PAYMENT_ACCRUAL", label: "Borrower Interest Payment Accrual", direction: "BOTH" },
  { value: "BORROWER_INTEREST_PAYMENT_RECEIVED", label: "Borrower Interest Payment Received", direction: "BOTH" }
];

async function run() {
  try {
    await signInWithEmailAndPassword(auth, "kyuahn@yahoo.com", "Citib@nk2");
    console.log("Logged in successfully. Starting Phase 3 migration...");

    // 1. Overwrite PaymentType with rich objects
    console.log("Updating PaymentType document to rich objects...");
    await setDoc(doc(db, "dimensions", "PaymentType"), {
      category: "PaymentType",
      items: richPaymentTypes,
      last_updated: new Date()
    });

    // 2. Delete legacy IN_PaymentType and OUT_PaymentType documents
    console.log("Deleting legacy IN_PaymentType document...");
    await deleteDoc(doc(db, "dimensions", "IN_PaymentType"));

    console.log("Deleting legacy OUT_PaymentType document...");
    await deleteDoc(doc(db, "dimensions", "OUT_PaymentType"));

    console.log("✅ Phase 3 Firestore migration complete!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Phase 3 migration failed:", err);
    process.exit(1);
  }
}

run();
