import { getDB } from "./db";

export interface AppSettings {
  annotator_id: string;
  theme: "light" | "dark" | "system";
  keyboard_shortcuts_enabled: boolean;
  autosave_delay_ms: number;
}

const DEFAULTS: AppSettings = {
  annotator_id: "A1",
  theme: "system",
  keyboard_shortcuts_enabled: true,
  autosave_delay_ms: 300,
};

export async function getSetting<K extends keyof AppSettings>(
  key: K
): Promise<AppSettings[K]> {
  const db = await getDB();
  const record = await db.get("settings", key as string);
  return (record?.value as AppSettings[K]) ?? DEFAULTS[key];
}

export async function setSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): Promise<void> {
  const db = await getDB();
  await db.put("settings", { key: key as string, value });
}

export async function getAllSettings(): Promise<AppSettings> {
  const db = await getDB();
  const all = await db.getAll("settings");
  const overrides: Partial<AppSettings> = {};
  for (const record of all) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (overrides as any)[record.key] = record.value;
  }
  return { ...DEFAULTS, ...overrides };
}
