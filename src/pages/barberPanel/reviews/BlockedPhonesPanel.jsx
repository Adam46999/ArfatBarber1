import { e164ToLocalPretty } from "../../../utils/phone";

export default function BlockedPhonesPanel({
  blocked,
  loading,
  onUnblock,
}) {
  if (loading && (!blocked || blocked.length === 0)) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        جارٍ تحميل الأرقام...
      </div>
    );
  }

  if (!blocked || blocked.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="text-sm font-black text-slate-700">
          ما في أرقام محظورة
        </div>

        <div className="mt-1 text-xs font-semibold text-slate-400">
          أي رقم بتحظره من تقييم رح يظهر هون.
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="text-sm font-black text-slate-900">
          الأرقام المحظورة
        </div>

        <div className="mt-0.5 text-[10px] font-semibold text-slate-400">
          {blocked.length} رقم
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {blocked.map((item) => {
          const phoneKey = String(item.phoneKey || item.id || "");

          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <div
                  dir="ltr"
                  className="font-mono text-sm font-black text-slate-800"
                >
                  {e164ToLocalPretty(phoneKey) || phoneKey}
                </div>

                <div className="mt-0.5 text-[10px] font-semibold text-slate-400">
                  ممنوع من الحجز وإرسال تقييم جديد
                </div>
              </div>

              <button
                type="button"
                onClick={() => onUnblock(phoneKey)}
                className="
                  shrink-0 rounded-xl border border-emerald-200
                  bg-emerald-50 px-3 py-2
                  text-xs font-black text-emerald-700
                  transition hover:bg-emerald-100
                "
              >
                فك الحظر
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
