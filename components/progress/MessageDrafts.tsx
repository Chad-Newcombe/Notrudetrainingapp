"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { addMessage, listMessages } from "@/lib/store";
import type { ComposedMessage, UserProfile } from "@/lib/types";

type ComposeChannel = "text_style" | "email_outline";

type Props = {
  profile: UserProfile;
};

function copyPayload(m: ComposedMessage): string {
  if (m.channel === "email_outline" && m.subject) {
    return `Subject: ${m.subject}\n\n${m.body}`;
  }
  return m.body;
}

export function MessageDrafts({ profile }: Props) {
  const [messages, setMessages] = useState<ComposedMessage[]>([]);
  const [loading, setLoading] = useState<ComposeChannel | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function generate(channel: ComposeChannel) {
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
      await addMessage(data.message);
      await reload();
    } catch {
      setError("Something went wrong. You can try again in a moment.");
    } finally {
      setLoading(null);
    }
  }

  if (!hasText && !hasEmail) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--muted)]">
        Message drafts
      </h2>
      <p className="text-base text-[var(--muted)]">
        Copy a draft into your text app or email — nothing is sent from here.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        {hasText ? (
          <Button
            className="w-full sm:flex-1"
            variant="ghost"
            disabled={loading != null}
            onClick={() => void generate("text_style")}
          >
            {loading === "text_style" ? "Generating…" : "Generate text nudge"}
          </Button>
        ) : null}
        {hasEmail ? (
          <Button
            className="w-full sm:flex-1"
            variant="ghost"
            disabled={loading != null}
            onClick={() => void generate("email_outline")}
          >
            {loading === "email_outline"
              ? "Generating…"
              : "Generate email outline"}
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-[var(--muted)]">{error}</p> : null}
      {messages.length > 0 ? (
        <ul className="mt-1 flex flex-col gap-3">
          {messages.slice(0, 5).map((m) => (
            <li
              key={m.id}
              className="panel px-4 py-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                  {m.channel === "email_outline" ? "Email" : "Text"} —{" "}
                  {new Date(m.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                <Button
                  variant="ghost"
                  className="shrink-0 px-3 py-1 text-sm"
                  onClick={() =>
                    void navigator.clipboard.writeText(copyPayload(m))
                  }
                >
                  Copy
                </Button>
              </div>
              {m.subject ? (
                <p className="mt-2 text-sm font-medium text-[var(--ink)]">
                  {m.subject}
                </p>
              ) : null}
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--ink)]">
                {m.body}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
