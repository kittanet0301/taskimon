export const LOBBY_GROUND_Y = 0.58

type Ctx = CanvasRenderingContext2D

function groundTop(h: number): number {
  return Math.round(h * LOBBY_GROUND_Y)
}

function drawSky(ctx: Ctx, w: number, h: number, top: string, mid: string, bottom: string): void {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, top)
  g.addColorStop(0.55, mid)
  g.addColorStop(1, bottom)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

function drawCloud(ctx: Ctx, x: number, y: number, scale: number, alpha = 0.85): void {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = '#fff'
  const r = 18 * scale
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.arc(x + r * 1.1, y - r * 0.2, r * 0.85, 0, Math.PI * 2)
  ctx.arc(x + r * 2.1, y, r * 0.95, 0, Math.PI * 2)
  ctx.arc(x + r * 1.05, y + r * 0.25, r * 0.7, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawBeach(ctx: Ctx, w: number, h: number, frame: number): void {
  const gt = groundTop(h)
  drawSky(ctx, w, h, '#38bdf8', '#7dd3fc', '#bae6fd')

  // sun
  const sunX = w * 0.82
  const sunY = h * 0.16
  const sunG = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 52)
  sunG.addColorStop(0, 'rgba(254, 240, 138, 0.95)')
  sunG.addColorStop(0.45, 'rgba(251, 191, 36, 0.55)')
  sunG.addColorStop(1, 'rgba(251, 191, 36, 0)')
  ctx.fillStyle = sunG
  ctx.beginPath()
  ctx.arc(sunX, sunY, 52, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fde047'
  ctx.beginPath()
  ctx.arc(sunX, sunY, 22, 0, Math.PI * 2)
  ctx.fill()

  // ocean
  const seaTop = Math.round(h * 0.42)
  const seaG = ctx.createLinearGradient(0, seaTop, 0, gt)
  seaG.addColorStop(0, '#0ea5e9')
  seaG.addColorStop(1, '#0284c7')
  ctx.fillStyle = seaG
  ctx.fillRect(0, seaTop, w, gt - seaTop)

  const waveY = seaTop + 18
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth = 3
  for (let row = 0; row < 3; row++) {
    ctx.beginPath()
    for (let x = 0; x <= w; x += 8) {
      const y = waveY + row * 14 + Math.sin((x + frame * 1.8 + row * 40) * 0.04) * 5
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  // sand
  const sandG = ctx.createLinearGradient(0, gt, 0, h)
  sandG.addColorStop(0, '#fde68a')
  sandG.addColorStop(0.35, '#fcd34d')
  sandG.addColorStop(1, '#c87050')
  ctx.fillStyle = sandG
  ctx.fillRect(0, gt, w, h - gt)

  // dunes
  ctx.fillStyle = 'rgba(245, 158, 11, 0.25)'
  for (let i = 0; i < 6; i++) {
    const dx = (i * 173) % w
    ctx.beginPath()
    ctx.ellipse(dx, gt + 28 + (i % 3) * 10, 90 + (i % 2) * 30, 16, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // palm silhouettes
  const palms = [
    { x: 72, s: 1 },
    { x: w - 88, s: 0.9 }
  ]
  for (const palm of palms) {
    ctx.fillStyle = '#166534'
    ctx.fillRect(palm.x - 4 * palm.s, gt - 70 * palm.s, 8 * palm.s, 70 * palm.s)
    ctx.beginPath()
    ctx.moveTo(palm.x, gt - 78 * palm.s)
    ctx.lineTo(palm.x - 34 * palm.s, gt - 52 * palm.s)
    ctx.lineTo(palm.x - 10 * palm.s, gt - 58 * palm.s)
    ctx.lineTo(palm.x - 28 * palm.s, gt - 34 * palm.s)
    ctx.lineTo(palm.x, gt - 48 * palm.s)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(palm.x, gt - 78 * palm.s)
    ctx.lineTo(palm.x + 36 * palm.s, gt - 50 * palm.s)
    ctx.lineTo(palm.x + 12 * palm.s, gt - 56 * palm.s)
    ctx.lineTo(palm.x + 30 * palm.s, gt - 30 * palm.s)
    ctx.lineTo(palm.x, gt - 46 * palm.s)
    ctx.closePath()
    ctx.fill()
  }
}

function drawPark(ctx: Ctx, w: number, h: number, frame: number): void {
  const gt = groundTop(h)
  drawSky(ctx, w, h, '#7dd3fc', '#bae6fd', '#dcfce7')

  const drift = (frame * 0.35) % (w + 120)
  drawCloud(ctx, ((w * 0.2 + drift) % (w + 120)) - 60, h * 0.14, 1.1)
  drawCloud(ctx, ((w * 0.62 + drift * 0.7) % (w + 160)) - 80, h * 0.22, 0.85, 0.7)
  drawCloud(ctx, ((w * 0.38 + drift * 1.2) % (w + 140)) - 70, h * 0.1, 0.75, 0.6)

  // hills
  ctx.fillStyle = '#86efac'
  ctx.beginPath()
  ctx.moveTo(0, gt)
  ctx.quadraticCurveTo(w * 0.25, gt - 36, w * 0.5, gt - 10)
  ctx.quadraticCurveTo(w * 0.78, gt + 8, w, gt - 18)
  ctx.lineTo(w, gt)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#4ade80'
  ctx.beginPath()
  ctx.moveTo(0, gt + 6)
  ctx.quadraticCurveTo(w * 0.35, gt - 20, w * 0.7, gt + 4)
  ctx.lineTo(w, gt + 2)
  ctx.lineTo(w, gt + 40)
  ctx.lineTo(0, gt + 40)
  ctx.closePath()
  ctx.fill()

  // grass ground
  const grassG = ctx.createLinearGradient(0, gt, 0, h)
  grassG.addColorStop(0, '#4ade80')
  grassG.addColorStop(0.4, '#22c55e')
  grassG.addColorStop(1, '#16a34a')
  ctx.fillStyle = grassG
  ctx.fillRect(0, gt, w, h - gt)

  // grass blades
  ctx.strokeStyle = 'rgba(21, 128, 61, 0.45)'
  ctx.lineWidth = 2
  for (let x = 8; x < w; x += 14) {
    const gx = x + ((x * 7) % 5)
    const gy = gt + 8 + ((x * 3) % 12)
    ctx.beginPath()
    ctx.moveTo(gx, gy + 10)
    ctx.lineTo(gx - 2, gy)
    ctx.lineTo(gx + 2, gy + 2)
    ctx.stroke()
  }

  // trees
  const trees = [90, 220, w - 200, w - 70]
  for (const tx of trees) {
    ctx.fillStyle = '#78350f'
    ctx.fillRect(tx - 6, gt - 52, 12, 52)
    ctx.fillStyle = '#15803d'
    ctx.beginPath()
    ctx.arc(tx, gt - 64, 28, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#16a34a'
    ctx.beginPath()
    ctx.arc(tx - 14, gt - 50, 20, 0, Math.PI * 2)
    ctx.arc(tx + 14, gt - 50, 20, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawPlaza(ctx: Ctx, w: number, h: number, frame: number): void {
  const gt = groundTop(h)
  drawSky(ctx, w, h, '#c4b5fd', '#fda4af', '#fde68a')

  const drift = (frame * 0.2) % (w + 100)
  drawCloud(ctx, ((w * 0.5 + drift) % (w + 100)) - 50, h * 0.18, 0.7, 0.35)

  // buildings
  const buildings = [
    { x: 40, w: 90, h: 120, c: '#c87050' },
    { x: 150, w: 70, h: 95, c: '#818cf8' },
    { x: 250, w: 110, h: 140, c: '#4f46e5' },
    { x: w - 200, w: 85, h: 110, c: '#7c3aed' },
    { x: w - 95, w: 75, h: 130, c: '#c87050' }
  ]
  for (const b of buildings) {
    ctx.fillStyle = b.c
    ctx.fillRect(b.x, gt - b.h, b.w, b.h)
    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    for (let wy = gt - b.h + 16; wy < gt - 12; wy += 22) {
      for (let wx = b.x + 10; wx < b.x + b.w - 14; wx += 18) {
        ctx.fillRect(wx, wy, 10, 12)
      }
    }
  }

  // fountain base
  const fx = w * 0.5
  ctx.fillStyle = '#94a3b8'
  ctx.beginPath()
  ctx.ellipse(fx, gt - 8, 48, 14, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#60a5fa'
  ctx.beginPath()
  ctx.ellipse(fx, gt - 12, 34, 10, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  const splash = Math.sin(frame * 0.12) * 4
  ctx.beginPath()
  ctx.ellipse(fx, gt - 22 + splash, 6, 10, 0, 0, Math.PI * 2)
  ctx.fill()

  // cobblestone floor
  const floorG = ctx.createLinearGradient(0, gt, 0, h)
  floorG.addColorStop(0, '#d6d3d1')
  floorG.addColorStop(1, '#a8a29e')
  ctx.fillStyle = floorG
  ctx.fillRect(0, gt, w, h - gt)

  ctx.fillStyle = 'rgba(120, 113, 108, 0.22)'
  const bw = 34
  const bh = 16
  const cols = Math.ceil((w + bw) / bw) + 1
  const rows = Math.ceil((h - gt) / bh) + 1
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const bx = col * bw + (row % 2) * (bw / 2) - 4
      const by = gt + 4 + row * bh
      if (by >= h) break
      ctx.beginPath()
      ctx.roundRect(bx, by, bw - 4, bh - 3, 4)
      ctx.fill()
    }
  }
}

function drawCave(ctx: Ctx, w: number, h: number, frame: number): void {
  const gt = groundTop(h)
  drawSky(ctx, w, h, '#0f172a', '#1e1b4b', '#312e81')

  // stalactites
  ctx.fillStyle = '#475569'
  for (let i = 0; i < 14; i++) {
    const sx = 30 + i * ((w - 60) / 13)
    const sh = 28 + (i * 17) % 42
    ctx.beginPath()
    ctx.moveTo(sx - 10, 0)
    ctx.lineTo(sx + 10, 0)
    ctx.lineTo(sx, sh)
    ctx.closePath()
    ctx.fill()
  }

  // crystals
  const pulse = 0.55 + Math.sin(frame * 0.08) * 0.15
  const crystals = [
    { x: 120, c: '#22d3ee' },
    { x: w - 140, c: '#a78bfa' },
    { x: w * 0.5, c: '#34d399' }
  ]
  for (const cr of crystals) {
    ctx.save()
    ctx.globalAlpha = pulse
    const glow = ctx.createRadialGradient(cr.x, gt - 40, 2, cr.x, gt - 40, 40)
    glow.addColorStop(0, cr.c)
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(cr.x, gt - 40, 40, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    ctx.fillStyle = cr.c
    ctx.beginPath()
    ctx.moveTo(cr.x, gt - 70)
    ctx.lineTo(cr.x - 14, gt - 24)
    ctx.lineTo(cr.x + 14, gt - 24)
    ctx.closePath()
    ctx.fill()
  }

  // rocky floor
  const rockG = ctx.createLinearGradient(0, gt, 0, h)
  rockG.addColorStop(0, '#57534e')
  rockG.addColorStop(0.5, '#44403c')
  rockG.addColorStop(1, '#292524')
  ctx.fillStyle = rockG
  ctx.fillRect(0, gt, w, h - gt)

  ctx.fillStyle = 'rgba(15, 23, 42, 0.35)'
  for (let i = 0; i < 18; i++) {
    const rx = (i * 97) % w
    const ry = gt + 10 + (i * 23) % 80
    ctx.beginPath()
    ctx.ellipse(rx, ry, 26 + (i % 3) * 8, 10, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

const DRAWERS: Record<string, (ctx: Ctx, w: number, h: number, frame: number) => void> = {
  beach: drawBeach,
  park: drawPark,
  plaza: drawPlaza,
  cave: drawCave
}

export function drawLobbyBackground(
  ctx: CanvasRenderingContext2D,
  slug: string,
  w: number,
  h: number,
  frame: number
): void {
  const draw = DRAWERS[slug] ?? drawPark
  draw(ctx, w, h, frame)
}
