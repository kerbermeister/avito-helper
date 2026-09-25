import { useEffect, useState } from 'react'

export interface MicDevice {
  deviceId: string
  label: string
}

const STORAGE_KEY = 'avito_mic'

/**
 * Список доступных микрофонов + выбранный (сохраняется в localStorage).
 * НЕ запрашивает доступ к микрофону при загрузке — чтобы не включать микрофон
 * просто от открытия формы. Названия устройств появляются после первого
 * реального использования надиктовки (когда браузер выдаёт разрешение).
 */
export function useMicrophones() {
  const [devices, setDevices] = useState<MicDevice[]>([])
  const [selectedId, setSelectedIdState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? '',
  )

  const refresh = async () => {
    try {
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
    navigator.mediaDevices.addEventListener?.('devicechange', onChange)
    return () => navigator.mediaDevices.removeEventListener?.('devicechange', onChange)
  }, [])

  const setSelectedId = (id: string) => {
    setSelectedIdState(id)
    localStorage.setItem(STORAGE_KEY, id)
  }

  return { devices, selectedId, setSelectedId, refresh }
}
