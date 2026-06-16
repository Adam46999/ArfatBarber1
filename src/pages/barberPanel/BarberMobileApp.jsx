// src/pages/barberPanel/BarberMobileApp.jsx
import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useLocation, useNavigate } from "react-router-dom";

import {
  FaBan,
  FaCalendarAlt,
  FaCalendarCheck,
  FaChartBar,
  FaClock,
  FaStar,
} from "react-icons/fa";

import BarberPanel from "./BarberPanel";
import AdminBookings from "../AdminBookings";
import WeeklyHoursPage from "./WeeklyHoursPage";
import ReviewsManagerPage from "./reviews/ReviewsManagerPage";
import BlockedPhones from "../BlockedPhones";
import Dashboard from "../Dashboard";

import "./BarberMobileApp.css";

const TABS = [
  {
    id: "manage",
    path: "/barber",
    shortLabel: "إدارة",
    fullLabel: "إدارة الساعات",
    icon: FaClock,
    component: BarberPanel,
    slideClassName: "barber-manage-slide",
  },
  {
    id: "bookings",
    path: "/barber/bookings",
    shortLabel: "حجوزات",
    fullLabel: "لوحة الحجوزات",
    icon: FaCalendarCheck,
    component: AdminBookings,
  },
  {
    id: "weekly-hours",
    path: "/barber/weekly-hours",
    shortLabel: "أسبوعي",
    fullLabel: "ساعات العمل الأسبوعية",
    icon: FaCalendarAlt,
    component: WeeklyHoursPage,
  },
  {
    id: "reviews",
    path: "/barber/reviews",
    shortLabel: "تقييمات",
    fullLabel: "إدارة التقييمات",
    icon: FaStar,
    component: ReviewsManagerPage,
  },
  {
    id: "blocked",
    path: "/barber/blocked",
    shortLabel: "محظورون",
    fullLabel: "الأرقام المحظورة",
    icon: FaBan,
    component: BlockedPhones,
  },
  {
    id: "stats",
    path: "/barber/stats",
    shortLabel: "إحصائيات",
    fullLabel: "الإحصائيات",
    icon: FaChartBar,
    component: Dashboard,
  },
];

const BLOCK_SWIPE_SELECTOR = [
  "[data-no-page-swipe]",
  "[data-horizontal-scroll]",
  ".overflow-x-auto",
  "input",
  "textarea",
  "select",
  "option",
  "button",
  "a",
  "[role='button']",
  "[contenteditable='true']",
].join(",");

function getTabIndexFromPath(pathname) {
  if (pathname === "/barber" || pathname === "/barber/") {
    return 0;
  }

  const index = TABS.findIndex(
    (tab) => tab.path !== "/barber" && pathname.startsWith(tab.path),
  );

  return index >= 0 ? index : 0;
}

function shouldBlockSwipe(target) {
  return (
    target instanceof Element && Boolean(target.closest(BLOCK_SWIPE_SELECTOR))
  );
}

export default function BarberMobileApp() {
  const location = useLocation();
  const navigate = useNavigate();

  const initialIndex = useMemo(
    () => getTabIndexFromPath(location.pathname),
    [location.pathname],
  );

  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const [containerWidth, setContainerWidth] = useState(() => window.innerWidth);

  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const [isAnimating, setIsAnimating] = useState(false);

  const viewportRef = useRef(null);
  const dragXRef = useRef(0);
  const activeIndexRef = useRef(initialIndex);
  const gestureRef = useRef(null);
  const didDragRef = useRef(false);
  const clickResetTimerRef = useRef(null);

  const setDrag = useCallback((value) => {
    dragXRef.current = value;
    setDragX(value);
  }, []);

  const goToTab = useCallback(
    (nextIndex, { updateUrl = true } = {}) => {
      const safeIndex = Math.max(0, Math.min(TABS.length - 1, nextIndex));

      setIsAnimating(true);
      setIsDragging(false);
      setDrag(0);
      setActiveIndex(safeIndex);
      activeIndexRef.current = safeIndex;

      if (updateUrl && location.pathname !== TABS[safeIndex].path) {
        navigate(TABS[safeIndex].path);
      }
    },
    [location.pathname, navigate, setDrag],
  );

  useEffect(() => {
    const pathIndex = getTabIndexFromPath(location.pathname);

    if (pathIndex !== activeIndexRef.current) {
      setIsAnimating(true);
      setActiveIndex(pathIndex);
      activeIndexRef.current = pathIndex;
      setDrag(0);
    }
  }, [location.pathname, setDrag]);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return undefined;
    }

    const updateWidth = () => {
      const measuredWidth = viewport.getBoundingClientRect().width;

      setContainerWidth(measuredWidth || window.innerWidth);
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);

    resizeObserver.observe(viewport);

    window.addEventListener("orientationchange", updateWidth);

    return () => {
      resizeObserver.disconnect();

      window.removeEventListener("orientationchange", updateWidth);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (clickResetTimerRef.current) {
        clearTimeout(clickResetTimerRef.current);
      }
    };
  }, []);

  const onPointerDown = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    if (isAnimating || shouldBlockSwipe(event.target)) {
      return;
    }

    const now = performance.now();

    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastTime: now,
      axis: null,
      velocityX: 0,
    };

    didDragRef.current = false;
  };

  const onPointerMove = (event) => {
    const gesture = gestureRef.current;

    if (!gesture || gesture.pointerId !== event.pointerId) {
      return;
    }

    const rawX = event.clientX - gesture.startX;

    const rawY = event.clientY - gesture.startY;

    if (!gesture.axis) {
      if (Math.abs(rawX) < 7 && Math.abs(rawY) < 7) {
        return;
      }

      gesture.axis =
        Math.abs(rawX) > Math.abs(rawY) * 1.15 ? "horizontal" : "vertical";

      if (gesture.axis === "vertical") {
        gestureRef.current = null;
        return;
      }

      setIsDragging(true);
      setIsAnimating(false);
      didDragRef.current = true;

      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // بعض المتصفحات لا تحتاج Pointer Capture
      }
    }

    if (gesture.axis !== "horizontal") {
      return;
    }

    event.preventDefault();

    const now = performance.now();

    const elapsed = Math.max(1, now - gesture.lastTime);

    gesture.velocityX = (event.clientX - gesture.lastX) / elapsed;

    gesture.lastX = event.clientX;
    gesture.lastTime = now;

    const atFirstPage = activeIndexRef.current === 0 && rawX > 0;

    const atLastPage = activeIndexRef.current === TABS.length - 1 && rawX < 0;

    const resistedX = atFirstPage || atLastPage ? rawX * 0.24 : rawX;

    setDrag(resistedX);
  };

  const finishGesture = (event) => {
    const gesture = gestureRef.current;

    if (!gesture || gesture.pointerId !== event.pointerId) {
      return;
    }

    gestureRef.current = null;

    if (gesture.axis !== "horizontal") {
      return;
    }

    const distance = dragXRef.current;
    const absoluteDistance = Math.abs(distance);

    const distanceThreshold = containerWidth * 0.24;

    const velocityThreshold = 0.45;

    const fastEnough = Math.abs(gesture.velocityX) >= velocityThreshold;

    const farEnough = absoluteDistance >= distanceThreshold;

    let nextIndex = activeIndexRef.current;

    if (farEnough || fastEnough) {
      if (distance < 0) {
        nextIndex += 1;
      }

      if (distance > 0) {
        nextIndex -= 1;
      }
    }

    nextIndex = Math.max(0, Math.min(TABS.length - 1, nextIndex));

    goToTab(nextIndex);

    if (clickResetTimerRef.current) {
      clearTimeout(clickResetTimerRef.current);
    }

    clickResetTimerRef.current = setTimeout(() => {
      didDragRef.current = false;
    }, 80);
  };

  const cancelGesture = () => {
    gestureRef.current = null;

    setIsAnimating(true);
    setIsDragging(false);
    setDrag(0);
  };

  const onClickCapture = (event) => {
    if (!didDragRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  };

  const baseOffset = -(activeIndex * containerWidth);

  const trackTransform = `translate3d(${baseOffset + dragX}px, 0, 0)`;

  return (
    <div className="barber-mobile-app" dir="rtl">
      <div
        ref={viewportRef}
        className={`barber-pages-viewport ${isDragging ? "is-dragging" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishGesture}
        onPointerCancel={cancelGesture}
        onLostPointerCapture={cancelGesture}
        onClickCapture={onClickCapture}
      >
        <div
          className="barber-pages-track"
          style={{
            transform: trackTransform,
            transition:
              isAnimating && !isDragging
                ? "transform 320ms cubic-bezier(0.22, 0.72, 0, 1)"
                : "none",
          }}
          onTransitionEnd={() => {
            setIsAnimating(false);
          }}
        >
          {TABS.map((tab, index) => (
            <section
              key={tab.id}
              className={`barber-page-slide ${tab.slideClassName || ""}`}
              aria-hidden={activeIndex !== index}
            >
              {createElement(tab.component)}
            </section>
          ))}
        </div>
      </div>

      <nav className="barber-floating-nav" aria-label="التنقل في لوحة الحلاق">
        {TABS.map((tab, index) => {
          const Icon = tab.icon;
          const active = activeIndex === index;

          return (
            <button
              key={tab.id}
              type="button"
              className={`barber-nav-item ${active ? "is-active" : ""}`}
              onClick={() => goToTab(index)}
              aria-current={active ? "page" : undefined}
              aria-label={tab.fullLabel}
              data-no-page-swipe
            >
              <span className="barber-nav-icon" aria-hidden="true">
                <Icon />
              </span>

              <span className="barber-nav-label">
                {active ? tab.fullLabel : tab.shortLabel}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
