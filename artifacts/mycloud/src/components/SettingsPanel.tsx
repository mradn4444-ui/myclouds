import { useRef, useState } from 'react'
import { X, User, Sparkles, Camera, Check } from 'lucide-react'
import type { UserProfile } from '../hooks/useUserProfile'

type Tab = 'profil' | 'assistant'

type Props = {
  open: boolean
  onClose: () => void
  profile: UserProfile
  onSave: (p: Partial<UserProfile>) => void
}

function Initials({ prenom, nom }: { prenom: string; nom: string }) {
  const a = prenom.charAt(0).toUpperCase()
  const b = nom.charAt(0).toUpperCase()
  return (
    <span style={{ fontSize: '22px', fontWeight: 300, letterSpacing: '0.08em', color: '#666', fontFamily: 'ui-monospace, monospace' }}>
      {a || b ? `${a}${b}` : '—'}
    </span>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{
        fontSize: '9px',
        letterSpacing: '0.18em',
        fontWeight: 600,
        color: focused ? '#555' : '#2e2e2e',
        fontFamily: 'ui-monospace, monospace',
        transition: 'color 0.2s',
        userSelect: 'none',
      }}>
        {label.toUpperCase()}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            borderBottom: `1px solid ${focused ? '#3a3a3a' : '#1a1a1a'}`,
            color: '#d4d4d4',
            fontSize: '13px',
            padding: '6px 0 10px',
            outline: 'none',
            transition: 'border-color 0.25s',
            fontFamily: 'inherit',
          }}
        />
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '1px',
          background: '#fff',
          width: focused ? '100%' : '0%',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }} />
      </div>
    </div>
  )
}

export default function SettingsPanel({ open, onClose, profile, onSave }: Props) {
  const [tab, setTab] = useState<Tab>('profil')
  const [local, setLocal] = useState<UserProfile>(profile)
  const [saved, setSaved] = useState(false)
  const [avatar, setAvatar] = useState<string | undefined>(undefined)
  const avatarRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  const set = (key: keyof UserProfile, val: string) =>
    setLocal(prev => ({ ...prev, [key]: val }))

  const save = () => {
    onSave({ ...local, ...(avatar ? { avatar } : {}) })
    setSaved(true)
    setTimeout(() => { setSaved(false) }, 2200)
  }

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setAvatar(url)
    e.target.value = ''
  }

  const displayName = [local.prenom, local.nom].filter(Boolean).join(' ') || local.pseudo || 'Utilisateur'

  const tabs: { id: Tab; label: string; icon: typeof User }[] = [
    { id: 'profil', label: 'Profil', icon: User },
    { id: 'assistant', label: 'Assistant', icon: Sparkles },
  ]

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '540px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#070707',
          border: '1px solid #161616',
          boxShadow: '0 0 0 1px #0f0f0f, 0 40px 80px rgba(0,0,0,0.8)',
          overflow: 'hidden',
        }}
      >
        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 0',
          borderBottom: '1px solid #111',
          paddingBottom: '0',
        }}>
          <div style={{ display: 'flex', gap: 0 }}>
            {tabs.map(t => {
              const Icon = t.icon
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '7px',
                    padding: '10px 18px 12px',
                    background: 'transparent', border: 'none',
                    fontSize: '12px',
                    fontWeight: active ? 500 : 400,
                    color: active ? '#e0e0e0' : '#333',
                    cursor: 'pointer',
                    borderBottom: active ? '1px solid #fff' : '1px solid transparent',
                    transition: 'color 0.15s',
                    letterSpacing: '0.02em',
                    marginBottom: '-1px',
                  }}
                >
                  <Icon style={{ width: '13px', height: '13px' }} />
                  {t.label}
                </button>
              )
            })}
          </div>
          <button
            onClick={onClose}
            style={{
              width: '28px', height: '28px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent',
              border: '1px solid #1a1a1a',
              color: '#333',
              cursor: 'pointer',
              transition: 'all 0.15s',
              marginBottom: '12px',
            }}
            onMouseOver={e => { e.currentTarget.style.color = '#aaa'; e.currentTarget.style.borderColor = '#333' }}
            onMouseOut={e => { e.currentTarget.style.color = '#333'; e.currentTarget.style.borderColor = '#1a1a1a' }}
          >
            <X style={{ width: '13px', height: '13px' }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '36px 32px' }}>

          {tab === 'profil' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* Avatar + name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div
                    onClick={() => avatarRef.current?.click()}
                    style={{
                      width: '72px', height: '72px',
                      borderRadius: '50%',
                      border: '1px solid #1e1e1e',
                      background: '#0d0d0d',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                    className="avatar-hover-target"
                  >
                    {avatar ? (
                      <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(80%)' }} />
                    ) : (
                      <Initials prenom={local.prenom} nom={local.nom} />
                    )}
                    <div className="avatar-overlay" style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(0,0,0,0.6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: 0, transition: 'opacity 0.2s',
                      borderRadius: '50%',
                    }}>
                      <Camera style={{ width: '18px', height: '18px', color: '#888' }} />
                    </div>
                  </div>
                  <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarFile} />
                </div>
                <div>
                  <p style={{ fontSize: '18px', fontWeight: 300, color: '#ccc', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                    {displayName}
                  </p>
                  {local.pseudo && (
                    <p style={{ fontSize: '11px', color: '#2e2e2e', marginTop: '4px', letterSpacing: '0.08em', fontFamily: 'ui-monospace, monospace' }}>
                      @{local.pseudo}
                    </p>
                  )}
                </div>
              </div>

              {/* Fields grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px 32px' }}>
                <Field label="Prénom" value={local.prenom} onChange={v => set('prenom', v)} placeholder="Ton prénom" />
                <Field label="Nom" value={local.nom} onChange={v => set('nom', v)} placeholder="Ton nom" />
                <Field label="Pseudo" value={local.pseudo} onChange={v => set('pseudo', v)} placeholder="@pseudo" />
                <Field label="Âge" value={local.age} onChange={v => set('age', v)} type="number" placeholder="—" />
              </div>
            </div>
          )}

          {tab === 'assistant' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              <div>
                <p style={{ fontSize: '18px', fontWeight: 300, color: '#ccc', letterSpacing: '-0.01em', marginBottom: '8px' }}>
                  Style de l'assistant
                </p>
                <p style={{ fontSize: '12px', color: '#2e2e2e', lineHeight: 1.7, letterSpacing: '0.02em' }}>
                  Définit la personnalité et le ton de l'IA. Elle intègre ce style dans chaque réponse.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{
                  fontSize: '9px', letterSpacing: '0.18em', fontWeight: 600,
                  color: '#2e2e2e', fontFamily: 'ui-monospace, monospace',
                }}>
                  PROMPT PERSONNALISÉ
                </label>
                <textarea
                  value={local.aiStyle}
                  onChange={e => set('aiStyle', e.target.value)}
                  placeholder={'Ex : "Parle avec un style street, sois direct et court, tutoie toujours."'}
                  rows={5}
                  style={{
                    width: '100%',
                    background: '#0b0b0b',
                    border: '1px solid #1a1a1a',
                    color: '#c0c0c0',
                    fontSize: '12px',
                    padding: '14px 16px',
                    resize: 'vertical',
                    outline: 'none',
                    lineHeight: '1.8',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#2e2e2e' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#1a1a1a' }}
                />
              </div>

              {/* Examples */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '9px', letterSpacing: '0.18em', color: '#222', fontFamily: 'ui-monospace, monospace', fontWeight: 600 }}>
                  EXEMPLES
                </p>
                {[
                  'Parle comme un ami proche, décontracté et direct',
                  'Sois très concis, maximum 3 phrases par réponse',
                  'Utilise le style street, fais court et punchy',
                  'Tutoie toujours, sois chaleureux et encourageant',
                ].map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => set('aiStyle', ex)}
                    style={{
                      textAlign: 'left',
                      background: 'transparent',
                      border: '1px solid #141414',
                      color: '#333',
                      fontSize: '11px',
                      padding: '9px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      letterSpacing: '0.01em',
                    }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = '#2e2e2e'; e.currentTarget.style.color = '#888' }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = '#141414'; e.currentTarget.style.color = '#333' }}
                  >
                    "{ex}"
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 32px 24px',
          borderTop: '1px solid #111',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none',
              color: '#2a2a2a', fontSize: '11px', cursor: 'pointer',
              letterSpacing: '0.06em',
              transition: 'color 0.15s',
            }}
            onMouseOver={e => { e.currentTarget.style.color = '#666' }}
            onMouseOut={e => { e.currentTarget.style.color = '#2a2a2a' }}
          >
            Fermer
          </button>
          <button
            onClick={save}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 28px',
              background: saved ? '#111' : '#fff',
              border: saved ? '1px solid #222' : '1px solid #fff',
              color: saved ? '#4ade80' : '#000',
              fontSize: '12px',
              fontWeight: 500,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {saved ? (
              <><Check style={{ width: '13px', height: '13px' }} /> Sauvegardé</>
            ) : (
              'Sauvegarder'
            )}
          </button>
        </div>
      </div>

      <style>{`
        .avatar-hover-target:hover .avatar-overlay { opacity: 1 !important; }
      `}</style>
    </div>
  )
}
