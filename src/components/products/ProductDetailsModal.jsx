import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FaTimes,
  FaWhatsapp,
  FaCheckCircle,
  FaBoxOpen,
} from "react-icons/fa";

export default function ProductDetailsModal({
  product,
  labels,
  onClose,
  onOrder,
}) {
  useEffect(() => {
    if (!product) return;

    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [product, onClose]);

  if (!product) return null;

  const available = product.inStock;
  const price = Number(product.price || 0);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/65 p-0 backdrop-blur-[3px] sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <article
        dir="auto"
        className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[26px] border border-white/10 bg-[#f5f2ec] text-[#111] shadow-[0_-12px_50px_rgba(0,0,0,0.35)] sm:max-w-[520px] sm:rounded-[24px] sm:shadow-2xl"
      >
        {/* Mobile drag handle */}
        <div className="sticky top-0 z-20 flex h-6 items-center justify-center bg-[#f5f2ec]/95 backdrop-blur sm:hidden">
          <div className="h-1 w-10 rounded-full bg-black/15" />
        </div>

        {/* IMAGE */}
        <div className="relative mx-3 overflow-hidden rounded-[20px] bg-[#171613] sm:mx-4 sm:mt-4">
          <div className="aspect-[1.18/1] w-full">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className={`h-full w-full object-cover ${
                  available ? "" : "grayscale opacity-65"
                }`}
              />
            ) : (
              <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_65%_30%,rgba(214,177,94,0.22),transparent_35%),linear-gradient(135deg,#251c11,#0f1010)]">
                <div className="text-center">
                  <p className="font-heading text-2xl font-black tracking-[0.18em] text-[#e5c477]">
                    ARFAT
                  </p>
                  <p className="mt-1 text-[8px] tracking-[0.34em] text-white/55">
                    BARBER
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            aria-label={labels.close}
            className="absolute end-3 top-3 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-md transition active:scale-95"
          >
            <FaTimes size={15} />
          </button>

          {product.featured && (
            <span className="absolute start-3 top-3 rounded-full bg-[#efd38f] px-3 py-1.5 text-[10px] font-black text-[#16120b] shadow">
              {labels.recommended}
            </span>
          )}

          {!available && (
            <div className="absolute inset-x-3 bottom-3 rounded-xl bg-black/75 px-3 py-2.5 text-center text-xs font-black text-white backdrop-blur">
              {labels.outOfStock}
            </div>
          )}
        </div>

        {/* CONTENT */}
        <div className="px-4 pb-[calc(18px+env(safe-area-inset-bottom))] pt-4 sm:px-5 sm:pb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {product.brand && (
                <p className="mb-1 text-[9px] font-black tracking-[0.16em] text-[#a77d29]">
                  {product.brand}
                </p>
              )}

              <h2 className="text-start text-[20px] font-black leading-tight text-[#111] sm:text-[23px]">
                {product.name}
              </h2>
            </div>

            <div className="shrink-0 text-end">
              <p className="text-[10px] font-bold text-black/35">
                {labels.price}
              </p>
              <p className="mt-0.5 text-[22px] font-black leading-none text-[#111] sm:text-[25px]">
                ₪{price.toFixed(price % 1 === 0 ? 0 : 2)}
              </p>
            </div>
          </div>

          {/* Availability */}
          <div
            className={`mt-4 flex min-h-[42px] items-center gap-2 rounded-xl border px-3 text-xs font-black ${
              available
                ? "border-emerald-700/10 bg-emerald-50 text-emerald-800"
                : "border-black/5 bg-black/5 text-black/45"
            }`}
          >
            {available ? (
              <FaCheckCircle className="text-emerald-600" />
            ) : (
              <FaBoxOpen />
            )}

            <span>
              {available ? labels.available : labels.outOfStock}
            </span>
          </div>

          {product.description && (
            <p className="mt-4 text-start text-[13px] font-medium leading-6 text-black/60 sm:text-sm">
              {product.description}
            </p>
          )}

          {/* CTA */}
          <button
            type="button"
            disabled={!available}
            onClick={() => onOrder(product)}
            className={`mt-5 flex min-h-[54px] w-full items-center justify-center gap-2.5 rounded-[15px] text-sm font-black shadow-sm transition active:scale-[0.985] ${
              available
                ? "bg-[#111211] text-[#efd38f]"
                : "cursor-not-allowed bg-black/8 text-black/30 shadow-none"
            }`}
          >
            <FaWhatsapp size={19} />
            <span>
              {available ? labels.order : labels.outOfStock}
            </span>
          </button>
        </div>
      </article>
    </div>,
    document.body
  );
}
