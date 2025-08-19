// src/components/booking/PhoneInput.jsx
import { formatPhoneInput } from "../../../utils/phone";

/**
 * حقل هاتف قياسي بإخراج مقنّع (05X-XXXXXXX)
 */
export default function PhoneInput({
  value,
  onChange,
  placeholder,
  required = true,
}) {
  const handle = (e) => onChange(formatPhoneInput(e.target.value));

  return (
    <input
      type="tel"
      inputMode="tel"
      placeholder={placeholder}
      className="w-full p-3 border border-gray-300 rounded-xl"
      value={value}
      onChange={handle}
      required={required}
      aria-label={placeholder}
    />
  );
}
