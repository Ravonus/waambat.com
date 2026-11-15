import { state, derived, onMount, watch, onCleanup } from "@kerf-js/core";
import { update as writeBox } from "#/lib/reactive";
import styles from "./forms.module.css";
// Native form validation + a themed, keyboard-operated listbox share one value.
export default function FormSelect({ id, name, options, placeholder, defaultValue, required, description, invalid, }: {
    id: string;
    name: string;
    options: string[];
    placeholder: string;
    defaultValue: string;
    required: boolean;
    description?: string;
    invalid: boolean;
}) {
    const value = state.linked(() => defaultValue);
    const open = state(false);
    const above = state(false);
    const list = { current: null as HTMLDivElement | null | undefined };
    const active = state.linked(() => Math.max(0, options.indexOf(defaultValue)));
    const root = { current: null as HTMLDivElement | null | undefined };
    const button = { current: null as HTMLButtonElement | null | undefined };
    const native = { current: null as HTMLSelectElement | null | undefined };
    const search = { current: { value: "", time: 0 } };
    const connectNative = (node: HTMLSelectElement | null) => {
        native.current = node;
        if (!node)
            return;
        const close = (event: PointerEvent) => {
            if (!root.current?.contains(event.target as Node))
                writeBox(open, false);
        };
        const reset = () => {
            writeBox(value, defaultValue);
            writeBox(open, false);
            queueMicrotask(() => {
                if (node.isConnected)
                    node.value = defaultValue;
            });
        };
        const form = node.form;
        document.addEventListener("pointerdown", close);
        form?.addEventListener("reset", reset);
        onCleanup(() => {
            document.removeEventListener("pointerdown", close);
            form?.removeEventListener("reset", reset);
            if (native.current === node)
                native.current = null;
        });
    };
    const openList = () => {
        const bounds = root.current?.getBoundingClientRect();
        if (bounds)
            writeBox(above, innerHeight - bounds.bottom < 280 && bounds.top > 280);
        writeBox(open, true);
    };
    const keepVisible = (option: HTMLDivElement | null, index: number) => {
        const panel = option?.parentElement;
        if (panel && option && active.value === index) {
            if (option.offsetTop < panel.scrollTop)
                panel.scrollTop = option.offsetTop;
            else if (option.offsetTop + option.offsetHeight >
                panel.scrollTop + panel.clientHeight)
                panel.scrollTop =
                    option.offsetTop + option.offsetHeight - panel.clientHeight;
        }
    };
    const choose = (index: number) => {
        const selected = options[index];
        if (selected === undefined)
            return;
        writeBox(value, selected);
        writeBox(open, false);
        button.current?.focus();
        // Keep FormData and native validation correct before React commits.
        if (native.current) {
            native.current.value = selected;
            native.current.dispatchEvent(new Event("input", { bubbles: true }));
        }
    };
    const key = (event: KeyboardEvent & {
        currentTarget: HTMLButtonElement;
    }) => {
        if (event.key === "Tab") {
            writeBox(open, false);
            return;
        }
        if (event.key === "Escape") {
            event.preventDefault();
            writeBox(open, false);
            return;
        }
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            openList();
            writeBox(active, (index) => event.key === "Home"
                ? 0
                : event.key === "End"
                    ? options.length - 1
                    : !open.value
                        ? Math.max(0, options.indexOf(value.value))
                        : Math.max(0, Math.min(options.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))));
        }
        else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (open.value)
                choose(active.value);
            else
                openList();
        }
        else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
            const now = Date.now();
            search.current = {
                value: (now - search.current.time < 600 ? search.current.value : "") +
                    event.key.toLowerCase(),
                time: now,
            };
            const index = options.findIndex((option) => option.toLowerCase().startsWith(search.current.value));
            if (index >= 0) {
                openList();
                writeBox(active, index);
            }
        }
    };
    return (<div ref={node => {
            root.current = node;
        }} className={styles.select}>
      <select ref={connectNative} data-part="input" name={name} value={value.value} required={required} tabIndex={-1} aria-hidden="true" className={styles.nativeSelect} onChange={(event) => writeBox(value, event.currentTarget.value)} onInvalid={(event) => {
            event.preventDefault();
            openList();
            button.current?.focus();
        }}>
        <option value="">{placeholder}</option>
        {options.map((option) => (<option key={option} value={option}>
            {option}
          </option>))}
      </select>
      <button ref={node => {
            button.current = node;
        }} id={id} type="button" role="combobox" aria-expanded={open.value} aria-controls={`${id}-options`} aria-haspopup="listbox" aria-activedescendant={open.value ? `${id}-option-${active.value}` : undefined} aria-required={required} aria-invalid={invalid} aria-describedby={description} onKeyDown={key} onClick={() => {
            writeBox(active, Math.max(0, options.indexOf(value.value)));
            if (open.value)
                writeBox(open, false);
            else
                openList();
        }} className={`${styles.control} ${styles.selectButton} ${value.value ? styles.chosen : ""}`}>
        <span>{value.value || placeholder}</span>
        <svg className={styles.chevron} data-open={open.value} viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="m5 8 5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open.value && (<div id={`${id}-options`} ref={node => {
                list.current = node;
            }} data-above={above.value} role="listbox" aria-label="Options" className={styles.options}>
          {options.map((option, index) => (<div key={option} id={`${id}-option-${index}`} data-option={index} ref={(node) => keepVisible(node, index)} role="option" aria-selected={value.value === option} data-active={active.value === index} className={styles.option} onPointerMove={() => writeBox(active, index)} onPointerDown={(event) => event.preventDefault()} onClick={() => choose(index)}>
              <span>{option}</span>
              {value.value === option && (<svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="m4 10 4 4 8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>)}
            </div>))}
        </div>)}
    </div>);
}
