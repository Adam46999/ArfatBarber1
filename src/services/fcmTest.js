// src/services/fcmTest.js
//
// مجاني 100% (بدون سيرفر دائم وبدون Billing):
// - يجيب FCM token للجهاز (Web FCM)
// - يحفظ التوكن في Firestore (بدون تكرار)
// - ينشئ طلب Test Notification في Firestore (pending)
//   ليتم التقاطه وإرساله من GitHub Actions (Firebase Admin + Secret)

import { getMessaging, getToken } from "firebase/messaging";
import { app, db } from "../firebase";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

// ✅ نفس الـ VAPID KEY اللي عندك بالمشروع (App.jsx / useBookingSubmit.js)
const VAPID_KEY =
  "BMSKYpj6OfL2RinVjw4jUNlL-Hbi1Ev4eiTibIKlvFwqSULUm42ricVJRcKbptmiepuDbl3andf-F2tf7Cmr-U8";

// Collections
// نخزن الأجهزة (docId = token) لمنع duplicates
const DEVICE_TOKENS_COL = "deviceTokens";

// طلبات التيست (كل ضغط زر يعمل addDoc)
// GitHub Actions يقرأ pending ويرسل
const TEST_NOTIFS_COL = "testNotifications";

// ---------- identity helper (بدون فرض Auth) ----------
function getLocalIdentity() {
  try {
    const raw = localStorage.getItem("barberUser");
    if (raw) {
      const u = JSON.parse(raw);
      return {
        role: "barber",
        username: u?.username ? String(u.username) : null,
      };
    }
  } catch {
    // ignore
  }
  return { role: "unknown", username: null };
}

// ---------- permission helper ----------
export function getNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission; // "granted" | "denied" | "default"
}

// ---------- token ----------
/**
 * يطلب إذن الإشعارات + يرجع FCM token
 * يرجع null إذا المستخدم رفض أو ما طلع token
 */
export async function getOrRequestFcmToken() {
  if (!("Notification" in window)) {
    throw new Error("Notifications are not supported in this browser.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const messaging = getMessaging(app);

  // ملاحظة: getToken قد يرمي خطأ إذا SW أو إعدادات Web Push مش جاهزة
  const token = await getToken(messaging, { vapidKey: VAPID_KEY });

  if (token) {
    try {
      localStorage.setItem("fcmToken", token);
    } catch {
      // ignore
    }
  }

  return token || null;
}

/**
 * يحفظ token في Firestore إذا لم يكن موجودًا (docId = token)
 * يرجع { token, existed }
 */
export async function saveDeviceToken(token) {
  if (!token) throw new Error("Missing FCM token.");

  const ident = getLocalIdentity();
  const ref = doc(db, "deviceTokens", token);

  // اكتب مباشرة بدون قراءة
  await setDoc(
    ref,
    {
      token,
      requestedRole: ident.role,
      username: ident.username,
      userAgent: navigator.userAgent || null,
      platform: navigator.platform || null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }, // يسمح بإعادة الكتابة
  );

  return { token, existed: null };
}

// ---------- test request ----------
/**
 * ينشئ طلب إشعار تجريبي (pending) في Firestore
 * هذا هو الاسم اللي NotificationTestCard.jsx بستوردو
 */
export async function createTestNotificationRequest(token, payload) {
  if (!token) throw new Error("Missing FCM token.");

  const ident = getLocalIdentity();

  const title = payload?.title || "🧪 Test Notification";
  const body =
    payload?.body || "If you received this, Notifications pipeline works ✅";

  const data = payload?.data || {};

  const docRef = await addDoc(collection(db, TEST_NOTIFS_COL), {
    status: "pending", // pending | sent | failed
    token,
    notification: { title, body },
    data,
    role: ident.role,
    username: ident.username,
    createdAt: serverTimestamp(),
  });

  return { id: docRef.id };
}
