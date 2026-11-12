"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmSharedFact } from "@/components/coach/ConfirmSharedFact";
import { COACH_PRESETS } from "@/lib/coaches/presets";
import { removeMemoryEntry } from "@/lib/coaches/relationship";
import { getCoachRelationship, saveCoachRelationship } from "@/lib/store";
import type { CoachId, CoachRelationship, SharedFactCandidate } from "@/lib/types";

const removeClass = "min-h-11 text-left text-sm font-semibold underline focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--app-focus)]";
const label = (key: string) => key.replace(/_/g, " ").replace(/^./, (first) => first.toUpperCase());
const category = (key: string) => /^(ability|constraint|schedule)/.exec(key)?.[1] as SharedFactCandidate["category"] | undefined;

export function CoachMemoryManager() {
  const [memories, setMemories] = useState<CoachRelationship[] | null>(null);
  const [error, setError] = useState("");
  // getCoachRelationship already returns an empty record for missing or corrupt data.
  const load = useCallback(() => Promise.all(COACH_PRESETS.map((coach) => getCoachRelationship(coach.id))).then(setMemories), []);
  useEffect(() => { void load().catch(() => setMemories([])); }, [load]);

  // Re-read before writing so a removal only drops the selected item.
  async function change(coachId: CoachId, update: (current: CoachRelationship, now: string) => CoachRelationship) {
    setError("");
    try {
      await saveCoachRelationship(update(await getCoachRelationship(coachId), new Date().toISOString()));
      await load();
    } catch { setError("Couldn’t remove that. Try again."); }
  }

  return (
    <section className="border-t border-[var(--app-line)] pt-7" aria-labelledby="coach-memory-heading">
      <h2 id="coach-memory-heading" className="text-base font-semibold text-[var(--app-text)]">What your coaches remember</h2>
      <p className="mt-1 text-sm text-[var(--app-muted)]">Each coach keeps its own notes. Removing a note doesn’t change your previous chats.</p>
      {error ? <p role="alert" className="mt-2 text-sm">{error}</p> : null}
      {!memories ? <p role="status" className="mt-3 text-sm text-[var(--app-muted)]">Loading…</p> : COACH_PRESETS.map((coach) => {
        const memory = memories.find((item) => item.coachId === coach.id);
        const empty = !memory || (!memory.learnedPreferences.length && !memory.rejectedPatterns.length && !memory.declinedSwitchSuggestion);
        const remove = `Remove from ${coach.name}'s memory`;
        return (
          <section key={coach.id} aria-label={`${coach.name}'s memory`} className="mt-5">
            <h3 className="meta-label">{coach.name}</h3>
            {empty ? <p className="mt-2 text-sm text-[var(--app-muted)]">Nothing saved yet.</p> : (
              <ul className="mt-2 flex flex-col gap-3">
                {memory.learnedPreferences.map((entry) => {
                  const shared = category(entry.key);
                  return (
                    <li key={entry.id} className="panel flex flex-col gap-1 p-4">
                      <p className="font-semibold text-[var(--app-text)]">{label(entry.key)}: {entry.value}</p>
                      <p className="text-sm text-[var(--app-muted)]">You said: “{entry.evidence}”</p>
                      {shared && entry.value.trim().length <= 220 ? <ConfirmSharedFact candidate={{ coachId: coach.id, category: shared, statement: entry.value, evidence: entry.evidence }} /> : null}
                      <button type="button" className={removeClass} aria-label={`${remove}: ${label(entry.key)}`}
                        onClick={() => void change(coach.id, (current, now) => removeMemoryEntry(current, entry.id, now))}>{remove}</button>
                    </li>
                  );
                })}
                {memory.rejectedPatterns.map((pattern) => (
                  <li key={pattern} className="panel flex flex-col gap-1 p-4">
                    <p className="font-semibold text-[var(--app-text)]">Avoids: {pattern}</p>
                    <button type="button" className={removeClass} aria-label={`${remove}: ${pattern}`}
                      onClick={() => void change(coach.id, (current, now) => ({ ...current, rejectedPatterns: current.rejectedPatterns.filter((item) => item !== pattern), updatedAt: now }))}>{remove}</button>
                  </li>
                ))}
                {memory.declinedSwitchSuggestion ? (
                  <li className="panel flex flex-col gap-1 p-4">
                    <p className="font-semibold text-[var(--app-text)]">You chose to stay with {coach.name}, so it won’t suggest another coach.</p>
                    <button type="button" className={removeClass} aria-label={`${remove}: stay choice`}
                      onClick={() => void change(coach.id, (current, now) => ({ ...current, declinedSwitchSuggestion: false, updatedAt: now }))}>{remove}</button>
                  </li>
                ) : null}
              </ul>
            )}
          </section>
        );
      })}
    </section>
  );
}
