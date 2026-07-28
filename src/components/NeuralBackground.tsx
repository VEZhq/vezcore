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

    const nodes: { x: number; y: number; vx: number; vy: number; size: number; pulse: number }[] = []
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const nodeCount = prefersReducedMotion ? 0 : window.innerWidth < 768 ? 45 : 75

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        size: Math.random() * 1.5 + 0.5,
        pulse: Math.random() * Math.PI * 2,
      })
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const isDark = document.documentElement.classList.contains('dark')
      const lineColor = isDark ? '172, 194, 255' : '80, 96, 130'
      const nodeColor = isDark ? '186, 230, 255' : '54, 70, 102'
      const lineAlpha = isDark ? 0.08 : 0.1

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

          if (dist < 250) {
            const alpha = (1 - dist / 250) * lineAlpha
            ctx.beginPath()
            ctx.strokeStyle = `rgba(${lineColor}, ${alpha})`
            ctx.lineWidth = isDark ? 0.5 : 0.8
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
      }

      nodes.forEach((node) => {
        const pulseSize = node.size + Math.sin(node.pulse) * 0.3
        const alpha = 0.2 + Math.sin(node.pulse) * 0.1

        ctx.beginPath()
        ctx.arc(node.x, node.y, pulseSize, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${nodeColor}, ${alpha})`
        ctx.fill()
      })

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
      className="fixed inset-0 pointer-events-none opacity-80 light:opacity-60"
      style={{ zIndex: 0 }}
    />
  )
}
