import { useEffect, useState } from 'react'

export interface MicDevice {
  deviceId: string
  label: string
}

const STORAGE_KEY = 'avito_mic'

/**
 * Список доступных микрофонов + выбранный (сохраняется в localStorage).
 * Безопасен в не-secure-контексте (обычный HTTP): navigator.mediaDevices там
 * отсутствует, поэтому все обращения защищены.
 */
export function useMicrophones() {
  const [devices, setDevices] = useState<MicDevice[]>([])
  const [selectedId, setSelectedIdState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? '',
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
    localStorage.setItem(STORAGE_KEY, id)
  }

  return { devices, selectedId, setSelectedId, refresh }
}
