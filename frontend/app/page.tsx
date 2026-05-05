'use client'
import { useState, useEffect, useCallback } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type Post = {
  id: number
  author_handle: string
  content: string
  score: number
}

type Draft = {
  id: number
  post_id: number
  draft_text: string
  status: 'pending' | 'approved' | 'rejected' | 'sent'
}

type Card = Post & { draft: Draft }

async function getPosts(): Promise<Post[]> {
  const res = await fetch(`${API}/posts?min_score=7&page_size=100`)
  if (!res.ok) throw new Error('posts')
  return res.json()
}

async function getDrafts(): Promise<Draft[]> {
  const res = await fetch(`${API}/drafts`)
  if (!res.ok) throw new Error('drafts')
  return res.json()
}

function buildCards(posts: Post[], drafts: Draft[]): Card[] {
  const byPost = new Map(drafts.map(d => [d.post_id, d]))
  return posts
    .filter(p => byPost.has(p.id))
    .map(p => ({ ...p, draft: byPost.get(p.id)! }))
    .sort((a, b) => b.score - a.score)
}

function Spinner({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

const TICKER_ITEMS = [
  'TECH CEO FIRES OFF GALAXY-BRAIN TAKE — RATIO INCOMING',
  'INFLUENCER POSTS CONTROVERSIAL OPINION AT 2AM',
  'VC EXPLAINS WHY EVERYTHING YOU KNOW IS WRONG',
  'FOUNDER DISCOVERS HUSTLE — SHARE PRICE UNCHANGED',
  'ANONYMOUS SOURCE CONFIRMS WHAT EVERYONE SUSPECTED',
  'TIMELINE DIVIDED OVER SPICY TAKE — EXPERTS WEIGH IN',
]

const TICKER_TEXT = [...TICKER_ITEMS, ...TICKER_ITEMS].join('  ★  ')

const IMPACT = "Impact, 'Arial Black', sans-serif"
const GEORGIA = 'Georgia, serif'

const SUBHEADLINES = [
  "Sources close to the situation confirm it's worse than we thought",
  "Friends say they've never seen anything quite like it",
  "The internet is absolutely losing its mind right now",
  "Our insiders reveal the shocking truth behind the post",
  "Followers react with shock as the drama continues to unfold",
  "Everything you know is wrong, apparently",
  "The timeline cannot cope — and frankly, neither can we",
  "A source who asked not to be named said 'we knew it was coming'",
]

const HEADLINE_TEMPLATES = [
  (h: string) => `@${h}'S BOMBSHELL CONFESSION`,
  (h: string) => `@${h} DROPS SCORCHED-EARTH TAKE`,
  (h: string) => `@${h} SAYS THE QUIET PART OUT LOUD`,
  (h: string) => `IS @${h} OKAY?? SOURCES SAY NO`,
  (h: string) => `@${h}'S WILDEST POST YET`,
  (h: string) => `@${h} BREAKS THE TIMELINE`,
]

type PillStyle = { label: string; bg: string; color: string }

const CATEGORY_PILLS: PillStyle[] = [
  { label: 'DRAMA',    bg: '#FF006E', color: '#fff' },
  { label: 'TEA',      bg: '#FFD700', color: '#111' },
  { label: 'BREAKING', bg: '#DC143C', color: '#fff' },
  { label: 'INSIDER',  bg: '#7B00D4', color: '#fff' },
]

function getCategoryPill(score: number, index: number): PillStyle {
  if (score >= 9.5) return CATEGORY_PILLS[2]
  if (score >= 9)   return CATEGORY_PILLS[0]
  return CATEGORY_PILLS[index % CATEGORY_PILLS.length]
}

function getStamp(index: number): { text: string; color: string } | null {
  if (index === 0)      return { text: 'EXCLUSIVE',  color: '#DC143C' }
  if (index % 5 === 2)  return { text: 'SOURCES SAY', color: '#FF006E' }
  if (index % 7 === 4)  return { text: 'DEVELOPING', color: '#7B00D4' }
  return null
}

const STARBURST_18 = 'polygon(50% 0%,56% 25%,79% 9%,66% 31%,93% 31%,72% 47%,87% 71%,64% 58%,57% 85%,50% 62%,43% 85%,36% 58%,13% 71%,28% 47%,7% 31%,34% 31%,21% 9%,44% 25%)'
const STARBURST_24 = 'polygon(50% 0%,56% 20%,74% 7%,65% 27%,87% 22%,74% 39%,97% 43%,78% 53%,91% 70%,70% 65%,73% 87%,57% 74%,50% 95%,43% 74%,27% 87%,30% 65%,9% 70%,22% 53%,3% 43%,26% 39%,13% 22%,35% 27%,26% 7%,44% 20%)'

function StarburstBadge({ score, size = 64 }: { score: number; size?: number }) {
  const hot = score >= 9
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: hot ? '#DC143C' : '#FFD700',
        clipPath: STARBURST_18,
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontFamily: IMPACT, fontSize: Math.round(size * 0.28) + 'px', color: hot ? '#FFD700' : '#111', lineHeight: 1 }}>
          {score % 1 === 0 ? score : score.toFixed(1)}
        </div>
        <div style={{ fontFamily: IMPACT, fontSize: Math.round(size * 0.125) + 'px', color: hot ? '#FFD700' : '#111' }}>
          🔥 HEAT
        </div>
      </div>
    </div>
  )
}

function PostCard({
  card,
  index,
  onAction,
}: {
  card: Card
  rank: number
  index: number
  onAction: (draftId: number, action: 'approve' | 'edit-approve' | 'skip', text: string) => Promise<void>
}) {
  const alreadyDone = card.draft.status !== 'pending'
  const [text, setText] = useState(card.draft.draft_text)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(alreadyDone)
  const [doneLabel, setDoneLabel] = useState<string>(() => {
    if (card.draft.status === 'approved' || card.draft.status === 'sent') return 'PUBLISHED'
    if (card.draft.status === 'rejected') return 'SPIKED'
    return ''
  })

  async function handle(action: 'approve' | 'edit-approve' | 'skip') {
    setBusy(true)
    await onAction(card.draft.id, action, text)
    setDoneLabel(action === 'skip' ? 'SPIKED' : 'PUBLISHED')
    setDone(true)
    setBusy(false)
  }

  const pill = getCategoryPill(card.score, index)
  const stamp = getStamp(index)
  const subheadline = SUBHEADLINES[index % SUBHEADLINES.length]
  const rawHandle = card.author_handle.startsWith('@')
    ? card.author_handle.slice(1).toUpperCase()
    : card.author_handle.toUpperCase()
  const headline = HEADLINE_TEMPLATES[index % HEADLINE_TEMPLATES.length](rawHandle)
  const isLead = index % 3 === 0

  return (
    <article style={{
      background: '#fff',
      border: '2px solid #111',
      position: 'relative',
      opacity: done ? 0.4 : 1,
      transition: 'opacity 0.3s',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      {stamp && (
        <div style={{
          position: 'absolute', top: '18px', right: '-24px',
          background: stamp.color, color: '#fff',
          fontFamily: IMPACT, fontSize: '10px', letterSpacing: '0.14em',
          padding: '4px 36px',
          transform: 'rotate(20deg)',
          zIndex: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          pointerEvents: 'none',
        }}>
          {stamp.text}
        </div>
      )}

      {/* Card header */}
      <div style={{ padding: '12px 14px 10px', borderBottom: '2px solid #111' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ marginBottom: '5px' }}>
              <span style={{
                background: pill.bg, color: pill.color,
                fontFamily: IMPACT, fontSize: '9px', letterSpacing: '0.14em',
                padding: '2px 8px', display: 'inline-block',
              }}>
                {pill.label}
              </span>
            </div>
            <h2 style={{
              fontFamily: GEORGIA, fontWeight: 'bold',
              fontSize: isLead ? '22px' : '16px',
              lineHeight: 1.05, letterSpacing: '-0.02em',
              color: '#111', margin: '0 0 4px',
              textTransform: 'uppercase', wordBreak: 'break-word',
            }}>
              {headline}
            </h2>
            <p style={{
              fontFamily: GEORGIA, fontStyle: 'italic',
              fontSize: '12px', color: '#666',
              margin: 0, lineHeight: 1.35,
            }}>
              {subheadline}
            </p>
          </div>
          <StarburstBadge score={card.score} size={isLead ? 64 : 52} />
        </div>
      </div>

      {/* Post content */}
      <div style={{
        borderLeft: '4px solid #FF006E',
        margin: '10px 14px',
        padding: '6px 10px',
        background: 'rgba(255,0,110,0.03)',
      }}>
        <p style={{
          fontFamily: GEORGIA, fontStyle: 'italic',
          fontSize: '13px', color: '#333',
          lineHeight: 1.6, margin: 0,
        }}>
          &ldquo;{card.content}&rdquo;
        </p>
      </div>

      {/* YOUR RESPONSE */}
      <div style={{
        padding: '8px 14px 10px',
        borderTop: '2px dashed #FF006E',
        background: 'rgba(255,0,110,0.02)',
        flex: 1, display: 'flex', flexDirection: 'column', gap: '6px',
      }}>
        <div style={{
          fontFamily: IMPACT, fontSize: '9px',
          letterSpacing: '0.22em', color: '#FF006E',
        }}>
          YOUR RESPONSE
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          disabled={done || busy}
          rows={3}
          style={{
            width: '100%', background: '#fff',
            border: '1.5px dashed #FF006E',
            fontFamily: GEORGIA, fontSize: '13px', color: '#222',
            padding: '8px 10px', resize: 'vertical',
            lineHeight: 1.55, outline: 'none',
            boxSizing: 'border-box',
            opacity: done || busy ? 0.5 : 1,
          }}
        />
        <div style={{
          fontFamily: GEORGIA, fontStyle: 'italic', fontSize: '11px',
          color: text.length > 280 ? '#DC143C' : '#bbb',
        }}>
          {text.length}/280
        </div>
      </div>

      {/* Action buttons */}
      <div style={{
        padding: '8px 14px 12px',
        display: 'flex', alignItems: 'center', gap: '8px',
        borderTop: '1px solid #eee',
      }}>
        {done ? (
          <span style={{ fontFamily: IMPACT, fontSize: '11px', letterSpacing: '0.18em', color: '#bbb' }}>
            {doneLabel}
          </span>
        ) : (
          <>
            <button
              onClick={() => handle('approve')}
              disabled={busy}
              style={{
                background: '#111', color: '#fff', border: 'none',
                fontFamily: IMPACT, fontSize: '11px', letterSpacing: '0.1em',
                padding: '8px 16px',
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy ? 0.5 : 1,
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              {busy && <Spinner className="h-3 w-3" />}
              PUBLISH IT
            </button>
            <button
              onClick={() => handle('edit-approve')}
              disabled={busy}
              style={{
                background: 'transparent', color: '#FF006E',
                border: '2px solid #FF006E',
                fontFamily: IMPACT, fontSize: '11px', letterSpacing: '0.1em',
                padding: '6px 16px',
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy ? 0.5 : 1,
              }}
            >
              REWRITE
            </button>
            <button
              onClick={() => handle('skip')}
              disabled={busy}
              style={{
                background: 'transparent', color: '#999',
                border: '1.5px solid #ddd',
                fontFamily: IMPACT, fontSize: '11px', letterSpacing: '0.1em',
                padding: '6px 16px',
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy ? 0.5 : 1,
                marginLeft: 'auto',
              }}
            >
              SPIKE IT
            </button>
          </>
        )}
      </div>
    </article>
  )
}

function CardGrid({ cards, rankOffset, onAction }: {
  cards: Card[]
  rankOffset: number
  onAction: (draftId: number, action: 'approve' | 'edit-approve' | 'skip', text: string) => Promise<void>
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      {cards.map((c, i) => {
        const globalIndex = rankOffset + i
        const isFullWidth = globalIndex % 3 === 0
        return (
          <div key={c.id} style={{ gridColumn: isFullWidth ? 'span 2' : 'span 1' }}>
            <PostCard card={c} rank={globalIndex} index={globalIndex} onAction={onAction} />
          </div>
        )
      })}
    </div>
  )
}

export default function Dashboard() {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [scouting, setScouting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [posts, drafts] = await Promise.all([getPosts(), getDrafts()])
      setCards(buildCards(posts, drafts))
    } catch {
      setError('Could not reach the API.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleRunScout() {
    if (scouting) return
    setScouting(true)
    const countBefore = cards.length
    try {
      await fetch(`${API}/run-scout`, { method: 'POST' })
    } catch {
      setScouting(false)
      return
    }
    let attempts = 0
    const poll = setInterval(async () => {
      attempts++
      try {
        const [posts, drafts] = await Promise.all([getPosts(), getDrafts()])
        const next = buildCards(posts, drafts)
        if (next.length > countBefore || attempts >= 24) {
          clearInterval(poll)
          setScouting(false)
          setCards(next)
        }
      } catch {
        if (attempts >= 24) { clearInterval(poll); setScouting(false) }
      }
    }, 5000)
  }

  async function handleAction(draftId: number, action: 'approve' | 'edit-approve' | 'skip', text: string) {
    if (action === 'skip') {
      await fetch(`${API}/drafts/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      })
    } else if (action === 'edit-approve') {
      await fetch(`${API}/drafts/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_text: text }),
      })
      await fetch(`${API}/drafts/${draftId}/approve`, { method: 'POST' })
    } else {
      await fetch(`${API}/drafts/${draftId}/approve`, { method: 'POST' })
    }
  }

  const pending = cards.filter(c => c.draft.status === 'pending')
  const done    = cards.filter(c => c.draft.status !== 'pending')
  const approvedCount = cards.filter(c => c.draft.status === 'approved').length
  const sentCount     = cards.filter(c => c.draft.status === 'sent').length
  const avgHeat = cards.length > 0
    ? cards.reduce((s, c) => s + c.score, 0) / cards.length
    : 0

  const stats = [
    { label: 'PENDING',    value: pending.length,     hot: true  },
    { label: 'APPROVED',   value: approvedCount,       hot: false },
    { label: 'SENT TODAY', value: sentCount,           hot: false },
    { label: 'AVG HEAT',   value: avgHeat.toFixed(1), hot: true  },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FFF8F0',
      backgroundImage: [
        'repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(160,130,100,0.04) 28px, rgba(160,130,100,0.04) 29px)',
        'repeating-linear-gradient(90deg, transparent, transparent 28px, rgba(160,130,100,0.03) 28px, rgba(160,130,100,0.03) 29px)',
      ].join(', '),
    }}>
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          display: flex;
          white-space: nowrap;
          animation: ticker-scroll 35s linear infinite;
        }
        *, *::before, *::after { box-sizing: border-box; }
        button:hover:not(:disabled) { filter: brightness(0.88); }
      `}</style>

      {/* ── MASTHEAD ── */}
      <header style={{ background: '#FFF8F0' }}>
        <div style={{ height: '3px', background: '#111' }} />
        <div style={{ padding: '14px 28px', maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>

            {/* FREE INSIDE starburst */}
            <div style={{ position: 'relative', width: '76px', height: '76px', flexShrink: 0 }}>
              <div style={{
                position: 'absolute', inset: 0,
                background: '#FFD700',
                clipPath: STARBURST_18,
              }} />
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', textAlign: 'center',
              }}>
                <div style={{ fontFamily: IMPACT, fontSize: '10px', letterSpacing: '0.04em', color: '#111', lineHeight: 1.25 }}>
                  FREE<br />INSIDE
                </div>
              </div>
            </div>

            {/* Title */}
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ lineHeight: 1, letterSpacing: '-0.02em' }}>
                <span style={{ fontFamily: GEORGIA, fontWeight: 'bold', fontSize: '62px', color: '#111' }}>REPLYGUY</span>
                <span style={{ fontFamily: GEORGIA, fontWeight: 'bold', fontSize: '38px', color: '#FF006E', marginLeft: '10px' }}>WEEKLY</span>
              </div>
              <div style={{ fontFamily: IMPACT, fontSize: '9px', letterSpacing: '0.28em', color: '#999', marginTop: '5px' }}>
                ALL THE HOT TAKES &nbsp;★&nbsp; NONE OF THE CRINGE
              </div>
            </div>

            {/* SEND THE PAPS starburst button */}
            <button
              onClick={handleRunScout}
              disabled={scouting}
              style={{
                position: 'relative', width: '84px', height: '84px',
                background: 'none', border: 'none',
                cursor: scouting ? 'not-allowed' : 'pointer',
                transform: 'rotate(-8deg)',
                padding: 0, flexShrink: 0,
                opacity: scouting ? 0.7 : 1,
                filter: 'none',
              }}
            >
              <div style={{
                position: 'absolute', inset: 0,
                background: '#FFD700',
                clipPath: STARBURST_24,
              }} />
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', padding: '22%',
              }}>
                {scouting
                  ? <Spinner className="h-4 w-4" />
                  : <div style={{ fontFamily: IMPACT, fontSize: '8px', letterSpacing: '0.05em', color: '#111', lineHeight: 1.35 }}>
                      📸<br />SEND<br />THE<br />PAPS
                    </div>
                }
              </div>
            </button>
          </div>
        </div>
        <div style={{ height: '3px', background: '#111' }} />
      </header>

      {/* ── CATEGORY STRIP ── */}
      <div style={{
        background: '#FFF8F0',
        borderBottom: '1px solid #ccc',
        padding: '5px 28px',
        textAlign: 'center',
      }}>
        <span style={{ fontFamily: IMPACT, fontSize: '9px', letterSpacing: '0.22em', color: '#444' }}>
          CELEB NEWS &nbsp;•&nbsp; REAL LIFE &nbsp;•&nbsp; DRAMA &nbsp;•&nbsp; SHOWBIZ &nbsp;•&nbsp; INSIDER &nbsp;•&nbsp; HOT TAKES
        </span>
      </div>

      {/* ── BREAKING NEWS TICKER ── */}
      <div style={{
        background: '#DC143C', height: '32px',
        display: 'flex', alignItems: 'center',
        overflow: 'hidden',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        <div style={{
          flexShrink: 0,
          background: '#FFD700', color: '#DC143C',
          padding: '0 14px', height: '100%',
          display: 'flex', alignItems: 'center',
          fontFamily: IMPACT, fontSize: '11px', letterSpacing: '0.12em',
        }}>
          BREAKING
        </div>
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div className="ticker-track">
            <span style={{ fontFamily: IMPACT, fontSize: '11px', letterSpacing: '0.07em', color: '#fff', paddingLeft: '28px' }}>
              {TICKER_TEXT}
            </span>
          </div>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div style={{ background: '#111', padding: '10px 28px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', alignItems: 'stretch' }}>
          {stats.map(({ label, value, hot }, i) => (
            <div key={label} style={{
              flex: 1, textAlign: 'center', padding: '6px 0',
              borderRight: i < stats.length - 1 ? '1px solid #2a2a2a' : 'none',
            }}>
              <div style={{ fontFamily: IMPACT, fontSize: '9px', letterSpacing: '0.2em', color: '#777', marginBottom: '3px' }}>
                {label}
              </div>
              <div style={{ fontFamily: IMPACT, fontSize: '26px', color: hot ? '#DC143C' : '#FFD700', lineHeight: 1 }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '20px 28px 64px' }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <Spinner className="h-5 w-5" />
          </div>
        )}

        {!loading && error && (
          <p style={{
            textAlign: 'center', padding: '80px 0',
            fontFamily: IMPACT, fontSize: '14px', letterSpacing: '0.1em', color: '#DC143C',
          }}>
            {error}
          </p>
        )}

        {!loading && !error && cards.length === 0 && (
          <p style={{
            textAlign: 'center', padding: '80px 0',
            fontFamily: IMPACT, fontSize: '13px', letterSpacing: '0.12em', color: '#aaa',
          }}>
            NO STORIES YET —{' '}
            <span style={{ color: '#DC143C' }}>📸 SEND THE PAPS</span>{' '}
            TO BREAK A STORY
          </p>
        )}

        {!loading && !error && pending.length > 0 && (
          <section>
            <div style={{
              background: '#111', color: '#FFD700',
              fontFamily: IMPACT, fontSize: '13px', letterSpacing: '0.14em',
              textAlign: 'center', padding: '9px 0',
              marginBottom: '16px',
            }}>
              ★ HOT TAKES AWAITING YOUR VERDICT ★
            </div>
            <CardGrid cards={pending} rankOffset={0} onAction={handleAction} />
          </section>
        )}

        {!loading && !error && done.length > 0 && (
          <section style={{ marginTop: pending.length > 0 ? '32px' : '0' }}>
            <div style={{
              background: '#888', color: '#fff',
              fontFamily: IMPACT, fontSize: '12px', letterSpacing: '0.14em',
              textAlign: 'center', padding: '7px 0',
              marginBottom: '16px',
            }}>
              ✓ FILED &amp; ARCHIVED · {done.length}
            </div>
            <CardGrid cards={done} rankOffset={pending.length} onAction={handleAction} />
          </section>
        )}
      </main>
    </div>
  )
}
