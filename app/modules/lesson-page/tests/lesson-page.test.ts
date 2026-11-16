import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestDb, seedBaseData, type TestDb } from "~/test/setup";
import * as schema from "~/db/schema";
import { setCurrentUserId } from "~/lib/session";
import { enrollStudentInTransaction } from "~/lib/enrollments.server";
import { lessonPage } from "../index.server";

// The module reads the app's shared `db`; point it at a fresh in-memory
// database per test.
const current = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("~/db", () => ({
  db: new Proxy(
    {},
    {
      get(_target, prop) {
        const target = current.db as object;
        const value = Reflect.get(target, prop);
        return typeof value === "function" ? value.bind(target) : value;
      },
    }
  ),
}));

let db: TestDb;
let base: ReturnType<typeof seedBaseData>;
let lessonIds: number[];

beforeEach(() => {
  db = createTestDb();
  current.db = db;
  base = seedBaseData(db);
  const mod = db
    .insert(schema.modules)
    .values({ courseId: base.course.id, title: "Basics", position: 1 })
    .returning()
    .get();
  lessonIds = ["First", "Second", "Third"].map(
    (title, index) =>
      db
        .insert(schema.lessons)
        .values({ moduleId: mod.id, title, position: index + 1 })
        .returning()
        .get().id
  );
});

// ─── Fixtures ───

function enrol(studentId: number) {
  enrollStudentInTransaction(db, studentId, base.course.id, new Date());
}

async function signedIn(userId: number, body?: Record<string, string>) {
  const setCookie = await setCurrentUserId(
    new Request("http://localhost/"),
    userId
  );
  return new Request("http://localhost/", {
    method: body ? "POST" : "GET",
    headers: { Cookie: setCookie.split(";")[0] },
    body: body ? new URLSearchParams(body) : undefined,
  });
}

function params(lessonId: number, slug = base.course.slug) {
  return { slug, lessonId: String(lessonId) };
}

async function load(lessonId: number) {
  return lessonPage.load(await signedIn(base.user.id), params(lessonId));
}

async function fullView(lessonId: number) {
  const page = await load(lessonId);
  if (page.view !== "full") throw new Error(`expected full, got ${page.view}`);
  return page;
}

async function act(lessonId: number, body: Record<string, string>) {
  return lessonPage.act(await signedIn(base.user.id, body), params(lessonId));
}

async function statusOf(promise: Promise<unknown>) {
  try {
    await promise;
    return "resolved";
  } catch (thrown) {
    return (thrown as { init?: { status?: number } }).init?.status;
  }
}

// ─── Tests ───

describe("lessonPage.load", () => {
  it("shows an enrolled Student the full lesson, with its neighbours", async () => {
    enrol(base.user.id);

    const page = await fullView(lessonIds[1]);

    expect(page.lesson.title).toBe("Second");
    expect(page.prevLesson?.title).toBe("First");
    expect(page.nextLesson?.title).toBe("Third");
    expect(page.note).toBeNull();
    expect(page.bookmarked).toBe(false);
  });

  it("has no previous lesson on the first, and no next on the last", async () => {
    enrol(base.user.id);

    expect((await fullView(lessonIds[0])).prevLesson).toBeNull();
    expect((await fullView(lessonIds[2])).nextLesson).toBeNull();
  });

  it("locks the lesson for a Student who is not enrolled", async () => {
    const page = await load(lessonIds[0]);

    expect(page.view).toBe("locked");
    expect(page).not.toHaveProperty("note");
  });

  it("is not found through another course's slug", async () => {
    enrol(base.user.id);

    const request = await signedIn(base.user.id);
    const result = lessonPage.load(request, params(lessonIds[0], "nope"));

    expect(await statusOf(result)).toBe(404);
  });
});

describe("lessonPage.act", () => {
  it("saves a Note that the next load shows", async () => {
    enrol(base.user.id);

    const result = await act(lessonIds[0], {
      intent: "save-note",
      body: "  Remember the generics bit  ",
    });

    expect(result).toEqual({ ok: true });
    expect((await fullView(lessonIds[0])).note?.body).toBe(
      "Remember the generics bit"
    );
  });

  it("refuses a blank Note", async () => {
    enrol(base.user.id);

    const result = await act(lessonIds[0], { intent: "save-note", body: " " });

    expect(result).toEqual({
      ok: false,
      error: "Write something before saving your note.",
    });
  });

  it("toggles the Bookmark on and off", async () => {
    enrol(base.user.id);

    await act(lessonIds[0], { intent: "toggle-bookmark" });
    expect((await fullView(lessonIds[0])).bookmarked).toBe(true);

    await act(lessonIds[0], { intent: "toggle-bookmark" });
    expect((await fullView(lessonIds[0])).bookmarked).toBe(false);
  });

  it("marks the lesson complete", async () => {
    enrol(base.user.id);

    await act(lessonIds[0], { intent: "mark-complete" });

    expect((await fullView(lessonIds[0])).lessonStatus).toBe(
      schema.LessonProgressStatus.Completed
    );
  });

  it("rejects an unknown intent", async () => {
    enrol(base.user.id);

    expect(await statusOf(act(lessonIds[0], { intent: "bogus" }))).toBe(400);
  });

  it("forbids a Student who is not enrolled from saving a Note", async () => {
    const result = act(lessonIds[0], { intent: "save-note", body: "x" });

    expect(await statusOf(result)).toBe(403);
  });
});
