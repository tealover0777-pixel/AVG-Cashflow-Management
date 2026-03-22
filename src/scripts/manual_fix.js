import { db } from "./src/firebase";
import { doc, updateDoc } from "firebase/firestore";

async function main() {
  const docRef = doc(db, "tenants/T10001/investments/I10023");
  await updateDoc(docRef, {
    deal_id: "D10001",
    deal_name: "PArl Spring Vilas"
  });
  console.log("Updated I10023 successfully");
}

main().catch(console.error);
