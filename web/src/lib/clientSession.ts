export function getClientSessionToken(): string | null {
  if (typeof window === "undefined") return null;

  const localToken = window.localStorage?.getItem("helpem_session");
  if (localToken) return localToken;

  const cookieToken = document.cookie
    .split("; ")
    .find((row) => row.startsWith("session_token="))
    ?.split("=")[1];

  return cookieToken ? decodeURIComponent(cookieToken) : null;
}
