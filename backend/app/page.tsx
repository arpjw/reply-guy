'use client'
import { useState, useEffect } from 'react'
import { createRun, getRuns, getRunPosts, updatePostStatus, Post, Run } from '@/lib/api'

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 60 ? '#c8f135' : score >= 40 ? '#f1a535' : '#666'
  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      color,
      border: `1px solid ${color}`,
      padding: '2px 7px',
      borderRadius: '3px',
      letterSpacing: '0.05em'
    }}>
      {score}
    </span>
  )
}

function ReplyCard({ post, onAction }: { post: Post; onAction: (id: number, status: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(post.draft_reply)
  const isDone = post.status !== 'pending'

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: '6px',
      overflow: 'hidden',
      opacity: isDone ? 0.45 : 1,
      transition: 'opacity 0.2s',
      background: 'var(--surface)',
    }}>
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '12px'
      }}>
        <div>
          <span style={{ fontWeight: 500, fontSize: '13px' }}>{post.handle}</span>
          <span style={{ color: 'var(--muted)', fontSize: '12px', marginLeft: '8px', fontFamily: 'var(--font-mono)' }}>
            {post.likes?.toLocaleString()} likes · {post.views?.toLocaleString()} views
          </span>
        </div>
        <ScoreBadge score={post.score} />
      </div>

      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6 }}>
        {post.text}
      </div>

      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
        <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--muted2)', letterSpacing: '0.08em', marginBottom: '8px' }}>
          DRAFT REPLY
        </div>
        {editing ? (
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg)',
              border: '1px solid var(--border2)',
              borderRadius: '4px',
              color: 'var(--text)',
              fontFamily: 'var(--font-sans)',
              fontSize: '13px',
              padding: '10px',
              resize: 'vertical',
              minHeight: '80px',
              lineHeight: 1.6,
              outline: 'none',
            }}
          />
        ) : (
          <div style={{ fontSize: '13px', lineHeight: 1.7, color: 'var(--text)' }}>{draft}</div>
        )}
        <div style={{ marginTop: '6px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: draft.length > 280 ? 'var(--red)' : 'var(--muted)' }}>
          {draft.length}/280
        </div>
      </div>

      <div style={{ padding: '10px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        {isDone ? (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.05em' }}>
            {post.status.toUpperCase()}
          </span>
        ) : editing ? (
          <>
            <button onClick={() => { onAction(post.id, 'sent'); setEditing(false) }} style={btnStyle('accent')}>Send edited</button>
            <button onClick={() => setEditing(false)} style={btnStyle('ghost')}>Cancel</button>
          </>
        ) : (
          <>
            <button onClick={() => onAction(post.id, 'sent')} style={btnStyle('accent')}>Send</button>
            <button onClick={() => setEditing(true)} style={btnStyle('ghost')}>Edit</button>
            <button onClick={() => onAction(post.id, 'skipped')} style={btnStyle('ghost')}>Skip</button>
          </>
        )}
      </div>
    </div>
  )
}

function btnStyle(variant: 'accent' | 'ghost') {
  return {
    padding: '5px 14px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    border: variant === 'accent' ? '1px solid var(--accent)' : '1px solid var(--border2)',
    background: variant === 'accent' ? 'var(--accent-dim)' : 'transparent',
    color: variant === 'accent' ? 'var(--accent)' : 'var(--muted)',
    fontFamily: 'var(--font-sans)',
    transition: 'all 0.15s',
  } as React.CSSProperties
}

export default function Dashboard() {
  const [runs, setRuns] = useState<Run[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [activeRun, setActiveRun] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getRuns().then(r => {
      setRuns(r)
      if (r.length > 0) {
        setActiveRun(r[0].id)
        getRunPosts(r[0].id).then(setPosts)
      }
    })
  }, [])

  async function handleRun() {
    setRunning(true)
    const { run_id } = await createRun()
    setActiveRun(run_id)
    setPosts([])
    const poll = setInterval(async () => {
      const p = await getRunPosts(run_id)
      if (p.length > 0) {
        setPosts(p)
        setRunning(false)
        clearInterval(poll)
        getRuns().then(setRuns)
      }
    }, 3000)
  }

  async function handleAction(postId: number, status: string) {
    await updatePostStatus(postId, status)
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: status as Post['status'] } : p))
  }

  const pending = posts.filter(p => p.status === 'pending')
  const done = posts.filter(p => p.status !== 'pending')

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '48px 24px' }}>
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.1em', marginBottom: '6px' }}>
              REPLY GUY
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 500, letterSpacing: '-0.02em' }}>
              Today's drafts
            </h1>
          </div>
          <button
            onClick={handleRun}
            disabled={running}
            style={{
              ...btnStyle('accent'),
              padding: '8px 20px',
              fontSize: '13px',
              opacity: running ? 0.6 : 1,
            }}
          >
            {running ? 'Scouting...' : 'Run now'}
          </button>
        </div>

        {runs.length > 0 && (
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {runs.slice(0, 5).map(r => (
              <button
                key={r.id}
                onClick={async () => {
                  setActiveRun(r.id)
                  setLoading(true)
                  const p = await getRunPosts(r.id)
                  setPosts(p)
                  setLoading(false)
                }}
                style={{
                  ...btnStyle(activeRun === r.id ? 'accent' : 'ghost'),
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  padding: '3px 10px',
                }}
              >
                #{r.id} · {r.status}
              </button>
            ))}
          </div>
        )}
      </div>

      {running && (
        <div style={{
          border: '1px solid var(--border)',
          borderRadius: '6px',
          padding: '24px',
          textAlign: 'center',
          color: 'var(--muted)',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          letterSpacing: '0.05em',
          marginBottom: '24px',
        }}>
          scouting feed · extracting posts · drafting replies...
        </div>
      )}

      {!running && posts.length === 0 && (
        <div style={{
          border: '1px solid var(--border)',
          borderRadius: '6px',
          padding: '48px 24px',
          textAlign: 'center',
          color: 'var(--muted)',
        }}>
          <div style={{ fontSize: '13px', marginBottom: '6px' }}>No drafts yet</div>
          <div style={{ fontSize: '12px', color: 'var(--muted2)' }}>Hit "Run now" to scout your feed</div>
        </div>
      )}

      {pending.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted2)', letterSpacing: '0.08em', marginBottom: '12px' }}>
            PENDING · {pending.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pending.map(p => <ReplyCard key={p.id} post={p} onAction={handleAction} />)}
          </div>
        </div>
      )}

      {done.length > 0 && (
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted2)', letterSpacing: '0.08em', marginBottom: '12px' }}>
            DONE · {done.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {done.map(p => <ReplyCard key={p.id} post={p} onAction={handleAction} />)}
          </div>
        </div>
      )}
    </div>
  )
}