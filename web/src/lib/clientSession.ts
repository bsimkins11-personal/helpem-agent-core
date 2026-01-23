export function getClientSessionToken(): string | null {
  if (typeof window === "undefined") return null;

  const localToken = window.localStorage?.getItem("helpem_session");
  if (localToken) return localToken;

  const nativeToken = (window as any).__nativeSessionToken;
  if (typeof nativeToken === "string" && nativeToken.length > 0) {
    return nativeToken;
  }

  const cookieToken = document.cookie
    .split("; ")
    .find((row) => row.startsWith("session_token="))
    ?.split("=")[1];

  return cookieToken ? decodeURIComponent(cookieToken) : null;
}
