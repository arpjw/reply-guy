'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

function authHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem('auth_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

type AuthUser = { id: number; x_handle: string }

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
  const res = await fetch(`${API}/posts?min_score=7&page_size=100`, { headers: authHeader() })
  if (!res.ok) throw new Error('posts')
  return res.json()
}

async function getDrafts(): Promise<Draft[]> {
  const res = await fetch(`${API}/drafts`, { headers: authHeader() })
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

const STARBURST_16 = 'polygon(50% 0%,56% 30%,80% 10%,65% 35%,95% 30%,72% 50%,90% 75%,62% 62%,58% 92%,50% 68%,42% 92%,38% 62%,10% 75%,28% 50%,5% 30%,35% 35%,20% 10%,44% 30%)'

const STRIPE_BG = 'repeating-linear-gradient(90deg, #FF1493 0px, #FF1493 14px, #9B00FF 14px, #9B00FF 28px, #00FFFF 28px, #00FFFF 42px, #FFD700 42px, #FFD700 56px, #FF69B4 56px, #FF69B4 70px)'

function StripeDivider() {
  return <div style={{ height: '8px', background: STRIPE_BG }} />
}

type CardVariant = 'pink' | 'blue' | 'yellow'
const CARD_VARIANTS: CardVariant[] = ['pink', 'blue', 'yellow']

interface CardStyle {
  bg: string
  borderColor: string
  outlineColor: string
  outlineStyle: 'dashed' | 'dotted'
}

const CARD_STYLES: Record<CardVariant, CardStyle> = {
  pink:   { bg: '#FFF0F9', borderColor: '#FF1493', outlineColor: '#FF69B4', outlineStyle: 'dashed' },
  blue:   { bg: '#F0F4FF', borderColor: '#9B00FF', outlineColor: '#9B00FF', outlineStyle: 'dotted' },
  yellow: { bg: '#FFFBE0', borderColor: '#FFD700', outlineColor: '#FF1493', outlineStyle: 'dashed' },
}

function getStamp(index: number): string | null {
  if (index === 0)     return 'EXCLUSIVE'
  if (index % 5 === 2) return 'SOURCES SAY'
  if (index % 7 === 4) return 'EXCLUSIVE'
  return null
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

  const variant = CARD_VARIANTS[index % 3]
  const cs = CARD_STYLES[variant]
  const stamp = getStamp(index)
  const subheadline = SUBHEADLINES[index % SUBHEADLINES.length]
  const rawHandle = card.author_handle.startsWith('@')
    ? card.author_handle.slice(1).toUpperCase()
    : card.author_handle.toUpperCase()
  const headline = HEADLINE_TEMPLATES[index % HEADLINE_TEMPLATES.length](rawHandle)
  const isLead = index === 0
  const hot = card.score > 60

  return (
    <article style={{
      background: cs.bg,
      border: `4px solid ${cs.borderColor}`,
      outline: `2px ${cs.outlineStyle} ${cs.outlineColor}`,
      outlineOffset: '3px',
      position: 'relative',
      opacity: done ? 0.42 : 1,
      transition: 'opacity 0.3s',
      overflow: 'visible',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>

      {/* Heat starburst — pokes outside the card border */}
      <div style={{
        position: 'absolute', top: '-6px', right: '-6px',
        width: '52px', height: '52px', zIndex: 4,
        clipPath: STARBURST_16,
        background: hot ? '#FF1493' : '#FFD700',
        animation: `pulse ${hot ? '1s' : '2s'} ease-in-out infinite alternate`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column',
      }}>
        <div style={{ fontFamily: IMPACT, fontSize: '13px', color: hot ? '#fff' : '#111', lineHeight: 1 }}>
          {card.score % 1 === 0 ? card.score : card.score.toFixed(1)}
        </div>
        <div style={{ fontFamily: IMPACT, fontSize: '7px', color: hot ? '#fff' : '#111' }}>HEAT</div>
      </div>

      {/* Corner stamp */}
      {stamp && (
        <div style={{
          position: 'absolute', bottom: '-4px', left: '-4px',
          background: '#fff', border: '2px solid #FF1493',
          transform: 'rotate(8deg)',
          fontFamily: IMPACT, fontSize: '8px', letterSpacing: '0.1em',
          color: '#FF1493', padding: '2px 6px', zIndex: 3,
        }}>
          {stamp}
        </div>
      )}

      {/* Card header */}
      <div style={{
        padding: `14px 52px 12px 16px`,
        borderBottom: `2px solid ${cs.borderColor}`,
      }}>
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

      {/* Post content — dual-sided borders */}
      <div style={{
        borderLeft: '4px solid #9B00FF',
        borderRight: '4px solid #FF1493',
        margin: '12px 16px',
        padding: '8px 12px',
        background: 'rgba(155,0,255,0.04)',
      }}>
        <p style={{
          fontFamily: GEORGIA, fontStyle: 'italic',
          fontSize: '13px', color: '#333',
          lineHeight: 1.65, margin: 0,
        }}>
          &ldquo;{card.content}&rdquo;
        </p>
      </div>

      {/* Draft block — ♥ label simulates ::before on the dashed border */}
      <div style={{ margin: '0 16px 12px', position: 'relative', flex: 1 }}>
        <div style={{
          position: 'absolute', top: '-11px', left: '50%',
          transform: 'translateX(-50%)',
          background: cs.bg, color: '#FF1493',
          fontSize: '18px', lineHeight: 1, padding: '0 6px', zIndex: 1,
        }}>
          ♥
        </div>
        <div style={{
          border: '3px dashed #FF1493',
          padding: '12px', height: '100%',
          display: 'flex', flexDirection: 'column', gap: '7px',
        }}>
          <div style={{ fontFamily: IMPACT, fontSize: '9px', letterSpacing: '0.28em', color: '#FF1493' }}>
            YOUR RESPONSE
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            disabled={done || busy}
            rows={3}
            style={{
              width: '100%', background: '#fff',
              border: '1.5px solid #FF69B4',
              fontFamily: GEORGIA, fontSize: '13px', color: '#222',
              padding: '8px 10px', resize: 'vertical',
              lineHeight: 1.55, outline: 'none',
              boxSizing: 'border-box',
              opacity: done || busy ? 0.5 : 1,
            }}
          />
          <div style={{
            fontFamily: GEORGIA, fontStyle: 'italic', fontSize: '11px',
            color: text.length > 280 ? '#FF1493' : '#bbb',
            textAlign: 'right',
          }}>
            {text.length}/280
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{
        padding: '10px 16px 14px',
        display: 'flex', alignItems: 'center', gap: '8px',
        borderTop: '2px dashed #FF1493',
        background: 'rgba(255,20,147,0.04)',
      }}>
        {done ? (
          <span style={{ fontFamily: IMPACT, fontSize: '11px', letterSpacing: '0.2em', color: '#FF1493' }}>
            ✓ {doneLabel}
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={() => handle('approve')}
              disabled={busy}
              style={{
                background: '#FF1493', color: '#FFD700',
                border: '3px solid #CC0066',
                fontFamily: IMPACT, fontSize: '11px', letterSpacing: '0.1em',
                padding: '9px 18px',
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy ? 0.5 : 1,
                display: 'flex', alignItems: 'center', gap: '6px',
                textShadow: '1px 1px 0 #CC0066',
              }}
            >
              {busy && <Spinner className="h-3 w-3" />}
              PUBLISH IT
            </button>
            <button
              type="button"
              onClick={() => handle('edit-approve')}
              disabled={busy}
              style={{
                background: '#FFD700', color: '#9B00FF',
                border: '3px solid #9B00FF',
                fontFamily: IMPACT, fontSize: '11px', letterSpacing: '0.1em',
                padding: '7px 18px',
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy ? 0.5 : 1,
              }}
            >
              REWRITE
            </button>
            <button
              type="button"
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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
      {cards.map((c, i) => {
        const globalIndex = rankOffset + i
        const isFullWidth = i === 0
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
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [scouting, setScouting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get('token')
    if (urlToken) {
      localStorage.setItem('auth_token', urlToken)
      window.history.replaceState({}, '', window.location.pathname)
    }
    fetch(`${API}/auth/me`, { headers: authHeader() }).then(res => {
      if (res.status === 401) {
        router.replace('/login')
      } else if (res.ok) {
        res.json().then((data: AuthUser) => {
          setUser(data)
          setAuthChecked(true)
        })
      } else {
        setAuthChecked(true)
      }
    }).catch(() => setAuthChecked(true))
  }, [router])

  async function handleLogout() {
    await fetch(`${API}/auth/logout`, { method: 'POST', headers: authHeader() })
    localStorage.removeItem('auth_token')
    router.replace('/login')
  }

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
      await fetch(`${API}/run-scout`, { method: 'POST', headers: authHeader() })
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
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ status: 'rejected' }),
      })
    } else if (action === 'edit-approve') {
      await fetch(`${API}/drafts/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ draft_text: text }),
      })
      await fetch(`${API}/drafts/${draftId}/approve`, { method: 'POST', headers: authHeader() })
    } else {
      await fetch(`${API}/drafts/${draftId}/approve`, { method: 'POST', headers: authHeader() })
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
    { label: 'PENDING',  value: pending.length,    isHeat: false },
    { label: 'APPROVED', value: approvedCount,      isHeat: false },
    { label: 'SENT',     value: sentCount,          isHeat: false },
    { label: 'AVG HEAT', value: avgHeat.toFixed(1), isHeat: true  },
  ]

  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#FFE4F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner className="h-5 w-5" />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFE4F7' }}>
      <style>{`
        @keyframes pulse {
          0%   { transform: scale(1); }
          100% { transform: scale(1.06); }
        }
        @keyframes wiggle {
          0%   { transform: rotate(-2deg); }
          100% { transform: rotate(2deg); }
        }
        @keyframes shimmer {
          0%   { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        @keyframes ticker {
          0%   { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        *, *::before, *::after { box-sizing: border-box; }
        button:hover:not(:disabled) { filter: brightness(0.9); }
        .y2k-shimmer {
          background: linear-gradient(90deg, #FF1493, #9B00FF, #00FFFF, #FFD700, #FF1493);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
          display: inline-block;
        }
        .y2k-banner {
          background: #FF1493;
          color: #FFD700;
          font-family: Impact, 'Arial Black', sans-serif;
          font-size: 13px;
          letter-spacing: 0.16em;
          text-align: center;
          padding: 10px 100px;
          border-top: 4px solid #FFD700;
          border-bottom: 4px solid #9B00FF;
          margin-bottom: 18px;
          position: relative;
        }
        .y2k-banner::before {
          content: '✦ ✦ ✦';
          color: #00FFFF;
          position: absolute;
          left: 20px;
          top: 50%;
          transform: translateY(-50%);
        }
        .y2k-banner::after {
          content: '✦ ✦ ✦';
          color: #00FFFF;
          position: absolute;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
        }
      `}</style>

      {/* ── MASTHEAD ── */}
      <header style={{
        background: 'repeating-linear-gradient(45deg, #FFB3DE 0px, #FFB3DE 14px, #FFE4F7 14px, #FFE4F7 28px)',
        padding: '16px 28px',
      }}>
        <div style={{
          maxWidth: '960px', margin: '0 auto',
          background: '#FFFAF8', border: '4px solid #FF1493',
          padding: '20px 28px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>

            {/* FREE INSIDE — 72px cyan starburst, wiggle */}
            <div style={{
              width: '72px', height: '72px', flexShrink: 0,
              clipPath: STARBURST_16,
              background: '#00FFFF',
              animation: 'wiggle 0.45s ease-in-out infinite alternate',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', textAlign: 'center',
            }}>
              <div style={{ fontFamily: IMPACT, fontSize: '12px', color: '#111', lineHeight: 1.25, letterSpacing: '0.03em' }}>
                FREE<br />INSIDE
              </div>
            </div>

            {/* Masthead logo */}
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ letterSpacing: '-0.03em', marginBottom: '8px' }}>
                <span style={{
                  fontFamily: GEORGIA, fontWeight: 'bold', fontSize: '72px',
                  color: '#FF1493',
                  WebkitTextStroke: '2px #CC0066',
                  textShadow: '4px 4px 0 #9B00FF',
                  display: 'inline-block', lineHeight: 0.92,
                }}>REPLY</span>
                <span style={{
                  fontFamily: GEORGIA, fontWeight: 'bold', fontSize: '72px',
                  color: '#9B00FF',
                  textShadow: '4px 4px 0 #FF1493',
                  display: 'inline-block', lineHeight: 0.92, marginLeft: '10px',
                }}>GUY</span>
              </div>
              <div style={{ fontFamily: GEORGIA, fontStyle: 'italic', fontSize: '22px' }}>
                <span className="y2k-shimmer">weekly</span>
              </div>
            </div>

            {/* Right side: handle + logout stacked above SEND THE PAPS */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              {user && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                  <span style={{ fontFamily: IMPACT, fontSize: '10px', letterSpacing: '0.08em', color: '#9B00FF' }}>
                    @{user.x_handle}
                  </span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                      background: 'transparent', color: '#aaa',
                      border: '1px solid #ddd',
                      fontFamily: IMPACT, fontSize: '8px', letterSpacing: '0.14em',
                      padding: '2px 8px',
                      cursor: 'pointer',
                    }}
                  >
                    LOG OUT
                  </button>
                </div>
              )}

              {/* SEND THE PAPS — 82px yellow starburst button, pulse */}
              <button
                type="button"
                onClick={handleRunScout}
                disabled={scouting}
                style={{
                  width: '82px', height: '82px',
                  clipPath: STARBURST_16,
                  background: '#FFD700',
                  animation: 'pulse 1.2s ease-in-out infinite alternate',
                  border: 'none',
                  cursor: scouting ? 'not-allowed' : 'pointer',
                  opacity: scouting ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', textAlign: 'center', padding: 0,
                }}
              >
                {scouting
                  ? <Spinner className="h-4 w-4" />
                  : <div style={{ fontFamily: IMPACT, fontSize: '9px', letterSpacing: '0.05em', color: '#111', lineHeight: 1.35 }}>
                      📸<br />SEND<br />THE<br />PAPS
                    </div>
                }
              </button>
            </div>
          </div>
        </div>
      </header>

      <StripeDivider />

      {/* ── NAV STRIP ── */}
      <div style={{ background: '#FFE4F7', padding: '7px 28px', textAlign: 'center' }}>
        <span style={{ fontFamily: IMPACT, fontSize: '9px', letterSpacing: '0.26em', color: '#9B00FF' }}>
          CELEB NEWS &nbsp;•&nbsp; REAL LIFE &nbsp;•&nbsp; DRAMA &nbsp;•&nbsp; SHOWBIZ &nbsp;•&nbsp; INSIDER &nbsp;•&nbsp; HOT TAKES
        </span>
      </div>

      <StripeDivider />

      {/* ── TICKER — sticky ── */}
      <div style={{
        background: '#FF1493',
        borderTop: '4px solid #FFD700',
        borderBottom: '4px solid #00FFFF',
        height: '36px',
        display: 'flex', alignItems: 'center',
        overflow: 'hidden',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        <div style={{
          flexShrink: 0,
          background: 'rgba(0,0,0,0.18)', color: '#00FFFF',
          padding: '0 16px', height: '100%',
          display: 'flex', alignItems: 'center',
          fontFamily: IMPACT, fontSize: '13px', letterSpacing: '0.14em',
        }}>
          OMG!!!
        </div>
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div style={{
            display: 'inline-block', whiteSpace: 'nowrap',
            animation: 'ticker 38s linear infinite',
          }}>
            <span style={{ fontFamily: IMPACT, fontSize: '11px', letterSpacing: '0.07em', color: '#FFD700', paddingLeft: '28px' }}>
              {TICKER_TEXT}
            </span>
          </div>
        </div>
      </div>

      <StripeDivider />

      {/* ── STATS BAR ── */}
      <div style={{ background: '#1A001A', borderTop: '3px solid #00FFFF', padding: '12px 28px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', alignItems: 'stretch' }}>
          {stats.map(({ label, value, isHeat }, i) => (
            <div key={label} style={{
              flex: 1, textAlign: 'center', padding: '6px 0',
              borderRight: i < stats.length - 1 ? '2px solid #FF1493' : 'none',
            }}>
              <div style={{ fontFamily: IMPACT, fontSize: '9px', letterSpacing: '0.22em', color: '#666', marginBottom: '4px' }}>
                {label}
              </div>
              <div style={{ fontFamily: IMPACT, fontSize: '28px', color: isHeat ? '#FFD700' : '#00FFFF', lineHeight: 1 }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <StripeDivider />

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
            fontFamily: IMPACT, fontSize: '14px', letterSpacing: '0.1em', color: '#FF1493',
          }}>
            {error}
          </p>
        )}

        {!loading && !error && cards.length === 0 && (
          <p style={{
            textAlign: 'center', padding: '80px 0',
            fontFamily: IMPACT, fontSize: '13px', letterSpacing: '0.12em', color: '#9B00FF',
          }}>
            NO STORIES YET —{' '}
            <span style={{ color: '#FF1493' }}>📸 SEND THE PAPS</span>{' '}
            TO BREAK A STORY
          </p>
        )}

        {!loading && !error && pending.length > 0 && (
          <section>
            <div className="y2k-banner">
              ★&nbsp; HOT TAKES AWAITING YOUR VERDICT &nbsp;★
            </div>
            <CardGrid cards={pending} rankOffset={0} onAction={handleAction} />
          </section>
        )}

        {!loading && !error && done.length > 0 && (
          <section style={{ marginTop: pending.length > 0 ? '36px' : '0' }}>
            <div className="y2k-banner">
              ✓&nbsp; FILED &amp; ARCHIVED &nbsp;·&nbsp; {done.length} STORIES
            </div>
            <CardGrid cards={done} rankOffset={pending.length} onAction={handleAction} />
          </section>
        )}
      </main>
    </div>
  )
}
