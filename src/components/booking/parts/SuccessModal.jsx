import { useState } from "react";

import { getOrRequestFcmToken } from "../../../services/fcmTest";
import { attachFcmTokenToBooking } from "../../../services/bookingService";

export default function SuccessModal({
  visible,
  onClose,
  code,
  booking,
  t,
  title = "",
  oldDate = "",
  oldTime = "",
  newDate = "",
  newTime = "",
  codeNote = "",
}) {
  const [copied, setCopied] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState("idle");

  if (!visible) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // تجاهل بهدوء
    }
  };

  const handleEnableNotifications = async () => {
    if (!booking?.id || notificationStatus === "enabling") return;

    setNotificationStatus("enabling");

    try {
      if (!("Notification" in window)) {
        setNotificationStatus("unsupported");
        return;
      }

      const token = await getOrRequestFcmToken();

      if (!token) {
        setNotificationStatus(
          Notification.permission === "denied" ? "denied" : "error",
        );
        return;
      }

      await attachFcmTokenToBooking(booking.id, token);

      setNotificationStatus("enabled");
    } catch (error) {
      console.warn("Customer notification setup failed:", error);
      setNotificationStatus("error");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative mx-4 flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-green-400 bg-white px-6 py-8 text-center text-lg text-green-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-xl font-bold text-gray-500 hover:text-red-600"
          aria-label="إغلاق"
        >
          ×
        </button>

        <div className="text-xl font-bold">✅ {title || t("thank_you")}</div>

        {oldDate && newDate ? (
          <div className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 text-right">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold text-gray-500">الموعد السابق</p>
                <p className="mt-1 font-bold text-gray-800">{oldDate}</p>
                <p className="text-sm text-gray-600">الساعة {oldTime}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-green-700">الموعد الجديد</p>
                <p className="mt-1 font-bold text-gray-800">{newDate}</p>
                <p className="text-sm text-gray-600">الساعة {newTime}</p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-2 rounded-lg border border-dashed border-green-500 bg-green-100 px-4 py-2 text-base font-semibold text-gray-800">
          🔐 {t("your_code")}: <span className="font-mono">{code}</span>

          <button
            onClick={handleCopy}
            className="ml-2 rounded bg-green-600 px-2 py-1 text-xs text-white transition hover:bg-green-700"
          >
            {copied ? "✅ تم النسخ!" : "نسخ"}
          </button>
        </div>

        {codeNote ? (
          <p className="text-sm font-bold text-green-800">{codeNote}</p>
        ) : null}

        <p className="text-sm text-gray-600">
          احتفظ بهذا الكود لتعديل أو إلغاء الحجز لاحقًا.
        </p>

        {booking?.id ? (
          <div className="w-full rounded-2xl border border-[#d9c58d] bg-[#fffaf0] p-4">
            {notificationStatus === "enabled" ? (
              <div className="text-sm font-extrabold text-green-700">
                ✅ تم تفعيل تذكيرات هذا الموعد
              </div>
            ) : (
              <>
                <p className="mb-3 text-sm font-bold text-gray-700">
                  بدك نذكّرك قبل موعدك؟
                </p>

                <button
                  type="button"
                  onClick={handleEnableNotifications}
                  disabled={notificationStatus === "enabling"}
                  className="min-h-[50px] w-full rounded-xl bg-[#b98b32] px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60"
                >
                  {notificationStatus === "enabling"
                    ? "جارٍ التفعيل..."
                    : "🔔 فعّل تذكيرات موعدي"}
                </button>

                {notificationStatus === "denied" ? (
                  <p className="mt-3 text-xs font-bold text-red-600">
                    تم رفض الإشعارات من المتصفح. يمكنك السماح بها من إعدادات الموقع.
                  </p>
                ) : null}

                {notificationStatus === "unsupported" ? (
                  <p className="mt-3 text-xs font-bold text-amber-700">
                    هذا المتصفح لا يدعم إشعارات الموقع.
                  </p>
                ) : null}

                {notificationStatus === "error" ? (
                  <p className="mt-3 text-xs font-bold text-red-600">
                    تعذر تفعيل التذكيرات الآن. حجزك مؤكد ولم يتأثر.
                  </p>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}