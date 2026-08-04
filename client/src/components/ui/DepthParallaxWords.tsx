import React, { useEffect, useRef, useState } from "react";

interface DepthParallaxWordsProps {
  children: string;
  className?: string;
  delay?: number;
  stagger?: number;
  as?: React.ElementType;
  threshold?: number;
}

export const DepthParallaxWords: React.FC<DepthParallaxWordsProps> = ({
  children,
  className = "",
  delay = 0,
  stagger = 65,
  as: Component = "span",
  threshold = 0.1,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Check if element is already in viewport on initial mount
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [threshold]);

  if (typeof children !== "string") {
    return <Component className={className}>{children}</Component>;
  }

  const words = children.trim().split(/\s+/);

  return (
    <Component
      ref={containerRef}
      className={`inline-block perspective-[1000px] ${className}`}
    >
      {words.map((word, idx) => (
        <span
          key={idx}
          className={`inline-block whitespace-pre ${
            isVisible ? "animate-depth-word" : "opacity-0"
          }`}
          style={{
            animationDelay: isVisible ? `${delay + idx * stagger}ms` : "0ms",
            marginRight: idx === words.length - 1 ? 0 : "0.28em",
          }}
        >
          {word}
        </span>
      ))}
    </Component>
  );
};

export default DepthParallaxWords;
