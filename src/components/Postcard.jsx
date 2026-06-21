// A single postcard: either a photo collage (a year) or the written message.
export default function Postcard({ card, interactive, onZoomPhoto }) {
  if (card.type === 'message') {
    return <MessageCard card={card} />
  }
  return <CollageCard card={card} interactive={interactive} onZoomPhoto={onZoomPhoto} />
}

function CollageCard({ card, interactive, onZoomPhoto }) {
  const photos = card.photos || []
  const count = Math.min(photos.length, 6)

  return (
    <div className="postcard postcard--collage">
      <div className={`collage collage--${count}`}>
        {photos.slice(0, 6).map((photo, i) => (
          <button
            key={i}
            className="collage__cell"
            // only the top, settled card lets you zoom — avoids accidental
            // taps while swiping or on cards underneath
            onClick={() => interactive && onZoomPhoto(photo)}
            tabIndex={interactive ? 0 : -1}
            aria-label={photo.alt || photo.caption || 'Photo'}
          >
            {photo.src ? (
              <img className="collage__img" src={photo.src} alt={photo.alt || ''} />
            ) : (
              <span className="collage__placeholder">{photo.caption || 'Photo'}</span>
            )}
          </button>
        ))}
      </div>
      {card.title && <div className="postcard__title">{card.title}</div>}
    </div>
  )
}

function MessageCard({ card }) {
  return (
    <div className="postcard postcard--message">
      <div className="message">
        {card.title && <h2 className="message__title">{card.title}</h2>}
        <div className="message__body">
          {card.body.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
        {card.signature && <div className="message__sign">{card.signature}</div>}
      </div>
    </div>
  )
}
