import Link from "next/link";

export default function NotFound() {
  return (
    <div className="content">
      <div className="empty">
        <h1>Page not found</h1>
        <p>The requested research workspace or local resource does not exist.</p>
        <Link className="button primary" href="/library">
          Return to Library
        </Link>
      </div>
    </div>
  );
}
