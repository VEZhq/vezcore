'use client'

import { useEffect, useRef, memo } from 'react'

function WhiteSphereCanvas() {
	const canvasRef = useRef<HTMLCanvasElement>(null)

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return

		const ctx = canvas.getContext('2d')
		if (!ctx) return

		let animationId: number

		let rotationX = 0
		let rotationY = 0
		const focalLength = 500
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
		const compactCanvas = window.innerWidth < 768
		const rings = compactCanvas ? 8 : 10
		const pointsPerRing = compactCanvas ? 12 : 15

		const basePoints: { phi: number; theta: number }[] = []
		for (let i = 0; i <= rings; i++) {
			const phi = (i / rings) * Math.PI
			for (let j = 0; j < pointsPerRing; j++) {
				const theta = (j / pointsPerRing) * Math.PI * 2
				basePoints.push({ phi, theta })
			}
		}

		const randomConnections: [number, number][] = []
		for (let i = 0; i < basePoints.length; i++) {
			if (Math.random() > 0.8) {
				const j = Math.floor(Math.random() * basePoints.length)
				if (i !== j) randomConnections.push([i, j])
			}
		}

		const signals: { fromIdx: number; toIdx: number; progress: number; speed: number }[] = []
		const maxSignals = compactCanvas ? 2 : 4

		const getSphereRadius = () => Math.min(canvas.width, canvas.height) * 0.2

		const getPoint = (phi: number, theta: number, radius: number) => ({
			x: radius * Math.sin(phi) * Math.cos(theta),
			y: radius * Math.cos(phi),
			z: radius * Math.sin(phi) * Math.sin(theta),
		})

		const project = (x: number, y: number, z: number) => {
			const x1 = x * Math.cos(rotationY) - z * Math.sin(rotationY)
			const z1 = x * Math.sin(rotationY) + z * Math.cos(rotationY)
			const y2 = y * Math.cos(rotationX) - z1 * Math.sin(rotationX)
			const z2 = y * Math.sin(rotationX) + z1 * Math.cos(rotationX)
			const scale = focalLength / (focalLength + z2)
			return {
				x: x1 * scale + canvas.width / 2,
				y: y2 * scale + canvas.height / 2,
				z: z2,
				scale,
			}
		}

		const resize = () => {
			if (canvas.parentElement) {
				canvas.width = canvas.parentElement.clientWidth
				canvas.height = canvas.parentElement.clientHeight
			}
		}
		resize()
		window.addEventListener('resize', resize)
		setTimeout(resize, 50)

		const animate = () => {
			ctx.clearRect(0, 0, canvas.width, canvas.height)
			rotationY += 0.002
			rotationX = Math.sin(rotationY * 0.3) * 0.1

			const sphereRadius = getSphereRadius()

			const projectedPoints = basePoints.map((p) => {
				const point = getPoint(p.phi, p.theta, sphereRadius)
				return project(point.x, point.y, point.z)
			})

			for (let i = 0; i < rings; i++) {
				for (let j = 0; j < pointsPerRing; j++) {
					const idx = i * pointsPerRing + j
					const nextIdx = i * pointsPerRing + ((j + 1) % pointsPerRing)
					const p1 = projectedPoints[idx]
					const p2 = projectedPoints[nextIdx]

					if (p1.z < 0 && p2.z < 0) {
						const depth = Math.min(-p1.z, -p2.z) / sphereRadius
						ctx.strokeStyle = `rgba(100, 100, 100, ${0.12 + depth * 0.2})`
						ctx.lineWidth = 0.8
						ctx.beginPath()
						ctx.moveTo(p1.x, p1.y)
						ctx.lineTo(p2.x, p2.y)
						ctx.stroke()
					}
				}
			}

			for (let j = 0; j < pointsPerRing; j++) {
				for (let i = 0; i < rings; i++) {
					const idx = i * pointsPerRing + j
					const nextIdx = ((i + 1) % (rings + 1)) * pointsPerRing + j
					if (nextIdx < projectedPoints.length) {
						const p1 = projectedPoints[idx]
						const p2 = projectedPoints[nextIdx]

						if (p1.z < 0 && p2.z < 0) {
							const depth = Math.min(-p1.z, -p2.z) / sphereRadius
							ctx.strokeStyle = `rgba(100, 100, 100, ${0.12 + depth * 0.2})`
							ctx.lineWidth = 0.8
							ctx.beginPath()
							ctx.moveTo(p1.x, p1.y)
							ctx.lineTo(p2.x, p2.y)
							ctx.stroke()
						}
					}
				}
			}

			randomConnections.forEach(([i, j]) => {
				const p1 = projectedPoints[i]
				const p2 = projectedPoints[j]
				if (p1.z < 0 && p2.z < 0) {
					const depth = Math.min(-p1.z, -p2.z) / sphereRadius
					ctx.strokeStyle = `rgba(80, 80, 80, ${0.1 + depth * 0.14})`
					ctx.lineWidth = 0.6
					ctx.beginPath()
					ctx.moveTo(p1.x, p1.y)
					ctx.lineTo(p2.x, p2.y)
					ctx.stroke()
				}
			})

			projectedPoints.forEach((p) => {
				if (p.z < 0) {
					const depth = -p.z / sphereRadius
					const size = 1.3 * p.scale
					const alpha = 0.25 + depth * 0.3
					ctx.beginPath()
					ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
					ctx.fillStyle = `rgba(120, 120, 120, ${alpha})`
					ctx.fill()
				}
			})

			if (signals.length < maxSignals && Math.random() > 0.98) {
				const connIdx = Math.floor(Math.random() * randomConnections.length)
				const [from, to] = randomConnections[connIdx]
				signals.push({
					fromIdx: from,
					toIdx: to,
					progress: 0,
					speed: 0.008 + Math.random() * 0.012,
				})
			}

			for (let i = signals.length - 1; i >= 0; i--) {
				const signal = signals[i]
				signal.progress += signal.speed

				if (signal.progress >= 1) {
					signals.splice(i, 1)
					continue
				}

				const fromPoint = getPoint(basePoints[signal.fromIdx].phi, basePoints[signal.fromIdx].theta, sphereRadius)
				const toPoint = getPoint(basePoints[signal.toIdx].phi, basePoints[signal.toIdx].theta, sphereRadius)

				const x = fromPoint.x + (toPoint.x - fromPoint.x) * signal.progress
				const y = fromPoint.y + (toPoint.y - fromPoint.y) * signal.progress
				const z = fromPoint.z + (toPoint.z - fromPoint.z) * signal.progress

				const proj = project(x, y, z)

				if (proj.z < 0) {
					const alpha = Math.sin(signal.progress * Math.PI) * 0.4
					const size = 2 * proj.scale

					ctx.beginPath()
					ctx.arc(proj.x, proj.y, size, 0, Math.PI * 2)
					ctx.fillStyle = `rgba(200, 200, 200, ${alpha})`
					ctx.fill()
				}
			}

			if (!reducedMotion) {
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
			className="absolute inset-0 w-full h-full"
		/>
	)
}

export default memo(WhiteSphereCanvas)
