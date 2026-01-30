// src/pages/barberPanel/reviews/SummaryCards.jsx
function StatCard({ title, value, hint }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
      <div className="text-xs text-gray-500 font-bold">{title}</div>
      <div className="mt-1 text-2xl font-black text-gray-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-gray-500">{hint}</div> : null}
    </div>
  );
}

export default function SummaryCards({ count, avg, byStar }) {
  const avgFixed = Number.isFinite(avg) ? avg.toFixed(2) : "0.00";
  const five = Number(byStar?.[5] || 0);
  const four = Number(byStar?.[4] || 0);
  const three = Number(byStar?.[3] || 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <StatCard
        title="عدد التقييمات"
        value={count}
        hint="التقييمات النشطة فقط"
      />
      <StatCard title="المتوسط" value={avgFixed} hint="حسب التقييمات النشطة" />
      <StatCard title="5 نجوم" value={five} />
      <StatCard title="4–3 نجوم" value={four + three} />
    </div>
  );
}
