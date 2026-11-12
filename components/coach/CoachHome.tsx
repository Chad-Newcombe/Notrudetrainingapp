"use client";

import { useEffect, useState } from "react";
import { CoachNavigation } from "@/components/coach/CoachChat";
import { CoachStage } from "@/components/coach/CoachStage";
import { CoachSwitcher } from "@/components/coach/CoachSwitcher";
import { ConversationQueue } from "@/components/coach/ConversationQueue";
import { StartCoachChat } from "@/components/coach/StartCoachChat";
import { getCoach } from "@/lib/coaches/presets";
import { listCoachConversations, migrateLegacyChat } from "@/lib/store";
import type { CoachConversation, UserProfile } from "@/lib/types";

export function CoachHome({ profile }: { profile: UserProfile }) {
  const [selectedProfile, setSelectedProfile] = useState(profile);
  const [conversations, setConversations] = useState<CoachConversation[] | null>(null);
  const [error, setError] = useState("");
  const coach = getCoach(selectedProfile.coachId);

  useEffect(() => {
    let current = true;
    setConversations(null);
    setError("");
    void (async () => {
      await migrateLegacyChat(selectedProfile);
      const records = await listCoachConversations(selectedProfile.coachId);
      if (current) setConversations(records);
    })().catch(() => { if (current) setError("Couldn’t load previous chats. Try opening Coach again."); });
    return () => { current = false; };
  }, [selectedProfile]);

  return (
    <div className="flex flex-col gap-5">
      <CoachNavigation />
      <CoachStage coachId={coach.id} label="Your coach" title={coach.name} description={coach.vibe}>
        <StartCoachChat key={coach.id} coachId={coach.id} />
      </CoachStage>
      {error ? <p role="alert" className="text-sm text-[var(--app-muted)]">{error}</p> : conversations === null ? (
        <p role="status" className="text-sm text-[var(--app-muted)]">Loading previous chats…</p>
      ) : <ConversationQueue conversations={conversations} coachId={coach.id} />}
      <CoachSwitcher profile={selectedProfile} onChanged={setSelectedProfile} />
    </div>
  );
}
