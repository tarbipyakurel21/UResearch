export function getBackendUrl(): string {
  return process.env.BACKEND_URL || "http://127.0.0.1:8000";
}
