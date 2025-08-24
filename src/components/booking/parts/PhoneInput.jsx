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
    "w-full p-3 rounded-xl border transition focus:ring-2 outline-none";
  const state = isInvalid
    ? "border-red-500 focus:ring-red-300"
    : isValid
    ? "border-emerald-500 focus:ring-emerald-300"
    : "border-gray-300 focus:border-gold focus:ring-gold/40";

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
