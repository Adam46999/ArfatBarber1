// src/components/booking/OpeningStatusCard.jsx
export default function OpeningStatusCard({ t, status, workingHours }) {
  let textColor = "text-red-600";
  let message = t("closed_today");

  if (status === "open") {
    textColor = "text-green-600";
    message = t("open_now");
  } else if (status === "opening_soon") {
    textColor = "text-yellow-600";
    message = "سنفتح قريبًا";
  } else if (status === "closing_soon") {
    textColor = "text-yellow-600";
    message = "سنغلق قريبًا";
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-md mb-6">
      <h3 className="text-lg font-bold text-gold mb-2 flex items-center gap-2">
        <span>🕒</span> {t("working_hours")}
      </h3>

      <p className={`mb-3 text-sm font-semibold ${textColor}`}>{message}</p>

      <div className="divide-y divide-gray-100 border-t border-gray-100 pt-3">
        {Object.entries(workingHours).map(([day, hours]) => (
          <div
            key={day}
            className="flex justify-between py-2 text-sm font-medium text-gray-700"
          >
            <span className="capitalize">{t(day.toLowerCase())}</span>
            {hours ? (
              <span className="text-gray-900">
                {hours.from} – {hours.to}
              </span>
            ) : (
              <span className="text-red-600">{t("closed")}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
