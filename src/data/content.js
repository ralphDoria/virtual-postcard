/**
 * ─────────────────────────────────────────────────────────────────────────
 *  CONTENT CONFIG
 * ─────────────────────────────────────────────────────────────────────────
 *
 *  PHOTOS — one photo per postcard.
 *  Drop image files into  src/assets/family-pictures/  and they're picked up
 *  automatically (one postcard each), in filename order. To set captions or a
 *  specific order, edit `photoOrder` / `captions` below.
 *
 *  The final postcard is a written message (customize `message` text).
 */

// auto-import every image in the family-pictures folder -> { path: url }
const imageModules = import.meta.glob(
  '../assets/family-pictures/*.{jpg,JPG,jpeg,JPEG,png,PNG,webp,WEBP}',
  { eager: true, import: 'default' },
)

// filename (basename) -> url
const imagesByName = Object.fromEntries(
  Object.entries(imageModules).map(([path, url]) => [path.split('/').pop(), url]),
)

// Optional: list filenames here to control ORDER (any not listed are appended
// alphabetically). Leave empty to just use filename order.
const photoOrder = []

// Optional: per-file captions, e.g. { 'IMG_6310.JPG': 'Fishing trip' }
const captions = {}

const orderedNames = [
  ...photoOrder.filter((n) => n in imagesByName),
  ...Object.keys(imagesByName)
    .filter((n) => !photoOrder.includes(n))
    .sort(),
]

const photoCards = orderedNames.map((name, i) => ({
  id: `photo-${i + 1}`,
  type: 'photo',
  src: imagesByName[name],
  alt: captions[name] || '',
  caption: captions[name] || '',
}))

const messageCard = {
  id: 'message',
  type: 'message',
  title: 'A note for you',
  body: [
    'Dad,',
    'Thank you for all that you\'ve done for us, all the places you\'ve brought us to, all the activities you\'ve enrolled us in to help us grow, and for being our dad.',
    'P.S. wanna play golf?',
  ],
  signature: 'Love, your kids',
}

export const content = {
  intro: {
    greeting: "Happy Father's Day",
  },
  envelope: {
    hint: 'Swipe the envelope up',
  },
  postcards: [...photoCards, messageCard],
}

export default content
