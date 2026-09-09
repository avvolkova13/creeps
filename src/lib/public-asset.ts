/** Next Link handles basePath itself; plain public image URLs need the prefix. */
export function publicAsset(path: string): string {
  return path.startsWith("/") && !path.startsWith("//") ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}` : path;
}
