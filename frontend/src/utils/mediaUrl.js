function resolveMediaOrigin() {
  if (import.meta.env.VITE_MEDIA_URL) {
    return import.meta.env.VITE_MEDIA_URL;
  }

  const apiBase =
    import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  if (apiBase.startsWith("/")) {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }

    return "";
  }

  return apiBase.replace(/\/api\/?$/, "") || apiBase;
}

const MEDIA_ORIGIN = resolveMediaOrigin();

export function resolveMediaUrl(path, cacheBust) {
  if (!path) {
    return null;
  }

  let url = path;

  if (!path.startsWith("http://") && !path.startsWith("https://")) {
    url = `${MEDIA_ORIGIN}${path}`;
  }

  if (cacheBust) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}v=${cacheBust}`;
  }

  return url;
}
