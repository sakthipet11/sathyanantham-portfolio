'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption<T = string | number> {
  value: T;
  label: string;
  count?: number;
  badge?: string;
  icon?: React.ReactNode;
}

export interface CustomSelectProps<T = string | number> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
  title?: string;
  size?: 'sm' | 'md';
  prefixIcon?: React.ReactNode;
}

export function CustomSelect<T extends string | number = string>({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  className = '',
  triggerClassName = '',
  menuClassName = '',
  disabled = false,
  title,
  size = 'md',
  prefixIcon
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => String(opt.value) === String(value));

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
        const idx = options.findIndex(opt => String(opt.value) === String(value));
        setFocusedIndex(idx >= 0 ? idx : 0);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => (prev < options.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : options.length - 1));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < options.length) {
          onChange(options[focusedIndex].value);
          setIsOpen(false);
        }
        break;
    }
  }, [disabled, isOpen, options, value, focusedIndex, onChange]);

  // Scroll focused option into view
  useEffect(() => {
    if (isOpen && menuRef.current && focusedIndex >= 0) {
      const optionElements = menuRef.current.querySelectorAll('[role="option"]');
      const target = optionElements[focusedIndex] as HTMLElement | undefined;
      if (target) {
        target.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [isOpen, focusedIndex]);

  const sizeClasses = size === 'sm'
    ? 'px-2.5 py-1.5 text-[11px] rounded-xl'
    : 'px-3.5 py-2.5 text-xs rounded-xl';

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left ${className}`}
      onKeyDown={handleKeyDown}
      title={title}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-2.5 bg-card border font-medium text-foreground transition-all duration-200 cursor-pointer select-none shadow-xs hover:border-primary/50 focus:outline-none ${sizeClasses} ${
          isOpen
            ? 'border-primary ring-2 ring-primary/20 bg-card shadow-md'
            : 'border-border/80 hover:bg-muted/40'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${triggerClassName}`}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          {prefixIcon && <span className="shrink-0 text-muted-foreground">{prefixIcon}</span>}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.count !== undefined && (
            <span className="shrink-0 text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-md">
              {selectedOption.count}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Popup */}
      {isOpen && (
        <div
          ref={menuRef}
          role="listbox"
          className={`absolute left-0 top-full mt-1.5 z-50 min-w-full w-max max-w-[340px] max-h-72 overflow-y-auto rounded-xl bg-card border border-border/80 shadow-2xl backdrop-blur-2xl p-1 animate-in fade-in zoom-in-95 duration-150 scrollbar-thin scrollbar-thumb-border ${menuClassName}`}
        >
          {options.map((opt, index) => {
            const isSelected = String(opt.value) === String(value);
            const isFocused = index === focusedIndex;

            return (
              <div
                key={String(opt.value)}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                onMouseEnter={() => setFocusedIndex(index)}
                className={`px-3 py-2 text-xs rounded-lg flex items-center justify-between gap-3 cursor-pointer transition-all duration-150 select-none ${
                  isSelected
                    ? 'bg-primary/15 text-primary font-semibold border border-primary/30 shadow-xs'
                    : isFocused
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-muted/60'
                }`}
              >
                <div className="flex items-center gap-2 truncate min-w-0">
                  {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                  <span className="truncate">{opt.label}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-auto font-mono">
                  {opt.count !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md transition-colors ${
                        isSelected
                          ? 'bg-primary/20 text-primary font-semibold'
                          : 'bg-muted/60 text-muted-foreground'
                      }`}
                    >
                      {opt.count}
                    </span>
                  )}
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-primary stroke-[2.5]" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
