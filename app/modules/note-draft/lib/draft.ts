import { MAX_NOTE_LENGTH } from "~/lib/notes";

export type NoteDraft = {
  length: number;
  maxLength: number;
  tooLong: boolean;
  unsaved: boolean;
  canSave: boolean;
};

export function describeDraft(
  body: string,
  savedBody: string | null
): NoteDraft {
  // The save action trims before it stores, so measure and compare what it
  // will store; otherwise a trailing newline reads as unsaved forever.
  const stored = body.trim();
  const length = stored.length;
  const tooLong = length > MAX_NOTE_LENGTH;
  const empty = length === 0;
  const unsaved = stored !== (savedBody ?? "");

  return {
    length,
    maxLength: MAX_NOTE_LENGTH,
    tooLong,
    unsaved,
    canSave: unsaved && !empty && !tooLong,
  };
}
