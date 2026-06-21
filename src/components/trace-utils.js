// Shared helpers for tracing a single word's polyline at constant speed.

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v
}

// point (user coords) at fraction f (0..1) of a uniform point table [x0,y0,...]
export function sampleUser(points, f) {
  const n = points.length / 2
  const idx = clamp(f, 0, 1) * (n - 1)
  const k = Math.min(Math.floor(idx), n - 2)
  const t = idx - k
  return {
    x: points[k * 2] + (points[(k + 1) * 2] - points[k * 2]) * t,
    y: points[k * 2 + 1] + (points[(k + 1) * 2 + 1] - points[k * 2 + 1]) * t,
  }
}

export function angleDeg(dx, dy) {
  return (Math.atan2(dy, dx) * 180) / Math.PI
}

export function normalize(x, y) {
  const m = Math.hypot(x, y) || 1
  return { x: x / m, y: y / m }
}

export function lerpPt(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

// distance from `origin` along unit `dir` until it leaves the axis-aligned box
export function rayExitDistance(origin, dir, box) {
  let t = Infinity
  if (dir.x > 1e-6) t = Math.min(t, (box.maxX - origin.x) / dir.x)
  else if (dir.x < -1e-6) t = Math.min(t, (box.minX - origin.x) / dir.x)
  if (dir.y > 1e-6) t = Math.min(t, (box.maxY - origin.y) / dir.y)
  else if (dir.y < -1e-6) t = Math.min(t, (box.minY - origin.y) / dir.y)
  return Number.isFinite(t) ? Math.max(0, t) : 0
}

// approximate drawn length of a polyline point table, ignoring pen-lift jumps
export function polylineLength(points) {
  const n = points.length / 2
  const d = []
  for (let i = 1; i < n; i++) {
    d.push(
      Math.hypot(
        points[i * 2] - points[(i - 1) * 2],
        points[i * 2 + 1] - points[(i - 1) * 2 + 1],
      ),
    )
  }
  if (!d.length) return 0
  const med = [...d].sort((a, b) => a - b)[Math.floor(d.length / 2)]
  const thr = med * 6 // skip jumps between subpaths
  return d.reduce((s, x) => s + (x <= thr ? x : 0), 0)
}
