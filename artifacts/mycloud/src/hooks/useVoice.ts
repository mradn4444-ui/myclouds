import { useCallback, useEffect, useRef, useState } from 'react'

interface UseVoiceOptions {
  onResult: (transcript: string) => void
  onEnd?: () => void
  lang?: string
}

export function useVoice({ onResult, onEnd, lang = 'fr-FR' }: UseVoiceOptions) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition
    setSupported(!!SpeechRecognition)
  }, [])

  const start = useCallback(() => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition
    if (!SpeechRecognition) return

    const rec = new SpeechRecognition()
    rec.lang = lang
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.continuous = false

    rec.onstart  = () => setListening(true)
    rec.onend    = () => { setListening(false); onEnd?.() }
    rec.onerror  = () => setListening(false)
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0]?.[0]?.transcript ?? ''
      if (transcript.trim()) onResult(transcript.trim())
    }

    recognitionRef.current = rec
    try { rec.start() } catch { /* already started */ }
  }, [lang, onResult, onEnd])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const toggle = useCallback(() => {
    if (listening) stop()
    else start()
  }, [listening, start, stop])

  return { listening, supported, start, stop, toggle }
}

let currentUtterance: SpeechSynthesisUtterance | null = null

export function speak(text: string, lang = 'fr-FR') {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const clean = text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .slice(0, 500)
  const utterance = new SpeechSynthesisUtterance(clean)
  utterance.lang = lang
  utterance.rate = 1.05
  utterance.pitch = 1
  const voices = window.speechSynthesis.getVoices()
  const frVoice = voices.find(v => v.lang.startsWith('fr'))
  if (frVoice) utterance.voice = frVoice
  currentUtterance = utterance
  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking() {
  window.speechSynthesis?.cancel()
  currentUtterance = null
}

export function isSpeaking() {
  return window.speechSynthesis?.speaking ?? false
}
