import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, updatePassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAD8G1WvI0SniOw5qvt_RrYIy5PkhF01Js",
  authDomain: "avg-cashflow-management.firebaseapp.com",
  projectId: "avg-cashflow-management",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// NOTE: Without the user's current password I cannot sign in to change it via the client SDK. 
// However, the Firebase CLI `auth:import` allows hash inputs.
