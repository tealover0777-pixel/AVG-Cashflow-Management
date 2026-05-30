import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";

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

// Migration mapping definitions
const MAPPING = {
  // Current ID -> { targetId, targetCategory }
  "5nYtYeC1I69gJsWE1iiB": { targetId: "PaymentLag", targetCategory: "PaymentLag" },
  "ACHBatchStatus_New": { targetId: "ACHBatchStatus", targetCategory: "ACHBatchStatus" },
  "AmnyFBf8g6INkHCEtmYR": { targetId: "AssetType", targetCategory: "AssetType" },
  "BorrowerInvestmentEditType": { targetId: "BorrowerInvestmentEditType", targetCategory: "BorrowerInvestmentEditType" },
  "BorrowerInvestmentNewType": { targetId: "BorrowerInvestmentNewType", targetCategory: "BorrowerInvestmentNewType" },
  "CalculationMethod": { targetId: "CalculationMethod", targetCategory: "CalculationMethod" },
  "Calculator": { targetId: "CalculatorType", targetCategory: "CalculatorType" },
  "Currency": { targetId: "Currency", targetCategory: "Currency" },
  "DealStatus": { targetId: "DealStatus", targetCategory: "DealStatus" },
  "DealType": { targetId: "DealType", targetCategory: "DealType" },
  "E8ACFOysPagt95cTGAGp": { targetId: "EmailTags", targetCategory: "EmailTags" },
  "FeeChargeAt": { targetId: "FeeChargeAt", targetCategory: "FeeChargeAt" },
  "FeeFrequency": { targetId: "FeeFrequency", targetCategory: "FeeFrequency" },
  "FeeType": { targetId: "FeeType", targetCategory: "FeeType" },
  "IN_PaymentType": { targetId: "IN_PaymentType", targetCategory: "IN_PaymentType" },
  "IhgXHpbE70TCB8tNZjjE": { targetId: "EmailType", targetCategory: "EmailType" },
  "InvestmentStatus": { targetId: "InvestmentStatus", targetCategory: "InvestmentStatus" },
  "InvestorInvestmentEditType": { targetId: "InvestorInvestmentEditType", targetCategory: "InvestorInvestmentEditType" },
  "InvestorInvestmentNewType": { targetId: "InvestorInvestmentNewType", targetCategory: "InvestorInvestmentNewType" },
  "InvestorType": { targetId: "InvestorType", targetCategory: "InvestorType" },
  "OUT_PaymentType": { targetId: "OUT_PaymentType", targetCategory: "OUT_PaymentType" },
  "PartyRole": { targetId: "ContactRole", targetCategory: "ContactRole" },
  "PartyType": { targetId: "ContactType", targetCategory: "ContactType" },
  "PaymentFrequency": { targetId: "ScheduleFrequency", targetCategory: "ScheduleFrequency" },
  "PaymentMethod": { targetId: "PaymentMethod", targetCategory: "PaymentMethod" },
  "PaymentType": { targetId: "PaymentType", targetCategory: "PaymentType" },
  "Permissions": { targetId: "Permissions", targetCategory: "Permissions" },
  "Role": { targetId: "Role", targetCategory: "Role" },
  "TransactionPaymentStatus": { targetId: "PaymentStatus", targetCategory: "PaymentStatus" }
};

async function run() {
  try {
    await signInWithEmailAndPassword(auth, "kyuahn@yahoo.com", "Citib@nk2");
    console.log("Logged in successfully. Starting migration...");

    const qSnapshot = await getDocs(collection(db, "dimensions"));
    console.log(`Fetched ${qSnapshot.size} original dimension documents.`);

    for (const oldDoc of qSnapshot.docs) {
      const oldId = oldDoc.id;
      const oldData = oldDoc.data();
      const rule = MAPPING[oldId];

      if (!rule) {
        console.log(`⚠️ Document ID "${oldId}" not found in mapping rules. Skipping.`);
        continue;
      }

      const { targetId, targetCategory } = rule;
      
      // Resolve options or items array
      const rawArray = oldData.items || oldData.options || [];
      
      // Standardize the document fields
      const newDocData = {
        category: targetCategory,
        items: rawArray
      };

      // Preserve created_at, name (if any) or other fields if needed, except legacy options/name
      if (oldData.created_at) {
        newDocData.created_at = oldData.created_at;
      }
      if (oldData.last_updated) {
        newDocData.last_updated = oldData.last_updated;
      }

      console.log(`🚀 Migrating "${oldId}" -> target ID: "${targetId}" (Category: "${targetCategory}")`);
      
      // Write the standardized canonical document
      const targetDocRef = doc(db, "dimensions", targetId);
      await setDoc(targetDocRef, newDocData);

      // If document ID changed, delete the old document
      if (oldId !== targetId) {
        console.log(`🔥 Deleting old document "${oldId}"`);
        const oldDocRef = doc(db, "dimensions", oldId);
        await deleteDoc(oldDocRef);
      }
    }

    console.log("✅ Dimension standardization migration complete!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

run();
