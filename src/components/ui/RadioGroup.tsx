interface RadioOption<T extends string> {
  value: T;
  label: string;
}

interface RadioGroupProps<T extends string> {
  legend: string;
  name: string;
  value: T;
  options: RadioOption<T>[];
  onChange: (value: T) => void;
}

/** Chip-style radio buttons built on real <input type="radio"> elements. */
export function RadioGroup<T extends string>({ legend, name, value, options, onChange }: RadioGroupProps<T>) {
  return (
    <fieldset className="radio-group">
      <legend>{legend}</legend>
      <div className="radio-grid">
        {options.map((o) => (
          <div key={o.value}>
            <input
              type="radio"
              id={`${name}-${o.value}`}
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            <label htmlFor={`${name}-${o.value}`}>{o.label}</label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
