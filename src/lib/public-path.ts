export function publicPath(path: string): string {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const base = raw.replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}
