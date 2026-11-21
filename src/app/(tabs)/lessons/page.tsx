"use client";

import Link from "next/link";
import { IoFlash, IoStar, IoStarOutline } from "react-icons/io5";
import Ionicon from "@/components/Ionicon";
import StatItem from "@/components/StatItem";
import { useLessonProgress } from "@/hooks/useLessonProgress";
import { useSpeakingListeningStats } from "@/hooks/useSpeakingListeningStats";
import { COURSE_DATA, type Lesson } from "@/lib/course";

const MAX_STARS = 3;

function practiseHref(lessonId: string) {
  return `/practise?lessonId=${encodeURIComponent(lessonId)}`;
}

function CompletionStars({ count }: { count: number }) {
  const filled = Math.min(count, MAX_STARS);
  return (
    <div
      className="flex items-center"
      role="img"
      aria-label={`Completed ${count} ${count === 1 ? "time" : "times"}`}
    >
      {Array.from({ length: MAX_STARS }, (_, i) =>
        i < filled ? (
          <IoStar key={i} size={16} color="#FFD700" className="mr-[3px]" />
        ) : (
          <IoStarOutline key={i} size={16} className="mr-[3px] text-subdued" />
        ),
      )}
      {count > MAX_STARS && (
        <span className="ml-1 text-sm font-bold text-subdued">+{count - MAX_STARS}</span>
      )}
    </div>
  );
}

function LessonNode({ lesson, index, count }: { lesson: Lesson; index: number; count: number }) {
  const isMastered = count >= MAX_STARS;
  return (
    <div className={`flex min-h-20 items-center ${index % 2 === 0 ? "justify-start" : "justify-end"}`}>
      <Link
        href={practiseHref(lesson.id)}
        className={`flex w-4/5 items-center gap-4 rounded-3xl border-2 bg-white px-5 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-transform active:scale-[0.98] ${
          isMastered ? "border-accent" : "border-border"
        }`}
      >
        <Ionicon name={lesson.icon} size={28} className="shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 text-base font-semibold text-text">{lesson.title}</p>
          <CompletionStars count={count} />
        </div>
      </Link>
    </div>
  );
}

export default function LessonsPage() {
  const { stats, loading } = useSpeakingListeningStats();
  const progress = useLessonProgress();

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h1 className="text-[22px] font-bold text-text">This week</h1>
          <p className="-mt-0.5 text-sm text-subdued">In reviews</p>
        </div>
        <div className="flex items-center gap-4">
          <StatItem
            value={loading ? "-" : Math.floor(stats?.minutesSpoken ?? 0)}
            change={Math.floor(stats?.weeklyChange.spoken ?? 0)}
            label="minutes spoken"
          />
          <div className="h-6 w-px bg-border" />
          <StatItem
            value={loading ? "-" : Math.floor(stats?.minutesListened ?? 0)}
            change={Math.floor(stats?.weeklyChange.listened ?? 0)}
            label="minutes listened"
          />
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-5 pt-6 pb-12">
        {COURSE_DATA.chapters.map((chapter) => (
          <section key={chapter.id} className="mb-6" aria-labelledby={`chapter-${chapter.id}`}>
            <div className="mb-6">
              <p className="text-sm font-bold text-[#8e8e93] uppercase">Chapter {chapter.id}</p>
              <h2
                id={`chapter-${chapter.id}`}
                className="mt-1 text-[32px] leading-8 font-bold text-text"
              >
                {chapter.title}
              </h2>
            </div>

            <div className="flex flex-col gap-5">
              {chapter.lessons.map((lesson, index) => (
                <LessonNode
                  key={lesson.id}
                  lesson={lesson}
                  index={index}
                  count={progress[lesson.id] || 0}
                />
              ))}
            </div>

            {chapter.review && (
              <div className="my-6 flex justify-center">
                <Link
                  href={practiseHref(chapter.review.id)}
                  className="flex items-center justify-center gap-2 rounded-3xl bg-accent px-6 py-3 text-base font-bold text-white shadow-[0_4px_5px_rgba(0,0,0,0.2)] transition-transform active:scale-[0.98]"
                >
                  <IoFlash size={20} aria-hidden />
                  Review &apos;{chapter.title}&apos;
                </Link>
              </div>
            )}
          </section>
        ))}
      </main>
    </div>
  );
}
