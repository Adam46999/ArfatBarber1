// src/components/booking/parts/PhoneInput.jsx
import React, { forwardRef } from "react";

const PhoneInput = forwardRef(function PhoneInput(
  {
    value,
    onChange,
    onBlur,
    placeholder,
    inputMode = "tel",
    className = "",
    isInvalid = false,
    isValid = false,
    ...rest
  },
  ref
) {
  const base =
    "w-full min-h-[54px] rounded-[16px] border bg-[#fffdfa] px-4 py-3.5 text-[15px] shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none transition-[border-color,box-shadow,background-color] duration-200 focus:ring-2";
  const state = isInvalid
    ? "border-red-500 focus:ring-red-300"
    : isValid
    ? "border-emerald-500 focus:ring-emerald-300"
    : "border-[#ddd5c5] focus:border-[#c9a44b] focus:ring-[#c9a44b]/25";

  return (
    <input
      ref={ref}
      type="tel"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      inputMode={inputMode}
      className={`${base} ${state} ${className}`}
      {...rest}
    />
  );
});

export default PhoneInput;
