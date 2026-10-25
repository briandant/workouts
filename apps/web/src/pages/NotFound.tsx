import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4 text-center">
      <div className="flex flex-col items-center gap-4">
        <h1 className="font-display text-6xl">Not found</h1>
        <p className="text-muted">That workout doesn’t exist (any more).</p>
        <Link to="/" className="font-semibold text-accent hover:text-accent-hi">
          All workouts
        </Link>
      </div>
    </div>
  );
}
