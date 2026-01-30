// src/pages/barberPanel/reviews/TabsBar.jsx
export default function TabsBar({ tab, setTab, counts }) {
  const items = [
    { key: "reviews", label: "التقييمات", count: counts?.reviews ?? 0 },
    { key: "blocked", label: "الأرقام المحظورة", count: counts?.blocked ?? 0 },
    { key: "archived", label: "الأرشيف", count: counts?.archived ?? 0 },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-2 shadow-sm flex gap-2 justify-between">
      {items.map((it) => {
        const active = tab === it.key;
        return (
          <button
            key={it.key}
            onClick={() => setTab(it.key)}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-extrabold transition flex items-center justify-center gap-2
              ${active ? "bg-gold text-primary" : "bg-transparent hover:bg-gray-50 text-gray-800"}`}
          >
            <span>{it.label}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full border
              ${active ? "border-white/50 bg-white/20 text-primary" : "border-gray-200 bg-gray-50 text-gray-700"}`}
            >
              {it.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
