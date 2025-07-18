import React, { useEffect, useMemo, useRef, ReactNode, RefObject } from "react";

// Dynamic import for GSAP to ensure proper loading
let gsap: any = null;
let ScrollTrigger: any = null;

if (typeof window !== 'undefined') {
  import('gsap').then((gsapModule) => {
    gsap = gsapModule.gsap;
    return import('gsap/ScrollTrigger');
  }).then((scrollTriggerModule) => {
    ScrollTrigger = scrollTriggerModule.ScrollTrigger;
    if (gsap && ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
    }
  }).catch(console.error);
}

interface ScrollFloatProps {
  children: ReactNode;
  scrollContainerRef?: RefObject<HTMLElement>;
  containerClassName?: string;
  textClassName?: string;
  animationDuration?: number;
  ease?: string;
  scrollStart?: string;
  scrollEnd?: string;
  stagger?: number;
  gradientWords?: string[];
  gradientFrom?: string;
  gradientTo?: string;
}

const ScrollFloat: React.FC<ScrollFloatProps> = ({
  children,
  scrollContainerRef,
  containerClassName = "",
  textClassName = "",
  animationDuration = 1,
  ease = "back.inOut(2)",
  scrollStart = "center bottom+=50%",
  scrollEnd = "bottom bottom-=40%",
  stagger = 0.03,
  gradientWords = [],
  gradientFrom = "#59e3a5",
  gradientTo = "#14c0ff"
}) => {
  const containerRef = useRef<HTMLHeadingElement>(null);

  const splitText = useMemo(() => {
    const text = typeof children === "string" ? children : "";
    const words = text.split(" ");
    let charIndex = 0;
    
    return words.map((word, wordIndex) => {
      const isGradientWord = gradientWords.includes(word.replace(/[.,!?…]/g, ''));
      const wordChars = word.split("").map((char, index) => {
        const span = (
          <span 
            className="inline-block"
            key={charIndex}
            style={isGradientWord ? {
              background: `linear-gradient(to right, ${gradientFrom}, ${gradientTo})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'transparent',
              display: 'inline-block',
              lineHeight: 'inherit',
              paddingBottom: '2px'
            } : {}}
          >
            {char}
          </span>
        );
        charIndex++;
        return span;
      });
      
      // Add space after word (except last word)
      if (wordIndex < words.length - 1) {
        wordChars.push(
          <span className="inline-block" key={charIndex}>
            {"\u00A0"}
          </span>
        );
        charIndex++;
      }
      
      return wordChars;
    }).flat();
  }, [children, gradientWords, gradientFrom, gradientTo]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Wait for GSAP to load with timeout
    const initAnimation = () => {
      if (!gsap || !gsap.fromTo || !ScrollTrigger) {
        // Try again after a short delay
        setTimeout(initAnimation, 100);
        return;
      }

      const scroller =
        scrollContainerRef && scrollContainerRef.current
          ? scrollContainerRef.current
          : window;

      const charElements = el.querySelectorAll(".inline-block");

      if (charElements.length === 0) {
        console.warn("No character elements found for animation");
        return;
      }

      gsap.fromTo(
        charElements,
        {
          willChange: "opacity, transform",
          opacity: 0,
          yPercent: 120,
          scaleY: 2.3,
          scaleX: 0.7,
          transformOrigin: "50% 0%"
        },
        {
          duration: animationDuration,
          ease: ease,
          opacity: 1,
          yPercent: 0,
          scaleY: 1,
          scaleX: 1,
          stagger: stagger,
          scrollTrigger: {
            trigger: el,
            scroller,
            start: scrollStart,
            end: scrollEnd,
            scrub: true
          },
        }
      );
    };

    // Start the animation initialization
    initAnimation();
  }, [
    scrollContainerRef,
    animationDuration,
    ease,
    scrollStart,
    scrollEnd,
    stagger
  ]);

  return (
    <h2
      ref={containerRef}
      className={`my-5 ${containerClassName}`}
      style={{ lineHeight: '1.2', paddingBottom: '8px' }}
    >
      <span
        className={`inline-block text-[clamp(1rem,7vw,3.5rem)] ${textClassName}`}
        style={{ lineHeight: '1.2', display: 'inline-block' }}
      >
        {splitText}
      </span>
    </h2>
  );
};

export default ScrollFloat; 