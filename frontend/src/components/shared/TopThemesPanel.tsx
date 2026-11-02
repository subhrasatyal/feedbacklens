import { NO_THEME, type ThemeCount } from '../../hooks/useFeedback'

const TOP_N = 5

type Props = {
  themeCounts: ThemeCount[]
  noThemeCount: number
  selectedTheme: string
  onSelectTheme: (theme: string) => void
}

// The most common themes, with counts. Clicking one filters the feedback list.
function TopThemesPanel({ themeCounts, noThemeCount, selectedTheme, onSelectTheme }: Props) {
  const topThemes = themeCounts.slice(0, TOP_N)

  return (
    <section className="top-themes">
      <h2>Top themes</h2>

      {topThemes.length === 0 ? (
        <p>No themes yet: AI analysis hasn't run.</p>
      ) : (
        <ol>
          {topThemes.map(({ theme, count }) => (
            <li key={theme}>
              <button
                type="button"
                className={theme === selectedTheme ? 'theme-button selected' : 'theme-button'}
                onClick={() => onSelectTheme(theme)}
              >
                {theme} <span className="count">{count}</span>
              </button>
            </li>
          ))}
        </ol>
      )}

      {noThemeCount > 0 && (
        <button
          type="button"
          className={selectedTheme === NO_THEME ? 'theme-button selected' : 'theme-button'}
          onClick={() => onSelectTheme(NO_THEME)}
        >
          No theme yet <span className="count">{noThemeCount}</span>
        </button>
      )}
    </section>
  )
}

export default TopThemesPanel
