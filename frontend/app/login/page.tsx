'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const IMPACT = "Impact, 'Arial Black', sans-serif"
const GEORGIA = 'Georgia, serif'

const STARBURST_16 = 'polygon(50% 0%,56% 30%,80% 10%,65% 35%,95% 30%,72% 50%,90% 75%,62% 62%,58% 92%,50% 68%,42% 92%,38% 62%,10% 75%,28% 50%,5% 30%,35% 35%,20% 10%,44% 30%)'

const STRIPE_BG = 'repeating-linear-gradient(90deg, #FF1493 0px, #FF1493 14px, #9B00FF 14px, #9B00FF 28px, #00FFFF 28px, #00FFFF 42px, #FFD700 42px, #FFD700 56px, #FF69B4 56px, #FF69B4 70px)'

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) return
    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { if (res.ok) router.replace('/') })
  }, [router])

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFE4F7', display: 'flex', flexDirection: 'column' }}>
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
      `}</style>

      {/* Stripe top */}
      <div style={{ height: '8px', background: STRIPE_BG }} />

      {/* Masthead */}
      <div style={{
        background: 'repeating-linear-gradient(45deg, #FFB3DE 0px, #FFB3DE 14px, #FFE4F7 14px, #FFE4F7 28px)',
        padding: '16px 28px',
      }}>
        <div style={{
          maxWidth: '600px', margin: '0 auto',
          background: '#FFFAF8', border: '4px solid #FF1493',
          padding: '20px 28px', textAlign: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
            <div style={{
              width: '56px', height: '56px', flexShrink: 0,
              clipPath: STARBURST_16,
              background: '#00FFFF',
              animation: 'wiggle 0.45s ease-in-out infinite alternate',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', textAlign: 'center',
            }}>
              <div style={{ fontFamily: IMPACT, fontSize: '10px', color: '#111', lineHeight: 1.25, letterSpacing: '0.03em' }}>
                FREE<br />INSIDE
              </div>
            </div>

            <div>
              <div style={{ letterSpacing: '-0.03em', marginBottom: '4px' }}>
                <span style={{
                  fontFamily: GEORGIA, fontWeight: 'bold', fontSize: '52px',
                  color: '#FF1493',
                  WebkitTextStroke: '2px #CC0066',
                  textShadow: '3px 3px 0 #9B00FF',
                  display: 'inline-block', lineHeight: 0.92,
                }}>REPLY</span>
                <span style={{
                  fontFamily: GEORGIA, fontWeight: 'bold', fontSize: '52px',
                  color: '#9B00FF',
                  textShadow: '3px 3px 0 #FF1493',
                  display: 'inline-block', lineHeight: 0.92, marginLeft: '8px',
                }}>GUY</span>
              </div>
              <div style={{ fontFamily: GEORGIA, fontStyle: 'italic', fontSize: '18px' }}>
                <span className="y2k-shimmer">weekly</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stripe divider */}
      <div style={{ height: '8px', background: STRIPE_BG }} />

      {/* Login card */}
      <div style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '48px 28px',
      }}>
        <div style={{
          background: '#FFFAF8',
          border: '4px solid #FF1493',
          outline: '2px dashed #FF69B4',
          outlineOffset: '3px',
          padding: '40px 48px',
          textAlign: 'center',
          maxWidth: '400px', width: '100%',
        }}>
          <div style={{
            fontFamily: IMPACT, fontSize: '9px', letterSpacing: '0.28em',
            color: '#9B00FF', marginBottom: '16px',
          }}>
            EXCLUSIVE ACCESS
          </div>

          <h1 style={{
            fontFamily: GEORGIA, fontWeight: 'bold',
            fontSize: '28px', color: '#111',
            textTransform: 'uppercase', letterSpacing: '-0.02em',
            margin: '0 0 8px', lineHeight: 1.1,
          }}>
            YOUR TIMELINE<br />AWAITS
          </h1>

          <p style={{
            fontFamily: GEORGIA, fontStyle: 'italic',
            fontSize: '13px', color: '#555',
            margin: '0 0 28px', lineHeight: 1.5,
          }}>
            Sign in with X to start crafting replies the internet deserves
          </p>

          <div style={{ height: '2px', background: STRIPE_BG, marginBottom: '28px' }} />

          <a
            href={`${API}/auth/twitter`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '10px',
              background: '#111', color: '#fff',
              border: '3px solid #111',
              fontFamily: IMPACT, fontSize: '13px', letterSpacing: '0.12em',
              padding: '14px 28px',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            SIGN IN WITH X
          </a>

          <div style={{
            marginTop: '20px',
            fontFamily: GEORGIA, fontStyle: 'italic',
            fontSize: '11px', color: '#aaa',
          }}>
            ★ for insiders only ★
          </div>
        </div>
      </div>

      {/* Stripe bottom */}
      <div style={{ height: '8px', background: STRIPE_BG }} />
    </div>
  )
}
