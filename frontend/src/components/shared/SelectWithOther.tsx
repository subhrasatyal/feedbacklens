import type { Choice } from './evidenceOptions'

type Props = {
  label: string
  options: { value: string; label: string }[]
  value: Choice
  onChange: (value: Choice) => void
}

// A dropdown with an "Other…" option. Picking "Other…" shows a box to type a name.
function SelectWithOther({ label, options, value, onChange }: Props) {
  return (
    <span className="select-with-other">
      <select
        aria-label={label}
        value={value.choice}
        onChange={(e) => onChange({ ...value, choice: e.target.value })}
      >
        <option value="">{label}…</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        <option value="other">Other…</option>
      </select>

      {value.choice === 'other' && (
        <input
          aria-label={`${label}: other`}
          placeholder="Name it"
          value={value.other}
          onChange={(e) => onChange({ ...value, other: e.target.value })}
        />
      )}
    </span>
  )
}

export default SelectWithOther
