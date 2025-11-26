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
import {
  toILPhoneE164,
  isILPhoneE164,
  e164ToLocalPretty,
} from "../utils/phone";

export default function BlockedPhones() {
  const navigate = useNavigate();
  const [blockedPhones, setBlockedPhones] = useState([]);
  const [newPhone, setNewPhone] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const fetchBlockedPhones = async () => {
    const snapshot = await getDocs(collection(db, "blockedPhones"));
    const phones = snapshot.docs.map((d) => ({ number: d.id }));
    setBlockedPhones(phones);
  };

  useEffect(() => {
    fetchBlockedPhones();
  }, []);

  const addPhone = async () => {
    setError("");
    setInfo("");

    const p = toILPhoneE164(newPhone.trim());
    if (!isILPhoneE164(p)) {
      setError("أدخل رقمًا صالحًا بصيغة 05XXXXXXXX أو +9725XXXXXXXX.");
      return;
    }

    await setDoc(doc(db, "blockedPhones", p), { blockedAt: Date.now() });
    setNewPhone("");
    setInfo("تم حظر الرقم بنجاح.");
    fetchBlockedPhones();
  };

  const removePhone = async (phone) => {
    setError("");
    setInfo("");
    await deleteDoc(doc(db, "blockedPhones", phone));
    setInfo("تم فك الحظر عن الرقم.");
    fetchBlockedPhones();
  };

  return (
    <div className="min-h-screen bg-gray-100 pt-24 px-4" dir="rtl">
      <div className="max-w-3xl mx-auto">
        {/* الكارد الرئيسي */}
        <div className="bg-white shadow-xl rounded-2xl border border-gray-200 p-8">
          {/* العنوان + الرجوع */}
          <div className="flex flex-row-reverse items-center justify-between mb-6">
            <button
              onClick={() => navigate(-1)}
              className="text-sm flex items-center gap-1 text-gray-600 hover:text-gray-800 transition"
            >
              <span className="text-lg">←</span> الرجوع
            </button>

            <div className="flex items-center gap-2">
              <span className="text-3xl">📵</span>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  الأرقام المحظورة
                </h1>
                <p className="text-xs text-gray-500">
                  إدارة الأرقام الممنوعة من الحجز
                </p>
              </div>
            </div>
          </div>

          {/* إضافة رقم */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6">
            <label className="block text-sm font-medium mb-2 text-gray-700">
              إضافة رقم جديد إلى قائمة الحظر
            </label>

            <div className="flex flex-col md:flex-row gap-3">
              <input
                type="tel"
                placeholder="05X-XXXXXXX أو +9725XXXXXXXX"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none"
              />
              <button
                onClick={addPhone}
                disabled={!newPhone.trim()}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                إضافة
              </button>
            </div>

            {error && (
              <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                ⚠️ {error}
              </p>
            )}

            {info && !error && (
              <p className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                ✅ {info}
              </p>
            )}
          </div>

          {/* الأرقام المحظورة */}
          {blockedPhones.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <div className="text-4xl mb-2">😌</div>
              لا يوجد أرقام محظورة حاليًا.
            </div>
          ) : (
            <>
              <div className="text-xs text-gray-600 mb-3">
                عدد الأرقام المحظورة:{" "}
                <span className="font-semibold text-gray-800">
                  {blockedPhones.length}
                </span>
              </div>

              <ul className="space-y-3">
                {blockedPhones.map((item) => (
                  <li
                    key={item.number}
                    className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm"
                  >
                    <span className="font-mono text-gray-900">
                      {e164ToLocalPretty(item.number)}
                    </span>

                    <button
                      onClick={() => removePhone(item.number)}
                      className="text-red-600 hover:text-red-700 hover:underline text-xs font-medium"
                    >
                      فك الحظر
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
