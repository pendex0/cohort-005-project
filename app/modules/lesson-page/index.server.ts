import { runLessonAction } from "./lib/act.server";
import { loadLessonPage } from "./lib/load.server";

/**
 * Everything the student-facing Lesson page reads and writes: the loader's
 * data (locked or full view) and the action's intents, each checking its own
 * capability.
 */
export const lessonPage = {
  load: loadLessonPage,
  act: runLessonAction,
};

export type LessonPageData = Awaited<ReturnType<typeof loadLessonPage>>;
