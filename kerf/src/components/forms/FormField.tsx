import { derived } from "@kerf-js/core";
import { field, floatingLabel, formReset } from "@kerf-js/veneer-core";
import { use } from "@kerf-js/veneer-core/kerf";
import type { FormQuestion } from "~/lib/forms";
import FormSelect from "./FormSelect";
import styles from "./forms.module.css";
export default function FormField({ question, prefix, error, }: {
    question: FormQuestion;
    prefix: string;
    error?: string;
}) {
    let root: HTMLDivElement | undefined;
    // Veneer's headless field owns fill, reset, focus and the measured border notch;
    // the site supplies its existing pastel palette and compact control styling.
    use((node: HTMLDivElement, options: readonly [string | undefined, string]) => {
        const action = question.type === "select" ? floatingLabel(node) : field(node, options);
        const reset = formReset(node, () => action.update());
        action.update();
        return {
            update: () => action.update(),
            destroy: () => { reset.destroy(); action.destroy(); },
        };
    }, () => root, () => [undefined, question.label] as const);
    const id = derived(() => `${prefix}-${question.id}`);
    const description = derived(() => [question.help ? `${id.value}-help` : "", error ? `${id.value}-error` : ""]
        .filter(Boolean)
        .join(" ") || undefined);
    const common = derived(() => ({
        id: id.value,
        name: question.id,
        required: question.required,
        "aria-describedby": description.value,
        "aria-invalid": !!error,
    }));
    const label = derived(() => (<>
      {question.label}
      {question.required && (<span aria-hidden="true" className={styles.required}>
          {" "}
          *
        </span>)}
    </>));
    const caption = derived(() => (<>
      {question.help && (<p id={`${id.value}-help`} className={styles.help}>
          {question.help}
        </p>)}
      {error && (<p id={`${id.value}-error`} className={styles.error}>
          {error}
        </p>)}
    </>));
    const className = derived(() => `${styles.field} ${question.width === "half" ? styles.half : ""}`);
    return <>{question.type === "radio" || question.type === "checkboxes" ? (<fieldset className={className.value} aria-describedby={description.value} aria-invalid={!!error}>
        <legend className={styles.label}>{label.value}</legend>
        <div className={styles.choices}>
          {question.options.map((option, index) => (<label key={option} className={styles.choice}>
              <input className={styles.check} type={question.type === "radio" ? "radio" : "checkbox"} name={question.id} value={option} id={`${id.value}-${index}`} required={question.type === "radio" && question.required} defaultChecked={question.type === "radio"
                ? question.defaultValue === option
                : question.defaultValue.split("\n").includes(option)}/>
              <span>{option}</span>
            </label>))}
        </div>
        {caption.value}
      </fieldset>) : question.type === "checkbox" ? (<div className={className.value}>
        <label htmlFor={id.value} className={styles.choice}>
          <input {...common.value} type="checkbox" className={styles.check} defaultChecked={question.defaultValue === "true"}/>
          <span>{label.value}</span>
        </label>
        {caption.value}
      </div>) : (<div ref={node => root = node} data-scope="field" className={className.value}>
      <div data-part="control" data-mosh-field className={`${styles.frame} ${["select", "date"].includes(question.type) ? styles.fixedLabel : ""} ${question.label.length > (question.width === "half" ? 24 : 40) ? styles.extended : ""}`}>
        <label data-part="label" htmlFor={id.value} className={styles.floatingLabel}>
          {label.value}
        </label>
        {question.type === "textarea" ? (<textarea {...common.value} data-part="input" className={styles.control} rows={3} maxLength={question.maxLength} placeholder={question.placeholder || " "} defaultValue={question.defaultValue}/>) : question.type === "select" ? (<FormSelect id={id.value} name={question.id} options={question.options} placeholder={question.placeholder || "Choose an option"} defaultValue={question.defaultValue} required={question.required} description={description.value} invalid={!!error}/>) : (<input {...common.value} data-part="input" className={styles.control} type={question.type} step={question.type === "number" ? "any" : undefined} maxLength={question.maxLength} placeholder={question.placeholder || " "} defaultValue={question.defaultValue} autoComplete={question.type === "email"
                ? "email"
                : question.type === "tel"
                    ? "tel"
                    : question.id === "name"
                        ? "name"
                        : undefined}/>)}
      </div>
      {caption.value}
    </div>)}</>;
}
