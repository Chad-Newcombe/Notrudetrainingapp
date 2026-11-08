import { NotrudeMark } from "@/components/brand/NotrudeMark";
import { Button } from "@/components/ui/Button";

export default function WelcomePage() {
  return (
    <main className="flex min-h-[100dvh] flex-col justify-between px-6 pb-8 pt-[max(2.5rem,env(safe-area-inset-top))]">
      <div className="flex flex-1 flex-col justify-center gap-8">
        <NotrudeMark />
        <div className="space-y-4">
          <h1 className="font-display text-3xl font-medium leading-tight text-[var(--ink)]">
            Training that meets you where you are.
          </h1>
          <p className="max-w-[32ch] text-lg leading-relaxed text-[var(--muted)]">
            Set a goal on your terms—no shame, no streak pressure—just a plan
            that adapts when life happens.
          </p>
        </div>
      </div>
      <Button href="/quiz" className="w-full">
        Start with a short quiz
      </Button>
    </main>
  );
}
