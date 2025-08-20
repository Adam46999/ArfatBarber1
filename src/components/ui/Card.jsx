// src/components/ui/Card.jsx
export default function Card({
  children,
  onClick,
  selected = false,
  disabled = false,
  className = "",
  role = "button",
  tabIndex = 0,
}) {
  const base =
    "rounded-2xl border bg-white p-4 shadow-sm transition cursor-pointer select-none " +
    "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-yellow-400";
  const selectedCls = selected
    ? "border-yellow-400 ring-1 ring-yellow-400 shadow-[0_8px_24px_rgba(250,204,21,0.25)]"
    : "border-gray-200";
  const disabledCls = disabled ? "opacity-50 cursor-not-allowed" : "";

  return (
    <div
      role={role}
      tabIndex={tabIndex}
      onClick={disabled ? undefined : onClick}
      className={`${base} ${selectedCls} ${disabledCls} ${className}`}
    >
      {children}
    </div>
  );
}
