# Father's Day — virtual postcard

A mobile-first animated Father's Day card built with React + Vite + Framer Motion.

## The sequence

1. **Sky** — a plane flies across a blue sky writing "Happy Father's Day" in cursive.
2. **Envelope** — an envelope slides up from the bottom; swipe it up to open.
3. **Stack** — a stack of postcards slides out. Each card is one year (a photo
   collage); the last is a written message. **Swipe a card up** to send it to the
   back of the stack — the stack loops forever. **Tap a photo** to zoom in.

## Run it

```bash
npm install
npm run dev
```

Vite prints a `Network:` URL — open that on your iPhone (same Wi-Fi) to test on
the real target device.

## Add your own photos (the easy part)

Everything is data-driven from a single file: **`src/data/content.js`**.

1. Drop image files into **`public/photos/`** (e.g. `public/photos/2024-beach.jpg`).
2. In `content.js`, set the photo's `src` to its path:
   ```js
   { src: "/photos/2024-beach.jpg", alt: "Dad at the beach", caption: "Beach trip" }
   ```
3. Leave `src: ""` to show a placeholder tile while you gather pictures.

You can add, remove, and reorder year-postcards freely — the layouts and the
stack adjust automatically. Each collage handles 1–6 photos.

## Tuning the animation

- Greeting text / timing: `src/data/content.js` + `WRITE_DURATION` in
  `src/components/SkyIntro.jsx`.
- How far the envelope peeks: `PEEK` in `src/components/Envelope.jsx`.
- Stack feel (visible depth, swipe sensitivity): `MAX_VISIBLE` / `SWIPE_COMMIT`
  in `src/components/PostcardStack.jsx`.
