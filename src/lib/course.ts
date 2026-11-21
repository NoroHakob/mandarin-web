import courseData from "@/data/course_content.json";
import type { IoniconName } from "@/components/Ionicon";

// Types ported from reference/constants/CourseData.ts.

export interface CourseData {
  chapters: Chapter[];
  scenarios: ConversationScenario[];
}

export interface ConversationScenario {
  id: string;
  title: string;
  icon: IoniconName;
  isFree: boolean;
  description: string;
  goal: string;
  tasks: string[];
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  phrasebook?: PhrasebookEntry[];
}

export interface PhrasebookEntry {
  hanzi: string;
  pinyin: string;
  english: string;
}

export interface Chapter {
  id: number;
  title: string;
  lessons: Lesson[];
  review?: Lesson;
}

export interface Lesson {
  id: string;
  title: string;
  icon: IoniconName;
  completionCount: number;
  questions: Question[];
}

interface BaseQuestion {
  id: number;
}

export interface MandarinPrompt {
  hanzi: string;
  pinyin: string;
}

export interface Word {
  hanzi: string;
  pinyin: string;
  english: string;
}

export interface MandarinPhrase {
  hanzi: string;
  pinyin: string;
  words: Word[];
  breakdown: string;
}

export interface SpeakingOption {
  id: number;
  english: string;
  mandarin: MandarinPhrase;
}

export interface ListeningOption {
  id: number;
  english: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: "multiple_choice";
  mandarin: MandarinPrompt;
  options: SpeakingOption[];
}

export interface SingleResponseQuestion extends BaseQuestion {
  type: "single_response";
  mandarin: MandarinPrompt;
  options: [SpeakingOption];
}

export interface ListeningMultipleChoiceQuestion extends BaseQuestion {
  type: "listening_mc";
  mandarin: MandarinPrompt & {
    words: Word[];
    breakdown: string;
  };
  options: ListeningOption[];
  correctOptionId: number;
}

export type Question =
  | MultipleChoiceQuestion
  | SingleResponseQuestion
  | ListeningMultipleChoiceQuestion;

// JSON imports widen literal types (e.g. question `type`), so the cast goes through unknown.
export const COURSE_DATA = courseData as unknown as CourseData;

/** Finds a lesson or chapter review by id. */
export function findLesson(lessonId: string): Lesson | undefined {
  for (const chapter of COURSE_DATA.chapters) {
    const lesson = chapter.lessons.find((l) => l.id === lessonId);
    if (lesson) return lesson;
    if (chapter.review?.id === lessonId) return chapter.review;
  }
  return undefined;
}

/** Finds a preset conversation scenario by id. */
export function findScenario(scenarioId: string): ConversationScenario | undefined {
  return COURSE_DATA.scenarios.find((s) => s.id === scenarioId);
}
