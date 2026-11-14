import { state, derived, onMount, watch, onCleanup } from "@kerf-js/core";
import { update as writeBox } from "#/lib/reactive";
import type { FormQuestion } from "~/lib/forms";
import FormSelect from "./FormSelect";
import styles from "./forms.module.css";
export default function FormField({ question, prefix, error, }: {
    question: FormQuestion;
    prefix: string;
    error?: string;
}) {
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
      </div>) : (<div className={className.value}>
      <div className={`${styles.frame} ${["select", "textarea", "date"].includes(question.type) ? styles.fixedLabel : ""} ${question.label.length > (question.width === "half" ? 24 : 40) ? styles.extended : ""}`}>
        <label htmlFor={id.value} className={styles.floatingLabel}>
          {label.value}
        </label>
        {question.type === "textarea" ? (<textarea {...common.value} className={styles.control} rows={3} maxLength={question.maxLength} placeholder={question.placeholder || " "} defaultValue={question.defaultValue}/>) : question.type === "select" ? (<FormSelect id={id.value} name={question.id} options={question.options} placeholder={question.placeholder || "Choose an option"} defaultValue={question.defaultValue} required={question.required} description={description.value} invalid={!!error}/>) : (<input {...common.value} className={styles.control} type={question.type} step={question.type === "number" ? "any" : undefined} maxLength={question.maxLength} placeholder={question.placeholder || " "} defaultValue={question.defaultValue} autoComplete={question.type === "email"
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
