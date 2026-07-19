import { Search } from "lucide-react";

/** Destination / sheet search field — icon + input, matches Sessions hub. */
export function PageSearchField({
  value,
  onChange,
  placeholder,
  "aria-label": ariaLabel,
  className,
  enterKeyHint = "search",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  "aria-label"?: string;
  className?: string;
  enterKeyHint?: "search" | "done" | "go" | "next" | "send" | "enter";
}) {
  return (
    <label className={`app-search${className ? ` ${className}` : ""}`}>
      <Search size={18} strokeWidth={2} aria-hidden />
      <input
        type="search"
        className="app-search__input"
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        enterKeyHint={enterKeyHint}
      />
    </label>
  );
}
