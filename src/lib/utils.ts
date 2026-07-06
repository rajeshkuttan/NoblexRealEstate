import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Base URL for stored `/uploads/...` paths.
 * Production nginx proxies `/api/` to the backend; images must use `/api/uploads/...`.
 * Optional `VITE_UPLOADS_ORIGIN` overrides (full base including `/uploads` if needed).
 */
export function getUploadsBaseUrl(): string {
  const explicit = import.meta.env.VITE_UPLOADS_ORIGIN as string | undefined;
  if (explicit && String(explicit).trim()) {
    const base = String(explicit).trim().replace(/\/$/, "");
    return base.endsWith("/uploads") ? base : `${base}/uploads`;
  }

  const api = import.meta.env.VITE_API_URL || "http://localhost:5002/api";
  const apiBase = String(api).trim().replace(/\/$/, "");

  if (apiBase.startsWith("http://") || apiBase.startsWith("https://")) {
    return `${apiBase}/uploads`;
  }

  if (typeof window !== "undefined") {
    try {
      const resolved = new URL(apiBase, window.location.origin).href.replace(/\/$/, "");
      return `${resolved}/uploads`;
    } catch {
      return `${window.location.origin}/api/uploads`;
    }
  }

  return "http://localhost:5002/api/uploads";
}

/** @deprecated Use getUploadsBaseUrl(); kept for callers that need API origin only */
export function getUploadsOrigin(): string {
  return getUploadsBaseUrl().replace(/\/uploads$/, "");
}

/**
 * Resolves stored image paths (/uploads/...) to full URLs. Keeps data URLs and absolute http(s) as-is.
 */
export function resolveImageUrl(src: string | undefined | null): string {
  if (src == null) return "";
  let s = String(src).trim();
  if (!s) return "";
  if (s.startsWith("data:") || s.startsWith("blob:")) return s;

  if (s.startsWith("http://") || s.startsWith("https://")) {
    try {
      const u = new URL(s);
      if (u.pathname.startsWith("/uploads/")) {
        return `${getUploadsBaseUrl()}${u.pathname.slice("/uploads".length)}`;
      }
      if (u.pathname.startsWith("/api/uploads/")) {
        return s;
      }
    } catch {
      /* keep original */
    }
    return s;
  }

  if (!s.startsWith("/") && s.startsWith("uploads/")) {
    s = `/${s}`;
  }
  if (s.startsWith("/uploads/")) {
    return `${getUploadsBaseUrl()}${s.slice("/uploads".length)}`;
  }
  return s;
}
