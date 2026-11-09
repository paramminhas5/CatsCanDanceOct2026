/**
 * "How did you hear about us?" One required free-text line on every form where someone commits.
 * Free text beats a dropdown: people name the DJ, the post, the friend, the crew, the AI assistant.
 * It's the only way to see word of mouth, which analytics can't.
 */
export default function HeardFrom({
  id,
  value,
  onChange,
  invalid,
  inputClassName,
  labelClassName,
  label = "How did you hear about us?",
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  inputClassName: string;
  labelClassName?: string;
  label?: string;
}) {
  return (
    <label htmlFor={id} className="grid gap-1">
      <span className={labelClassName ?? "text-sm font-bold"}>{label}</span>
      <input
        id={id}
        name="heard_from"
        required
        maxLength={300}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="A friend, a DJ, Instagram, a crew, ChatGPT..."
        aria-invalid={invalid || undefined}
        className={inputClassName}
      />
      {invalid && <span className="text-sm font-bold text-magenta">Tell us in a few words. It helps us find more people like you.</span>}
    </label>
  );
}

export const heardOk = (v: string) => v.trim().length >= 2;
