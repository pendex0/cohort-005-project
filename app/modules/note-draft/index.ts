import { describeDraft, type NoteDraft } from "./lib/draft";

export type { NoteDraft };

/**
 * What the Lesson page's note editor shows for the text being typed: the
 * character count against the limit, whether it differs from the saved Note,
 * and whether Save should be enabled.
 */
export function describeNoteDraft(
  body: string,
  savedBody: string | null
): NoteDraft {
  return describeDraft(body, savedBody);
}
