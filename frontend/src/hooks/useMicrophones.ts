import { useEffect, useState } from 'react'

export interface MicDevice {
  deviceId: string
  label: string
}

const STORAGE_KEY = 'avito_mic'

/**
 * Список доступных микрофонов + выбранный (сохраняется в localStorage).
 * Запрашивает доступ к микрофону, чтобы получить человекочитаемые названия устройств
 * (например, «MacBook Pro Microphone» / «iPhone Microphone»).
 */
export function useMicrophones() {
  const [devices, setDevices] = useState<MicDevice[]>([])
  const [selectedId, setSelectedIdState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? '',
  )

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const probe = await navigator.mediaDevices.getUserMedia({ audio: true })
        probe.getTracks().forEach((t) => t.stop())
        const all = await navigator.mediaDevices.enumerateDevices()
        if (cancelled) return
        const mics: MicDevice[] = all
          .filter((d) => d.kind === 'audioinput' && d.deviceId)
          .map((d) => ({
            deviceId: d.deviceId,
            label: d.label || `Микрофон ${d.deviceId.slice(0, 5)}`,
          }))
        setDevices(mics)
      } catch {
        // нет доступа к микрофону — список останется пустым
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const setSelectedId = (id: string) => {
    setSelectedIdState(id)
    localStorage.setItem(STORAGE_KEY, id)
  }

  return { devices, selectedId, setSelectedId }
}
