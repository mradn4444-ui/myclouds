import { useState } from 'react'
import { X, User, Sparkles, Check } from 'lucide-react'
import type { UserProfile } from '../hooks/useUserProfile'

type Props = {
  open: boolean
  onClose: () => void
  profile: UserProfile
  onSave: (p: Partial<UserProfile>) => void
}

export default function SettingsPanel({ open, onClose, profile, onSave }: Props) {
  const [local, setLocal] = useState<UserProfile>(profile)
  const [saved, setSaved] = useState(false)

  const handleOpen = () => {
    setLocal(profile)
    setSaved(false)
  }

  const set = (key: keyof UserProfile, val: string) =>
    setLocal(prev => ({ ...prev, [key]: val }))

  const save = () => {
    onSave(local)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-[440px] bg-[#0a0a0a] border border-neutral-800 shadow-2xl flex flex-col max-h-[90vh]" onAnimationStart={handleOpen}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-800/60">
          <div>
            <h2 className="text-sm font-semibold text-white tracking-wide">Paramètres</h2>
            <p className="text-[11px] text-neutral-500 mt-0.5">Profil & assistant IA</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center border border-neutral-800 text-neutral-500 hover:text-white hover:border-neutral-600 transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <User className="w-3.5 h-3.5 text-neutral-500" />
              <span className="text-[10px] font-semibold tracking-[0.15em] text-neutral-500 uppercase">Mon profil</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([
                ['prenom', 'Prénom'],
                ['nom', 'Nom'],
                ['pseudo', 'Pseudo'],
                ['age', 'Âge'],
              ] as [keyof UserProfile, string][]).map(([key, label]) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-neutral-500 font-medium tracking-wide">{label}</label>
                  <input
                    type={key === 'age' ? 'number' : 'text'}
                    value={local[key]}
                    onChange={e => set(key, e.target.value)}
                    placeholder={label}
                    className="bg-neutral-900 border border-neutral-800 text-white text-xs px-3 py-2.5 focus:outline-none focus:border-neutral-600 transition-colors placeholder:text-neutral-700"
                  />
                </div>
              ))}
            </div>
          </section>

          <div className="border-t border-neutral-800/60" />

          <section>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-neutral-500" />
              <span className="text-[10px] font-semibold tracking-[0.15em] text-neutral-500 uppercase">Style de l'assistant</span>
            </div>
            <p className="text-[11px] text-neutral-500 mb-3 leading-relaxed">
              Donne un style à ton IA. Elle s'inspirera de ce prompt à chaque réponse.
            </p>
            <textarea
              value={local.aiStyle}
              onChange={e => set('aiStyle', e.target.value)}
              placeholder={`Ex : "Parle avec un style street, utilise des expressions familières mais reste clair et utile."`}
              rows={4}
              className="w-full bg-neutral-900 border border-neutral-800 text-white text-xs px-3 py-2.5 resize-none focus:outline-none focus:border-neutral-600 transition-colors placeholder:text-neutral-700 leading-relaxed"
            />
            <p className="text-[10px] text-neutral-600 mt-2">
              Exemples : "parle comme un ami", "sois très concis", "tutoie-moi toujours"
            </p>
          </section>
        </div>

        <div className="px-6 py-4 border-t border-neutral-800/60 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-xs text-neutral-500 hover:text-white transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={save}
            className={`flex items-center gap-2 px-5 py-2 text-xs font-medium transition-all ${
              saved
                ? 'bg-neutral-800 text-green-400 border border-neutral-700'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            {saved ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Sauvegardé
              </>
            ) : (
              'Sauvegarder'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
