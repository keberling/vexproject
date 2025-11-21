/**
 * Simple confetti effect utility
 * Creates a burst of confetti particles from a specific element
 */

interface ConfettiParticle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  rotation: number
  rotationSpeed: number
}

const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

export function createConfetti(element: HTMLElement | null) {
  if (!element) return

  const rect = element.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  const particles: ConfettiParticle[] = []
  const particleCount = 30

  // Create particles
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5
    const speed = 2 + Math.random() * 3
    particles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 4 + Math.random() * 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
    })
  }

  // Create container for confetti
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.top = '0'
  container.style.left = '0'
  container.style.width = '100%'
  container.style.height = '100%'
  container.style.pointerEvents = 'none'
  container.style.zIndex = '9999'
  document.body.appendChild(container)

  let animationFrame: number
  let startTime = Date.now()
  const duration = 2000 // 2 seconds

  function animate() {
    const elapsed = Date.now() - startTime
    const progress = elapsed / duration

    if (progress >= 1) {
      document.body.removeChild(container)
      return
    }

    // Clear previous frame
    container.innerHTML = ''

    particles.forEach((particle) => {
      // Update position
      particle.x += particle.vx
      particle.y += particle.vy
      particle.vy += 0.2 // Gravity
      particle.rotation += particle.rotationSpeed

      // Create particle element
      const particleEl = document.createElement('div')
      particleEl.style.position = 'absolute'
      particleEl.style.left = `${particle.x}px`
      particleEl.style.top = `${particle.y}px`
      particleEl.style.width = `${particle.size}px`
      particleEl.style.height = `${particle.size}px`
      particleEl.style.backgroundColor = particle.color
      particleEl.style.borderRadius = '50%'
      particleEl.style.transform = `rotate(${particle.rotation}deg)`
      particleEl.style.opacity = `${1 - progress}`
      particleEl.style.transition = 'opacity 0.1s'

      container.appendChild(particleEl)
    })

    animationFrame = requestAnimationFrame(animate)
  }

  animate()
}

