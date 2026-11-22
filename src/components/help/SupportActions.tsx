"use client";

import { useId, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  IoChevronDown,
  IoCopyOutline,
  IoLogoGoogle,
  IoMailOutline,
  IoOpenOutline,
  IoTrashOutline,
} from "react-icons/io5";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { CONTACT_EMAIL } from "@/lib/legal";

interface Email {
  subject: string;
  body?: string;
}

type ActionId = "support" | "deletion";

function mailto({ subject, body }: Email) {
  const params = [`subject=${encodeURIComponent(subject)}`];
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${CONTACT_EMAIL}?${params.join("&")}`;
}

/** Gmail's web compose window, for desktops where mailto: has no mail app to open. */
function gmailCompose({ subject, body }: Email) {
  const params = new URLSearchParams({ view: "cm", fs: "1", to: CONTACT_EMAIL, su: subject });
  if (body) params.set("body", body);
  return `https://mail.google.com/mail/?${params.toString()}`;
}

async function copyAddress() {
  try {
    await navigator.clipboard.writeText(CONTACT_EMAIL);
    toast.success("Email copied");
  } catch {
    // Clipboard API missing (insecure context, old browser) or permission denied.
    toast(`Our email: ${CONTACT_EMAIL}`, { duration: 10000 });
  }
}

const COARSE_POINTER = "(pointer: coarse)";

function subscribeCoarsePointer(callback: () => void) {
  const query = window.matchMedia(COARSE_POINTER);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

/**
 * True on touch devices, where mailto: reliably opens a mail app. The server snapshot is false, so
 * the option stays hidden through hydration and appears once the client knows (no mismatch).
 */
function useIsTouchDevice(): boolean {
  return useSyncExternalStore(
    subscribeCoarsePointer,
    () => window.matchMedia(COARSE_POINTER).matches,
    () => false,
  );
}

const optionClass =
  "flex min-h-11 w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-[15px] font-semibold !text-text !no-underline";

/** A main button that toggles a panel of ways to send `email`. */
function EmailAction({
  email,
  label,
  icon,
  buttonClass,
  open,
  onToggle,
}: {
  email: Email;
  label: string;
  icon: ReactNode;
  buttonClass: string;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();
  // Desktops often have no mail app, so a mailto link there does nothing: offer Gmail/copy only.
  const showMailApp = useIsTouchDevice();

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-3xl px-5 py-4 text-base font-semibold ${buttonClass}`}
      >
        {icon}
        {label}
        <IoChevronDown
          size={18}
          aria-hidden
          className={`motion-safe:transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* grid-rows 0fr → 1fr animates to the content's natural height. `inert` keeps the
          collapsed options out of the tab order and the accessibility tree. */}
      <div
        id={panelId}
        role="region"
        aria-label={`${label} options`}
        inert={!open}
        className={`grid motion-safe:transition-[grid-template-rows,opacity] motion-safe:duration-200 motion-safe:ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mt-2 overflow-hidden rounded-2xl border-2 border-border [&>*:not(:last-child)]:border-b [&>*:not(:last-child)]:border-border">
            {showMailApp && (
              <a href={mailto(email)} className={optionClass}>
                <IoMailOutline size={20} className="text-subdued" aria-hidden />
                Open email app
              </a>
            )}
            <a
              href={gmailCompose(email)}
              target="_blank"
              rel="noopener noreferrer"
              className={optionClass}
            >
              <IoLogoGoogle size={20} className="text-subdued" aria-hidden />
              <span className="flex-1">Open in Gmail</span>
              <IoOpenOutline size={16} className="text-subdued" aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <button type="button" onClick={copyAddress} className={optionClass}>
              <IoCopyOutline size={20} className="text-subdued" aria-hidden />
              Copy email address
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Contact + account-deletion actions; the deletion email carries the signed-in address. */
export default function SupportActions() {
  const { user } = useAuth();
  const [openAction, setOpenAction] = useState<ActionId | null>(null);
  const toggle = (id: ActionId) => setOpenAction((current) => (current === id ? null : id));

  const deletionBody = [
    "Please delete my Convo account and all data stored about it.",
    "",
    `Account email: ${user?.email ?? "(not available)"}`,
  ].join("\n");

  return (
    <div className="flex flex-col gap-3">
      <EmailAction
        email={{ subject: "Convo support" }}
        label="Contact support"
        icon={<IoMailOutline size={20} aria-hidden />}
        buttonClass="bg-accent text-white"
        open={openAction === "support"}
        onToggle={() => toggle("support")}
      />
      <EmailAction
        email={{ subject: "Delete my Convo account", body: deletionBody }}
        label="Request account deletion"
        icon={<IoTrashOutline size={20} aria-hidden />}
        buttonClass="border-2 border-border text-[#DC2626]"
        open={openAction === "deletion"}
        onToggle={() => toggle("deletion")}
      />
    </div>
  );
}
