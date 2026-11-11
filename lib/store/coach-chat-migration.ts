import type { StoredRecord } from "@/lib/account/records";
import { archiveConversation, newCoachConversation, withConversationMessages } from "@/lib/coach/conversations";
import type { UserProfile } from "@/lib/types";
import { listChat } from "./chat";
import { readRecord, writeRecords } from "./storage";

const MIGRATION_KEY = "coach-conversation-migration-v2";

export async function migrateLegacyChat(profile: UserProfile): Promise<void> {
  if (await readRecord("meta", MIGRATION_KEY)) return;
  const messages = await listChat();
  const records: StoredRecord[] = [];
  if (messages.length > 0) {
    const now = new Date().toISOString();
    const conversation = archiveConversation(
      withConversationMessages({
        ...newCoachConversation(profile.coachId, messages[0].createdAt),
        // A stable ID also prevents duplicates when simultaneous callers see no marker.
        id: "legacy-chat-v2",
      }, messages, now),
      { title: "Legacy conversation", resultLabels: [] }, now,
    );
    records.push({ collection: "coachConversations", key: conversation.id, value: conversation });
  }
  records.push({ collection: "meta", key: MIGRATION_KEY, value: true });
  // Commit the archive and marker together so a failed write remains retryable.
  await writeRecords(records);
}
