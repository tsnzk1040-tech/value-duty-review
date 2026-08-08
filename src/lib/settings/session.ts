import { AUTH_SESSION_KEY } from "./types";

export function isAuthSessionActive(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(AUTH_SESSION_KEY) === "1";
}

export function setAuthSessionActive(active: boolean): void {
  if (typeof window === "undefined") return;
  if (active) window.sessionStorage.setItem(AUTH_SESSION_KEY, "1");
  else window.sessionStorage.removeItem(AUTH_SESSION_KEY);
}
