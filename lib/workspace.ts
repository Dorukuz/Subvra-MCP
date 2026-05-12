import type { User } from "./db/models";

/** True when user should debit / display org pool credits (member of an org and not in individual mode). */
export function userUsesTeamWallet(
  user: Pick<User, "orgId" | "workspace"> | null | undefined
): boolean {
  if (!user?.orgId) return false;
  return user.workspace !== "personal";
}

/** API / UI workspace: null when the user has no team. */
export function workspaceFromUser(
  user: Pick<User, "orgId" | "workspace"> | null | undefined
): "personal" | "team" | null {
  if (!user?.orgId) return null;
  return user.workspace === "personal" ? "personal" : "team";
}
