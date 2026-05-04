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

function getPill(score: number, rank: number): { label: string; bg: string; color: string } {
  if (rank === 0) return { label: '🔥 Top Story', bg: '#DC143C', color: '#fff' }
  if (score >= 8) return { label: '📰 Developing', bg: '#B8600A', color: '#fff' }
  return { label: '👀 Watch This', bg: '#1A56A0', color: '#fff' }
}

function HeatBadge({ score }: { score: number }) {
  const hot = score >= 9
  return (
    <div style={{
      background: hot ? '#DC143C' : '#111',
      color: '#FFD700',
      fontFamily: IMPACT,
      padding: '4px 10px',
      minWidth: '60px',
      textAlign: 'center',
      lineHeight: 1.2,
      flexShrink: 0,
    }}>
      <div style={{ fontSize: '20px' }}>{score % 1 === 0 ? score : score.toFixed(1)}</div>
      <div style={{ fontSize: '10px', letterSpacing: '0.05em' }}>🔥 HEAT</div>
    </div>
  )
}

function PostCard({
  card,
  rank,
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
    if (card.draft.status === 'approved' || card.draft.status === 'sent') return 'PRINTED'
    if (card.draft.status === 'rejected') return 'KILLED'
    return ''
  })

  async function handle(action: 'approve' | 'edit-approve' | 'skip') {
    setBusy(true)
    await onAction(card.draft.id, action, text)
    setDoneLabel(action === 'skip' ? 'KILLED' : 'PRINTED')
    setDone(true)
    setBusy(false)
  }

  const pill = getPill(card.score, rank)
  const cardBg = index % 2 === 0 ? '#FFF8F0' : '#FFFFFF'
  const rawHandle = card.author_handle.startsWith('@')
    ? card.author_handle.slice(1).toUpperCase()
    : card.author_handle.toUpperCase()

  return (
    <article style={{
      background: cardBg,
      borderLeft: '3px solid #111',
      borderRight: '3px solid #111',
      borderBottom: '3px solid #111',
      opacity: done ? 0.45 : 1,
      transition: 'opacity 0.3s',
    }}>
      {/* Card header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '10px 14px 10px',
        borderBottom: '2px solid #111',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: '5px' }}>
            <span style={{
              display: 'inline-block',
              background: pill.bg,
              color: pill.color,
              fontFamily: IMPACT,
              fontSize: '10px',
              letterSpacing: '0.08em',
              padding: '2px 9px',
            }}>
              {pill.label}
            </span>
          </div>
          <div style={{
            fontFamily: IMPACT,
            fontSize: '22px',
            lineHeight: 1.1,
            letterSpacing: '0.02em',
            color: '#111',
            wordBreak: 'break-word',
          }}>
            <span style={{ color: '#DC143C' }}>@</span>
            {rawHandle} STRIKES AGAIN
          </div>
        </div>
        <HeatBadge score={card.score} />
      </div>

      {/* Post content */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '2px solid #111',
        borderLeft: '3px solid #FFD700',
        marginLeft: '3px',
      }}>
        <p style={{
          fontFamily: GEORGIA,
          fontStyle: 'italic',
          fontSize: '14px',
          color: '#333',
          lineHeight: 1.65,
          margin: 0,
        }}>
          {card.content}
        </p>
      </div>

      {/* Draft reply */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '2px solid #111',
        borderTop: '2px solid #FF006E',
        background: 'rgba(255,0,110,0.04)',
        outline: '0',
        borderLeft: '3px solid #FF006E',
        marginLeft: '3px',
      }}>
        <div style={{
          fontFamily: IMPACT,
          fontSize: '11px',
          letterSpacing: '0.14em',
          color: '#FF006E',
          marginBottom: '7px',
        }}>
          YOUR HOT TAKE
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          disabled={done || busy}
          rows={3}
          style={{
            width: '100%',
            background: '#fff',
            border: '1.5px solid #FF006E',
            fontFamily: GEORGIA,
            fontSize: '13px',
            color: '#222',
            padding: '8px 10px',
            resize: 'vertical',
            lineHeight: 1.55,
            outline: 'none',
            boxSizing: 'border-box',
            opacity: done || busy ? 0.5 : 1,
          }}
        />
        <div style={{
          marginTop: '4px',
          fontFamily: IMPACT,
          fontSize: '11px',
          color: text.length > 280 ? '#DC143C' : '#aaa',
          letterSpacing: '0.06em',
        }}>
          {text.length}/280
        </div>
      </div>

      {/* Action buttons */}
      <div style={{
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: cardBg,
      }}>
        {done ? (
          <span style={{
            fontFamily: IMPACT,
            fontSize: '12px',
            letterSpacing: '0.18em',
            color: '#aaa',
          }}>
            {doneLabel}
          </span>
        ) : (
          <>
            <button
              onClick={() => handle('approve')}
              disabled={busy}
              style={{
                background: '#111',
                color: '#FFD700',
                border: 'none',
                fontFamily: IMPACT,
                fontSize: '12px',
                letterSpacing: '0.1em',
                padding: '8px 18px',
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {busy ? <Spinner className="h-3 w-3" /> : null}
              PRINT IT
            </button>
            <button
              onClick={() => handle('edit-approve')}
              disabled={busy}
              style={{
                background: '#FFD700',
                color: '#111',
                border: 'none',
                fontFamily: IMPACT,
                fontSize: '12px',
                letterSpacing: '0.1em',
                padding: '8px 18px',
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
                background: 'transparent',
                color: '#aaa',
                border: '1.5px solid #ccc',
                fontFamily: IMPACT,
                fontSize: '12px',
                letterSpacing: '0.1em',
                padding: '8px 18px',
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy ? 0.5 : 1,
                marginLeft: 'auto',
              }}
            >
              KILL IT
            </button>
          </>
        )}
      </div>
    </article>
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
  const done = cards.filter(c => c.draft.status !== 'pending')
  const approvedCount = cards.filter(c => c.draft.status === 'approved').length
  const sentCount = cards.filter(c => c.draft.status === 'sent').length
  const avgHeat = cards.length > 0
    ? (cards.reduce((s, c) => s + c.score, 0) / cards.length)
    : 0

  const stats = [
    { label: 'PENDING',    value: pending.length,       hot: true  },
    { label: 'APPROVED',   value: approvedCount,         hot: false },
    { label: 'SENT TODAY', value: sentCount,             hot: false },
    { label: 'AVG HEAT',   value: avgHeat.toFixed(1),   hot: true  },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#FFF8F0' }}>
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
      `}</style>

      {/* Scrolling ticker */}
      <div style={{
        background: '#DC143C',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}>
        <div style={{
          flexShrink: 0,
          background: '#FFD700',
          color: '#DC143C',
          padding: '0 14px',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          fontFamily: IMPACT,
          fontSize: '11px',
          letterSpacing: '0.12em',
          zIndex: 1,
        }}>
          BREAKING
        </div>
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div className="ticker-track">
            <span style={{
              fontFamily: IMPACT,
              fontSize: '11px',
              letterSpacing: '0.07em',
              color: '#fff',
              paddingLeft: '28px',
            }}>
              {TICKER_TEXT}
            </span>
          </div>
        </div>
      </div>

      {/* Masthead */}
      <div style={{
        background: '#FFF8F0',
        borderBottom: '3px solid #111',
        padding: '14px 24px 12px',
      }}>
        <div style={{
          maxWidth: '680px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}>
          <div style={{ flex: 1 }} />

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: IMPACT,
              fontSize: '32px',
              letterSpacing: '0.04em',
              lineHeight: 1,
            }}>
              <span style={{ color: '#111' }}>REPLY</span>
              <span style={{ color: '#DC143C' }}>GUY</span>
              <span style={{ color: '#111' }}> WEEKLY</span>
            </div>
            <div style={{
              fontFamily: IMPACT,
              fontSize: '9px',
              letterSpacing: '0.22em',
              color: '#777',
              textTransform: 'uppercase',
              marginTop: '4px',
            }}>
              All the hot takes ★ None of the cringe
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleRunScout}
              disabled={scouting}
              style={{
                background: '#DC143C',
                color: '#fff',
                border: 'none',
                fontFamily: IMPACT,
                fontSize: '11px',
                letterSpacing: '0.1em',
                padding: '9px 14px',
                cursor: scouting ? 'not-allowed' : 'pointer',
                opacity: scouting ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {scouting && <Spinner className="h-3 w-3" />}
              {scouting ? 'SCOUTING...' : '📸 SEND THE PAPS'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{
        background: '#111',
        borderBottom: '3px solid #FFD700',
        padding: '8px 24px',
      }}>
        <div style={{
          maxWidth: '680px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'center',
          gap: '40px',
        }}>
          {stats.map(({ label, value, hot }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: IMPACT,
                fontSize: '24px',
                lineHeight: 1,
                color: hot ? '#DC143C' : '#FFD700',
              }}>
                {value}
              </div>
              <div style={{
                fontFamily: IMPACT,
                fontSize: '9px',
                letterSpacing: '0.16em',
                color: '#888',
                marginTop: '2px',
              }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <main style={{ maxWidth: '680px', margin: '0 auto', padding: '0 24px 56px' }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <Spinner className="h-5 w-5" />
          </div>
        )}

        {!loading && error && (
          <p style={{
            textAlign: 'center',
            padding: '80px 0',
            fontFamily: IMPACT,
            fontSize: '14px',
            letterSpacing: '0.1em',
            color: '#DC143C',
          }}>
            {error}
          </p>
        )}

        {!loading && !error && cards.length === 0 && (
          <p style={{
            textAlign: 'center',
            padding: '80px 0',
            fontFamily: IMPACT,
            fontSize: '13px',
            letterSpacing: '0.12em',
            color: '#aaa',
          }}>
            NO STORIES YET —{' '}
            <span style={{ color: '#DC143C' }}>📸 SEND THE PAPS</span>{' '}
            TO BREAK A STORY
          </p>
        )}

        {!loading && !error && pending.length > 0 && (
          <section>
            <div style={{
              background: '#111',
              color: '#FFD700',
              fontFamily: IMPACT,
              fontSize: '14px',
              letterSpacing: '0.14em',
              textAlign: 'center',
              padding: '9px 0',
              border: '3px solid #111',
            }}>
              ★ HOT TAKES AWAITING YOUR VERDICT ★
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {pending.map((c, i) => (
                <PostCard key={c.id} card={c} rank={i} index={i} onAction={handleAction} />
              ))}
            </div>
          </section>
        )}

        {!loading && !error && done.length > 0 && (
          <section style={{ marginTop: pending.length > 0 ? '28px' : '0' }}>
            <div style={{
              background: '#888',
              color: '#fff',
              fontFamily: IMPACT,
              fontSize: '12px',
              letterSpacing: '0.14em',
              textAlign: 'center',
              padding: '7px 0',
              border: '3px solid #888',
            }}>
              ✓ FILED &amp; ARCHIVED · {done.length}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {done.map((c, i) => (
                <PostCard key={c.id} card={c} rank={pending.length + i} index={i} onAction={handleAction} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
