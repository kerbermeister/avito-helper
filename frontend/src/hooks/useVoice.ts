import { useCallback, useRef, useState } from 'react'

/** Порог уровня: ниже него считаем, что речи не было (тишина/шум микрофона). */
const SILENCE_LEVEL = 0.06

/**
 * Хук записи с микрофона. `process` — функция, которая получает blob аудио и
 * возвращает результат (например, api.transcribeStream).
 *
 * `maxDurationSeconds` — ограничение длительности записи: по достижении запись
 * останавливается автоматически, а `remaining` показывает сколько секунд осталось.
 */
export function useVoice<T>(
  onResult: (result: T) => void | Promise<void>,
  process: (blob: Blob, filename: string) => Promise<T>,
  maxDurationSeconds?: number,
  minSpeechLevel = SILENCE_LEVEL,
) {
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [level, setLevel] = useState(0)
  const [remaining, setRemaining] = useState<number | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const waveformBufRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const rafRef = useRef<number | null>(null)
  const timerRef = useRef<number | null>(null)
  const stopRef = useRef<() => void>(() => {})
  const peakRef = useRef(0)

  const cleanup = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setRemaining(null)
    setLevel(0)
    if (audioContextRef.current) {
      void audioContextRef.current.close()
      audioContextRef.current = null
    }
    analyserRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    recorderRef.current = null
  }

  const stop = () => {
    const rec = recorderRef.current
    if (rec && rec.state !== 'inactive') {
      rec.stop()
    } else {
      // слишком быстрое нажатие — рекордер ещё не стартовал, просто освобождаем ресурсы
      cleanup()
      setRecording(false)
    }
  }
  stopRef.current = stop

  const start = async (deviceId?: string) => {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Микрофон недоступен — нужен HTTPS или localhost')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      })
      streamRef.current = stream

      // Живой индикатор уровня громкости
      const ctx = new AudioContext()
      audioContextRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser
      source.connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128
          sum += v * v
        }
        const lvl = Math.min(1, Math.sqrt(sum / data.length) * 4)
        if (lvl > peakRef.current) peakRef.current = lvl
        setLevel(lvl)
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)

      const mime = MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : ''
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream)
      recorderRef.current = recorder
      chunksRef.current = []
      peakRef.current = 0
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })
        // Пик > 0 значит анализатор реально видел звук. Если пик ненулевой, но ниже
        // порога — это тишина: в STT не отправляем, иначе модель выдумывает текст.
        const peak = peakRef.current
        const silent = peak > 0 && peak < minSpeechLevel
        cleanup()
        if (silent) {
          setError('Речь не распознана — попробуйте ещё раз')
          setRecording(false)
          return
        }
        try {
          const ext = recorder.mimeType?.includes('mp4') ? 'm4a' : 'webm'
          const result = await process(blob, `voice.${ext}`)
          await onResult(result)
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Не удалось распознать')
        }
        setRecording(false)
      }
      recorder.start()
      setRecording(true)

      // Авто-стоп по достижении лимита длительности
      if (maxDurationSeconds && maxDurationSeconds > 0) {
        const deadline = Date.now() + maxDurationSeconds * 1000
        setRemaining(maxDurationSeconds)
        timerRef.current = window.setInterval(() => {
          const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
          setRemaining(left)
          if (left <= 0) {
            if (timerRef.current !== null) {
              clearInterval(timerRef.current)
              timerRef.current = null
            }
            stopRef.current()
          }
        }, 250)
      }
    } catch {
      cleanup()
      setError('Нет доступа к микрофону')
      setRecording(false)
    }
  }

  /** Текущее окно сигнала (для визуализации). null — если запись не идёт. */
  const readWaveform = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser) return null
    if (!waveformBufRef.current || waveformBufRef.current.length !== analyser.fftSize) {
      waveformBufRef.current = new Uint8Array(analyser.fftSize)
    }
    analyser.getByteTimeDomainData(waveformBufRef.current)
    return waveformBufRef.current
  }, [])

  return { recording, error, level, remaining, readWaveform, start, stop }
}
