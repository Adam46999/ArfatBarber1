// src/pages/barberPanel/components/NotificationTestCard.jsx
import React, { useMemo, useState } from "react";
import {
  createTestNotificationRequest,
  getNotificationPermission,
  getOrRequestFcmToken,
  saveDeviceToken,
} from "../../../services/fcmTest";

function Pill({ tone = "neutral", children }) {
  const cls =
    tone === "success"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : tone === "danger"
        ? "bg-rose-50 text-rose-800 border-rose-200"
        : tone === "info"
          ? "bg-sky-50 text-sky-800 border-sky-200"
          : "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <span
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-black border ${cls}`}
    >
      {children}
    </span>
  );
}

export default function NotificationTestCard() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const perm = useMemo(() => getNotificationPermission(), []);

  const permPill = useMemo(() => {
    if (perm === "unsupported") return <Pill tone="danger">غير مدعوم</Pill>;
    if (perm === "granted") return <Pill tone="success">مفعّل</Pill>;
    if (perm === "denied") return <Pill tone="danger">مرفوض</Pill>;
    return <Pill tone="info">مش مقرر</Pill>; // default
  }, [perm]);

  const clearMsgSoon = () => {
    setTimeout(() => setMsg(null), 3500);
  };

  const ensureTokenAndSave = async () => {
    const token = await getOrRequestFcmToken();
    if (!token) {
      setMsg({ tone: "danger", text: "تم رفض الإذن أو ما في Token." });
      clearMsgSoon();
      return null;
    }
    await saveDeviceToken(token);
    return token;
  };

  const onEnable = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const token = await ensureTokenAndSave();
      if (token) {
        setMsg({
          tone: "success",
          text: "جاهز ✅ تم تفعيل الإشعارات وحفظ التوكن.",
        });
        clearMsgSoon();
      }
    } catch (e) {
      setMsg({
        tone: "danger",
        text: e?.message || "صار خطأ أثناء تفعيل الإشعارات.",
      });
    } finally {
      setBusy(false);
    }
  };

  const onTest = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const token = await ensureTokenAndSave();
      if (!token) return;

      const { id } = await createTestNotificationRequest(token, {
        title: "🧪 Test Notification (Barber)",
        body: "إذا وصلتك، معناها الـ FCM pipeline شغّال ✅",
        data: { kind: "barber_test" },
      });

      setMsg({
        tone: "success",
        text: `تم إنشاء طلب تيست ✅ (id: ${id}). رح ينرسل مع GitHub Actions.`,
      });
      clearMsgSoon();
    } catch (e) {
      setMsg({
        tone: "danger",
        text: e?.message || "صار خطأ أثناء إنشاء طلب التيست.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-black text-slate-900">الإشعارات</div>
          <div className="text-xs text-slate-500">
            تفعيل + اختبار إرسال إشعار تجريبي (بدون حجز)
          </div>
        </div>
        {permPill}
      </div>

      {msg ? (
        <div
          className={`mt-3 rounded-xl border px-3 py-2 text-xs font-bold ${
            msg.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {msg.text}
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={busy}
          onClick={onEnable}
          className={`w-full sm:w-auto rounded-xl px-4 py-2 text-sm font-black border ${
            busy
              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
              : "bg-slate-900 text-white border-slate-900 hover:opacity-90"
          }`}
        >
          تفعيل الإشعارات / تحديث التوكن
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={onTest}
          className={`w-full sm:w-auto rounded-xl px-4 py-2 text-sm font-black border ${
            busy
              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
              : "bg-white text-slate-900 border-slate-300 hover:bg-slate-50"
          }`}
        >
          🧪 Test Notification
        </button>
      </div>

      <div className="mt-3 text-[11px] text-slate-500 leading-5">
        ملاحظة: الإرسال الفعلي بيتم من GitHub Actions (Firebase Admin)، مش من
        المتصفح.
      </div>
    </div>
  );
}
