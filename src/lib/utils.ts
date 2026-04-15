import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** API origin for static files (strip trailing /api from VITE_API_URL). */
export function getUploadsOrigin(): string {
  const api = import.meta.env.VITE_API_URL || "http://localhost:5002/api";
  return api.replace(/\/api\/?$/, "");
}

/**
 * Resolves stored image paths (/uploads/...) to full URLs. Keeps data URLs and absolute http(s) as-is.
 */
export function resolveImageUrl(src: string | undefined | null): string {
  if (src == null) return "";
  const s = String(src).trim();
  if (!s) return "";
  if (s.startsWith("data:") || s.startsWith("blob:")) return s;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/uploads/")) return `${getUploadsOrigin()}${s}`;
  return s;
}
