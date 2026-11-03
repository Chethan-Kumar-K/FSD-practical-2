interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

/** Bonus requirement: filters the log as you type. */
export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="search">
      <label htmlFor="log-search" className="sr-only">
        Search the log
      </label>
      <input
        id="log-search"
        type="search"
        autoComplete="off"
        placeholder="Search, e.g. car, food or Oct"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onChange('');
        }}
      />
    </div>
  );
}
