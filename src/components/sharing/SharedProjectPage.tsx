import type { SharedProjectRecord } from '../../services/cloudStorageService';
import { SharedStemPlayer } from './SharedStemPlayer';

export function SharedProjectPage({ sharedProject }: { sharedProject: SharedProjectRecord }) {
  return (
    <main className="min-h-screen overflow-auto bg-[radial-gradient(circle_at_top,_#19324a,_#081018_55%,_#04070b)] px-4 py-10 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">ACE-Step Web Share</p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight">
            Preview, mute, solo, and rebalance each project stem directly in the browser.
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-zinc-300">
            This shared page opens without installing the DAW. Use space to play or pause, then adjust each track with dedicated mute, solo, and level controls.
          </p>
        </header>

        <SharedStemPlayer sharedProject={sharedProject} />
      </div>
    </main>
  );
}
