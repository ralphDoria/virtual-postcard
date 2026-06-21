// A single postcard: one photo, or the written message.
export default function Postcard({ card, interactive, onZoomPhoto }) {
  if (card.type === 'message') {
    return <MessageCard card={card} />
  }
  return <PhotoCard card={card} interactive={interactive} onZoomPhoto={onZoomPhoto} />
}

function PhotoCard({ card, interactive, onZoomPhoto }) {
  return (
    <div className="postcard postcard--photo">
      <button
        className="photo"
        // only the settled front card lets you zoom (avoids taps mid-swipe)
        onClick={() => interactive && onZoomPhoto(card)}
        tabIndex={interactive ? 0 : -1}
        aria-label={card.alt || card.caption || 'Photo'}
      >
        {card.src ? (
          <img className="photo__img" src={card.src} alt={card.alt || ''} />
        ) : (
          <span className="photo__placeholder">Photo</span>
        )}
      </button>
      {card.caption && <div className="postcard__title">{card.caption}</div>}
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
