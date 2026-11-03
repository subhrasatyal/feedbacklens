import { STATIONS, type StationId } from './stations'

type Props = {
  current: StationId
  // Which stations can be opened right now (built, and ready to use).
  isOpenable: (id: StationId) => boolean
  onSelect: (id: StationId) => void
}

// The step bar across the top: one button per station, in order.
function StationNav({ current, isOpenable, onSelect }: Props) {
  const currentIndex = STATIONS.findIndex((s) => s.id === current)

  return (
    <nav className="station-nav" aria-label="Investigation stations">
      {STATIONS.map((station, index) => {
        const state = index === currentIndex ? 'on' : index < currentIndex ? 'done' : ''
        return (
          <button
            key={station.id}
            type="button"
            className={`step ${state}`}
            aria-current={index === currentIndex ? 'step' : undefined}
            disabled={!isOpenable(station.id)}
            onClick={() => onSelect(station.id)}
          >
            <span className="step-number">{index + 1}</span>
            <span>
              {station.title}
              <br />
              <span className="step-sub">{station.built ? station.sub : 'Not built yet'}</span>
            </span>
          </button>
        )
      })}
    </nav>
  )
}

export default StationNav
