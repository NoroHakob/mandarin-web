import { IoChatbubblesOutline } from "react-icons/io5";

export default function ConversationsPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-border px-4 py-3">
        <h1 className="text-[22px] font-bold text-text">Conversations</h1>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
        <IoChatbubblesOutline size={48} className="text-accent" aria-hidden />
        <p className="text-base text-subdued">Conversations — coming in Part 2</p>
      </main>
    </div>
  );
}
