"use client";
import { useCallback, useEffect, useState } from "react";
import type { Dataset } from "@/types/dataset";
import type { AuditSession, AuditTemplate } from "@/types/audit";
import { listDatasets } from "@/lib/persistence/datasets";
import { listSessions, listTemplates } from "@/lib/persistence/audit";

export function useLocalData() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [sessions, setSessions] = useState<AuditSession[]>([]);
  const [templates, setTemplates] = useState<AuditTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    const [d, s, t] = await Promise.all([listDatasets(), listSessions(), listTemplates()]);
    setDatasets(d); setSessions(s); setTemplates(t); setLoading(false);
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  return { datasets, sessions, templates, loading, refresh };
}
