import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SimpleSelectProps<T extends string> {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

// Simple custom select to avoid native dropdown clipping issues.
// Renders an inline popover list with full control over borders.
export function SimpleSelect<T extends string>({
  value,
  options,
  onChange,
  className = '',
  placeholder = 'Select...',
  disabled = false,
  'aria-label': ariaLabel,
}: SimpleSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) {
      return;
    }
    const handleClick = (e: MouseEvent) => {
      if (
        listRef.current &&
        !listRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const selected = options.find(o => o.value === value);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    width: number;
    above: boolean;
  } | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(() =>
    options.findIndex(o => o.value === value)
  );

  // Recompute dropdown position when opening or on window resize/scroll
  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    const compute = () => {
      const btn = buttonRef.current;
      if (!btn) {
        return;
      }
      const rect = btn.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const estimatedHeight = Math.min(240, options.length * 34 + 8); // rough estimate per item
      const openAbove =
        spaceBelow < estimatedHeight && rect.top > estimatedHeight;
      setPosition({
        top:
          (openAbove ? rect.top - estimatedHeight : rect.bottom) +
          window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        above: openAbove,
      });
    };
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [open, options.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) {
      return;
    }
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(i => {
          const next = i < options.length - 1 ? i + 1 : 0;
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(i => {
          const prev = i > 0 ? i - 1 : options.length - 1;
          return prev;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < options.length) {
          onChange(options[focusedIndex].value);
          setOpen(false);
        }
      } else if (e.key === 'Home') {
        setFocusedIndex(0);
      } else if (e.key === 'End') {
        setFocusedIndex(options.length - 1);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, focusedIndex, options, onChange]);

  // Sync focused index with current value when options change or value changes
  useEffect(() => {
    setFocusedIndex(options.findIndex(o => o.value === value));
  }, [value, options]);

  return (
    <div className={`relative inline-block text-left ${className} z-40`}>
      <button
        type='button'
        ref={buttonRef}
        aria-haspopup='listbox'
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={`min-w-[7rem] flex items-center justify-between px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <span className={selected ? 'text-gray-800' : 'text-gray-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 ml-1 transition-transform ${open ? 'rotate-180' : ''}`}
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M19 9l-7 7-7-7'
          />
        </svg>
      </button>
      {open &&
        position &&
        createPortal(
          <div
            ref={listRef}
            role='listbox'
            tabIndex={-1}
            aria-activedescendant={
              focusedIndex >= 0
                ? `ss-opt-${options[focusedIndex].value}`
                : undefined
            }
            style={{
              position: 'absolute',
              top: position.top,
              left: position.left,
              width: position.width,
              zIndex: 9999,
            }}
            className='max-h-60 overflow-auto rounded-md border border-gray-300 bg-white shadow-lg focus:outline-none'
          >
            {options.map((opt, i) => {
              const active = opt.value === value;
              const focused = i === focusedIndex;
              return (
                <button
                  id={`ss-opt-${opt.value}`}
                  type='button'
                  key={opt.value}
                  role='option'
                  aria-selected={active}
                  onMouseEnter={() => setFocusedIndex(i)}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full flex justify-between items-center text-left px-3 py-1.5 text-sm transition-colors ${
                    active ? 'text-blue-600 font-medium' : 'text-gray-700'
                  } ${focused && !active ? 'bg-blue-50' : 'hover:bg-blue-50 focus:bg-blue-50'}`}
                >
                  <span>{opt.label}</span>
                  {active && (
                    <svg
                      className='w-4 h-4'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M5 13l4 4L19 7'
                      />
                    </svg>
                  )}
                </button>
              );
            })}
            {options.length === 0 && (
              <div className='px-3 py-2 text-sm text-gray-500'>No options</div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

export default SimpleSelect;
