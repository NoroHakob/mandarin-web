"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import VocabularyIntroScreen from "@/components/lesson/VocabularyIntroScreen";
import { findLesson, type Lesson } from "@/lib/course";

export default function PractiseContent() {
  const router = useRouter();
  const lessonId = useSearchParams().get("lessonId");
  const lesson = lessonId ? findLesson(lessonId) : undefined;
  const isPlayable = !!lesson && lesson.questions.length > 0;

  useEffect(() => {
    if (!isPlayable) router.replace("/lessons");
  }, [isPlayable, router]);

  if (!isPlayable) return null;

  // Keyed by lesson so switching lessons via the URL restarts the whole flow.
  return <PractiseSession key={lesson.id} lesson={lesson} />;
}

function PractiseSession({ lesson }: { lesson: Lesson }) {
  const [isStudyingVocabulary, setIsStudyingVocabulary] = useState(true);
  const startLesson = useCallback(() => setIsStudyingVocabulary(false), []);

  return (
    <div className="absolute inset-0 flex flex-col bg-white">
      {isStudyingVocabulary ? (
        <VocabularyIntroScreen questions={lesson.questions} onStartLesson={startLesson} />
      ) : (
        // Placeholder until LessonContent is ported.
        <main className="flex flex-1 items-center justify-center px-8 text-center">
          <p className="text-lg font-semibold text-text">Lesson questions — next step</p>
        </main>
      )}
    </div>
  );
}
