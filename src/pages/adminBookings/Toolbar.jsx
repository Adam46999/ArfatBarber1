// src/pages/adminBookings/Toolbar.jsx
import { useState } from "react";
import {
  FaSearch,
  FaFilter,
  FaTimes,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";

export default function Toolbar({
  searchTerm,
  setSearchTerm,
  serviceFilter,
  setServiceFilter,
  sortMode,
  setSortMode,
  compactMode,
  setCompactMode,
}) {
  // ✅ افتراضيًا مغلق (حسب طلبك)
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* ✅ Bar صغير (بنفس روح ارتفاع الدور المضغوط) */}
      <div className="px-3 py-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((s) => !s)}
          className="inline-flex items-center gap-2 text-sm font-extrabold text-gray-900"
          aria-label="فتح/إغلاق أدوات البحث"
        >
          {open ? (
            <FaChevronUp className="opacity-70" />
          ) : (
            <FaChevronDown className="opacity-70" />
          )}
          أدوات البحث
          {searchTerm.trim() ||
          serviceFilter !== "all" ||
          sortMode !== "soonest" ? (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900">
              مفعّل
            </span>
          ) : null}
        </button>

        {/* Compact toggle (يبقى ظاهر دائمًا) */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-gray-600">مضغوط</span>
          <button
            type="button"
            onClick={() => setCompactMode((s) => !s)}
            aria-label="تبديل العرض المضغوط"
            title="تبديل العرض"
          >
            <div
              className={`relative w-14 h-7 rounded-full transition-colors flex items-center ${
                compactMode ? "bg-emerald-500" : "bg-gray-300"
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
                  compactMode ? "translate-x-7" : "translate-x-0"
                }`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* ✅ المحتوى القابل للفتح */}
      {open && (
        <div className="border-t border-gray-200 bg-gray-50 p-3 rounded-b-2xl">
          <div className="flex flex-col gap-3">
            {/* Search */}
            <div>
              <label className="text-[11px] text-gray-500 flex items-center gap-2 mb-1">
                <FaSearch className="opacity-70" />
                بحث سريع (اسم / هاتف)
              </label>

              <div className="relative">
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="اكتب اسم الزبون أو رقم الهاتف..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200 bg-white"
                  aria-label="بحث بالاسم أو رقم الهاتف"
                />

                {searchTerm.trim() && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                    aria-label="مسح البحث"
                    title="مسح"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-gray-500 flex items-center gap-2 mb-1">
                  <FaFilter className="opacity-70" />
                  الخدمة
                </label>
                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-gray-200"
                  aria-label="فلترة حسب الخدمة"
                >
                  <option value="all">الكل</option>
                  <option value="haircut">قص شعر</option>
                  <option value="beard">تعليم لحية</option>
                  <option value="both">قص + لحية</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-gray-500 mb-1 block">
                  الترتيب
                </label>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-gray-200"
                  aria-label="ترتيب الحجوزات"
                >
                  <option value="soonest">أقرب موعد</option>
                  <option value="newest">أحدث حجز</option>
                </select>
              </div>
            </div>

            {/* Quick reset */}
            {(searchTerm.trim() ||
              serviceFilter !== "all" ||
              sortMode !== "soonest") && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setServiceFilter("all");
                  setSortMode("soonest");
                }}
                className="w-full rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-sm font-bold py-2"
              >
                تصفير الأدوات
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
