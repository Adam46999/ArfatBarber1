// src/components/ui/Button.jsx
export default function Button({
  children,
  type = "button",
  onClick,
  variant = "gold", // gold | outlineGold | ghost
  size = "lg", // sm | md | lg | xl
  disabled = false,
  loading = false,
  fullWidth = false,
  className = "",
}) {
  const base =
    "inline-flex items-center justify-center select-none rounded-2xl border " +
    "transition duration-200 ease-out will-change-transform " +
    "focus:outline-none focus:ring-2 focus:ring-offset-2 " +
    "disabled:opacity-60 disabled:cursor-not-allowed";

  const variants = {
    gold:
      // ذهبي متدرّج + نص داكن (متناسق مع موقعك)
      "bg-gradient-to-r from-[#FACC15] to-[#eab308] text-[#1F2937] " +
      "border-yellow-400 shadow-[0_6px_20px_rgba(250,204,21,0.35)] " +
      "hover:brightness-[1.03] hover:shadow-[0_10px_28px_rgba(250,204,21,0.45)] " +
      "active:scale-[0.98] focus:ring-yellow-400",
    outlineGold:
      "bg-white text-[#1F2937] border-yellow-400 " +
      "hover:bg-yellow-50 focus:ring-yellow-300 active:scale-[0.98]",
    ghost:
      "bg-transparent text-[#1F2937] border-transparent " +
      "hover:bg-gray-100 focus:ring-gray-300 active:scale-[0.98]",
  };

  const sizes = {
    sm: "text-sm px-3 py-1.5",
    md: "text-base px-4 py-2",
    lg: "text-base px-5 py-3",
    xl: "text-lg px-6 py-3.5",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={[
        base,
        variants[variant],
        sizes[size],
        fullWidth ? "w-full" : "",
        "relative overflow-hidden", // لمعان لطيف
        className,
      ].join(" ")}
    >
      {/* لمعان خفيف يمر عند الهوفر */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 hover:opacity-10 transition"
        style={{
          background:
            "linear-gradient(120deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.9) 45%, rgba(255,255,255,0) 90%)",
          transform: "translateX(-120%)",
        }}
        onAnimationEnd={(e) =>
          (e.currentTarget.style.transform = "translateX(-120%)")
        }
      />
      {/* محتوى الزر */}
      <span className="inline-flex items-center gap-2">
        {loading ? (
          <svg
            className="animate-spin h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-90"
              d="M4 12a8 8 0 018-8"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        ) : null}
        <span>{children}</span>
      </span>
    </button>
  );
}
