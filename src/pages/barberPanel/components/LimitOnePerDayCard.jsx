// src/pages/barberPanel/components/LimitOnePerDayCard.jsx
export default function LimitOnePerDayCard({
  limitOnePerDay,
  loadingSettings,
  savingSettings,
  onToggle,
}) {
  return (
    <div className="max-w-3xl mx-auto mt-6">
      <div className="bg-white rounded-2xl shadow p-4 border border-gray-200 text-center">
        <h2 className="text-sm font-semibold text-gray-800 mb-2">
          وضع حجز واحد لكل رقم / يوم
        </h2>

        <div className="flex items-center justify-center gap-4 mb-2">
          <span className="text-xs font-semibold text-gray-700">
            {limitOnePerDay ? "مُفَعَّل" : "مُعَطَّل"}
          </span>

          <button
            type="button"
            onClick={onToggle}
            disabled={loadingSettings || savingSettings}
            className="disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div
              className={`relative w-16 h-8 rounded-full transition-colors flex items-center ${
                limitOnePerDay ? "bg-emerald-500" : "bg-gray-300"
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-7 h-7 rounded-full bg-white shadow-md transition-transform ${
                  limitOnePerDay ? "translate-x-8" : "translate-x-0"
                }`}
              />
            </div>
          </button>
        </div>

        <p className="text-xs text-gray-500">
          {limitOnePerDay
            ? "مُفعَّل: لا يمكن لنفس الرقم حجز أكثر من موعد في نفس اليوم."
            : "مُعطَّل: يمكن لنفس الرقم حجز أكثر من موعد في نفس اليوم."}
        </p>
      </div>
    </div>
  );
}
