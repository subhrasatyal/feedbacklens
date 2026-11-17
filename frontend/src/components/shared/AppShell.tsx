import type { ReactNode } from 'react'

type Props = {
  caseTitle: string | null // the open investigation's question, shown as a tag
  nav: ReactNode
  side: ReactNode
  children: ReactNode // the current station
}

// The frame around every station: header, step bar, station, side panel.
function AppShell({ caseTitle, nav, side, children }: Props) {
  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          {/* Flask logo */}
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3" />
            <path d="M7 15h10" />
          </svg>
          <strong>The Product Lab</strong>
          {caseTitle && (
            <span className="tag case-tag" title={caseTitle}>
              Case: {caseTitle}
            </span>
          )}
        </div>
        <div className="row">
          <span className="tag dashed">Supplied evidence · no live integrations</span>
          <span className="avatar" aria-label="Head of lab: you">
            PM
          </span>
        </div>
      </header>
      {nav}
      <div className="layout">
        <main className="content">{children}</main>
        {side}
      </div>
    </div>
  )
}

export default AppShell
