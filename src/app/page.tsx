import Image from "next/image";

export default function Home() {
  return (
    <main className="flex h-full flex-col items-center justify-center gap-4">
      <Image src="/images/logo.png" alt="Convo logo" width={96} height={96} priority />
      <h1 className="font-garamond text-4xl font-medium italic text-text">Convo</h1>
    </main>
  );
}
