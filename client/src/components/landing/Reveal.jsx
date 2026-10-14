import React, { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Devuelve [ref, inView]. inView pasa a true la primera vez que el
 * elemento entra en pantalla y ya no vuelve a false.
 */
export const useInView = ({ threshold = 0.15, rootMargin = '0px 0px -60px 0px' } = {}) => {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return [ref, inView];
};

/**
 * Anima la entrada de su contenido al hacer scroll.
 * variant: 'up' | 'zoom' | 'left' | 'right'
 */
export const Reveal = ({ as: Tag = 'div', delay = 0, variant = 'up', className = '', style, children, ...rest }) => {
  const [ref, inView] = useInView();

  return (
    <Tag
      ref={ref}
      className={`reveal reveal-${variant} ${inView ? 'is-visible' : ''} ${className}`.trim()}
      style={{ ...style, '--d': `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
};

/**
 * Cuenta desde 0 hasta `end` cuando el número aparece en pantalla.
 */
export const CountUp = ({ end, decimals = 0, prefix = '', suffix = '', duration = 1800 }) => {
  const [ref, inView] = useInView({ threshold: 0.4 });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion()) {
      setValue(end);
      return;
    }

    let frame;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setValue(end * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, end, duration]);

  return (
    <span ref={ref} className="stat-value">
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
};

/**
 * onMouseMove para tarjetas `.spotlight`: guarda la posición del cursor
 * en variables CSS para que el brillo lo siga.
 */
export const trackSpotlight = (e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
};

export default Reveal;
