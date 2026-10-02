export default function LoadingScreen({ message = 'Loading...', compact = false }) {
  return (
    <div className={`app-loading${compact ? ' app-loading--compact' : ''}`} role="status" aria-live="polite">
      <span className="app-loading__spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
