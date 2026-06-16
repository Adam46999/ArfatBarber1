// src/pages/barberPanel/BarberMobileApp.jsx

import { createElement, useCallback, useEffect, useRef, useState } from "react";

import {
  animate,
  motion,
  useDragControls,
  useMotionValue,
} from "framer-motion";

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

const MotionDiv = motion.div;

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

const REVERSED_TABS = [...TABS].reverse();

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

const SPRING_TRANSITION = {
  type: "spring",
  stiffness: 380,
  damping: 38,
  mass: 0.82,
  restDelta: 0.5,
  restSpeed: 8,
};

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

function clampTabIndex(index) {
  return Math.max(0, Math.min(TABS.length - 1, index));
}

function getVisualIndex(tabIndex) {
  return TABS.length - 1 - tabIndex;
}

function getTargetX(tabIndex, width) {
  return -getVisualIndex(tabIndex) * width;
}

export default function BarberMobileApp() {
  const location = useLocation();
  const navigate = useNavigate();

  const initialIndex = getTabIndexFromPath(location.pathname);

  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const [containerWidth, setContainerWidth] = useState(() => window.innerWidth);

  const [isDragging, setIsDragging] = useState(false);

  const viewportRef = useRef(null);
  const activeIndexRef = useRef(initialIndex);

  const currentAnimationRef = useRef(null);

  const dragControls = useDragControls();

  const x = useMotionValue(0);

  const stopCurrentAnimation = useCallback(() => {
    if (currentAnimationRef.current) {
      currentAnimationRef.current.stop();
      currentAnimationRef.current = null;
    }

    x.stop();
  }, [x]);

  const animateToIndex = useCallback(
    (tabIndex, width = containerWidth, immediate = false) => {
      const targetX = getTargetX(tabIndex, width);

      stopCurrentAnimation();

      if (immediate) {
        x.jump(targetX);
        return;
      }

      currentAnimationRef.current = animate(x, targetX, SPRING_TRANSITION);
    },
    [containerWidth, stopCurrentAnimation, x],
  );

  const goToTab = useCallback(
    (nextIndex, { updateUrl = true, immediate = false } = {}) => {
      const safeIndex = clampTabIndex(nextIndex);

      activeIndexRef.current = safeIndex;

      setActiveIndex(safeIndex);
      setIsDragging(false);

      animateToIndex(safeIndex, containerWidth, immediate);

      if (updateUrl && location.pathname !== TABS[safeIndex].path) {
        navigate(TABS[safeIndex].path);
      }
    },
    [animateToIndex, containerWidth, location.pathname, navigate],
  );

  useEffect(() => {
    const pathIndex = getTabIndexFromPath(location.pathname);

    if (pathIndex === activeIndexRef.current) {
      return;
    }

    activeIndexRef.current = pathIndex;

    setActiveIndex(pathIndex);
    setIsDragging(false);

    animateToIndex(pathIndex);
  }, [animateToIndex, location.pathname]);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return undefined;
    }

    const updateWidth = () => {
      const measuredWidth = viewport.getBoundingClientRect().width;

      const nextWidth = measuredWidth || window.innerWidth;

      setContainerWidth(nextWidth);

      x.jump(getTargetX(activeIndexRef.current, nextWidth));
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);

    resizeObserver.observe(viewport);

    window.addEventListener("orientationchange", updateWidth);

    return () => {
      resizeObserver.disconnect();

      window.removeEventListener("orientationchange", updateWidth);
    };
  }, [x]);

  useEffect(() => {
    return () => {
      stopCurrentAnimation();
    };
  }, [stopCurrentAnimation]);

  const handlePointerDown = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    if (shouldBlockSwipe(event.target)) {
      return;
    }

    stopCurrentAnimation();

    dragControls.start(event);
  };

  const handleDragStart = () => {
    stopCurrentAnimation();
    setIsDragging(true);
  };

  const handleDragEnd = (event, info) => {
    event.stopPropagation();

    setIsDragging(false);

    const offsetX = info.offset.x;

    const velocityX = info.velocity.x;

    const distanceThreshold = Math.min(110, containerWidth * 0.2);

    const velocityThreshold = 520;

    const projectedOffset = offsetX + velocityX * 0.14;

    let nextIndex = activeIndexRef.current;

    const shouldMoveRight =
      projectedOffset > distanceThreshold || velocityX > velocityThreshold;

    const shouldMoveLeft =
      projectedOffset < -distanceThreshold || velocityX < -velocityThreshold;

    if (shouldMoveRight) {
      nextIndex += 1;
    } else if (shouldMoveLeft) {
      nextIndex -= 1;
    }

    nextIndex = clampTabIndex(nextIndex);

    goToTab(nextIndex);
  };

  const dragLeftConstraint = -(TABS.length - 1) * containerWidth;

  const dragRightConstraint = 0;

  return (
    <div className="barber-mobile-app" dir="rtl">
      <div
        ref={viewportRef}
        className={`barber-pages-viewport ${isDragging ? "is-dragging" : ""}`}
        onPointerDown={handlePointerDown}
      >
        <MotionDiv
          className="barber-pages-track"
          style={{ x }}
          drag="x"
          dragListener={false}
          dragControls={dragControls}
          dragConstraints={{
            left: dragLeftConstraint,
            right: dragRightConstraint,
          }}
          dragElastic={0.075}
          dragMomentum={false}
          dragDirectionLock
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {REVERSED_TABS.map((tab) => {
            const originalIndex = TABS.findIndex((item) => item.id === tab.id);

            return (
              <section
                key={tab.id}
                className={`barber-page-slide ${tab.slideClassName || ""}`}
                aria-hidden={activeIndex !== originalIndex}
              >
                {createElement(tab.component)}
              </section>
            );
          })}
        </MotionDiv>
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
