import { useEffect, useRef } from 'react'
import { cn } from '../lib/utils'

interface VoiceWaveProps {
  active: boolean
  readWaveform: () => Uint8Array | null
  className?: string
}

/**
 * Живая визуализация уровня микрофона — «осциллограф»: рисует текущую форму
 * сигнала. В тишине это ровная линия по центру, при речи — бегущая волна.
 */
export function VoiceWave({ active, readWaveform, className }: VoiceWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr))
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    const draw = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const mid = h / 2
      const half = Math.max(1, h / 2 - 2)

      ctx.clearRect(0, 0, w, h)

      const data = active ? readWaveform() : null

      // Градиентная линия
      const gradient = ctx.createLinearGradient(0, 0, w, 0)
      gradient.addColorStop(0, '#818cf8')
      gradient.addColorStop(0.5, '#6366f1')
      gradient.addColorStop(1, '#a855f7')

      ctx.beginPath()
      if (data && data.length > 0) {
        for (let i = 0; i < data.length; i++) {
          const x = (i / (data.length - 1)) * w
          const v = (data[i] - 128) / 128 // -1..1
          const y = mid + v * half
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
      } else {
        ctx.moveTo(0, mid)
        ctx.lineTo(w, mid)
      }
      ctx.lineWidth = 2
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.strokeStyle = gradient
      ctx.shadowColor = 'rgba(99, 102, 241, 0.7)'
      ctx.shadowBlur = 10
      ctx.stroke()

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [active, readWaveform])

  return <canvas ref={canvasRef} className={cn('h-14 w-full', className)} />
}
