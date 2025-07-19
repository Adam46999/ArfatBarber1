import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";


import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export default function BlockedPhones() { 
    const navigate = useNavigate();

  const [blockedPhones, setBlockedPhones] = useState([]);
  const [newPhone, setNewPhone] = useState("");

  const fetchBlockedPhones = async () => {
    const snapshot = await getDocs(collection(db, "blockedPhones"));
    const phones = snapshot.docs.map((doc) => ({
      number: doc.id,
    }));
    setBlockedPhones(phones);
  };

  useEffect(() => {
    fetchBlockedPhones();
  }, []);

  const addPhone = async () => {
    const clean = newPhone.replace(/\D/g, "");
    if (clean.length !== 10 || !clean.startsWith("05")) {
      alert("❌ يجب إدخال رقم صحيح يبدأ بـ 05 ويتكون من 10 أرقام.");
      return;
    }
    console.log("🚀 Adding phone:", clean);

    await setDoc(doc(db, "blockedPhones", clean), { blockedAt: Date.now() });
    setNewPhone("");
    fetchBlockedPhones();
  };

  const removePhone = async (phone) => {
    await deleteDoc(doc(db, "blockedPhones", phone));
    fetchBlockedPhones();
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded shadow mt-24">
    <button
  onClick={() => navigate(-1)}
  className="text-blue-600 hover:underline text-sm mb-4 flex items-center gap-1"
>
  <span className="text-lg">←</span>
  <span>الرجوع</span>
</button>

      <h2 className="text-xl font-bold text-gold mb-4">📵 الأرقام المحظورة</h2>

      <div className="flex gap-2 mb-4">
        <input
          type="tel"
          placeholder="05X-XXXXXXX"
          value={newPhone}
          onChange={(e) => setNewPhone(e.target.value)}
          className="flex-1 p-2 border border-gray-300 rounded"
        />
        <button
          onClick={addPhone}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          إضافة
        </button>
      </div>

      {blockedPhones.length === 0 ? (
        <p className="text-gray-500">لا يوجد أرقام محظورة حاليًا.</p>
      ) : (
        <ul className="space-y-2">
          {blockedPhones.map((item) => (
            <li
              key={item.number}
              className="flex justify-between items-center bg-gray-50 px-3 py-2 border rounded"
            >
              <span className="font-mono">{item.number}</span>
              <button
                onClick={() => removePhone(item.number)}
                className="text-sm text-red-600 hover:underline"
              >
                فك الحظر
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
