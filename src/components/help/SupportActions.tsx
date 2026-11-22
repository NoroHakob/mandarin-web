"use client";

import { IoMailOutline, IoTrashOutline } from "react-icons/io5";
import { useAuth } from "@/lib/auth";
import { CONTACT_EMAIL } from "@/lib/legal";

function mailto(subject: string, body?: string) {
  const params = [`subject=${encodeURIComponent(subject)}`];
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${CONTACT_EMAIL}?${params.join("&")}`;
}

const buttonBase =
  "flex w-full items-center justify-center gap-2 rounded-3xl px-5 py-4 text-base font-semibold !no-underline";

/** Contact + account-deletion buttons; the deletion email carries the signed-in address. */
export default function SupportActions() {
  const { user } = useAuth();
  const email = user?.email ?? "(not available)";

  const deletionBody = [
    "Please delete my Convo account and all data stored about it.",
    "",
    `Account email: ${email}`,
  ].join("\n");

  return (
    <div className="flex flex-col gap-3">
      <a href={mailto("Convo support")} className={`${buttonBase} bg-accent !text-white`}>
        <IoMailOutline size={20} aria-hidden />
        Contact support
      </a>
      <a
        href={mailto("Delete my Convo account", deletionBody)}
        className={`${buttonBase} border-2 border-border !text-[#DC2626]`}
      >
        <IoTrashOutline size={20} aria-hidden />
        Request account deletion
      </a>
      <p className="!mb-0 text-center text-sm text-subdued">
        Both open your email app. You can also write to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </div>
  );
}
