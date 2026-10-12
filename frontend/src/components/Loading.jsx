export default function Loading({ message = 'Loading…', fullPage = false }) {
  return (
    <div className={`loading ${fullPage ? 'loading--page' : ''}`} role="status" aria-live="polite">
      <span className="loading__spinner" aria-hidden="true" />
      <span className="loading__text">{message}</span>
    </div>
  );
}