import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { useAuth } from './useAuth'

export type UserProfile = {
  nom: string
  prenom: string
  pseudo: string
  age: string
  aiStyle: string
  workspaceBase: string
  workspaceAccent: string
  workspaceGlow: string
  workspaceMotion: string
}

const KEY_PREFIX = 'mycloud-profile-v1'

const defaultProfile: UserProfile = {
  nom: '',
  prenom: '',
  pseudo: '',
  age: '',
  aiStyle: '',
  workspaceBase: '#060606',
  workspaceAccent: '#8be7ff',
  workspaceGlow: '#b7a6ff',
  workspaceMotion: 'calm',
}

export function useUserProfile() {
  const { user } = useAuth()
  const storageKey = useMemo(
    () => `${KEY_PREFIX}:${user?.id ?? 'anonymous'}`,
    [user?.id],
  )
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const raw = localStorage.getItem(`${KEY_PREFIX}:anonymous`)
      if (raw) return { ...defaultProfile, ...JSON.parse(raw) }
    } catch { /* ignore */ }
    return defaultProfile
  })

  useEffect(() => {
    let cancelled = false

    try {
      const cached = localStorage.getItem(storageKey)
      setProfile(cached ? { ...defaultProfile, ...JSON.parse(cached) } : defaultProfile)
    } catch {
      setProfile(defaultProfile)
    }

    if (!user) return

    apiFetch<Partial<UserProfile>>('/users/profile')
      .then((serverProfile) => {
        if (cancelled) return
        setProfile((current) => ({
          ...current,
          nom: serverProfile.nom ?? '',
          prenom: serverProfile.prenom ?? '',
          pseudo: serverProfile.pseudo ?? '',
          age: serverProfile.age ?? '',
          aiStyle: serverProfile.aiStyle ?? '',
          workspaceBase: serverProfile.workspaceBase ?? defaultProfile.workspaceBase,
          workspaceAccent: serverProfile.workspaceAccent ?? defaultProfile.workspaceAccent,
          workspaceGlow: serverProfile.workspaceGlow ?? defaultProfile.workspaceGlow,
          workspaceMotion: serverProfile.workspaceMotion ?? defaultProfile.workspaceMotion,
        }))
      })
      .catch(() => {
        /* Keep the cached profile if the network is temporarily unavailable. */
      })

    return () => {
      cancelled = true
    }
  }, [storageKey, user])

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(profile))
  }, [profile, storageKey])

  const updateProfile = (patch: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...patch }))
    if (user) {
      apiFetch('/users/profile', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }).catch(() => {
        /* Profile remains cached locally and will be retried on the next save. */
      })
    }
  }

  const previewProfile = (patch: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...patch }))
  }

  return { profile, updateProfile, previewProfile }
}
