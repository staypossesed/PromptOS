export function Marquee({ items }: { items: string[] }) {
  const track = [...items, ...items];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">
        {track.map((item, index) => (
          <span className="marquee__item" key={`${item}-${index}`}>{item}</span>
        ))}
      </div>
    </div>
  );
}
