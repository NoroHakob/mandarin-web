"use client";

import { IoMicOutline } from "react-icons/io5";
import type { SpeakingOption } from "@/lib/course";

/** Pick an English response, then say it in Mandarin with the mic above. */
export default function MultipleChoiceMode({
  options,
  selectedOption,
  onOptionPress,
  disabled,
}: {
  options: SpeakingOption[];
  selectedOption: number | null;
  onOptionPress: (id: number) => void;
  disabled: boolean;
}) {
  const hasSelection = selectedOption !== null;

  return (
    <div className="flex flex-col">
      {/* The two headings cross-fade in the same spot. */}
      <div className="relative mb-5 flex min-h-[30px] items-center justify-center">
        <h2
          className={`text-center text-lg font-semibold text-text transition-[opacity,transform] duration-300 ${
            hasSelection ? "-translate-y-2.5 opacity-0" : "opacity-100"
          }`}
          aria-hidden={hasSelection}
        >
          Choose your response:
        </h2>
        <h2
          className={`absolute text-center text-lg font-semibold text-accent transition-[opacity,transform] duration-300 ${
            hasSelection ? "opacity-100" : "translate-y-2.5 opacity-0"
          }`}
          aria-hidden={!hasSelection}
        >
          Now, say it in Mandarin
        </h2>
      </div>

      <ul className="flex flex-col gap-4">
        {options.map((option) => {
          const isSelected = selectedOption === option.id;
          const dimmed = hasSelection && !isSelected;
          return (
            <li
              key={option.id}
              className={`transition-[opacity,transform] duration-300 ${
                dimmed ? "scale-95 opacity-40" : "opacity-100"
              }`}
            >
              <button
                type="button"
                aria-pressed={isSelected}
                disabled={disabled}
                onClick={() => onOptionPress(option.id)}
                className={`flex w-full cursor-pointer items-center justify-between rounded-xl border-2 bg-white p-5 text-left shadow-[0_2px_4px_rgba(0,0,0,0.08)] transition-colors disabled:cursor-default disabled:opacity-70 ${
                  isSelected ? "border-accent shadow-[0_2px_6px_rgba(0,0,0,0.15)]" : "border-[#e5e7eb]"
                }`}
              >
                <span className="flex-1 text-base font-medium text-text">{option.english}</span>
                {isSelected ? <IoMicOutline size={20} className="ml-3 shrink-0 text-accent" aria-hidden /> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
