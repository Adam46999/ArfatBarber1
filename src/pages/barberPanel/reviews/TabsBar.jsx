export default function TabsBar({ tab, setTab, counts }) {
  const items = [
    {
      key: "reviews",
      label: "تقييمات",
      count: counts?.reviews ?? 0,
    },
    {
      key: "blocked",
      label: "محظورون",
      count: counts?.blocked ?? 0,
    },
    {
      key: "archived",
      label: "مخفية",
      count: counts?.archived ?? 0,
    },
  ];

  return (
    <div
      className="
        grid grid-cols-3 gap-1
        rounded-2xl bg-slate-100 p-1
      "
    >
      {items.map((item) => {
        const active = tab === item.key;

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={[
              "flex min-w-0 items-center justify-center gap-1.5",
              "rounded-xl px-2 py-2.5",
              "text-xs font-black transition",
              active
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-500 hover:text-slate-800",
            ].join(" ")}
          >
            <span className="truncate">{item.label}</span>

            <span
              className={[
                "shrink-0 rounded-full px-1.5 py-0.5",
                "text-[9px] font-black",
                active
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-200 text-slate-600",
              ].join(" ")}
            >
              {item.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
