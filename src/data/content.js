/**
 * ─────────────────────────────────────────────────────────────────────────
 *  CONTENT CONFIG  —  this is the ONLY file you need to edit to add photos.
 * ─────────────────────────────────────────────────────────────────────────
 *
 *  HOW TO ADD REAL PHOTOS
 *  ----------------------
 *  1. Drop your image files into:  /public/photos/
 *       e.g.  /public/photos/2024-beach.jpg
 *  2. Reference them by URL path (note the leading slash):
 *       { src: "/photos/2024-beach.jpg", alt: "Dad at the beach", caption: "Beach trip" }
 *  3. Leave `src` empty ("") to show a colored placeholder tile instead —
 *     handy while you're still gathering pictures.
 *
 *  Each "collage" postcard = one year. Put 1–6 photos in `photos`.
 *  The layout adapts automatically to how many photos you provide.
 *
 *  The final "message" postcard is a written note (no photos).
 *
 *  You can add/remove/reorder postcards freely — the stack adjusts.
 */

export const content = {
  // Step 1: cursive text the "plane" writes in the sky.
  intro: {
    greeting: "Happy Father's Day",
  },

  // Step 2: the envelope.
  envelope: {
    hint: 'Swipe the envelope up',
  },

  // Step 3: the postcard stack (top of stack = first item).
  postcards: [
    {
      id: 'year-2023',
      type: 'collage',
      year: '2023',
      title: 'Adventures, 2023',
      // Add 1–6 photos. `src: ""` => placeholder tile.
      photos: [
        { src: '', alt: '', caption: 'Add a memory' },
        { src: '', alt: '', caption: 'Add a memory' },
        { src: '', alt: '', caption: 'Add a memory' },
        { src: '', alt: '', caption: 'Add a memory' },
      ],
    },
    {
      id: 'year-2024',
      type: 'collage',
      year: '2024',
      title: 'Adventures, 2024',
      photos: [
        { src: '', alt: '', caption: 'Add a memory' },
        { src: '', alt: '', caption: 'Add a memory' },
        { src: '', alt: '', caption: 'Add a memory' },
      ],
    },
    {
      id: 'year-2025',
      type: 'collage',
      year: '2025',
      title: 'Adventures, 2025',
      photos: [
        { src: '', alt: '', caption: 'Add a memory' },
        { src: '', alt: '', caption: 'Add a memory' },
        { src: '', alt: '', caption: 'Add a memory' },
        { src: '', alt: '', caption: 'Add a memory' },
        { src: '', alt: '', caption: 'Add a memory' },
      ],
    },
    {
      id: 'message',
      type: 'message',
      title: 'A note for you',
      body: [
        'Dad,',
        'Thank you for every adventure, every lesson, and every laugh along the way.',
        'These are just a few of the memories I treasure — here’s to many more.',
      ],
      signature: 'Love, your kid',
    },
  ],
}

export default content
