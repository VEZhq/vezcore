'use client'

import { useEffect, useRef } from 'react'

export function NeuralBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const nodes: { x: number; y: number; vx: number; vy: number; pulse: number }[] = []
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const nodeCount = prefersReducedMotion ? 0 : window.innerWidth < 768 ? 24 : 42

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.08,
        vy: (Math.random() - 0.5) * 0.08,
        pulse: Math.random() * Math.PI * 2,
      })
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const isDark = document.documentElement.classList.contains('dark')
      const lineColor = isDark ? '224, 218, 208' : '68, 64, 58'
      const pulseColor = isDark ? '238, 202, 168' : '122, 82, 45'
      const lineAlpha = isDark ? 0.052 : 0.065

      nodes.forEach((node) => {
        node.x += node.vx
        node.y += node.vy
        node.pulse += 0.01

        if (node.x < 0 || node.x > canvas.width) node.vx *= -1
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1
      })

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 230) {
            const alpha = (1 - dist / 230) * lineAlpha
            ctx.beginPath()
            ctx.strokeStyle = `rgba(${lineColor}, ${alpha})`
            ctx.lineWidth = isDark ? 0.65 : 0.75
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()

            if ((i + j) % 9 === 0) {
              const progress = (Math.sin(nodes[i].pulse + j) + 1) / 2
              const sx = nodes[i].x + dx * -progress
              const sy = nodes[i].y + dy * -progress
              const ex = nodes[i].x + dx * -(Math.min(progress + 0.08, 1))
              const ey = nodes[i].y + dy * -(Math.min(progress + 0.08, 1))
              ctx.beginPath()
              ctx.strokeStyle = `rgba(${pulseColor}, ${alpha * 1.45})`
              ctx.lineWidth = isDark ? 0.9 : 1
              ctx.moveTo(sx, sy)
              ctx.lineTo(ex, ey)
              ctx.stroke()
            }
          }
        }
      }

      if (!prefersReducedMotion) {
        animationId = requestAnimationFrame(animate)
      }
    }

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none opacity-70 light:opacity-50"
      style={{ zIndex: 0 }}
    />
  )
}
