import { useEffect, useState } from 'react'

export type UserProfile = {
  nom: string
  prenom: string
  pseudo: string
  age: string
  aiStyle: string
}

const KEY = 'mycloud-profile-v1'

const defaultProfile: UserProfile = {
  nom: '',
  prenom: '',
  pseudo: '',
  age: '',
  aiStyle: '',
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) return { ...defaultProfile, ...JSON.parse(raw) }
    } catch { /* ignore */ }
    return defaultProfile
  })

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(profile))
  }, [profile])

  const updateProfile = (patch: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...patch }))
  }

  return { profile, updateProfile }
}
