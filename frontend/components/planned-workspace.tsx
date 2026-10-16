import Link from "next/link";
import { PageHeader } from "./page-header";

export function PlannedWorkspace({
  name,
  phase,
  description,
}: {
  name: string;
  phase: string;
  description: string;
}) {
  return (
    <div className="content">
      <PageHeader
        eyebrow={`${phase} roadmap`}
        title={`${name} workspace`}
        description={description}
      />
      <div className="panel coming">
        <div className="panel-head">
          <h2>Architecture prepared, functionality intentionally deferred</h2>
          <span className="badge">{phase}</span>
        </div>
        <div className="panel-body">
          <p>
            This workspace will reuse the same locally stored datasets, filters, mappings, and provenance model. It does not show invented results or nonfunctional research controls.
          </p>
          <div className="actions">
            <Link className="button primary" href="/visualize">
              Open Visualization
            </Link>
            <Link className="button" href="/library">
              Open Research Library
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
