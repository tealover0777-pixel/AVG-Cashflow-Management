import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

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
export const db = getFirestore(app);
export const auth = getAuth(app);
