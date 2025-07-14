import React, { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText as GSAPSplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, GSAPSplitText);

// Helper function to interpolate between two colors
const interpolateColor = (color1: string, color2: string, factor: number): string => {
  // Convert hex colors to RGB
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const r1 = parseInt(hex1.substr(0, 2), 16);
  const g1 = parseInt(hex1.substr(2, 2), 16);
  const b1 = parseInt(hex1.substr(4, 2), 16);
  
  const r2 = parseInt(hex2.substr(0, 2), 16);
  const g2 = parseInt(hex2.substr(2, 2), 16);
  const b2 = parseInt(hex2.substr(4, 2), 16);
  
  // Interpolate
  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);
  
  // Convert back to hex
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  ease?: string | ((t: number) => number);
  splitType?: "chars" | "words" | "lines" | "words, chars";
  from?: gsap.TweenVars;
  to?: gsap.TweenVars;
  threshold?: number;
  rootMargin?: string;
  textAlign?: React.CSSProperties["textAlign"];
  onLetterAnimationComplete?: () => void;
  gradientFrom?: string;
  gradientVia?: string;
  gradientTo?: string;
  gradientDirection?: "to-r" | "to-b" | "to-l" | "to-t";
}

const SplitText: React.FC<SplitTextProps> = ({
  text,
  className = "",
  delay = 100,
  duration = 0.6,
  ease = "power3.out",
  splitType = "chars",
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  threshold = 0.1,
  rootMargin = "-100px",
  textAlign = "center",
  onLetterAnimationComplete,
  gradientFrom,
  gradientVia,
  gradientTo,
  gradientDirection = "to-r",
}) => {
  const ref = useRef<HTMLParagraphElement>(null);
  const animationCompletedRef = useRef(false);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !ref.current || !text || hasInitialized.current) return;

    const el = ref.current;
    hasInitialized.current = true;
    
    animationCompletedRef.current = false;

    const absoluteLines = splitType === "lines";
    if (absoluteLines) el.style.position = "relative";

    let splitter: GSAPSplitText;
    try {
      splitter = new GSAPSplitText(el, {
        type: splitType,
        absolute: absoluteLines,
        linesClass: "split-line",
      });
    } catch (error) {
      console.error("Failed to create SplitText:", error);
      return;
    }

    let targets: Element[];
    switch (splitType) {
      case "lines":
        targets = splitter.lines;
        break;
      case "words":
        targets = splitter.words;
        break;
      case "chars":
        targets = splitter.chars;
        break;
      default:
        targets = splitter.chars;
    }

    if (!targets || targets.length === 0) {
      console.warn("No targets found for SplitText animation");
      splitter.revert();
      return;
    }

    // Apply gradient styling to individual characters if gradient props are provided
    if (gradientFrom && gradientTo) {
      const totalChars = targets.length;
      targets.forEach((t, index) => {
        const element = t as HTMLElement;
        element.style.willChange = "transform, opacity";
        
        // Calculate gradient position for each character
        const progress = totalChars > 1 ? index / (totalChars - 1) : 0;
        
        // Create gradient colors
        const fromColor = gradientFrom;
        const toColor = gradientTo;
        const viaColor = gradientVia;
        
        let color;
        if (viaColor && progress <= 0.5) {
          // First half: from -> via
          const localProgress = progress * 2;
          color = interpolateColor(fromColor, viaColor, localProgress);
        } else if (viaColor && progress > 0.5) {
          // Second half: via -> to
          const localProgress = (progress - 0.5) * 2;
          color = interpolateColor(viaColor, toColor, localProgress);
        } else {
          // No via color: from -> to
          color = interpolateColor(fromColor, toColor, progress);
        }
        
        element.style.color = color;
      });
    } else {
      targets.forEach((t) => {
        (t as HTMLElement).style.willChange = "transform, opacity";
      });
    }

    const startPct = (1 - threshold) * 100;
    const marginMatch = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(rootMargin);
    const marginValue = marginMatch ? parseFloat(marginMatch[1]) : 0;
    const marginUnit = marginMatch ? (marginMatch[2] || "px") : "px";
    const sign = marginValue < 0 ? `-=${Math.abs(marginValue)}${marginUnit}` : `+=${marginValue}${marginUnit}`;
    const start = `top ${startPct}%${sign}`;

    // Prevent animation if already completed
    if (animationCompletedRef.current) {
      gsap.set(targets, { ...to, immediateRender: true });
      return;
    }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start,
        toggleActions: "play none none none",
        once: true,
        onToggle: (self) => {
          scrollTriggerRef.current = self;
        },
      },
      smoothChildTiming: true,
      onComplete: () => {
        animationCompletedRef.current = true;
        gsap.set(targets, {
          ...to,
          clearProps: "willChange",
          immediateRender: true,
        });
        onLetterAnimationComplete?.();
        
        // Kill the timeline and ScrollTrigger to prevent re-triggering
        tl.kill();
        if (scrollTriggerRef.current) {
          scrollTriggerRef.current.kill();
          scrollTriggerRef.current = null;
        }
      },
    });

    tl.set(targets, { ...from, immediateRender: false, force3D: true });
    tl.to(targets, {
      ...to,
      duration,
      ease,
      stagger: delay / 1000,
      force3D: true,
    });

    return () => {
      tl.kill();
      if (scrollTriggerRef.current) {
        scrollTriggerRef.current.kill();
        scrollTriggerRef.current = null;
      }
      gsap.killTweensOf(targets);
      if (splitter) {
        splitter.revert();
      }
    };
  }, []); // Empty dependency array - run only once

  return (
    <p
      ref={ref}
      className={`split-parent inline-block whitespace-normal ${className}`}
      style={{
        textAlign,
        wordWrap: "break-word",
      }}
    >
      {text}
    </p>
  );
};

export default SplitText; 