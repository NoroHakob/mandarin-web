"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { IoArrowBack } from "react-icons/io5";
import Ionicon from "@/components/Ionicon";
import { findLesson } from "@/lib/course";

// Placeholder until the practise flow is ported.
export default function PractiseContent() {
  const router = useRouter();
  const lessonId = useSearchParams().get("lessonId");
  const lesson = lessonId ? findLesson(lessonId) : undefined;

  const goBack = () => {
    // Opened directly (no in-app history): go to the lessons tab instead of leaving the site.
    if (window.history.length > 1) router.back();
    else router.replace("/lessons");
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-white">
      <header className="flex h-[60px] shrink-0 items-center px-5">
        <button
          type="button"
          onClick={goBack}
          aria-label="Back"
          className="cursor-pointer text-text"
        >
          <IoArrowBack size={24} />
        </button>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
        {lesson ? (
          <>
            <Ionicon name={lesson.icon} size={48} className="text-accent" />
            <h1 className="text-[28px] leading-8 font-bold text-text">{lesson.title}</h1>
            <p className="text-sm text-subdued">
              {lesson.questions.length} questions · practice coming next
            </p>
          </>
        ) : (
          <h1 className="text-2xl font-bold text-text">Lesson not found</h1>
        )}
        <button
          type="button"
          onClick={goBack}
          className="mt-4 cursor-pointer rounded-3xl border-2 border-border px-6 py-3 text-base font-semibold text-text"
        >
          Back
        </button>
      </main>
    </div>
  );
}
