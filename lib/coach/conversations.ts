import type {
  ChatMessage,
  CoachConversation,
  CoachId,
  ConversationArchive,
} from "@/lib/types";

export function newCoachConversation(
  coachId: CoachId,
  now: string,
  continuedFromId?: string,
): CoachConversation {
  return {
    id: crypto.randomUUID(),
    coachId,
    status: "active",
    messages: [],
    resultLabels: [],
    ...(continuedFromId === undefined ? {} : { continuedFromId }),
    createdAt: now,
    updatedAt: now,
  };
}

export function withConversationMessages(
  conversation: CoachConversation,
  messages: ChatMessage[],
  now: string,
): CoachConversation {
  return {
    ...conversation,
    messages: [...messages],
    updatedAt: now,
  };
}

export function archiveConversation(
  conversation: CoachConversation,
  archive: ConversationArchive,
  now: string,
): CoachConversation {
  return {
    ...conversation,
    status: "archived",
    ...(archive.title === undefined ? {} : { title: archive.title }),
    ...(archive.summary === undefined ? {} : { summary: archive.summary }),
    resultLabels: [...archive.resultLabels],
    updatedAt: now,
    archivedAt: now,
  };
}

export function shouldDiscardConversation(conversation: CoachConversation): boolean {
  return conversation.messages.length === 0;
}

export function conversationsForCoach(
  records: CoachConversation[],
  coachId: CoachId,
): CoachConversation[] {
  return records
    .filter((conversation) => conversation.coachId === coachId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}
