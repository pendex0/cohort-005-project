import { MAX_NOTE_LENGTH } from "~/lib/notes";

export type NoteDraft = {
  length: number;
  maxLength: number;
  tooLong: boolean;
  empty: boolean;
  unsaved: boolean;
  canSave: boolean;
};

export function describeDraft(
  body: string,
  savedBody: string | null
): NoteDraft {
  const length = body.length;
  const tooLong = length > MAX_NOTE_LENGTH;
  // The save action rejects a blank Note, so a blank draft is never saveable.
  const empty = body.trim().length === 0;
  const unsaved = body !== (savedBody ?? "");

  return {
    length,
    maxLength: MAX_NOTE_LENGTH,
    tooLong,
    empty,
    unsaved,
    canSave: unsaved && !empty && !tooLong,
  };
}
