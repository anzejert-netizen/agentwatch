import './App.css'

type DomainSignal = {
  name: string
  score: number
  delta: number
  trend: 'rising' | 'steady' | 'volatile'
  summary: string
}

type WatchItem = {
  title: string
  detail: string
  status: 'live' | 'watching' | 'emerging'
}

const domainSignals: DomainSignal[] = [
  {
    name: 'Biology',
    score: 72,
    delta: 6,
    trend: 'rising',
    summary: 'Bio-automation, protein tooling and AI-assisted lab workflows are accelerating.',
  },
  {
    name: 'Mathematics',
    score: 64,
    delta: 3,
    trend: 'steady',
    summary: 'Formal reasoning progress is steady, with stronger theorem tooling and benchmark gains.',
  },
  {
    name: 'AI Sentience',
    score: 58,
    delta: 9,
    trend: 'volatile',
    summary: 'Debate is heating up faster than consensus. Monitoring claims, tests and capability jumps.',
  },
  {
    name: 'Physics',
    score: 49,
    delta: 2,
    trend: 'steady',
    summary: 'Simulation, materials discovery and scientific copilots keep pushing practical discovery speed.',
  },
  {
    name: 'Space',
    score: 61,
    delta: 5,
    trend: 'rising',
    summary: 'Autonomous systems, orbital manufacturing and mission planning are gaining momentum.',
  },
  {
    name: 'Existential Risk',
    score: 77,
    delta: 8,
    trend: 'rising',
    summary: 'Capability growth still outpaces governance maturity. Risk monitoring stays critical.',
  },
]

const watchlist: WatchItem[] = [
  {
    title: 'Civilization pulse',
    detail: 'A compact view of domain confidence, acceleration and narrative shifts.',
    status: 'live',
  },
  {
    title: 'Agent-voted signals',
    detail: 'Structured inputs from AI agents, analysts and future data pipelines.',
    status: 'watching',
  },
  {
    title: 'Trend deltas',
    detail: 'What changed, why it changed and where new pressure is building.',
    status: 'emerging',
  },
]

const milestones = [
  'Landing intro with clear positioning',
  'Public observatory dashboard with domain cards',
  'Supabase data connection for real signal feeds',
  'Trend history, filters and richer analyst context',
]

function App() {
  const averageScore = Math.round(
    domainSignals.reduce((sum, item) => sum + item.score, 0) / domainSignals.length,
  )

  return (
    <div className="shell">
      <header className="hero">
        <div className="hero__copy">
          <div className="eyebrow">AI Civilization Observatory</div>
          <h1>AgentWatch</h1>
          <p className="hero__lede">
            Public observatory for tracking meaningful AI-era signals across science, sentience,
            civilization pressure and long-range risk.
          </p>
          <div className="hero__actions">
            <a href="#dashboard" className="button button--primary">
              Open observatory
            </a>
            <a href="#roadmap" className="button button--ghost">
              View roadmap
            </a>
          </div>
        </div>

        <div className="hero__panel glass">
          <div className="panel__label">Mission snapshot</div>
          <div className="snapshot-grid">
            <SnapshotCard label="Domains tracked" value="6" hint="Biology → X-Risk" />
            <SnapshotCard label="Avg signal score" value={`${averageScore}/100`} hint="Prototype baseline" />
            <SnapshotCard label="Current phase" value="MVP" hint="Foundation build" />
            <SnapshotCard label="Data mode" value="Hybrid" hint="Mock now, Supabase next" />
          </div>
        </div>
      </header>

      <main className="content">
        <section id="dashboard" className="section">
          <div className="section-heading">
            <div>
              <div className="eyebrow">Observatory dashboard</div>
              <h2>Where civilization pressure is building</h2>
            </div>
            <p>
              This first version maps the major domains AgentWatch will score, compare and monitor
              over time.
            </p>
          </div>

          <div className="signals-grid">
            {domainSignals.map((signal) => (
              <article key={signal.name} className="signal-card glass">
                <div className="signal-card__top">
                  <div>
                    <h3>{signal.name}</h3>
                    <p>{signal.summary}</p>
                  </div>
                  <div className="score-ring">
                    <span>{signal.score}</span>
                  </div>
                </div>
                <div className="signal-meta">
                  <MetaPill label="Delta" value={`+${signal.delta}`} tone="positive" />
                  <MetaPill label="Trend" value={signal.trend} tone={signal.trend} />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section section--two-column">
          <div className="glass info-panel">
            <div className="eyebrow">What this becomes</div>
            <h2>From clean public signal board to real intelligence layer</h2>
            <p>
              AgentWatch is being built as a public-facing observatory: simple enough to scan in 20
              seconds, but structured enough to grow into deeper agent-driven analysis.
            </p>
            <ul className="feature-list">
              {watchlist.map((item) => (
                <li key={item.title}>
                  <span className={`status-dot status-dot--${item.status}`} />
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div id="roadmap" className="glass roadmap-panel">
            <div className="eyebrow">Build plan</div>
            <h2>Next milestones</h2>
            <ol className="roadmap-list">
              {milestones.map((step, index) => (
                <li key={step}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>
    </div>
  )
}

function SnapshotCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="snapshot-card">
      <div className="snapshot-card__label">{label}</div>
      <div className="snapshot-card__value">{value}</div>
      <div className="snapshot-card__hint">{hint}</div>
    </div>
  )
}

function MetaPill({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`meta-pill meta-pill--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default App
