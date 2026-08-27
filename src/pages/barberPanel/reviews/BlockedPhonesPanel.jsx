import { useMemo, useState } from "react";
import {
  Ban,
  Check,
  Copy,
  Search,
  ShieldAlert,
  ShieldOff,
  X,
} from "lucide-react";

import { e164ToLocalPretty } from "../../../utils/phone";

function formatBlockedAt(value) {
  if (!value) return "";

  try {
    const date = value?.toDate
      ? value.toDate()
      : value instanceof Date
        ? value
        : new Date(value);

    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return "";
    }

    return new Intl.DateTimeFormat("ar", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  } catch {
    return "";
  }
}

function normalizeSearch(value) {
  return String(value || "").replace(/\D/g, "");
}

export default function BlockedPhonesPanel({
  blocked,
  loading,
  onUnblock,
}) {
  const [search, setSearch] = useState("");
  const [copiedPhone, setCopiedPhone] = useState("");
  const [confirmPhone, setConfirmPhone] = useState("");

  const items = Array.isArray(blocked) ? blocked : [];

  const filteredItems = useMemo(() => {
    const query = normalizeSearch(search);

    if (!query) {
      return items;
    }

    return items.filter((item) => {
      const phoneKey = String(item.phoneKey || item.id || "");
      const prettyPhone = e164ToLocalPretty(phoneKey) || phoneKey;

      return (
        normalizeSearch(phoneKey).includes(query) ||
        normalizeSearch(prettyPhone).includes(query)
      );
    });
  }, [items, search]);

  async function handleCopy(phoneKey) {
    try {
      const prettyPhone = e164ToLocalPretty(phoneKey) || phoneKey;

      await navigator.clipboard.writeText(prettyPhone);
      setCopiedPhone(phoneKey);

      window.setTimeout(() => {
        setCopiedPhone((current) => (current === phoneKey ? "" : current));
      }, 1800);
    } catch {
      // لا نوقف تجربة الصفحة إذا النسخ غير مدعوم.
    }
  }

  function handleRequestUnblock(phoneKey) {
    setConfirmPhone(phoneKey);
  }

  function handleCancelUnblock() {
    setConfirmPhone("");
  }

  function handleConfirmUnblock(phoneKey) {
    setConfirmPhone("");
    onUnblock(phoneKey);
  }

  if (loading && items.length === 0) {
    return (
      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="animate-pulse p-5 sm:p-6">
          <div className="h-5 w-36 rounded-lg bg-slate-200" />
          <div className="mt-3 h-3 w-56 max-w-full rounded-lg bg-slate-100" />

          <div className="mt-6 space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-24 rounded-2xl border border-slate-100 bg-slate-50"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col items-center px-5 py-10 text-center sm:px-8 sm:py-12">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <ShieldOff className="h-7 w-7" aria-hidden="true" />
          </div>

          <h3 className="mt-4 text-base font-black text-slate-900">
            قائمة المحظورين فارغة
          </h3>

          <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-slate-500">
            ما في أي زبون محظور حاليًا. أي رقم بتحظره من التقييمات رح يظهر هون
            تلقائيًا.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-4 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-700 ring-1 ring-rose-100">
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            </div>

            <div className="min-w-0">
              <h2 className="text-base font-black text-slate-950">
                إدارة المحظورين
              </h2>

              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                راقب الأرقام المحظورة وفك الحظر بأمان عند الحاجة.
              </p>
            </div>
          </div>

          <div className="shrink-0 rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2 text-center">
            <div className="text-lg font-black leading-none text-rose-700">
              {items.length}
            </div>
            <div className="mt-1 text-[10px] font-black text-rose-500">
              محظور
            </div>
          </div>
        </div>

        <div className="relative mt-5">
          <Search
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />

          <input
            type="search"
            inputMode="tel"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث برقم الهاتف..."
            aria-label="البحث في الأرقام المحظورة"
            className="
              min-h-[50px] w-full rounded-2xl border border-slate-200
              bg-white py-3 pl-11 pr-10 text-base font-bold text-slate-800
              outline-none transition placeholder:text-sm placeholder:font-semibold
              placeholder:text-slate-400
              focus:border-[#c5a04a] focus:ring-4 focus:ring-[#c8a34e]/15
            "
          />

          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="مسح البحث"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        {search ? (
          <div className="mt-2 text-xs font-bold text-slate-400">
            {filteredItems.length} نتيجة من أصل {items.length}
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-center text-[11px] font-bold text-amber-700">
          جارٍ تحديث القائمة...
        </div>
      ) : null}

      {filteredItems.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <Search className="h-5 w-5" aria-hidden="true" />
          </div>

          <div className="mt-3 text-sm font-black text-slate-800">
            ما لقينا هذا الرقم
          </div>

          <div className="mt-1 text-xs font-semibold text-slate-400">
            جرّب كتابة رقم آخر أو امسح البحث.
          </div>
        </div>
      ) : (
        <div className="space-y-3 bg-slate-50/70 p-3 sm:p-4">
          {filteredItems.map((item) => {
            const phoneKey = String(item.phoneKey || item.id || "");
            const phoneLabel = e164ToLocalPretty(phoneKey) || phoneKey;
            const blockedDate = formatBlockedAt(item.blockedAt);
            const isConfirming = confirmPhone === phoneKey;
            const isCopied = copiedPhone === phoneKey;

            return (
              <article
                key={item.id || phoneKey}
                className="
                  rounded-[22px] border border-slate-200 bg-white
                  p-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]
                  sm:p-5
                "
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                      <Ban className="h-5 w-5" aria-hidden="true" />
                    </div>

                    <div className="min-w-0">
                      <div
                        dir="ltr"
                        className="truncate font-mono text-base font-black text-slate-900"
                      >
                        {phoneLabel}
                      </div>

                      <div className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                        ممنوع من الحجز وإرسال تقييم جديد
                      </div>

                      {blockedDate ? (
                        <div className="mt-1 text-[11px] font-bold text-slate-400">
                          تم الحظر بتاريخ {blockedDate}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <span className="shrink-0 rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1 text-[10px] font-black text-rose-700">
                    محظور
                  </span>
                </div>

                {!isConfirming ? (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(phoneKey)}
                      className="
                        flex min-h-[48px] items-center justify-center gap-2
                        rounded-2xl border border-slate-200 bg-white
                        px-3 text-xs font-black text-slate-700
                        transition hover:bg-slate-50
                      "
                    >
                      {isCopied ? (
                        <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                      ) : (
                        <Copy className="h-4 w-4" aria-hidden="true" />
                      )}

                      <span>{isCopied ? "تم النسخ" : "نسخ الرقم"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRequestUnblock(phoneKey)}
                      className="
                        flex min-h-[48px] items-center justify-center gap-2
                        rounded-2xl border border-emerald-200 bg-emerald-50
                        px-3 text-xs font-black text-emerald-700
                        transition hover:bg-emerald-100
                      "
                    >
                      <ShieldOff className="h-4 w-4" aria-hidden="true" />
                      <span>فك الحظر</span>
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs font-black text-amber-900">
                      متأكد إنك بدك تفك الحظر عن هذا الرقم؟
                    </p>

                    <p className="mt-1 text-[11px] font-semibold leading-5 text-amber-700">
                      بعد فك الحظر رح يقدر الزبون يحجز ويرسل تقييم من جديد.
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleCancelUnblock}
                        className="
                          min-h-[46px] rounded-xl border border-slate-200
                          bg-white px-3 text-xs font-black text-slate-700
                          transition hover:bg-slate-50
                        "
                      >
                        تراجع
                      </button>

                      <button
                        type="button"
                        onClick={() => handleConfirmUnblock(phoneKey)}
                        className="
                          min-h-[46px] rounded-xl bg-emerald-600
                          px-3 text-xs font-black text-white
                          transition hover:bg-emerald-700
                        "
                      >
                        نعم، فك الحظر
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}