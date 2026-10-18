import type { FormQuestion } from "~/lib/forms";
import FormSelect from "./FormSelect";
import styles from "./forms.module.css";

export default function FormField({
  question,
  prefix,
  error,
}: {
  question: FormQuestion;
  prefix: string;
  error?: string;
}) {
  const id = `${prefix}-${question.id}`;
  const description =
    [question.help ? `${id}-help` : "", error ? `${id}-error` : ""]
      .filter(Boolean)
      .join(" ") || undefined;
  const common = {
    id,
    name: question.id,
    required: question.required,
    "aria-describedby": description,
    "aria-invalid": !!error,
  };
  const label = (
    <>
      {question.label}
      {question.required && (
        <span aria-hidden="true" className={styles.required}>
          {" "}
          *
        </span>
      )}
    </>
  );
  const caption = (
    <>
      {question.help && (
        <p id={`${id}-help`} className={styles.help}>
          {question.help}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className={styles.error}>
          {error}
        </p>
      )}
    </>
  );
  const className = `${styles.field} ${question.width === "half" ? styles.half : ""}`;
  if (question.type === "radio" || question.type === "checkboxes")
    return (
      <fieldset
        className={className}
        aria-describedby={description}
        aria-invalid={!!error}
      >
        <legend className={styles.label}>{label}</legend>
        <div className={styles.choices}>
          {question.options.map((option, index) => (
            <label key={option} className={styles.choice}>
              <input
                className={styles.check}
                type={question.type === "radio" ? "radio" : "checkbox"}
                name={question.id}
                value={option}
                id={`${id}-${index}`}
                required={question.type === "radio" && question.required}
                defaultChecked={
                  question.type === "radio"
                    ? question.defaultValue === option
                    : question.defaultValue.split("\n").includes(option)
                }
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
        {caption}
      </fieldset>
    );
  if (question.type === "checkbox")
    return (
      <div className={className}>
        <label htmlFor={id} className={styles.choice}>
          <input
            {...common}
            type="checkbox"
            className={styles.check}
            defaultChecked={question.defaultValue === "true"}
          />
          <span>{label}</span>
        </label>
        {caption}
      </div>
    );
  return (
    <div className={className}>
      <div
        className={`${styles.frame} ${["select", "textarea", "date"].includes(question.type) ? styles.fixedLabel : ""} ${question.label.length > (question.width === "half" ? 24 : 40) ? styles.extended : ""}`}
      >
        <label htmlFor={id} className={styles.floatingLabel}>
          {label}
        </label>
        {question.type === "textarea" ? (
          <textarea
            {...common}
            className={styles.control}
            rows={3}
            maxLength={question.maxLength}
            placeholder={question.placeholder || " "}
            defaultValue={question.defaultValue}
          />
        ) : question.type === "select" ? (
          <FormSelect
            id={id}
            name={question.id}
            options={question.options}
            placeholder={question.placeholder || "Choose an option"}
            defaultValue={question.defaultValue}
            required={question.required}
            description={description}
            invalid={!!error}
          />
        ) : (
          <input
            {...common}
            className={styles.control}
            type={question.type}
            step={question.type === "number" ? "any" : undefined}
            maxLength={question.maxLength}
            placeholder={question.placeholder || " "}
            defaultValue={question.defaultValue}
            autoComplete={
              question.type === "email"
                ? "email"
                : question.type === "tel"
                  ? "tel"
                  : question.id === "name"
                    ? "name"
                    : undefined
            }
          />
        )}
      </div>
      {caption}
    </div>
  );
}
