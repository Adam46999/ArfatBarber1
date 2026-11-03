// src/pages/adminBookings/CustomerInfoEditor.jsx

import { useEffect, useMemo, useState } from "react";
import {
  FaCheck,
  FaChevronDown,
  FaChevronUp,
  FaEdit,
  FaHistory,
  FaPhone,
  FaSave,
  FaUndo,
  FaWhatsapp,
} from "react-icons/fa";

import {
  e164ToLocalPretty,
  isILPhoneE164,
  toILPhoneE164,
} from "../../utils/phone";

import { isNameValid } from "../../utils/validators";

function formatPhone(value) {
  if (!value) return "بدون رقم";

  const normalized = toILPhoneE164(value);

  return e164ToLocalPretty(normalized || value) || value;
}

function formatDate(value) {
  if (!value) return "وقت غير معروف";

  const date = value?.toDate
    ? value.toDate()
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "وقت غير معروف";
  }

  return date.toLocaleString("ar-IL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function actionLabel(action) {
  if (action === "UNDO") return "تراجع";
  if (action === "RESTORE_HISTORY") return "استرجاع من السجل";

  return "تعديل";
}

function getBackendError(error) {
  switch (error?.message) {
    case "INVALID_CUSTOMER_NAME":
      return {
        field: "name",
        text: "الاسم غير صحيح. اكتب اسمًا واضحًا من حرفين على الأقل.",
      };

    case "INVALID_CUSTOMER_PHONE":
      return {
        field: "phone",
        text: "رقم الهاتف غير صحيح. مثال: 05XXXXXXXX.",
      };

    case "PHONE_REQUIRED":
      return {
        field: "phone",
        text: "رقم الهاتف مطلوب لهذا الحجز.",
      };

    case "PHONE_BLOCKED":
      return {
        field: "phone",
        text: "هذا الرقم موجود في قائمة الأرقام المحظورة.",
      };

    case "PHONE_ALREADY_BOOKED_TODAY":
      return {
        field: "phone",
        text: "هذا الرقم لديه حجز آخر بنفس اليوم.",
      };

    case "BOOKING_NOT_FOUND":
      return {
        field: "general",
        text: "الحجز لم يعد موجودًا. حدّث الصفحة وحاول مرة ثانية.",
      };

    default:
      return {
        field: "general",
        text: "تعذر حفظ التعديل. لم يتم تغيير بيانات الحجز.",
      };
  }
}

export default function CustomerInfoEditor({
  booking,
  onSave,
}) {
  const [editing, setEditing] = useState(false);

  const [name, setName] = useState(
    booking.fullName || "",
  );

  const [phone, setPhone] = useState(
    e164ToLocalPretty(booking.phoneNumber) ||
      booking.phoneNumber ||
      "",
  );

  const [saving, setSaving] = useState(false);

  const [nameServerError, setNameServerError] =
    useState("");

  const [phoneServerError, setPhoneServerError] =
    useState("");

  const [generalError, setGeneralError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [undoData, setUndoData] = useState(null);

  const [undoing, setUndoing] = useState(false);

  const [showHistory, setShowHistory] =
    useState(false);

  const [expandedHistoryId, setExpandedHistoryId] =
    useState(null);

  const [restoringHistoryId, setRestoringHistoryId] =
    useState(null);

  const currentName = String(
    booking.fullName || "",
  ).trim();

  const currentPhone =
    toILPhoneE164(booking.phoneNumber) ||
    String(booking.phoneNumber || "").trim();

  const normalizedDraftPhone = phone.trim()
    ? toILPhoneE164(phone)
    : "";

  const trimmedName = String(name || "").trim();

  const nameChanged = trimmedName !== currentName;

  const phoneChanged =
    normalizedDraftPhone !== currentPhone;

  const hasChanges = nameChanged || phoneChanged;

  const nameError = useMemo(() => {
    if (!editing) return "";

    if (!isNameValid(trimmedName)) {
      return "الاسم لازم يكون حرفين على الأقل.";
    }

    return nameServerError;
  }, [
    editing,
    trimmedName,
    nameServerError,
  ]);

  const phoneError = useMemo(() => {
    if (!editing) return "";

    if (!phone.trim()) {
      if (booking.manualBooking) {
        return phoneServerError;
      }

      return "رقم الهاتف مطلوب لهذا الحجز.";
    }

    if (
      !normalizedDraftPhone ||
      !isILPhoneE164(normalizedDraftPhone)
    ) {
      return "رقم الهاتف غير صحيح. مثال: 05XXXXXXXX.";
    }

    return phoneServerError;
  }, [
    editing,
    phone,
    normalizedDraftPhone,
    booking.manualBooking,
    phoneServerError,
  ]);

  const formValid =
    !nameError &&
    !phoneError &&
    isNameValid(trimmedName);

  const canSave =
    hasChanges &&
    formValid &&
    !saving &&
    !undoing &&
    !restoringHistoryId;

  const history = useMemo(() => {
    const value = Array.isArray(
      booking.customerInfoEditHistory,
    )
      ? booking.customerInfoEditHistory
      : [];

    return [...value].reverse();
  }, [booking.customerInfoEditHistory]);

  const lastEdit = history[0] || null;

  const whatsappPhone = currentPhone
    .replace("+", "")
    .replace(/\D/g, "");

  useEffect(() => {
    if (!editing) {
      setName(currentName);

      setPhone(
        e164ToLocalPretty(currentPhone) ||
          currentPhone ||
          "",
      );
    }
  }, [
    currentName,
    currentPhone,
    editing,
  ]);

  function clearErrors() {
    setNameServerError("");
    setPhoneServerError("");
    setGeneralError("");
  }

  function openEditor() {
    setName(currentName);

    setPhone(
      e164ToLocalPretty(currentPhone) ||
        currentPhone ||
        "",
    );

    clearErrors();

    setSuccessMessage("");
    setEditing(true);
  }

  function closeEditor() {
    if (saving) return;

    setEditing(false);
    clearErrors();

    setName(currentName);

    setPhone(
      e164ToLocalPretty(currentPhone) ||
        currentPhone ||
        "",
    );
  }

  async function performSave(
    values,
    metadata = {},
  ) {
    clearErrors();

    try {
      return await onSave(values, metadata);
    } catch (error) {
      console.error(
        "Failed to update customer info:",
        error,
      );

      const mapped = getBackendError(error);

      if (mapped.field === "name") {
        setNameServerError(mapped.text);
      } else if (mapped.field === "phone") {
        setPhoneServerError(mapped.text);
      } else {
        setGeneralError(mapped.text);
      }

      throw error;
    }
  }

  async function save() {
    if (!canSave) return;

    const previous = {
      fullName: currentName,
      phoneNumber: currentPhone,
    };

    const changedFields = [];

    if (nameChanged) changedFields.push("name");
    if (phoneChanged) changedFields.push("phone");

    try {
      setSaving(true);
      setSuccessMessage("");

      await performSave(
        {
          fullName: trimmedName,
          phoneNumber: phone,
        },
        {
          action: "EDIT",
        },
      );

      setUndoData(previous);

      if (
        changedFields.includes("name") &&
        changedFields.includes("phone")
      ) {
        setSuccessMessage(
          "تم تحديث الاسم ورقم الهاتف ✓",
        );
      } else if (
        changedFields.includes("phone")
      ) {
        setSuccessMessage(
          "تم تحديث رقم الهاتف ✓",
        );
      } else {
        setSuccessMessage(
          "تم تحديث الاسم ✓",
        );
      }

      setEditing(false);
    } catch {
      // errors already displayed inline
    } finally {
      setSaving(false);
    }
  }

  async function undoLastEdit() {
    if (!undoData || undoing) return;

    try {
      setUndoing(true);
      clearErrors();

      await performSave(
        {
          fullName: undoData.fullName,
          phoneNumber: undoData.phoneNumber,
        },
        {
          action: "UNDO",
        },
      );

      setUndoData(null);

      setSuccessMessage(
        "تم التراجع عن التعديل ✓",
      );
    } catch {
      // error shown already
    } finally {
      setUndoing(false);
    }
  }

  async function restoreFromHistory(entry) {
    if (!entry || restoringHistoryId) return;

    const changes = entry.changes || {};

    const restoredName =
      changes.fullName?.from ?? currentName;

    const restoredPhone =
      changes.phoneNumber?.from ?? currentPhone;

    try {
      setRestoringHistoryId(entry.id || "history");

      clearErrors();

      await performSave(
        {
          fullName: restoredName,
          phoneNumber: restoredPhone,
        },
        {
          action: "RESTORE_HISTORY",
          sourceHistoryId: entry.id || null,
        },
      );

      setUndoData({
        fullName: currentName,
        phoneNumber: currentPhone,
      });

      setSuccessMessage(
        "تم استرجاع البيانات السابقة ✓",
      );
    } catch {
      // error shown already
    } finally {
      setRestoringHistoryId(null);
    }
  }

  return (
    <div className="mt-2">
      {!editing ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {/* Small edit control */}
            <button
              type="button"
              onClick={openEditor}
              className="
                inline-flex h-9 items-center
                justify-center gap-1.5
                rounded-xl border border-slate-200
                bg-white px-3
                text-xs font-black text-slate-600
                transition
                hover:border-amber-300
                hover:bg-amber-50
                hover:text-amber-900
              "
              title="تعديل بيانات الزبون"
              aria-label="تعديل بيانات الزبون"
            >
              <FaEdit />
              تعديل
            </button>

            {currentPhone ? (
              <a
                href={`tel:${currentPhone}`}
                className="
                  inline-flex h-9 items-center
                  justify-center gap-1.5
                  rounded-xl border border-blue-200
                  bg-blue-50 px-3
                  text-xs font-black text-blue-700
                  transition hover:bg-blue-100
                "
                title="اتصال"
              >
                <FaPhone />
                اتصال
              </a>
            ) : null}

            {whatsappPhone ? (
              <a
                href={`https://wa.me/${whatsappPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  inline-flex h-9 items-center
                  justify-center gap-1.5
                  rounded-xl border border-emerald-200
                  bg-emerald-50 px-3
                  text-xs font-black text-emerald-700
                  transition hover:bg-emerald-100
                "
                title="واتساب"
              >
                <FaWhatsapp />
                واتساب
              </a>
            ) : null}

            {history.length > 0 ? (
              <button
                type="button"
                onClick={() =>
                  setShowHistory(
                    (current) => !current,
                  )
                }
                className="
                  inline-flex h-9 items-center
                  justify-center gap-1.5
                  rounded-xl border border-slate-200
                  bg-white px-3
                  text-xs font-bold text-slate-500
                  transition hover:bg-slate-50
                "
              >
                <FaHistory />

                {showHistory
                  ? "إخفاء السجل"
                  : `السجل (${history.length})`}
              </button>
            ) : null}
          </div>

          {lastEdit ? (
            <div className="mt-1.5 text-[10px] font-bold text-slate-400">
              آخر تعديل:{" "}
              {formatDate(lastEdit.editedAt)}
            </div>
          ) : null}

          {successMessage ? (
            <div
              className="
                mt-2 flex flex-wrap
                items-center gap-2
                rounded-xl border border-emerald-200
                bg-emerald-50 px-3 py-2
              "
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700">
                <FaCheck />
                {successMessage}
              </span>

              {undoData ? (
                <button
                  type="button"
                  disabled={undoing}
                  onClick={undoLastEdit}
                  className="
                    inline-flex items-center gap-1
                    rounded-lg border border-emerald-300
                    bg-white px-2 py-1
                    text-[11px] font-black
                    text-emerald-700
                    transition
                    hover:bg-emerald-100
                    disabled:opacity-50
                  "
                >
                  <FaUndo />

                  {undoing
                    ? "جاري التراجع..."
                    : "تراجع"}
                </button>
              ) : null}
            </div>
          ) : null}

          {generalError ? (
            <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
              {generalError}
            </div>
          ) : null}
        </>
      ) : (
        <div
          className="
            rounded-2xl border border-amber-200
            bg-gradient-to-b
            from-amber-50/80 to-white
            p-3 shadow-sm
            sm:p-4
          "
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-slate-900">
                تعديل بيانات الزبون
              </div>

              <div className="mt-0.5 text-[10px] font-bold text-slate-400">
                التعديل لا يغيّر الموعد أو الخدمة
              </div>
            </div>

            <FaEdit className="text-amber-500" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-xs font-black text-slate-600">
                الاسم
              </span>

              <input
                type="text"
                value={name}
                disabled={saving}
                onChange={(event) => {
                  setName(event.target.value);
                  setNameServerError("");
                }}
                className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-bold outline-none transition ${
                  nameError
                    ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    : nameChanged
                      ? "border-amber-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                      : "border-slate-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                }`}
              />

              {nameError ? (
                <div className="mt-1 text-[11px] font-bold text-red-600">
                  {nameError}
                </div>
              ) : null}
            </label>

            <label>
              <span className="mb-1 block text-xs font-black text-slate-600">
                رقم الهاتف
              </span>

              <input
                type="tel"
                dir="ltr"
                value={phone}
                disabled={saving}
                placeholder={
                  booking.manualBooking
                    ? "اختياري"
                    : "05XXXXXXXX"
                }
                onChange={(event) => {
                  setPhone(event.target.value);
                  setPhoneServerError("");
                }}
                className={`w-full rounded-xl border bg-white px-3 py-2.5 text-left text-sm font-bold outline-none transition ${
                  phoneError
                    ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    : phoneChanged
                      ? "border-amber-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                      : "border-slate-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                }`}
              />

              {phoneError ? (
                <div className="mt-1 text-[11px] font-bold text-red-600">
                  {phoneError}
                </div>
              ) : null}
            </label>
          </div>

          {hasChanges ? (
            <div
              className="
                mt-3 space-y-1
                rounded-xl border border-slate-200
                bg-white px-3 py-2
                text-xs font-bold text-slate-600
              "
            >
              <div className="text-[10px] font-black text-slate-400">
                التغييرات قبل الحفظ
              </div>

              {nameChanged ? (
                <div>
                  الاسم:{" "}
                  <span className="text-slate-400">
                    {currentName || "—"}
                  </span>
                  {" ← "}
                  <span className="text-amber-800">
                    {trimmedName || "—"}
                  </span>
                </div>
              ) : null}

              {phoneChanged ? (
                <div>
                  الرقم:{" "}
                  <span
                    dir="ltr"
                    className="text-slate-400"
                  >
                    {formatPhone(currentPhone)}
                  </span>
                  {" ← "}
                  <span
                    dir="ltr"
                    className="text-amber-800"
                  >
                    {formatPhone(
                      normalizedDraftPhone,
                    )}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

          {phoneChanged && !phoneError ? (
            <div
              className="
                mt-3 rounded-xl
                border border-blue-200
                bg-blue-50 px-3 py-2
                text-[11px] font-bold
                leading-5 text-blue-700
              "
            >
              هذا الرقم سيصبح الرقم المعتمد لهذا الحجز للبحث والاتصال والتواصل.
            </div>
          ) : null}

          {generalError ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
              {generalError}
            </div>
          ) : null}

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={closeEditor}
              className="
                rounded-xl border border-slate-200
                bg-white px-4 py-2
                text-sm font-bold text-slate-600
                transition hover:bg-slate-100
                disabled:opacity-50
              "
            >
              إلغاء
            </button>

            <button
              type="button"
              disabled={!canSave}
              onClick={save}
              className="
                inline-flex items-center
                justify-center gap-2
                rounded-xl border border-amber-300
                bg-amber-100 px-4 py-2
                text-sm font-black text-amber-900
                transition hover:bg-amber-200
                disabled:cursor-not-allowed
                disabled:border-slate-200
                disabled:bg-slate-100
                disabled:text-slate-400
              "
            >
              <FaSave />

              {saving
                ? "جاري الحفظ..."
                : !hasChanges
                  ? "ما في تغييرات"
                  : "حفظ التعديل"}
            </button>
          </div>
        </div>
      )}

      {showHistory && history.length > 0 ? (
        <div
          className="
            mt-3 overflow-hidden
            rounded-2xl border border-slate-200
            bg-white shadow-sm
          "
        >
          <div
            className="
              border-b border-slate-100
              bg-slate-50 px-3 py-2.5
            "
          >
            <div className="text-xs font-black text-slate-700">
              تاريخ التعديلات الكامل
            </div>

            <div className="mt-0.5 text-[10px] font-bold text-slate-400">
              {history.length} عمليات محفوظة
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {history.map((entry, index) => {
              const id =
                entry.id ||
                `${entry.editedAt || "edit"}-${index}`;

              const expanded =
                expandedHistoryId === id;

              const nameChange =
                entry.changes?.fullName;

              const phoneChange =
                entry.changes?.phoneNumber;

              const summary = [
                nameChange ? "الاسم" : "",
                phoneChange ? "الرقم" : "",
              ]
                .filter(Boolean)
                .join(" + ");

              return (
                <div key={id}>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedHistoryId(
                        expanded ? null : id,
                      )
                    }
                    className="
                      flex w-full items-center
                      justify-between gap-3
                      px-3 py-3 text-right
                      transition hover:bg-slate-50
                    "
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-700">
                        {actionLabel(entry.action)}
                        {summary
                          ? ` — ${summary}`
                          : ""}
                      </div>

                      <div className="mt-0.5 text-[10px] font-bold text-slate-400">
                        {formatDate(entry.editedAt)}
                        {" • "}
                        الحلاق
                      </div>
                    </div>

                    <span className="shrink-0 text-slate-400">
                      {expanded ? (
                        <FaChevronUp />
                      ) : (
                        <FaChevronDown />
                      )}
                    </span>
                  </button>

                  {expanded ? (
                    <div
                      className="
                        border-t border-slate-100
                        bg-slate-50/70 px-3 py-3
                      "
                    >
                      <div className="space-y-2">
                        {nameChange ? (
                          <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="text-[10px] font-black text-slate-400">
                              الاسم
                            </div>

                            <div className="mt-1 text-xs font-bold">
                              <span className="text-red-500 line-through">
                                {nameChange.from ||
                                  "—"}
                              </span>

                              {" → "}

                              <span className="text-emerald-700">
                                {nameChange.to ||
                                  "—"}
                              </span>
                            </div>
                          </div>
                        ) : null}

                        {phoneChange ? (
                          <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="text-[10px] font-black text-slate-400">
                              رقم الهاتف
                            </div>

                            <div
                              dir="ltr"
                              className="mt-1 text-right text-xs font-bold"
                            >
                              <span className="text-red-500 line-through">
                                {formatPhone(
                                  phoneChange.from,
                                )}
                              </span>

                              {" → "}

                              <span className="text-emerald-700">
                                {formatPhone(
                                  phoneChange.to,
                                )}
                              </span>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        disabled={
                          Boolean(
                            restoringHistoryId,
                          ) ||
                          saving ||
                          undoing
                        }
                        onClick={() =>
                          restoreFromHistory(entry)
                        }
                        className="
                          mt-3 inline-flex w-full
                          items-center justify-center
                          gap-2 rounded-xl
                          border border-indigo-200
                          bg-indigo-50 px-3 py-2
                          text-xs font-black
                          text-indigo-700
                          transition
                          hover:bg-indigo-100
                          disabled:opacity-50
                        "
                      >
                        <FaUndo />

                        {restoringHistoryId === id
                          ? "جاري الاسترجاع..."
                          : "استرجاع القيم السابقة"}
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}