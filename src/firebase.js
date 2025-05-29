// ✅ firebase.js

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// ✅ هذا التكوين مأخوذ من إعدادات Firebase الرسمية
const firebaseConfig = {
  apiKey: "AIzaSyCRpZf2RKFWk7aT8rF5CEEDVkjblJg5uC8",
  authDomain: "arfatbarber.firebaseapp.com",
  projectId: "arfatbarber",
  storageBucket: "arfatbarber.appspot.com", // ✅ تصحيح هنا
  messagingSenderId: "275175753990",
  appId: "1:275175753990:web:20bd913d8fef6da6c37687",
  measurementId: "G-5SK9SHENGX"
};

// ✅ تهيئة التطبيق
const app = initializeApp(firebaseConfig);

// ✅ خدمات Firebase
export const db = getFirestore(app);
export const auth = getAuth(app);
export { app };
