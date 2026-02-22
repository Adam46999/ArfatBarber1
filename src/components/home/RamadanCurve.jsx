import { useMemo, useRef } from "react";

export default function RamadanCurve({
  message = "رمضان كريم",
  subMessage = "أعاده الله علينا وعليكم باليُمن والبركات",
  curveAmount = 85,
  debug = false,
}) {
  const pathRef = useRef(null);

  const fullText = useMemo(() => {
    // جملة واحدة فقط
    return `${message}  🌙  ✧  ${subMessage}`;
  }, [message, subMessage]);

  // ✅ أهم إصلاح: عكس اتجاه المسار نفسه (Safari RTL fix)
  const pathD = useMemo(() => {
    const baseY = 120;
    const controlY = baseY + curveAmount;

    // بدل: M 60 ... 1140
    // صارت: M 1140 ... 60  (reverse)
    return `M 1140 ${baseY} Q 600 ${controlY} 60 ${baseY}`;
  }, [curveAmount]);

  return (
    <div
      className={`hero-ramadan-wrap ${debug ? "hero-ramadan-debug" : ""}`}
      aria-hidden="true"
    >
      <div className="hero-ramadan-curve">
        <svg
          width="100%"
          height="170"
          viewBox="0 0 1200 220"
          className="hero-ramadan-svg"
          role="img"
        >
          <defs>
            <path
              id="ramadan-curve-path"
              ref={pathRef}
              d={pathD}
              fill="transparent"
            />

            <linearGradient id="ramadanGold" x1="0.05" y1="0" x2="0.95" y2="1">
              <stop offset="0%" stopColor="#b8923b" />
              <stop offset="35%" stopColor="#f7e7b7" />
              <stop offset="60%" stopColor="#e6c774" />
              <stop offset="100%" stopColor="#b8923b" />
            </linearGradient>

            <linearGradient id="ramadanRibbonTint" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(198,168,91,0.10)" />
              <stop offset="50%" stopColor="rgba(0,0,0,0.14)" />
              <stop offset="100%" stopColor="rgba(198,168,91,0.10)" />
            </linearGradient>

            <filter
              id="ramadanGlow"
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feGaussianBlur stdDeviation="0.9" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="
                  1 0 0 0 0
                  0 1 0 0 0
                  0 0 1 0 0
                  0 0 0 0.35 0"
                result="glow"
              />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter
              id="ramadanRibbonBlur"
              x="-60%"
              y="-60%"
              width="220%"
              height="220%"
            >
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Ribbon زجاجي */}
          <use
            href="#ramadan-curve-path"
            stroke="url(#ramadanRibbonTint)"
            className="hero-ramadan-ribbonGlass"
            filter="url(#ramadanRibbonBlur)"
          />
          <use
            href="#ramadan-curve-path"
            className="hero-ramadan-ribbonGoldTop"
          />
          <use
            href="#ramadan-curve-path"
            className="hero-ramadan-ribbonGoldBottom"
          />

          {/* ✅ حجم خط Inline (غصب عن Safari/CSS) */}
          <text
            className="hero-ramadan-text"
            fill="url(#ramadanGold)"
            filter="url(#ramadanGlow)"
            textAnchor="middle"
            style={{ fontSize: "30px", fontWeight: 900 }}
          >
            <textPath href="#ramadan-curve-path" startOffset="50%">
              {fullText}
            </textPath>
          </text>
        </svg>
      </div>
    </div>
  );
}
