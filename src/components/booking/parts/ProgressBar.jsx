// src/components/booking/ProgressBar.jsx
export default function ProgressBar({ progress, step, t }) {
  return (
    <div className="flex justify-between items-center mb-6">
      <div className="flex-1 h-1 bg-gray-300 rounded-full">
        <div
          className="h-1 rounded-full transition-all duration-300 bg-gold"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="ml-4 text-sm font-semibold text-gray-600">
        {t("step") || "Step"} {step} / 5
      </div>
    </div>
  );
}
