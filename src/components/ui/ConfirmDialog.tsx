"use client";

import { useEffect, useId, useRef } from "react";

/**
 * Modal confirm dialog. Uses `fixed`, which stays inside `.app-column` because the column's
 * transform makes it the containing block. Escape and a backdrop click both cancel.
 */
export default function ConfirmDialog({
  visible,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  destructive = false,
}: {
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}) {
  if (!visible) return null;

  return (
    <DialogCard
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      onConfirm={onConfirm}
      onCancel={onCancel}
      destructive={destructive}
    />
  );
}

// Split out so the focus/keyboard effect runs on each open (mount) rather than tracking `visible`.
function DialogCard({
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive,
}: {
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive: boolean;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Focus the safe choice first.
    cancelRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-5 motion-safe:animate-fade-in">
      <div className="absolute inset-0" onClick={onCancel} aria-hidden />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="relative w-full rounded-2xl bg-white p-4 shadow-xl"
      >
        <h2 id={titleId} className="text-lg font-semibold text-text">
          {title}
        </h2>
        {description ? (
          <p id={descriptionId} className="mt-2 text-base text-text/80">
            {description}
          </p>
        ) : null}

        <div className="mt-4 flex justify-end gap-2.5">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-[10px] bg-black/6 px-3.5 py-2.5 font-semibold text-text active:opacity-70"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`cursor-pointer rounded-[10px] px-3.5 py-2.5 font-semibold text-white active:opacity-70 ${
              destructive ? "bg-danger" : "bg-accent"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
