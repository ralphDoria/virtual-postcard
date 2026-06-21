import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, animate, AnimatePresence } from 'framer-motion'
import Postcard from './Postcard.jsx'

const MAX_VISIBLE = 3 // how many cards show depth behind the front one
const DEPTH_Y = -14 // px each deeper card shifts up
const DEPTH_SCALE = 0.05 // scale lost per depth step
const SWIPE_COMMIT = 60 // px to count as an up-swipe
const ARC_DURATION = 0.5 // seconds for the up arc
const SPRING = { type: 'spring', stiffness: 260, damping: 30 }

// down (reverse) is drag-driven:
const PULL_FULL = 260 // px of downward drag = back card fully over the top
const REVERSE_COMMIT = 0.35 // fraction of PULL_FULL to commit on release

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)

// resting transform for a card at a given depth in the stack
function presentation(rank, total) {
  const depth = Math.min(rank, MAX_VISIBLE)
  return {
    y: depth * DEPTH_Y,
    scale: 1 - depth * DEPTH_SCALE,
    zIndex: total - rank,
  }
}

export default function PostcardStack({ postcards }) {
  // order = card ids; index 0 is the front of the stack.
  const [order, setOrder] = useState(() => postcards.map((p) => p.id))
  const [moving, setMoving] = useState(null) // up arc in progress: { id }
  const [reversing, setReversing] = useState(false) // down drag/commit in progress
  const [committing, setCommitting] = useState(false) // down finishing after release
  const [zoom, setZoom] = useState(null)
  const pull = useMotionValue(0) // live downward-drag amount driving the back card

  const byId = Object.fromEntries(postcards.map((p) => [p.id, p]))
  const locked = !!moving || committing

  // up = advance: front card arcs over the top to the back (release-triggered)
  const advance = () => {
    if (locked) return
    const id = order[0]
    setOrder((o) => [...o.slice(1), o[0]])
    setMoving({ id })
  }

  // down = reverse: the back card is pulled over the top as you drag
  const reverseDrag = (dy) => {
    if (locked) return
    if (dy > 0) {
      if (!reversing) setReversing(true)
      pull.set(dy)
    } else if (reversing) {
      pull.set(0)
    }
  }
  const commitReverse = () => {
    if (committing) return
    setCommitting(true)
    animate(pull, PULL_FULL, { duration: 0.18, ease: 'easeOut' }).then(() => {
      // NB: don't reset `pull` here — the preview listener is still subscribed,
      // so pull.set(0) would snap the just-arrived front card back to the rear
      // (the "extra step"). It's harmless once `reversing` is false (nothing
      // reads it) and the next down-drag overwrites it.
      setOrder((o) => [o[o.length - 1], ...o.slice(0, -1)])
      setReversing(false)
      setCommitting(false)
    })
  }
  const cancelReverse = () => {
    animate(pull, 0, { type: 'spring', stiffness: 420, damping: 36 }).then(() =>
      setReversing(false),
    )
  }

  return (
    <motion.div
      className="stack-layer fill"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="stack">
        {order.map((id, rank) => (
          <StackCard
            key={id}
            card={byId[id]}
            rank={rank}
            total={order.length}
            mover={moving?.id === id}
            reversing={reversing}
            pull={pull}
            locked={locked}
            onAdvance={advance}
            onReverseDrag={reverseDrag}
            onCommitReverse={commitReverse}
            onCancelReverse={cancelReverse}
            onArcDone={() => setMoving(null)}
            onZoomPhoto={(photo) => setZoom(photo)}
          />
        ))}
      </div>

      <div className="stack__hint">Swipe up or down</div>

      <AnimatePresence>
        {zoom && <PhotoZoom photo={zoom} onClose={() => setZoom(null)} />}
      </AnimatePresence>
    </motion.div>
  )
}

function StackCard({
  card,
  rank,
  total,
  mover,
  reversing,
  pull,
  locked,
  onAdvance,
  onReverseDrag,
  onCommitReverse,
  onCancelReverse,
  onArcDone,
  onZoomPhoto,
}) {
  const isTop = rank === 0
  const isPreview = reversing && rank === total - 1 // the back card, coming over
  const y = useMotionValue(0)
  const scale = useMotionValue(1)
  const [zIndex, setZIndex] = useState(total - rank)
  const [dragging, setDragging] = useState(false)
  const inited = useRef(false)

  const pres = presentation(rank, total)

  // rest: settle on first render, then spring to the new depth on reorder
  // (skipped while this card is the up-mover or the down preview)
  useEffect(() => {
    if (mover || isPreview) return
    if (!inited.current) {
      inited.current = true
      y.set(pres.y)
      scale.set(pres.scale)
      setZIndex(pres.zIndex)
      return
    }
    setZIndex(pres.zIndex)
    const cy = animate(y, pres.y, SPRING)
    const cs = animate(scale, pres.scale, SPRING)
    return () => {
      cy.stop()
      cs.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rank, mover, isPreview])

  // up arc: rise over the top, then drop behind at the apex to tuck to the back
  useEffect(() => {
    if (!mover) return
    const lift = -window.innerHeight * 0.42
    const opts = { duration: ARC_DURATION, times: [0, 0.5, 1], ease: 'easeInOut' }
    setZIndex(total + 5)
    const cy = animate(y, [y.get(), lift, pres.y], opts)
    const cs = animate(scale, [scale.get(), 1.02, pres.scale], opts)
    const zt = setTimeout(() => setZIndex(pres.zIndex), ARC_DURATION * 500)
    cy.then(() => {
      setZIndex(pres.zIndex)
      onArcDone()
    })
    return () => {
      cy.stop()
      cs.stop()
      clearTimeout(zt)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mover])

  // down preview: the back card follows the live `pull` up and over the top
  useEffect(() => {
    if (!isPreview) return
    const lift = window.innerHeight * 0.42
    const back = presentation(total - 1, total)
    const apply = (val) => {
      const p = clamp(val / PULL_FULL, 0, 1)
      let yy
      let sc
      if (p < 0.5) {
        const t = p / 0.5 // rise from the back position to the apex
        yy = back.y + (-lift - back.y) * t
        sc = back.scale + (1.02 - back.scale) * t
      } else {
        const t = (p - 0.5) / 0.5 // come down over the top to the front
        yy = -lift + lift * t
        sc = 1.02 + (1 - 1.02) * t
      }
      y.set(yy)
      scale.set(sc)
      setZIndex(p < 0.5 ? 0 : total + 5) // emerge from behind, then over the top
    }
    apply(pull.get())
    const unsub = pull.on('change', apply)
    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreview])

  const handleDragEnd = (_e, info) => {
    setDragging(false)
    const up = info.offset.y < -SWIPE_COMMIT || info.velocity.y < -500
    const downCommit =
      info.offset.y > 0 &&
      (info.offset.y >= PULL_FULL * REVERSE_COMMIT || info.velocity.y > 500)
    if (up) {
      onAdvance()
    } else if (downCommit) {
      onCommitReverse()
    } else {
      animate(y, pres.y, { type: 'spring', stiffness: 500, damping: 35 })
      onCancelReverse()
    }
  }

  return (
    <motion.div
      className="stack__card"
      style={{ y, scale, zIndex }}
      drag={isTop && !locked ? 'y' : false}
      dragConstraints={{ top: -160, bottom: 0 }}
      dragElastic={{ top: 0.5, bottom: 0 }}
      onDragStart={() => setDragging(true)}
      onDrag={(_e, info) => onReverseDrag(info.offset.y)}
      onDragEnd={handleDragEnd}
    >
      <Postcard
        card={card}
        interactive={isTop && !dragging && !locked && !reversing}
        onZoomPhoto={onZoomPhoto}
      />
    </motion.div>
  )
}

function PhotoZoom({ photo, onClose }) {
  return (
    <motion.div
      className="zoom"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="zoom__frame"
        initial={{ scale: 0.85, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
      >
        {photo.src ? (
          <img className="zoom__img" src={photo.src} alt={photo.alt || ''} />
        ) : (
          <div className="zoom__img zoom__placeholder" />
        )}
        {photo.caption && <div className="zoom__caption">{photo.caption}</div>}
        <button className="zoom__close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </motion.div>
    </motion.div>
  )
}
