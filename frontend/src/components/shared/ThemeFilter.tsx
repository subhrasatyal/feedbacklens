import { ALL_THEMES, NO_THEME, type ThemeCount } from '../../hooks/useFeedback'

type Props = {
  value: string
  onChange: (theme: string) => void
  totalCount: number
  themeCounts: ThemeCount[]
  noThemeCount: number
}

// Dropdown for showing only one theme's feedback. Each option shows how many
// items it would show.
function ThemeFilter({ value, onChange, totalCount, themeCounts, noThemeCount }: Props) {
  return (
    <label className="theme-filter">
      Theme
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value={ALL_THEMES}>All themes ({totalCount})</option>
        {themeCounts.map(({ theme, count }) => (
          <option key={theme} value={theme}>
            {theme} ({count})
          </option>
        ))}
        <option value={NO_THEME}>No theme yet ({noThemeCount})</option>
      </select>
    </label>
  )
}

export default ThemeFilter
