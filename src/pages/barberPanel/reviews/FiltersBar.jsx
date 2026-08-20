import { useState } from "react";

export default function FiltersBar({
  qText,
  setQText,
  stars,
  setStars,
  sortBy,
  setSortBy,
}) {
  const [open, setOpen] = useState(false);

  const hasFilters =
    String(qText || "").trim() !== "" ||
    stars !== "all" ||
    sortBy !== "newest";

  const starOptions = [
    { value: "all", label: "الكل" },
    { value: "5", label: "5★" },
    { value: "4", label: "4★" },
    { value: "3", label: "3★" },
    { value: "2", label: "2★" },
    { value: "1", label: "1★" },
  ];

  function clearFilters() {
    setQText("");
    setStars("all");
    setSortBy("newest");
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 p-2">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          className="
            flex min-w-0 flex-1 items-center justify-between
            rounded-xl px-2 py-2
            text-right transition
            hover:bg-slate-50
          "
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-sm">🔎</span>

            <span className="text-xs font-black text-slate-700">
              بحث وفلترة
            </span>

            {hasFilters ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black text-amber-800">
                مفعّل
              </span>
            ) : null}
          </div>

          <span className="shrink-0 text-[10px] font-black text-slate-400">
            {open ? "▲" : "▼"}
          </span>
        </button>

        {hasFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="
              shrink-0 rounded-xl
              px-2.5 py-2
              text-[10px] font-black text-slate-500
              transition hover:bg-slate-100 hover:text-slate-800
            "
          >
            مسح
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="border-t border-slate-100 p-3">
          <div className="relative">
            <input
              value={qText}
              onChange={(event) => setQText(event.target.value)}
              placeholder="ابحث بالاسم، الرقم أو التعليق..."
              className="
                w-full rounded-xl border border-slate-200
                bg-slate-50 px-3 py-2.5 pl-10
                text-sm font-semibold text-slate-900
                outline-none transition
                placeholder:text-slate-400
                focus:border-amber-300 focus:bg-white
                focus:ring-2 focus:ring-amber-100
              "
            />

            {qText ? (
              <button
                type="button"
                onClick={() => setQText("")}
                className="
                  absolute left-2 top-1/2 -translate-y-1/2
                  rounded-lg px-2 py-1
                  text-xs font-black text-slate-400
                  hover:bg-slate-200 hover:text-slate-700
                "
                aria-label="مسح البحث"
              >
                ✕
              </button>
            ) : null}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div
              data-horizontal-scroll
              className="
                flex min-w-0 flex-1 gap-1.5
                overflow-x-auto pb-0.5
              "
            >
              {starOptions.map((option) => {
                const active = stars === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStars(option.value)}
                    className={[
                      "shrink-0 rounded-xl border",
                      "px-3 py-2 text-xs font-black transition",
                      active
                        ? "border-amber-300 bg-amber-100 text-amber-900"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="
                shrink-0 rounded-xl border border-slate-200
                bg-white px-2 py-2
                text-xs font-black text-slate-700
                outline-none
              "
              aria-label="ترتيب التقييمات"
            >
              <option value="newest">الأحدث</option>
              <option value="highest">الأعلى</option>
              <option value="lowest">الأقل</option>
            </select>
          </div>
        </div>
      ) : null}
    </div>
  );
}
