export default function GalleryGrid({ items }) {
  return (
    <div className="gallery">
      {items.map((item, index) => (
        <div
          key={index}
          className="gallery__tile"
          role={item.image ? 'img' : undefined}
          aria-label={item.alt}
          style={item.image ? { backgroundImage: `url(${item.image})` } : undefined}
        >
          {item.label && <span className="gallery__caption">{item.label}</span>}
        </div>
      ))}
    </div>
  );
}