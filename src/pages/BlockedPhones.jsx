import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  Check,
  Copy,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  X,
} from "lucide-react";
import {
  collection,
  getDocs,
  doc,
  writeBatch,
} from "firebase/firestore";

import { db } from "../firebase";

const BARBER_ID = "arfat";
import {
  toILPhoneE164,
  isILPhoneE164,
  e164ToLocalPretty,
} from "../utils/phone";

function normalizeDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

export default function BlockedPhones() {
  const [blockedPhones, setBlockedPhones] = useState([]);
  const [newPhone, setNewPhone] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(true);
  const [workingPhone, setWorkingPhone] = useState("");
  const [search, setSearch] = useState("");
  const [copiedPhone, setCopiedPhone] = useState("");
  const [confirmPhone, setConfirmPhone] = useState("");

  const fetchBlockedPhones = async () => {
    setLoading(true);

    try {
      const snapshot = await getDocs(collection(db, "blockedPhones"));
      const phones = snapshot.docs.map((documentSnapshot) => ({
        number: documentSnapshot.id,
        ...documentSnapshot.data(),
      }));

      setBlockedPhones(phones);
    } catch {
      setError("تعذر تحميل قائمة المحظورين. حاول مرة ثانية.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBlockedPhones();
  }, []);

  const filteredPhones = useMemo(() => {
    const query = normalizeDigits(search);

    if (!query) {
      return blockedPhones;
    }

    return blockedPhones.filter((item) => {
      const raw = normalizeDigits(item.number);
      const pretty = normalizeDigits(
        e164ToLocalPretty(item.number) || item.number,
      );

      return raw.includes(query) || pretty.includes(query);
    });
  }, [blockedPhones, search]);

  const addPhone = async () => {
    if (workingPhone) return;

    setError("");
    setInfo("");

    const phone = toILPhoneE164(newPhone.trim());

    if (!isILPhoneE164(phone)) {
      setError("أدخل رقمًا صالحًا مثل 05XXXXXXXX أو +9725XXXXXXXX.");
      return;
    }

    if (blockedPhones.some((item) => item.number === phone)) {
      setError("هذا الرقم موجود أصلًا في قائمة الحظر.");
      return;
    }

    setWorkingPhone(phone);

    try {
      const batch = writeBatch(db);
      const blockData = {
        phoneKey: phone,
        from: "manual",
        fromBarberId: BARBER_ID,
        blockedAt: Date.now(),
      };

      batch.set(doc(db, "blockedPhones", phone), blockData);
      batch.set(doc(db, "barbers", BARBER_ID, "blockedPhones", phone), blockData);

      await batch.commit();

      setNewPhone("");
      setInfo("تم حظر الرقم بنجاح.");
      await fetchBlockedPhones();
    } catch {
      setError("تعذر حظر الرقم الآن. حاول مرة ثانية.");
    } finally {
      setWorkingPhone("");
    }
  };

  const removePhone = async (phone) => {
    if (workingPhone) return;

    setError("");
    setInfo("");
    setWorkingPhone(phone);

    try {
      const batch = writeBatch(db);

      batch.delete(doc(db, "blockedPhones", phone));
      batch.delete(doc(db, "barbers", BARBER_ID, "blockedPhones", phone));

      await batch.commit();
      setInfo("تم فك الحظر عن الرقم.");
      setConfirmPhone("");
      await fetchBlockedPhones();
    } catch {
      setError("تعذر فك الحظر الآن. حاول مرة ثانية.");
    } finally {
      setWorkingPhone("");
    }
  };

  const handleCopy = async (phone) => {
    try {
      const value = e164ToLocalPretty(phone) || phone;

      await navigator.clipboard.writeText(value);
      setCopiedPhone(phone);

      window.setTimeout(() => {
        setCopiedPhone((current) => (current === phone ? "" : current));
      }, 1800);
    } catch {
      // النسخ ميزة مساعدة فقط ولا تؤثر على الحظر.
    }
  };

  return (
    <div
      className="min-h-full bg-[#f4f5f7] px-3 pb-28 pt-20 sm:px-5 sm:pt-20"
      dir="rtl"
    >
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <section
          className="
            overflow-hidden rounded-[26px] border border-black/5
            bg-gradient-to-br from-[#171717] via-[#24211c] to-[#332a1b]
            px-4 py-5 text-white
            shadow-[0_12px_30px_rgba(15,23,42,0.12)]
            sm:px-6 sm:py-6
          "
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div
                className="
                  flex h-12 w-12 shrink-0 items-center justify-center
                  rounded-2xl border border-white/10 bg-white/10
                  text-[#e5c36a]
                "
              >
                <ShieldAlert className="h-6 w-6" aria-hidden="true" />
              </div>

              <div className="min-w-0">
                <div className="text-[11px] font-black tracking-wide text-[#d6b45c]">
                  إدارة الحماية
                </div>

                <h1 className="mt-1 text-xl font-black sm:text-2xl">
                  الأرقام المحظورة
                </h1>

                <p className="mt-1 max-w-md text-xs font-semibold leading-5 text-white/60">
                  إدارة الزبائن الممنوعين من الحجز بطريقة واضحة وآمنة.
                </p>
              </div>
            </div>

            <div
              className="
                min-w-[64px] shrink-0 rounded-2xl border border-[#d6b45c]/25
                bg-[#d6b45c]/10 px-3 py-2.5 text-center
              "
            >
              <div className="text-xl font-black text-[#f0ce76]">
                {blockedPhones.length}
              </div>
              <div className="mt-0.5 text-[10px] font-black text-white/55">
                محظور
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div
            role="alert"
            className="
              flex items-start gap-2 rounded-2xl border border-rose-200
              bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700
            "
          >
            <Ban className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}

        {info && !error ? (
          <div
            className="
              flex items-start gap-2 rounded-2xl border border-emerald-200
              bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700
            "
          >
            <ShieldCheck
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <span>{info}</span>
          </div>
        ) : null}

        <section
          className="
            rounded-[24px] border border-slate-200 bg-white
            p-4 shadow-[0_5px_18px_rgba(15,23,42,0.05)]
            sm:p-5
          "
        >
          <div className="flex items-start gap-3">
            <div
              className="
                flex h-10 w-10 shrink-0 items-center justify-center
                rounded-2xl bg-rose-50 text-rose-600
              "
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
            </div>

            <div>
              <h2 className="text-sm font-black text-slate-900">
                حظر رقم جديد
              </h2>

              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                أضف رقم الزبون لمنعه من إنشاء حجوزات جديدة.
              </p>
            </div>
          </div>

          <form
            className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              void addPhone();
            }}
          >
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="05X-XXXXXXX"
              value={newPhone}
              onChange={(event) => {
                setNewPhone(event.target.value);

                if (error) {
                  setError("");
                }
              }}
              className="
                min-h-[52px] min-w-0 w-full rounded-2xl
                border border-slate-200 bg-slate-50
                px-4 text-base font-bold text-slate-900
                outline-none transition
                placeholder:text-sm placeholder:font-semibold
                placeholder:text-slate-400
                focus:border-[#c5a04a] focus:bg-white
                focus:ring-4 focus:ring-[#c8a34e]/15
              "
            />

            <button
              type="submit"
              disabled={!newPhone.trim() || Boolean(workingPhone)}
              className="
                flex min-h-[52px] items-center justify-center gap-2
                rounded-2xl bg-rose-600 px-6
                text-sm font-black text-white
                shadow-[0_8px_18px_rgba(225,29,72,0.16)]
                transition hover:bg-rose-700
                disabled:cursor-not-allowed disabled:opacity-45
              "
            >
              <Ban className="h-4 w-4" aria-hidden="true" />
              <span>{workingPhone ? "جارٍ التنفيذ..." : "حظر الرقم"}</span>
            </button>
          </form>
        </section>

        <section
          className="
            overflow-hidden rounded-[24px] border border-slate-200
            bg-white shadow-[0_5px_18px_rgba(15,23,42,0.05)]
          "
        >
          <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-slate-900">
                  قائمة المحظورين
                </h2>

                <p className="mt-1 text-[11px] font-semibold text-slate-400">
                  {blockedPhones.length === 0
                    ? "لا توجد أرقام في القائمة"
                    : `${blockedPhones.length} رقم في قائمة الحظر`}
                </p>
              </div>

              {blockedPhones.length > 0 ? (
                <span
                  className="
                    rounded-full border border-rose-100 bg-rose-50
                    px-3 py-1 text-[10px] font-black text-rose-700
                  "
                >
                  نشط
                </span>
              ) : null}
            </div>

            {blockedPhones.length > 0 ? (
              <div className="relative mt-4">
                <Search
                  className="
                    pointer-events-none absolute right-3 top-1/2
                    h-4 w-4 -translate-y-1/2 text-slate-400
                  "
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
                    min-h-[50px] w-full rounded-2xl
                    border border-slate-200 bg-slate-50
                    py-3 pl-11 pr-10 text-base font-bold text-slate-900
                    outline-none transition
                    placeholder:text-sm placeholder:font-semibold
                    placeholder:text-slate-400
                    focus:border-[#c5a04a] focus:bg-white
                    focus:ring-4 focus:ring-[#c8a34e]/15
                  "
                />

                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="
                      absolute left-2 top-1/2 flex h-9 w-9
                      -translate-y-1/2 items-center justify-center
                      rounded-xl text-slate-400 transition
                      hover:bg-slate-200/70 hover:text-slate-700
                    "
                    aria-label="مسح البحث"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {loading ? (
            <div className="space-y-3 bg-slate-50/60 p-3 sm:p-4">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="
                    h-[108px] animate-pulse rounded-[20px]
                    border border-slate-100 bg-white
                  "
                />
              ))}
            </div>
          ) : blockedPhones.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div
                className="
                  mx-auto flex h-14 w-14 items-center justify-center
                  rounded-2xl bg-emerald-50 text-emerald-700
                "
              >
                <ShieldOff className="h-7 w-7" aria-hidden="true" />
              </div>

              <h3 className="mt-4 text-sm font-black text-slate-900">
                ما في أرقام محظورة
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-xs font-semibold leading-5 text-slate-500">
                القائمة نظيفة حاليًا. لما تحظر رقم جديد رح يظهر هون مباشرة.
              </p>
            </div>
          ) : filteredPhones.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Search
                className="mx-auto h-7 w-7 text-slate-300"
                aria-hidden="true"
              />

              <div className="mt-3 text-sm font-black text-slate-800">
                ما لقينا هذا الرقم
              </div>

              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-3 text-xs font-black text-[#9b7628]"
              >
                مسح البحث
              </button>
            </div>
          ) : (
            <div className="space-y-3 bg-slate-50/60 p-3 sm:p-4">
              {filteredPhones.map((item) => {
                const phone = item.number;
                const phoneLabel = e164ToLocalPretty(phone) || phone;
                const confirming = confirmPhone === phone;
                const copied = copiedPhone === phone;
                const removing = workingPhone === phone;

                return (
                  <article
                    key={phone}
                    className="
                      rounded-[20px] border border-slate-200
                      bg-white p-4
                      shadow-[0_3px_12px_rgba(15,23,42,0.035)]
                    "
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div
                          className="
                            flex h-10 w-10 shrink-0 items-center
                            justify-center rounded-2xl
                            bg-rose-50 text-rose-600
                          "
                        >
                          <Ban className="h-5 w-5" aria-hidden="true" />
                        </div>

                        <div className="min-w-0">
                          <div
                            dir="ltr"
                            className="
                              truncate font-mono text-base
                              font-black text-slate-900
                            "
                          >
                            {phoneLabel}
                          </div>

                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            ممنوع من إنشاء حجز جديد
                          </p>
                        </div>
                      </div>

                      <span
                        className="
                          shrink-0 rounded-full border border-rose-100
                          bg-rose-50 px-2.5 py-1
                          text-[10px] font-black text-rose-700
                        "
                      >
                        محظور
                      </span>
                    </div>

                    {!confirming ? (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => void handleCopy(phone)}
                          className="
                            flex min-h-[48px] items-center justify-center
                            gap-2 rounded-2xl border border-slate-200
                            bg-white px-3 text-xs font-black text-slate-700
                            transition hover:bg-slate-50
                          "
                        >
                          {copied ? (
                            <Check
                              className="h-4 w-4 text-emerald-600"
                              aria-hidden="true"
                            />
                          ) : (
                            <Copy className="h-4 w-4" aria-hidden="true" />
                          )}

                          <span>{copied ? "تم النسخ" : "نسخ الرقم"}</span>
                        </button>

                        <button
                          type="button"
                          disabled={Boolean(workingPhone)}
                          onClick={() => setConfirmPhone(phone)}
                          className="
                            flex min-h-[48px] items-center justify-center
                            gap-2 rounded-2xl border border-emerald-200
                            bg-emerald-50 px-3 text-xs font-black
                            text-emerald-700 transition
                            hover:bg-emerald-100
                            disabled:cursor-not-allowed disabled:opacity-50
                          "
                        >
                          <ShieldOff className="h-4 w-4" aria-hidden="true" />
                          <span>فك الحظر</span>
                        </button>
                      </div>
                    ) : (
                      <div
                        className="
                          mt-4 rounded-2xl border border-amber-200
                          bg-amber-50 p-3
                        "
                      >
                        <p className="text-xs font-black text-amber-900">
                          متأكد إنك بدك تفك الحظر؟
                        </p>

                        <p className="mt-1 text-[11px] font-semibold leading-5 text-amber-700">
                          الرقم رح يقدر يحجز من الموقع مرة ثانية.
                        </p>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled={removing}
                            onClick={() => setConfirmPhone("")}
                            className="
                              min-h-[46px] rounded-xl
                              border border-slate-200 bg-white
                              px-3 text-xs font-black text-slate-700
                            "
                          >
                            تراجع
                          </button>

                          <button
                            type="button"
                            disabled={removing}
                            onClick={() => void removePhone(phone)}
                            className="
                              min-h-[46px] rounded-xl bg-emerald-600
                              px-3 text-xs font-black text-white
                              transition hover:bg-emerald-700
                              disabled:cursor-not-allowed disabled:opacity-60
                            "
                          >
                            {removing ? "جارٍ فك الحظر..." : "نعم، فك الحظر"}
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
      </div>
    </div>
  );
}
