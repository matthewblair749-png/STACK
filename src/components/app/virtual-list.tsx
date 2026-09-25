"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";

/**
 * Minimal fixed-row-height windowing: only the rows in (and just around) the viewport are in the
 * DOM, so a long inbox stays fast. `onEndReached` lets the caller fetch the next page lazily.
 */
export function VirtualList<T>({
  items,
  rowHeight,
  overscan = 6,
  className,
  renderRow,
  getKey,
  onEndReached,
  footer,
  label,
}: {
  items: T[];
  rowHeight: number;
  overscan?: number;
  className?: string;
  renderRow: (item: T, index: number) => ReactNode;
  getKey: (item: T) => string;
  onEndReached?: () => void;
  footer?: ReactNode;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(600);
  const endFired = useRef(-1);

  const measure = useCallback((el: HTMLDivElement | null) => {
    ref.current = el;
    if (el) setHeight(el.clientHeight);
  }, []);

  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const end = Math.min(items.length, Math.ceil((scrollTop + height) / rowHeight) + overscan);

  return (
    <div
      ref={measure}
      role="list"
      aria-label={label}
      tabIndex={0}
      className={className}
      style={{ overflowY: "auto" }}
      onScroll={(e) => {
        const el = e.currentTarget;
        setScrollTop(el.scrollTop);
        setHeight(el.clientHeight);
        if (onEndReached && el.scrollTop + el.clientHeight > el.scrollHeight - rowHeight * 8 && endFired.current !== items.length) {
          endFired.current = items.length;
          onEndReached();
        }
      }}
    >
      <div style={{ height: items.length * rowHeight, position: "relative" }}>
        <div style={{ position: "absolute", top: start * rowHeight, left: 0, right: 0 }}>
          {items.slice(start, end).map((item, i) => (
            <div key={getKey(item)} role="listitem" style={{ height: rowHeight }}>
              {renderRow(item, start + i)}
            </div>
          ))}
        </div>
      </div>
      {footer}
    </div>
  );
}
