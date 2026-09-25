import { useEffect, useState } from 'react'

export interface MicDevice {
  deviceId: string
  label: string
}

const STORAGE_KEY = 'avito_mic'

/**
 * Список доступных микрофонов + выбранный.
 * Безопасен: navigator.mediaDevices может отсутствовать (HTTP без HTTPS),
 * localStorage тоже может быть недоступен (iOS Safari инкогнито).
 */
export function useMicrophones() {
  const [devices, setDevices] = useState<MicDevice[]>([])
  const [selectedId, setSelectedIdState] = useState<string>(
    () => {
      try { return localStorage.getItem(STORAGE_KEY) ?? '' } catch { return '' }
    },
  )

  const refresh = async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return
      const all = await navigator.mediaDevices.enumerateDevices()
      setDevices(
        all
          .filter((d) => d.kind === 'audioinput' && d.deviceId)
          .map((d) => ({
            deviceId: d.deviceId,
            label: d.label || `Микрофон ${d.deviceId.slice(0, 5)}`,
          })),
      )
    } catch {
      // нет доступа — список останется пустым
    }
  }

  useEffect(() => {
    void refresh()
    const onChange = () => void refresh()
    if (navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', onChange)
    }
    return () => {
      if (navigator.mediaDevices?.removeEventListener) {
        navigator.mediaDevices.removeEventListener('devicechange', onChange)
      }
    }
  }, [])

  const setSelectedId = (id: string) => {
    setSelectedIdState(id)
    try { localStorage.setItem(STORAGE_KEY, id) } catch { /* ignore */ }
  }

  return { devices, selectedId, setSelectedId, refresh }
}
