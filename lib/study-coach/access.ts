/** Feature-specific access; does not grant platform administrator privileges. */
export const STUDY_COACH_OWNER_EMAIL = "vanarnold.etsy@gmail.com";

export interface StudyCoachIdentity {
  id?: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  is_anonymous?: boolean;
}

export function canUseStudyCoach(user: StudyCoachIdentity | null | undefined): boolean {
  return !!user?.id && user.is_anonymous !== true &&
    typeof user.email_confirmed_at === "string" && Number.isFinite(Date.parse(user.email_confirmed_at)) &&
    user.email?.trim().toLowerCase() === STUDY_COACH_OWNER_EMAIL;
}
