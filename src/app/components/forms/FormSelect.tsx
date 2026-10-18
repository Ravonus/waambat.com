"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import styles from "./forms.module.css";

// Native form validation + a themed, keyboard-operated listbox share one value.
export default function FormSelect({
  id,
  name,
  options,
  placeholder,
  defaultValue,
  required,
  description,
  invalid,
}: {
  id: string;
  name: string;
  options: string[];
  placeholder: string;
  defaultValue: string;
  required: boolean;
  description?: string;
  invalid: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(
    Math.max(0, options.indexOf(defaultValue)),
  );
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const native = useRef<HTMLSelectElement>(null);
  const search = useRef({ value: "", time: 0 });
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const reset = () => {
      setValue(defaultValue);
      setOpen(false);
      queueMicrotask(() => {
        if (native.current) native.current.value = defaultValue;
      });
    };
    const form = native.current?.form;
    document.addEventListener("pointerdown", close);
    form?.addEventListener("reset", reset);
    return () => {
      document.removeEventListener("pointerdown", close);
      form?.removeEventListener("reset", reset);
    };
  }, [defaultValue]);
  useEffect(() => {
    if (!open) return;
    const bounds = root.current?.getBoundingClientRect();
    if (bounds) setAbove(innerHeight - bounds.bottom < 280 && bounds.top > 280);
    const panel = list.current;
    const option = panel?.querySelector<HTMLElement>(
      `[data-option="${active}"]`,
    );
    if (panel && option) {
      if (option.offsetTop < panel.scrollTop)
        panel.scrollTop = option.offsetTop;
      else if (
        option.offsetTop + option.offsetHeight >
        panel.scrollTop + panel.clientHeight
      )
        panel.scrollTop =
          option.offsetTop + option.offsetHeight - panel.clientHeight;
    }
  }, [active, open]);
  const choose = (index: number) => {
    const selected = options[index];
    if (selected === undefined) return;
    setValue(selected);
    setOpen(false);
    button.current?.focus();
    // Keep FormData and native validation correct before React commits.
    if (native.current) {
      native.current.value = selected;
      native.current.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };
  const key = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      setOpen(true);
      setActive((index) =>
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? options.length - 1
            : !open
              ? Math.max(0, options.indexOf(value))
              : Math.max(
                  0,
                  Math.min(
                    options.length - 1,
                    index + (event.key === "ArrowDown" ? 1 : -1),
                  ),
                ),
      );
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(active);
      else setOpen(true);
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      const now = Date.now();
      search.current = {
        value:
          (now - search.current.time < 600 ? search.current.value : "") +
          event.key.toLowerCase(),
        time: now,
      };
      const index = options.findIndex((option) =>
        option.toLowerCase().startsWith(search.current.value),
      );
      if (index >= 0) {
        setOpen(true);
        setActive(index);
      }
    }
  };
  return (
    <div ref={root} className={styles.select}>
      <select
        ref={native}
        name={name}
        value={value}
        required={required}
        tabIndex={-1}
        aria-hidden="true"
        className={styles.nativeSelect}
        onChange={(event) => setValue(event.target.value)}
        onInvalid={(event) => {
          event.preventDefault();
          setOpen(true);
          button.current?.focus();
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <button
        ref={button}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        aria-haspopup="listbox"
        aria-activedescendant={open ? `${id}-option-${active}` : undefined}
        aria-required={required}
        aria-invalid={invalid}
        aria-describedby={description}
        onKeyDown={key}
        onClick={() => {
          setActive(Math.max(0, options.indexOf(value)));
          setOpen(!open);
        }}
        className={`${styles.control} ${styles.selectButton} ${value ? styles.chosen : ""}`}
      >
        <span>{value || placeholder}</span>
        <svg
          className={styles.chevron}
          data-open={open}
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="m5 8 5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div
          id={`${id}-options`}
          ref={list}
          data-above={above}
          role="listbox"
          aria-label="Options"
          className={styles.options}
        >
          {options.map((option, index) => (
            <div
              key={option}
              id={`${id}-option-${index}`}
              data-option={index}
              role="option"
              aria-selected={value === option}
              data-active={active === index}
              className={styles.option}
              onPointerMove={() => setActive(index)}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
            >
              <span>{option}</span>
              {value === option && (
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="m4 10 4 4 8-8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
