import {
  useEffect,
  useRef,
  useState,
  createElement,
  useMemo,
  useCallback,
} from "react";
import { gsap } from "gsap";
import "./TextType.css";

const TextType = ({
  text,
  as: Component = "span",
  typingSpeed = 90,
  initialDelay = 0,
  pauseDuration = 900,
  deletingSpeed = 60,
  loop = false,
  className = "",
  showCursor = false,
  hideCursorWhileTyping = false,
  cursorCharacter = "●",
  cursorClassName = "",
  cursorBlinkDuration = 0.6,
  textColors = [],
  variableSpeed,
  onSentenceComplete,
  startOnVisible = false,
  reverseMode = false,
  ...props
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(!startOnVisible);

  const cursorRef = useRef(null);
  const containerRef = useRef(null);

  const textArray = useMemo(
    () => (Array.isArray(text) ? text : [text]),
    [text],
  );

  const getRandomSpeed = useCallback(() => {
    if (!variableSpeed) return typingSpeed;
    const { min, max } = variableSpeed;
    return Math.random() * (max - min) + min;
  }, [variableSpeed, typingSpeed]);

  const getCurrentTextColor = () => {
    if (textColors.length === 0) return "inherit";
    return textColors[currentTextIndex % textColors.length];
  };

  // Start on visible (optional)
  useEffect(() => {
    if (!startOnVisible || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => e.isIntersecting && setIsVisible(true)),
      { threshold: 0.1 },
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [startOnVisible]);

  // Cursor blink
  useEffect(() => {
    if (!showCursor || !cursorRef.current) return;

    gsap.killTweensOf(cursorRef.current);
    gsap.set(cursorRef.current, { opacity: 1 });
    gsap.to(cursorRef.current, {
      opacity: 0,
      duration: cursorBlinkDuration,
      repeat: -1,
      yoyo: true,
      ease: "power2.inOut",
    });
  }, [showCursor, cursorBlinkDuration]);

  // Typing logic
  useEffect(() => {
    if (!isVisible) return;

    let timeout;
    const currentText = textArray[currentTextIndex] ?? "";
    const processedText = reverseMode
      ? currentText.split("").reverse().join("")
      : currentText;

    const tick = () => {
      // deleting
      if (isDeleting) {
        if (displayedText === "") {
          setIsDeleting(false);

          if (onSentenceComplete)
            onSentenceComplete(textArray[currentTextIndex], currentTextIndex);

          // stop if finished and not looping
          if (currentTextIndex === textArray.length - 1 && !loop) return;

          setCurrentTextIndex((p) => (p + 1) % textArray.length);
          setCurrentCharIndex(0);
          timeout = setTimeout(() => {}, pauseDuration);
        } else {
          timeout = setTimeout(
            () => setDisplayedText((p) => p.slice(0, -1)),
            deletingSpeed,
          );
        }
        return;
      }

      // typing
      if (currentCharIndex < processedText.length) {
        timeout = setTimeout(
          () => {
            setDisplayedText((p) => p + processedText[currentCharIndex]);
            setCurrentCharIndex((p) => p + 1);
          },
          variableSpeed ? getRandomSpeed() : typingSpeed,
        );
        return;
      }

      // finished typing sentence
      if (onSentenceComplete)
        onSentenceComplete(textArray[currentTextIndex], currentTextIndex);

      // stop if last sentence and no loop
      if (currentTextIndex === textArray.length - 1 && !loop) return;

      timeout = setTimeout(() => setIsDeleting(true), pauseDuration);
    };

    if (currentCharIndex === 0 && !isDeleting && displayedText === "") {
      timeout = setTimeout(tick, initialDelay);
    } else {
      tick();
    }

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentCharIndex,
    displayedText,
    isDeleting,
    typingSpeed,
    deletingSpeed,
    pauseDuration,
    textArray,
    currentTextIndex,
    loop,
    initialDelay,
    isVisible,
    reverseMode,
    variableSpeed,
    onSentenceComplete,
  ]);

  const shouldHideCursor =
    hideCursorWhileTyping &&
    (currentCharIndex < (textArray[currentTextIndex]?.length ?? 0) ||
      isDeleting);

  return createElement(
    Component,
    { ref: containerRef, className: `text-type ${className}`, ...props },
    <span
      className="text-type__content"
      style={{ color: getCurrentTextColor() }}
    >
      {displayedText}
    </span>,
    showCursor && (
      <span
        ref={cursorRef}
        className={`text-type__cursor ${cursorClassName} ${shouldHideCursor ? "text-type__cursor--hidden" : ""}`}
      >
        {cursorCharacter}
      </span>
    ),
  );
};

export default TextType;
