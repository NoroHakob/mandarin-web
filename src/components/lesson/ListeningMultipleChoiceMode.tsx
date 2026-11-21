"use client";

import type { ListeningOption } from "@/lib/course";

/** Pick the English meaning of what was just heard. */
export default function ListeningMultipleChoiceMode({
  options,
  selectedOption,
  onOptionPress,
  disabled,
}: {
  options: ListeningOption[];
  selectedOption: number | null;
  onOptionPress: (id: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col">
      <h2 className="mb-5 flex min-h-[30px] items-center justify-center text-center text-lg font-semibold text-text">
        What did you just hear?
      </h2>
      <ul className="flex flex-col gap-4">
        {options.map((option) => {
          const isSelected = selectedOption === option.id;
          return (
            <li key={option.id}>
              <button
                type="button"
                aria-pressed={isSelected}
                disabled={disabled}
                onClick={() => onOptionPress(option.id)}
                className={`w-full cursor-pointer rounded-xl border-2 bg-white p-5 text-left text-base font-medium text-text shadow-[0_2px_4px_rgba(0,0,0,0.08)] transition-colors active:bg-[#f9fafb] disabled:cursor-default disabled:opacity-70 ${
                  isSelected ? "border-accent" : "border-[#e5e7eb]"
                }`}
              >
                {option.english}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
