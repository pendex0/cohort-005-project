import { describe, it, expect } from "vitest";
import { MAX_NOTE_LENGTH } from "~/lib/notes";
import { describeNoteDraft } from "../index";

describe("describeNoteDraft", () => {
  it("cannot save a first note that is still empty", () => {
    const draft = describeNoteDraft("", null);

    expect(draft).toEqual({
      length: 0,
      maxLength: MAX_NOTE_LENGTH,
      tooLong: false,
      empty: true,
      unsaved: false,
      canSave: false,
    });
  });

  it("treats whitespace alone as empty", () => {
    const draft = describeNoteDraft("   \n ", null);

    expect(draft.empty).toBe(true);
    expect(draft.canSave).toBe(false);
  });

  it("can save a first note once something is written", () => {
    const draft = describeNoteDraft(
      "Generics are like function arguments",
      null
    );

    expect(draft.unsaved).toBe(true);
    expect(draft.canSave).toBe(true);
  });

  it("has nothing to save when the draft matches the saved note", () => {
    const draft = describeNoteDraft("Saved text", "Saved text");

    expect(draft.unsaved).toBe(false);
    expect(draft.canSave).toBe(false);
  });

  it("can save an edit to a saved note", () => {
    const draft = describeNoteDraft("Saved text, edited", "Saved text");

    expect(draft.unsaved).toBe(true);
    expect(draft.canSave).toBe(true);
  });

  it("allows a note at exactly the limit", () => {
    const draft = describeNoteDraft("a".repeat(MAX_NOTE_LENGTH), null);

    expect(draft.length).toBe(MAX_NOTE_LENGTH);
    expect(draft.tooLong).toBe(false);
    expect(draft.canSave).toBe(true);
  });

  it("refuses a note one character over the limit", () => {
    const draft = describeNoteDraft("a".repeat(MAX_NOTE_LENGTH + 1), null);

    expect(draft.tooLong).toBe(true);
    expect(draft.canSave).toBe(false);
  });

  it("refuses to save a cleared note over a saved one", () => {
    const draft = describeNoteDraft("", "Saved text");

    expect(draft.unsaved).toBe(true);
    expect(draft.canSave).toBe(false);
  });

  it("has nothing to save once the server has trimmed the saved note", () => {
    const draft = describeNoteDraft("Saved text \n", "Saved text");

    expect(draft.unsaved).toBe(false);
    expect(draft.canSave).toBe(false);
  });

  it("counts the length the server will store, without surrounding whitespace", () => {
    const draft = describeNoteDraft(` ${"a".repeat(MAX_NOTE_LENGTH)} `, null);

    expect(draft.length).toBe(MAX_NOTE_LENGTH);
    expect(draft.tooLong).toBe(false);
    expect(draft.canSave).toBe(true);
  });
});
