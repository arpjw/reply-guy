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

type PillStyle = { label: string; bg: string; color: string; accent: string }

const CATEGORY_PILLS: PillStyle[] = [
  { label: 'DRAMA',    bg: '#FF006E', color: '#fff', accent: '#FF006E' },
  { label: 'TEA',      bg: '#FFD700', color: '#111', accent: '#C8A000' },
  { label: 'BREAKING', bg: '#DC143C', color: '#fff', accent: '#DC143C' },
  { label: 'INSIDER',  bg: '#7B00D4', color: '#fff', accent: '#7B00D4' },
]

function getCategoryPill(score: number, index: number): PillStyle {
  if (score >= 9.5) return CATEGORY_PILLS[2]
  if (score >= 9)   return CATEGORY_PILLS[0]
  return CATEGORY_PILLS[index % CATEGORY_PILLS.length]
}

function getStamp(index: number): { text: string; color: string } | null {
  if (index === 0)      return { text: 'EXCLUSIVE',   color: '#DC143C' }
  if (index % 5 === 2)  return { text: 'SOURCES SAY', color: '#FF006E' }
  if (index % 7 === 4)  return { text: 'DEVELOPING',  color: '#7B00D4' }
  return null
}

const STARBURST_18 = 'polygon(50% 0%,56% 25%,79% 9%,66% 31%,93% 31%,72% 47%,87% 71%,64% 58%,57% 85%,50% 62%,43% 85%,36% 58%,13% 71%,28% 47%,7% 31%,34% 31%,21% 9%,44% 25%)'
const STARBURST_24 = 'polygon(50% 0%,56% 20%,74% 7%,65% 27%,87% 22%,74% 39%,97% 43%,78% 53%,91% 70%,70% 65%,73% 87%,57% 74%,50% 95%,43% 74%,27% 87%,30% 65%,9% 70%,22% 53%,3% 43%,26% 39%,13% 22%,35% 27%,26% 7%,44% 20%)'

function StarburstBadge({ score, size = 64 }: { score: number; size?: number }) {
  const hot = score >= 9
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {hot && (
        <div style={{
          position: 'absolute', inset: '-4px',
          background: '#DC143C',
          clipPath: STARBURST_18,
        }} />
      )}
      <div style={{
        position: 'absolute', inset: 0,
        background: '#FFD700',
        clipPath: STARBURST_18,
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontFamily: IMPACT, fontSize: Math.round(size * 0.28) + 'px', color: '#111', lineHeight: 1 }}>
          {score % 1 === 0 ? score : score.toFixed(1)}
        </div>
        <div style={{ fontFamily: IMPACT, fontSize: Math.round(size * 0.115) + 'px', color: '#111' }}>
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
      border: '1.5px solid #111',
      borderTop: `5px solid ${pill.accent}`,
      position: 'relative',
      opacity: done ? 0.42 : 1,
      transition: 'opacity 0.3s',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      {stamp && (
        <div style={{
          position: 'absolute', top: '20px', right: '-30px',
          background: stamp.color, color: '#fff',
          fontFamily: IMPACT, fontSize: '9px', letterSpacing: '0.16em',
          padding: '5px 44px',
          transform: 'rotate(20deg)',
          zIndex: 10, boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          pointerEvents: 'none',
        }}>
          {stamp.text}
        </div>
      )}

      {/* Card header */}
      <div style={{ padding: '14px 16px 12px', borderBottom: '1.5px solid #111' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ marginBottom: '6px' }}>
              <span style={{
                background: pill.bg, color: pill.color,
                fontFamily: IMPACT, fontSize: '9px', letterSpacing: '0.16em',
                padding: '2px 9px', display: 'inline-block',
              }}>
                {pill.label}
              </span>
            </div>
            <h2 style={{
              fontFamily: GEORGIA, fontWeight: 'bold',
              fontSize: isLead ? '25px' : '17px',
              lineHeight: 1.0, letterSpacing: '-0.02em',
              color: '#111', margin: '0 0 5px',
              textTransform: 'uppercase', wordBreak: 'break-word',
            }}>
              {headline}
            </h2>
            <p style={{
              fontFamily: GEORGIA, fontStyle: 'italic',
              fontSize: '12px', color: '#555',
              margin: 0, lineHeight: 1.4,
            }}>
              {subheadline}
            </p>
          </div>
          <StarburstBadge score={card.score} size={isLead ? 70 : 56} />
        </div>
      </div>

      {/* Post content */}
      <div style={{
        borderLeft: `4px solid ${pill.accent}`,
        margin: '12px 16px',
        padding: '8px 12px',
        background: 'rgba(0,0,0,0.018)',
      }}>
        <p style={{
          fontFamily: GEORGIA, fontStyle: 'italic',
          fontSize: '13px', color: '#333',
          lineHeight: 1.65, margin: 0,
        }}>
          &ldquo;{card.content}&rdquo;
        </p>
      </div>

      {/* YOUR RESPONSE */}
      <div style={{
        padding: '10px 16px 12px',
        borderTop: '2px dashed #FF006E',
        background: 'rgba(255,0,110,0.018)',
        flex: 1, display: 'flex', flexDirection: 'column', gap: '7px',
      }}>
        <div style={{
          fontFamily: IMPACT, fontSize: '9px',
          letterSpacing: '0.28em', color: '#FF006E',
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
          textAlign: 'right',
        }}>
          {text.length}/280
        </div>
      </div>

      {/* Action buttons */}
      <div style={{
        padding: '10px 16px 14px',
        display: 'flex', alignItems: 'center', gap: '8px',
        borderTop: '1px solid #e8e0d8',
        background: '#FFF8F0',
      }}>
        {done ? (
          <span style={{ fontFamily: IMPACT, fontSize: '11px', letterSpacing: '0.2em', color: '#bbb' }}>
            ✓ {doneLabel}
          </span>
        ) : (
          <>
            <button
              onClick={() => handle('approve')}
              disabled={busy}
              style={{
                background: '#111', color: '#fff', border: 'none',
                fontFamily: IMPACT, fontSize: '11px', letterSpacing: '0.1em',
                padding: '9px 18px',
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
                padding: '7px 18px',
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
                border: '1px solid #ddd',
                fontFamily: IMPACT, fontSize: '11px', letterSpacing: '0.1em',
                padding: '7px 18px',
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
    { label: 'PENDING',  value: pending.length,     hot: true  },
    { label: 'APPROVED', value: approvedCount,       hot: false },
    { label: 'SENT',     value: sentCount,           hot: false },
    { label: 'AVG HEAT', value: avgHeat.toFixed(1), hot: true  },
  ]

  return (
    <div className="mag-root" style={{ minHeight: '100vh', backgroundColor: '#FFF8F0' }}>
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          display: flex;
          white-space: nowrap;
          animation: ticker-scroll 38s linear infinite;
        }
        *, *::before, *::after { box-sizing: border-box; }
        button:hover:not(:disabled) { filter: brightness(0.88); }
        .mag-root {
          background-color: #FFF8F0;
          background-image:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"),
            repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(160,130,100,0.04) 31px, rgba(160,130,100,0.04) 32px);
        }
      `}</style>

      {/* ── MASTHEAD ── */}
      <header style={{ background: '#FFF8F0' }}>
        <div style={{ height: '5px', background: '#111' }} />
        <div style={{ height: '1.5px', background: '#111', marginTop: '3px' }} />
        <div style={{ padding: '16px 28px 14px', maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>

            {/* FREE INSIDE double-ring starburst */}
            <div style={{ position: 'relative', width: '82px', height: '82px', flexShrink: 0 }}>
              <div style={{
                position: 'absolute', inset: 0,
                background: '#111',
                clipPath: STARBURST_18,
              }} />
              <div style={{
                position: 'absolute', inset: '6px',
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

            {/* Masthead title */}
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ lineHeight: 0.92, letterSpacing: '-0.03em' }}>
                <span style={{ fontFamily: GEORGIA, fontWeight: 'bold', fontSize: '70px', color: '#111', display: 'inline-block' }}>REPLYGUY</span>
                <span style={{ fontFamily: GEORGIA, fontWeight: 'bold', fontSize: '44px', color: '#FF006E', marginLeft: '12px', display: 'inline-block' }}>WEEKLY</span>
              </div>
              <div style={{ fontFamily: IMPACT, fontSize: '9px', letterSpacing: '0.34em', color: '#888', marginTop: '7px' }}>
                ALL THE HOT TAKES &nbsp;★&nbsp; NONE OF THE CRINGE
              </div>
            </div>

            {/* SEND THE PAPS double-ring starburst button */}
            <button
              onClick={handleRunScout}
              disabled={scouting}
              style={{
                position: 'relative', width: '90px', height: '90px',
                background: 'none', border: 'none',
                cursor: scouting ? 'not-allowed' : 'pointer',
                transform: 'rotate(-9deg)',
                padding: 0, flexShrink: 0,
                opacity: scouting ? 0.7 : 1,
                filter: 'none',
              }}
            >
              <div style={{
                position: 'absolute', inset: 0,
                background: '#111',
                clipPath: STARBURST_24,
              }} />
              <div style={{
                position: 'absolute', inset: '7px',
                background: '#FFD700',
                clipPath: STARBURST_24,
              }} />
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', padding: '26%',
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
        <div style={{ height: '1.5px', background: '#111', marginBottom: '3px' }} />
        <div style={{ height: '5px', background: '#111' }} />
      </header>

      {/* ── CATEGORY STRIP ── */}
      <div style={{
        background: '#FFF8F0',
        borderBottom: '1px solid #bbb',
        padding: '6px 28px',
        textAlign: 'center',
      }}>
        <span style={{ fontFamily: IMPACT, fontSize: '9px', letterSpacing: '0.26em', color: '#555' }}>
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
          padding: '0 16px', height: '100%',
          display: 'flex', alignItems: 'center',
          fontFamily: IMPACT, fontSize: '11px', letterSpacing: '0.14em',
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
      <div style={{ background: '#111', padding: '12px 28px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', alignItems: 'stretch' }}>
          {stats.map(({ label, value, hot }, i) => (
            <div key={label} style={{
              flex: 1, textAlign: 'center', padding: '6px 0',
              borderRight: i < stats.length - 1 ? '1px solid #2a2a2a' : 'none',
            }}>
              <div style={{ fontFamily: IMPACT, fontSize: '9px', letterSpacing: '0.22em', color: '#666', marginBottom: '4px' }}>
                {label}
              </div>
              <div style={{ fontFamily: IMPACT, fontSize: '28px', color: hot ? '#DC143C' : '#FFD700', lineHeight: 1 }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '22px 28px 72px' }}>
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
              fontFamily: IMPACT, fontSize: '12px', letterSpacing: '0.16em',
              textAlign: 'center', padding: '10px 0',
              marginBottom: '18px',
            }}>
              ★&nbsp; HOT TAKES AWAITING YOUR VERDICT &nbsp;★
            </div>
            <CardGrid cards={pending} rankOffset={0} onAction={handleAction} />
          </section>
        )}

        {!loading && !error && done.length > 0 && (
          <section style={{ marginTop: pending.length > 0 ? '36px' : '0' }}>
            <div style={{
              background: '#777', color: '#fff',
              fontFamily: IMPACT, fontSize: '11px', letterSpacing: '0.16em',
              textAlign: 'center', padding: '8px 0',
              marginBottom: '18px',
            }}>
              ✓&nbsp; FILED &amp; ARCHIVED &nbsp;·&nbsp; {done.length} STORIES
            </div>
            <CardGrid cards={done} rankOffset={pending.length} onAction={handleAction} />
          </section>
        )}
      </main>
    </div>
  )
}
