import Link from "next/link";
import { conversationsForCoach } from "@/lib/coach/conversations";
import type { CoachConversation, CoachId } from "@/lib/types";

export function ConversationQueue({ conversations, coachId }: {
  conversations: CoachConversation[];
  coachId: CoachId;
}) {
  const archives = conversationsForCoach(conversations, coachId).filter((record) => record.status === "archived");
  return (
    <section aria-labelledby="coach-history-heading" className="flex flex-col gap-3">
      <h2 id="coach-history-heading" className="meta-label">Previous chats</h2>
      {archives.length === 0 ? <p className="text-sm text-[var(--app-muted)]">No previous chats with this coach yet.</p> : (
        <ul aria-label="Previous chats" className="flex flex-col gap-3">
          {archives.map((record) => {
            const date = record.archivedAt ?? record.updatedAt;
            return (
              <li key={record.id}>
                <Link href={`/coach/history/${record.id}`} className="panel block p-4 focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--app-focus)]">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-semibold text-[var(--app-text)]">{record.title || "Conversation"}</h3>
                    <time dateTime={date} className="text-xs text-[var(--app-muted)]">{new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</time>
                  </div>
                  {record.summary ? <p className="mt-2 truncate text-sm text-[var(--app-muted)]">{record.summary}</p> : null}
                  {record.resultLabels.length > 0 ? <div className="mt-3 flex flex-wrap gap-2">
                    {record.resultLabels.map((label, index) => <span key={index} className="rounded-[var(--radius-control)] border border-[var(--app-line)] px-2 py-1 text-xs font-semibold text-[var(--app-text)]">{label}</span>)}
                  </div> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
