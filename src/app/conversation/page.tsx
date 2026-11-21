import { Suspense } from "react";
import ConversationContent from "./ConversationContent";

function Loading() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <span
        role="status"
        aria-label="Loading"
        className="h-8 w-8 animate-spin rounded-full border-[3px] border-black/10 border-t-accent"
      />
    </div>
  );
}

// useSearchParams lives in ConversationContent, so it must sit inside a Suspense boundary.
export default function ConversationPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ConversationContent />
    </Suspense>
  );
}
