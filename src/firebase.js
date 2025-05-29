import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCRp2f2RKFWk7aT8rF5CEEDvkjblJg5uC8",
  authDomain: "arfatbarber.firebaseapp.com",
  projectId: "arfatbarber",
  storageBucket: "arfatbarber.appspot.com",
  messagingSenderId: "275175753990",
  appId: "1:275175753990:web:20bd913d8fef6da6c37687",
};

const app = initializeApp(firebaseConfig); // 👈 لازم نصدره
export const db = getFirestore(app);
export const auth = getAuth(app);
export { app }; // ✅ هذا السطر يحل المشكلة
