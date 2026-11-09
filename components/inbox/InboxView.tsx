"use client";

import { useCallback, useEffect, useState } from "react";
import { CoachAvatar } from "@/components/coach/CoachAvatar";
import { Button } from "@/components/ui/Button";
import { getCoach, DEFAULT_COACH_ID } from "@/lib/coaches/presets";
import { createId } from "@/lib/ids";
import { addMessage, listMessages } from "@/lib/store";
import type { ComposedMessage, UserProfile } from "@/lib/types";

type ComposeChannel = "text_style" | "email_outline";

type Props = {
  profile: UserProfile;
};

export function InboxView({ profile }: Props) {
  const coachId = profile.coachId ?? DEFAULT_COACH_ID;
  const coach = getCoach(coachId);
  const [messages, setMessages] = useState<ComposedMessage[]>([]);
  const [loading, setLoading] = useState<ComposeChannel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phoneDemo, setPhoneDemo] = useState(false);
  const [emailDemo, setEmailDemo] = useState(false);

  const hasText = profile.channels.includes("text_style");
  const hasEmail = profile.channels.includes("email_outline");

  const reload = useCallback(async () => {
    const list = await listMessages();
    setMessages(
      list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    );
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function requestFromCoach(channel: ComposeChannel) {
    setLoading(channel);
    setError(null);
    try {
      const res = await fetch("/api/compose-message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile, channel }),
      });
      if (!res.ok) throw new Error("Could not compose message");
      const data = (await res.json()) as { message: ComposedMessage };
      const now = new Date().toISOString();
      await addMessage({
        ...data.message,
        id: data.message.id || createId(),
        fromCoachId: coachId,
        direction: "coach_to_user",
        deliveredAt: data.message.deliveredAt || now,
        createdAt: data.message.createdAt || now,
      });
      await reload();
    } catch {
      setError("Couldn’t deliver that just now. Try again in a moment.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="page-enter flex flex-col gap-8">
      <div className="flex items-start gap-3">
        <CoachAvatar coachId={coachId} size="md" />
        <div>
          <p className="meta-label">Inbox</p>
          <h1 className="mt-1 font-display text-[1.75rem] font-semibold tracking-[-0.035em] text-[var(--ink)]">
            From {coach.name}
          </h1>
          <p className="mt-2 text-base text-[var(--muted)]">
            Text and email check-ins from {coach.name} appear here in the app.
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <p className="meta-label">Ask {coach.name} to send</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          {(hasText || !hasEmail) && (
            <Button
              className="w-full sm:flex-1"
              disabled={loading != null}
              onClick={() => void requestFromCoach("text_style")}
            >
              {loading === "text_style" ? "Sending…" : "Send me a text"}
            </Button>
          )}
          {(hasEmail || !hasText) && (
            <Button
              className="w-full sm:flex-1"
              variant={hasText ? "ghost" : "primary"}
              disabled={loading != null}
              onClick={() => void requestFromCoach("email_outline")}
            >
              {loading === "email_outline" ? "Sending…" : "Send me an email"}
            </Button>
          )}
        </div>
        {error ? <p className="text-sm text-[var(--muted)]">{error}</p> : null}
      </section>

      <section className="flex flex-col gap-3">
        <p className="meta-label">Delivery</p>
        <div className="panel flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-sm font-semibold text-[var(--ink)]">
                Phone
              </p>
              <p className="text-xs text-[var(--muted)]">
                Real SMS coming soon — demo marks you as reachable.
              </p>
            </div>
            <Button
              variant="ghost"
              className="shrink-0 px-3 py-2 text-sm"
              onClick={() => setPhoneDemo((v) => !v)}
            >
              {phoneDemo ? "Connected (demo)" : "Connect"}
            </Button>
          </div>
          <div className="border-t border-[var(--line)]" />
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-sm font-semibold text-[var(--ink)]">
                Email
              </p>
              <p className="text-xs text-[var(--muted)]">
                Real email coming soon — messages stay in-app for now.
              </p>
            </div>
            <Button
              variant="ghost"
              className="shrink-0 px-3 py-2 text-sm"
              onClick={() => setEmailDemo((v) => !v)}
            >
              {emailDemo ? "Connected (demo)" : "Connect"}
            </Button>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <p className="meta-label">Message history</p>
        {messages.length === 0 ? (
          <p className="text-base text-[var(--muted)]">
            Nothing yet — ask {coach.name} to send you a nudge above.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {messages.map((m) => {
              const sender = m.direction === "coach_to_user"
                ? getCoach(m.fromCoachId)
                : null;
              return (
                <li key={m.id} className="panel p-4">
                  <div className="flex items-center gap-2">
                    {sender ? <CoachAvatar coachId={sender.id} size="sm" /> : null}
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm font-semibold text-[var(--ink)]">
                        {sender?.name ?? "Saved draft"}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {m.channel === "email_outline" ? "Email" : "Text"} ·{" "}
                        {new Date((sender && m.deliveredAt) || m.createdAt).toLocaleString(
                          undefined,
                          { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
                        )}
                      </p>
                    </div>
                  </div>
                  {m.subject ? (
                    <p className="mt-3 font-display text-sm font-semibold text-[var(--ink)]">
                      {m.subject}
                    </p>
                  ) : null}
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--ink)]">
                    {m.body}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
