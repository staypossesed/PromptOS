/** Feature-specific allowlist; does not confer general platform administrator access. */
export const ADMIN_GENERATOR_OWNER_EMAIL = "vanarnold.etsy@gmail.com";
export interface GeneratorIdentity { id?: string; email?: string | null; email_confirmed_at?: string | null; is_anonymous?: boolean; }
export function canUseAdminGenerator(user: GeneratorIdentity | null | undefined): boolean {
  return !!user?.id && user.is_anonymous !== true &&
    typeof user.email_confirmed_at === "string" && Number.isFinite(Date.parse(user.email_confirmed_at)) &&
    user.email?.trim().toLowerCase() === ADMIN_GENERATOR_OWNER_EMAIL;
}
