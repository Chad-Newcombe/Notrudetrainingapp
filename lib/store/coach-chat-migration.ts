import { COACH_MIGRATION_KEY } from "@/lib/account/records";
import { archiveConversation, newCoachConversation, withConversationMessages } from "@/lib/coach/conversations";
import type { CoachConversation, UserProfile } from "@/lib/types";
import { listChat } from "./chat";
import { commitLegacyChatMigration, readRecord } from "./storage";

export async function migrateLegacyChat(profile: UserProfile): Promise<void> {
  if (await readRecord("meta", COACH_MIGRATION_KEY)) return;
  const messages = await listChat();
  let conversation: CoachConversation | undefined;
  if (messages.length > 0) {
    const now = new Date().toISOString();
    conversation = archiveConversation(
      withConversationMessages({
        ...newCoachConversation(profile.coachId, messages[0].createdAt),
        // The atomic migration operation preserves the first committed owner.
        id: "legacy-chat-v2",
      }, messages, now),
      { title: "Legacy conversation", resultLabels: [] }, now,
    );
  }
  // Recheck the marker inside the same transaction that conditionally inserts the archive.
  await commitLegacyChatMigration(conversation);
}
