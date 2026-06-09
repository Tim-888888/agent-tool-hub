export function useSession() {
  return { data: null, status: "unauthenticated" };
}

export async function signIn() {
  return undefined;
}

export async function signOut() {
  return undefined;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  return children;
}
import type { ReactNode } from "react";
