import { IoClose } from "react-icons/io5";

/** Close button, accent progress bar and a "current/total" counter. `progress` is 0–100. */
export default function ProgressHeader({
  progress,
  currentCount,
  totalCount,
  onClose,
}: {
  progress: number;
  currentCount: number;
  totalCount: number;
  onClose: () => void;
}) {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <header className="flex shrink-0 items-center border-b border-[#e5e7eb] bg-white px-5 py-4">
      <button
        type="button"
        onClick={onClose}
        aria-label="Exit practise"
        // Negative margin keeps the visual position while giving a larger tap target.
        className="-m-2 mr-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-[#9ca3af] active:bg-black/5"
      >
        <IoClose size={18} />
      </button>
      <div className="flex flex-1 items-center">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={totalCount}
          aria-valuenow={currentCount}
          aria-label="Progress"
          className="mr-3 h-2 flex-1 overflow-hidden rounded bg-[#e5e7eb]"
        >
          <div
            className="h-full rounded bg-accent transition-[width] duration-300 ease-out"
            style={{ width: `${clamped}%` }}
          />
        </div>
        <span className="min-w-[45px] text-[15px] font-semibold text-text tabular-nums">
          {currentCount}/{totalCount}
        </span>
      </div>
    </header>
  );
}
