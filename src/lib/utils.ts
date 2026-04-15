import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Base URL where `/uploads/...` is served (API host without `/api`).
 * Optional `VITE_UPLOADS_ORIGIN` overrides (e.g. CDN or when API URL is path-only).
 */
export function getUploadsOrigin(): string {
  const explicit = import.meta.env.VITE_UPLOADS_ORIGIN as string | undefined;
  if (explicit && String(explicit).trim()) {
    return String(explicit).trim().replace(/\/$/, "");
  }

  const api = import.meta.env.VITE_API_URL || "http://localhost:5002/api";
  const s = String(api).trim();

  if (s.startsWith("http://") || s.startsWith("https://")) {
    try {
      return new URL(s).origin;
    } catch {
      return s.replace(/\/?api\/?$/, "").replace(/\/$/, "") || s;
    }
  }

  if (typeof window !== "undefined") {
    try {
      return new URL(s, window.location.origin).origin;
    } catch {
      return window.location.origin;
    }
  }

  return "http://localhost:5002";
}

/**
 * Resolves stored image paths (/uploads/...) to full URLs. Keeps data URLs and absolute http(s) as-is.
 */
export function resolveImageUrl(src: string | undefined | null): string {
  if (src == null) return "";
  let s = String(src).trim();
  if (!s) return "";
  if (s.startsWith("data:") || s.startsWith("blob:")) return s;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (!s.startsWith("/") && s.startsWith("uploads/")) {
    s = `/${s}`;
  }
  if (s.startsWith("/uploads/")) {
    return `${getUploadsOrigin()}${s}`;
  }
  return s;
}
