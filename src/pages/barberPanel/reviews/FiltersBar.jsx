// src/pages/barberPanel/reviews/FiltersBar.jsx
export default function FiltersBar({
  qText,
  setQText,
  stars,
  setStars,
  sortBy,
  setSortBy,
  onRefresh,
  loading,
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          value={qText}
          onChange={(e) => setQText(e.target.value)}
          placeholder="بحث بالاسم / الرقم / النص..."
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-right focus:ring-2 focus:ring-gold bg-white"
        />

        <select
          value={stars}
          onChange={(e) => setStars(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-right bg-white"
        >
          <option value="all">كل النجوم</option>
          <option value="5">5 نجوم</option>
          <option value="4">4 نجوم</option>
          <option value="3">3 نجوم</option>
          <option value="2">2 نجوم</option>
          <option value="1">1 نجمة</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-right bg-white"
        >
          <option value="newest">الأحدث</option>
          <option value="highest">الأعلى تقييمًا</option>
          <option value="lowest">الأقل تقييمًا</option>
        </select>

        <button
          onClick={onRefresh}
          disabled={loading}
          className={`rounded-xl px-4 py-2 font-extrabold border transition
            ${loading ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50"}
            bg-white border-gray-200`}
        >
          {loading ? "جارٍ التحديث..." : "تحديث"}
        </button>
      </div>
    </div>
  );
}
