// scripts/notifications/sendFcm.js

/**
 * هذا الملف مسؤول فقط عن:
 * - إرسال إشعارات FCM
 * - دعم إرسال متعدد (multicast)
 * - تنظيف tokens غير الصالحة
 *
 * لا يوجد Firestore هنا
 * لا يوجد Templates
 */

import { getAdmin } from "./firebaseAdmin.js";

/**
 * إرسال إشعار لمجموعة tokens
 * @param {string[]} tokens
 * @param {{ title: string, body: string, data?: Record<string,string> }} payload
 */
export async function sendToTokens(tokens, payload) {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return { sent: 0, invalid: [] };
  }

  const admin = getAdmin();
  const messaging = admin.messaging();

  // FCM يسمح بحد أقصى 500 token في الإرسال الواحد
  const chunks = [];
  for (let i = 0; i < tokens.length; i += 500) {
    chunks.push(tokens.slice(i, i + 500));
  }

  let sent = 0;
  const invalid = [];

  for (const chunk of chunks) {
    const res = await messaging.sendEachForMulticast({
      tokens: chunk,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
    });

    sent += res.successCount;

    // جمع الـ tokens غير الصالحة
    res.responses.forEach((r, idx) => {
      if (!r.success) {
        const code = r.error?.code || "";
        if (
          code.includes("registration-token-not-registered") ||
          code.includes("invalid-argument")
        ) {
          invalid.push(chunk[idx]);
        }
      }
    });
  }

  return { sent, invalid };
}
