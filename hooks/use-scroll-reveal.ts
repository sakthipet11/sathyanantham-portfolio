'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface ScrollRevealOptions extends IntersectionObserverInit {
  once?: boolean;
  onEnter?: () => void;
  onLeave?: () => void;
}

export function useScrollReveal(options: ScrollRevealOptions = {}) {
  const {
    once = true,
    threshold = 0.1,
    rootMargin = '0px 0px -50px 0px',
    onEnter,
    onLeave,
  } = options;

  const ref = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setRef = useCallback((node: HTMLElement | null) => {
    ref.current = node;
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setIsVisible(visible);

        if (visible && !hasAnimated) {
          setHasAnimated(true);
          onEnter?.();
        } else if (!visible && hasAnimated && !once) {
          onLeave?.();
        }
      },
      { threshold, rootMargin }
    );

    observerRef.current.observe(element);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [threshold, rootMargin, once, hasAnimated, onEnter, onLeave]);

  return { ref: setRef, isVisible: isVisible || hasAnimated, hasAnimated };
}

export function useInView(
  options: IntersectionObserverInit = {}
): [React.RefObject<HTMLElement>, boolean] {
  const ref = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.1, rootMargin: '0px', ...options }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [options.threshold, options.rootMargin]);

  return [ref, isInView];
}

export function useScrollPosition(): { x: number; y: number } {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => {
      setPosition({ x: window.scrollX, y: window.scrollY });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return position;
}

export function useScrollDirection(): 'up' | 'down' | null {
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);
  const prevY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > prevY.current) setDirection('down');
      else if (currentY < prevY.current) setDirection('up');
      prevY.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return direction;
}