import type { ConversationScenario } from "@/lib/course";

const DIFFICULTY_STYLES: Record<ConversationScenario["difficulty"], string> = {
  Beginner: "bg-success/15 text-[#1f7a35]",
  Intermediate: "bg-[#F59E0B]/15 text-[#92400E]",
  Advanced: "bg-danger/15 text-[#b91c1c]",
};

export default function DifficultyBadge({
  difficulty,
  className = "",
}: {
  difficulty: ConversationScenario["difficulty"];
  className?: string;
}) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${DIFFICULTY_STYLES[difficulty]} ${className}`}
    >
      {difficulty}
    </span>
  );
}
