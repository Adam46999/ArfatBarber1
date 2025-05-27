import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// ✅ تم التحقق من صحة المفاتيح
const firebaseConfig = {
  apiKey: "AIzaSyCRpZf2RKFWk7aT8rF5CEEDVkjblJg5uC8",
  authDomain: "arfatbarber.firebaseapp.com",
  projectId: "arfatbarber",
  storageBucket: "arfatbarber.appspot.com", // ✅ تم التعديل
  messagingSenderId: "275175753990",
  appId: "1:275175753990:web:20bd913d8fef6da6c37687"
};

// ✅ تهيئة Firebase
const app = initializeApp(firebaseConfig);

// ✅ تصدير قواعد البيانات والمصادقة
export const db = getFirestore(app);
export const auth = getAuth(app);
