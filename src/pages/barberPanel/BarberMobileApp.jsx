// src/pages/barberPanel/BarberMobileApp.jsx

import { createElement, useCallback, useEffect, useRef, useState } from "react";

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

  const initialIndex = getTabIndexFromPath(location.pathname);

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [containerWidth, setContainerWidth] = useState(() => window.innerWidth);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const viewportRef = useRef(null);

  const activeIndexRef = useRef(initialIndex);
  const dragXRef = useRef(0);
  const gestureRef = useRef(null);
  const mouseDraggingRef = useRef(false);

  const setDrag = useCallback((value) => {
    dragXRef.current = value;
    setDragX(value);
  }, []);

  const goToTab = useCallback(
    (nextIndex, updateUrl = true) => {
      const safeIndex = Math.max(0, Math.min(TABS.length - 1, nextIndex));

      activeIndexRef.current = safeIndex;

      setIsDragging(false);
      setIsAnimating(true);
      setActiveIndex(safeIndex);
      setDrag(0);

      if (updateUrl && location.pathname !== TABS[safeIndex].path) {
        navigate(TABS[safeIndex].path);
      }
    },
    [location.pathname, navigate, setDrag],
  );

  const beginGesture = useCallback(
    (clientX, clientY, target) => {
      if (isAnimating || shouldBlockSwipe(target)) {
        gestureRef.current = null;
        return;
      }

      const now = performance.now();

      gestureRef.current = {
        startX: clientX,
        startY: clientY,
        lastX: clientX,
        lastTime: now,
        velocityX: 0,
        axis: null,
      };
    },
    [isAnimating],
  );

  const moveGesture = useCallback(
    (clientX, clientY) => {
      const gesture = gestureRef.current;

      if (!gesture) {
        return false;
      }

      const deltaX = clientX - gesture.startX;
      const deltaY = clientY - gesture.startY;

      if (!gesture.axis) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (absX < 8 && absY < 8) {
          return false;
        }

        if (absX > absY * 1.1) {
          gesture.axis = "horizontal";
          setIsAnimating(false);
          setIsDragging(true);
        } else {
          gesture.axis = "vertical";
          return false;
        }
      }

      if (gesture.axis !== "horizontal") {
        return false;
      }

      const now = performance.now();
      const elapsed = Math.max(1, now - gesture.lastTime);

      gesture.velocityX = (clientX - gesture.lastX) / elapsed;

      gesture.lastX = clientX;
      gesture.lastTime = now;

      const isFirstPage = activeIndexRef.current === 0;

      const isLastPage = activeIndexRef.current === TABS.length - 1;

      const draggingBeyondFirst = isFirstPage && deltaX > 0;

      const draggingBeyondLast = isLastPage && deltaX < 0;

      const nextDragX =
        draggingBeyondFirst || draggingBeyondLast ? deltaX * 0.22 : deltaX;

      setDrag(nextDragX);

      return true;
    },
    [setDrag],
  );

  const finishGesture = useCallback(() => {
    const gesture = gestureRef.current;

    if (!gesture) {
      return;
    }

    gestureRef.current = null;
    mouseDraggingRef.current = false;

    if (gesture.axis !== "horizontal") {
      setIsDragging(false);
      return;
    }

    const distance = dragXRef.current;
    const absoluteDistance = Math.abs(distance);

    const distanceThreshold = containerWidth * 0.22;
    const velocityThreshold = 0.35;

    const farEnough = absoluteDistance >= distanceThreshold;

    const fastEnough = Math.abs(gesture.velocityX) >= velocityThreshold;

    let nextIndex = activeIndexRef.current;

    if (farEnough || fastEnough) {
      if (distance < 0) {
        nextIndex += 1;
      } else if (distance > 0) {
        nextIndex -= 1;
      }
    }

    goToTab(nextIndex);
  }, [containerWidth, goToTab]);

  const cancelGesture = useCallback(() => {
    gestureRef.current = null;
    mouseDraggingRef.current = false;

    setIsDragging(false);
    setIsAnimating(true);
    setDrag(0);
  }, [setDrag]);

  useEffect(() => {
    const pathIndex = getTabIndexFromPath(location.pathname);

    if (pathIndex === activeIndexRef.current) {
      return;
    }

    activeIndexRef.current = pathIndex;

    setIsAnimating(true);
    setActiveIndex(pathIndex);
    setDrag(0);
  }, [location.pathname, setDrag]);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return undefined;
    }

    const updateWidth = () => {
      const width = viewport.getBoundingClientRect().width;

      setContainerWidth(width || window.innerWidth);
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);

    resizeObserver.observe(viewport);
    window.addEventListener("resize", updateWidth);
    window.addEventListener("orientationchange", updateWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateWidth);
      window.removeEventListener("orientationchange", updateWidth);
    };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return undefined;
    }

    const handleTouchStart = (event) => {
      if (event.touches.length !== 1) {
        return;
      }

      const touch = event.touches[0];

      beginGesture(touch.clientX, touch.clientY, event.target);
    };

    const handleTouchMove = (event) => {
      if (event.touches.length !== 1 || !gestureRef.current) {
        return;
      }

      const touch = event.touches[0];

      const isHorizontal = moveGesture(touch.clientX, touch.clientY);

      if (isHorizontal) {
        event.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      finishGesture();
    };

    const handleTouchCancel = () => {
      cancelGesture();
    };

    viewport.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });

    viewport.addEventListener("touchmove", handleTouchMove, { passive: false });

    viewport.addEventListener("touchend", handleTouchEnd, { passive: true });

    viewport.addEventListener("touchcancel", handleTouchCancel, {
      passive: true,
    });

    return () => {
      viewport.removeEventListener("touchstart", handleTouchStart);

      viewport.removeEventListener("touchmove", handleTouchMove);

      viewport.removeEventListener("touchend", handleTouchEnd);

      viewport.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [beginGesture, moveGesture, finishGesture, cancelGesture]);

  const handleMouseDown = (event) => {
    if (event.button !== 0) {
      return;
    }

    beginGesture(event.clientX, event.clientY, event.target);

    if (gestureRef.current) {
      mouseDraggingRef.current = true;
    }
  };

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!mouseDraggingRef.current) {
        return;
      }

      const isHorizontal = moveGesture(event.clientX, event.clientY);

      if (isHorizontal) {
        event.preventDefault();
      }
    };

    const handleMouseUp = () => {
      if (!mouseDraggingRef.current) {
        return;
      }

      finishGesture();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);

      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [moveGesture, finishGesture]);

  const baseOffset = -(activeIndex * containerWidth);

  const trackTransform = `translate3d(${baseOffset + dragX}px, 0, 0)`;

  return (
    <div className="barber-mobile-app" dir="rtl">
      <div
        ref={viewportRef}
        className={`barber-pages-viewport ${isDragging ? "is-dragging" : ""}`}
        onMouseDown={handleMouseDown}
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

      <nav
        className="barber-floating-nav"
        aria-label="التنقل في لوحة الحلاق"
        data-no-page-swipe
      >
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
