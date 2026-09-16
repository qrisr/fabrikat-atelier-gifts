/** Browser file helpers: logo validation and reading. */

export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"] as const;

export type LogoError = { code: "type"; type: string } | { code: "size"; bytes: number } | { code: "empty" };

export function validateLogo(file: Pick<File, "type" | "size" | "name">): LogoError | null {
  if (file.size === 0) return { code: "empty" };
  const type = file.type || guessType(file.name);
  if (!(LOGO_TYPES as readonly string[]).includes(type)) return { code: "type", type: type || file.name };
  if (file.size > LOGO_MAX_BYTES) return { code: "size", bytes: file.size };
  return null;
}

function guessType(name: string): string {
  const ext = name.toLowerCase().split(".").pop();
  return ext === "svg" ? "image/svg+xml" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext ? `image/${ext}` : "";
}

export function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function readAsText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, "utf-8");
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function downloadText(filename: string, content: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
