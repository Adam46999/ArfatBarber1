import { FaWhatsapp, FaShoppingCart } from "react-icons/fa";

export default function ProductCard({
  product,
  labels,
  onDetails,
  onOrder,
}) {
  const available = product.inStock;
  const price = Number(product.price || 0);

  return (
    <article
      className={`group overflow-hidden rounded-[12px] border bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] transition sm:rounded-[14px] ${
        available ? "border-black/5" : "border-black/10"
      }`}
    >
      <button
        type="button"
        onClick={() => onDetails(product)}
        className="relative block aspect-[1.12/1] w-full overflow-hidden bg-[#191816]"
      >
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className={`h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] ${
              available ? "" : "grayscale opacity-55"
            }`}
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#29251f] to-[#0d0d0c]">
            <div className="text-center">
              <div className="font-heading text-base font-black tracking-[0.18em] text-[#e7c77f]">
                ARFAT
              </div>
              <div className="mt-0.5 text-[7px] tracking-[0.3em] text-white/50">
                BARBER
              </div>
            </div>
          </div>
        )}

        {product.featured && (
          <span className="absolute start-2 top-2 rounded-full bg-[#f0d69a] px-2 py-1 text-[8px] font-black text-[#16130e] shadow-sm sm:text-[9px]">
            {labels.recommended}
          </span>
        )}

        {!available && (
          <span className="absolute end-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[8px] font-bold text-white backdrop-blur-sm sm:text-[9px]">
            {labels.outOfStock}
          </span>
        )}
      </button>

      <div className="p-2.5 sm:p-3">
        <button
          type="button"
          onClick={() => onDetails(product)}
          className="block min-w-0 w-full text-start"
        >
          <h3 className="truncate text-[12px] font-black leading-5 text-[#111] sm:text-[14px]">
            {product.name}
          </h3>

          <p className="truncate text-[9px] font-medium text-black/45 sm:text-[11px]">
            {product.brand || ""}
          </p>
        </button>

        <div className="mt-2 flex min-h-[34px] items-end justify-between gap-2">
          <span className="shrink-0 text-[14px] font-black leading-none text-[#111] sm:text-[17px]">
            ₪{price.toFixed(price % 1 === 0 ? 0 : 2)}
          </span>

          {available ? (
            <div className="flex shrink-0 overflow-hidden rounded-[9px] bg-[#0d0e0e] shadow-sm">
              <button
                type="button"
                onClick={() => onDetails(product)}
                className="grid h-[32px] w-[32px] place-items-center text-[#e6c579] transition active:bg-white/10 active:scale-95 sm:h-[34px] sm:w-[34px]"
                aria-label={labels.details}
              >
                <FaShoppingCart size={12} />
              </button>

              <div className="my-2 w-px bg-white/15" />

              <button
                type="button"
                onClick={() => onOrder(product)}
                className="grid h-[32px] w-[32px] place-items-center text-white transition active:bg-white/10 active:scale-95 sm:h-[34px] sm:w-[34px]"
                aria-label={labels.order}
              >
                <FaWhatsapp size={14} />
              </button>
            </div>
          ) : (
            <div className="rounded-lg bg-black/8 px-2.5 py-2 text-[9px] font-black text-black/45 sm:text-[10px]">
              {labels.outOfStock}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
