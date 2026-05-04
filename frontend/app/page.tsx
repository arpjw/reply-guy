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

function ScoreBadge({ score }: { score: number }) {
  const green = score >= 9
  const yellow = score >= 7 && score < 9
  return (
    <span className={[
      'shrink-0 font-mono text-[11px] px-2 py-0.5 rounded border tracking-wide',
      green  ? 'text-green-400  border-green-700  bg-green-950/50'  : '',
      yellow ? 'text-yellow-400 border-yellow-700 bg-yellow-950/50' : '',
      !green && !yellow ? 'text-white/30 border-white/10' : '',
    ].join(' ')}>
      {score % 1 === 0 ? score : score.toFixed(1)}
    </span>
  )
}

function PostCard({
  card,
  onAction,
}: {
  card: Card
  onAction: (draftId: number, action: 'approve' | 'edit-approve' | 'skip', text: string) => Promise<void>
}) {
  const alreadyDone = card.draft.status !== 'pending'
  const [text, setText] = useState(card.draft.draft_text)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(alreadyDone)
  const [doneLabel, setDoneLabel] = useState<string>(() => {
    if (card.draft.status === 'approved' || card.draft.status === 'sent') return 'APPROVED'
    if (card.draft.status === 'rejected') return 'SKIPPED'
    return ''
  })

  async function handle(action: 'approve' | 'edit-approve' | 'skip') {
    setBusy(true)
    await onAction(card.draft.id, action, text)
    setDoneLabel(action === 'skip' ? 'SKIPPED' : 'APPROVED')
    setDone(true)
    setBusy(false)
  }

  return (
    <article className={`rounded-lg border border-white/[0.08] overflow-hidden transition-opacity duration-300 ${done ? 'opacity-40' : ''}`}>
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-white/[0.08]">
        <span className="text-sm font-medium text-white truncate">{card.author_handle}</span>
        <ScoreBadge score={card.score} />
      </div>

      <div className="px-4 py-3 border-b border-white/[0.08] text-[13px] text-white/50 leading-relaxed">
        {card.content}
      </div>

      <div className="px-4 py-3 border-b border-white/[0.08] bg-white/[0.015]">
        <div className="font-mono text-[10px] tracking-[0.12em] text-white/25 mb-2">DRAFT REPLY</div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          disabled={done || busy}
          rows={3}
          className="w-full bg-black/50 border border-white/[0.08] rounded text-[13px] text-white/85 font-mono p-2.5 resize-y leading-relaxed outline-none focus:border-white/20 transition-colors disabled:opacity-50 placeholder-white/20"
        />
        <div className={`mt-1 font-mono text-[11px] ${text.length > 280 ? 'text-red-400' : 'text-white/25'}`}>
          {text.length}/280
        </div>
      </div>

      <div className="px-4 py-2.5 flex items-center gap-2">
        {done ? (
          <span className="font-mono text-[11px] tracking-widest text-white/30">{doneLabel}</span>
        ) : (
          <>
            <button
              onClick={() => handle('approve')}
              disabled={busy}
              className="px-3.5 py-1.5 text-xs font-medium rounded border border-green-700 bg-green-950/50 text-green-400 hover:bg-green-900/60 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Approve
            </button>
            <button
              onClick={() => handle('edit-approve')}
              disabled={busy}
              className="px-3.5 py-1.5 text-xs font-medium rounded border border-white/[0.15] text-white/60 hover:border-white/25 hover:text-white/80 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Edit + Approve
            </button>
            <button
              onClick={() => handle('skip')}
              disabled={busy}
              className="px-3.5 py-1.5 text-xs font-medium rounded border border-white/[0.08] text-white/35 hover:border-white/[0.15] hover:text-white/50 transition-colors disabled:opacity-50 cursor-pointer ml-auto"
            >
              Skip
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

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white">
      <nav className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#0c0c0c]/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-mono text-[11px] tracking-[0.15em] text-white/30">REPLY GUY</span>
          <button
            onClick={handleRunScout}
            disabled={scouting}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded border border-white/[0.15] text-white/60 hover:border-white/25 hover:text-white/80 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {scouting && <Spinner />}
            {scouting ? 'Scouting...' : 'Run Scout'}
          </button>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-8">
        {loading && (
          <div className="flex justify-center py-20">
            <Spinner className="h-5 w-5 text-white/30" />
          </div>
        )}

        {!loading && error && (
          <p className="text-center py-20 text-sm text-red-400/60">{error}</p>
        )}

        {!loading && !error && cards.length === 0 && (
          <p className="text-center py-20 text-sm text-white/25">
            No drafts yet — hit{' '}
            <span className="font-mono text-white/40">Run Scout</span> to start
          </p>
        )}

        {!loading && !error && pending.length > 0 && (
          <section className="mb-10">
            <div className="font-mono text-[10px] tracking-[0.12em] text-white/25 mb-4">
              PENDING · {pending.length}
            </div>
            <div className="flex flex-col gap-3">
              {pending.map(c => (
                <PostCard key={c.id} card={c} onAction={handleAction} />
              ))}
            </div>
          </section>
        )}

        {!loading && !error && done.length > 0 && (
          <section>
            <div className="font-mono text-[10px] tracking-[0.12em] text-white/25 mb-4">
              DONE · {done.length}
            </div>
            <div className="flex flex-col gap-3">
              {done.map(c => (
                <PostCard key={c.id} card={c} onAction={handleAction} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
