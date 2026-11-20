"use client";

import { Check, Ellipsis, Plus, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { CoachGlass } from "@/components/coach/CoachGlass";
import { DAY_LABELS, dayIndexInPlanWeek } from "@/lib/dates";
import { COACH_PALETTES, inkFor, mix, type CoachPalette } from "@/lib/coaches/palette";
import { getCoach } from "@/lib/coaches/presets";
import { useTilt } from "@/lib/hooks/useTilt";
import { computeStreak } from "@/lib/progress/streaks";
import type { PlanSession, TrainingPlan, UserProfile, WorkoutLog } from "@/lib/types";

type Props = {
  profile: UserProfile;
  plan: TrainingPlan;
  history: TrainingPlan[];
  logs: WorkoutLog[];
  dailyNote: string | null;
  weeklyNote: string | null;
  onPlanNewWeek: () => void;
  planning: "idle" | "busy" | "error";
  onCoachClosed: () => void;
};

const PAGES = ["Today", "Week", "Progress"] as const;
const minutesOf = (session: PlanSession) => session.steps.reduce((sum, step) => sum + (step.durationMin ?? 0), 0);

function weekNumbers(week: TrainingPlan, logs: WorkoutLog[]) {
  const latest = (id: string) => [...logs].reverse().find((log) => log.sessionId === id);
  const done = week.sessions.filter((session) => { const log = latest(session.id); return log && log.status !== "skipped"; });
  const minutes = done.reduce((sum, session) => sum + (latest(session.id)?.actualMinutes ?? minutesOf(session)), 0);
  const days = DAY_LABELS.map((_, dayIndex) => {
    const session = week.sessions.find((item) => item.dayIndex === dayIndex);
    const log = session && latest(session.id);
    return !session ? "rest" : log && log.status !== "skipped" ? "done" : log ? "skipped" : "open";
  });
  return { planned: week.sessions.length, done: done.length, minutes, days };
}

/** A lit tile: colour blend, top sheen, bottom shade and a glow in the coach's own family. */
function Tile({ children, background, color, glow, className = "", style }: { children: ReactNode; background: string; color: string; glow: string; className?: string; style?: CSSProperties }) {
  return (
    <div className={`bento-tile ${className}`} style={{ background, color, boxShadow: `inset 0 1px 0 rgba(255,255,255,.5), inset 0 -28px 50px rgba(0,0,0,.22), 0 26px 50px -22px ${glow}`, ...style }}>
      <span aria-hidden className="bento-sheen" />
      {children}
    </div>
  );
}

export function BentoHome({ profile, plan, history, logs, dailyNote, weeklyNote, onPlanNewWeek, planning, onCoachClosed }: Props) {
  const coach = getCoach(profile.coachId);
  const p: CoachPalette = COACH_PALETTES[coach.id];
  const ink = inkFor(p);
  const [page, setPage] = useState(0);
  const [coachOpen, setCoachOpen] = useState(false);
  const rail = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  useTilt(root);

  const dayIndex = dayIndexInPlanWeek(plan.weekStartIso);
  const today = dayIndex == null ? null : plan.sessions.find((session) => session.dayIndex === dayIndex) ?? null;
  const todayLog = today ? [...logs].reverse().find((log) => log.sessionId === today.id) : undefined;
  const week = weekNumbers(plan, logs);
  const weeks = [...history, plan].slice(-4).map((item) => ({ item, ...weekNumbers(item, logs) }));
  const streak = computeStreak(logs, new Date(), [...history, plan]);
  const peak = Math.max(...weeks.map((item) => item.minutes), 1);
  const lastWeek = weeks.at(-2)?.minutes ?? 0;
  const change = lastWeek ? Math.round(((week.minutes - lastWeek) / lastWeek) * 100) : null;

  const light = `radial-gradient(circle at 72% 78%, ${p.mid} 0%, transparent 52%), radial-gradient(circle at 18% 16%, #fff 0%, transparent 45%), linear-gradient(160deg, ${p.light}, ${mix(p.light, p.mid, 0.5)})`;
  const pale = `radial-gradient(circle at 50% 70%, ${mix(p.light, p.mid, 0.6)} 0%, transparent 46%), radial-gradient(circle at 85% 12%, #fff 0%, transparent 44%), linear-gradient(170deg, ${mix(p.light, "#ffffff", 0.35)}, ${p.light})`;
  const deep = `radial-gradient(circle at 28% 82%, ${p.glow} 0%, transparent 50%), linear-gradient(165deg, ${mix(p.mid, p.deep, 0.45)}, ${p.deep})`;
  const deepest = `radial-gradient(circle at 50% 62%, ${p.mid} 0%, transparent 46%), linear-gradient(165deg, ${p.deep}, ${mix(p.deep, "#000000", 0.35)})`;
  const orb = `radial-gradient(circle at 34% 28%, #fff 0%, ${p.light} 20%, ${p.mid} 58%, ${p.deep} 100%)`;

  const go = (index: number) => rail.current?.scrollTo({ left: index * rail.current.clientWidth, behavior: "smooth" });

  return (
    <div ref={root} className="bento-root" style={{
      // Both versions' coach tones; globals.css picks light or dark from the app appearance.
      "--bento-canvas-dark": mix(p.deep, "#000000", 0.82), "--bento-canvas-light": mix(p.light, "#ffffff", 0.82),
      "--bento-ink": ink, "--bento-ink-soft": `${ink}b3`,
      "--glow": `${p.glow}6b`, "--glow-top": `${p.light}38`, "--glow-light": `${p.mid}40`, "--glow-top-light": `${p.light}cc`,
      "--bento-veil-dark": `${mix(p.deep, "#000000", 0.45)}8c`, "--bento-veil-light": `${mix(p.light, "#ffffff", 0.6)}a6`,
    } as CSSProperties}>
      <div className="bento-scene" data-open={coachOpen || undefined} inert={coachOpen || undefined}>
        <header className="flex items-end justify-between px-5 pt-[max(1.75rem,env(safe-area-inset-top))]">
          <h1 className="font-display text-[2.1rem] font-extrabold leading-none tracking-[-0.03em]">{PAGES[page]}</h1>
          <Link href="/more" aria-label="More" className="bento-glass-button size-11"><Ellipsis size={20} aria-hidden /></Link>
        </header>

        <div ref={rail} className="bento-rail" onScroll={(event) => setPage(Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth))}>
          <section aria-label="Today" className="bento-page grid grid-cols-2 auto-rows-[44px] gap-2.5">
            <Tile background={light} color={ink} glow={p.mid} className="row-span-4">
              {today ? (
                <Link href={`/workout/${today.id}`} className="bento-fill">
                  <span className="text-xs font-semibold">Today{todayLog && todayLog.status !== "skipped" ? " · done" : ""}</span>
                  <span className="text-xs font-medium opacity-80">{today.title}</span>
                  <span className="bento-hero"><span className="text-[3.25rem] font-bold tracking-[-0.04em] tabular-nums">{minutesOf(today)}</span><span className="text-sm font-semibold">min</span></span>
                  <span className="text-xs font-semibold capitalize">{today.intensity} effort</span>
                </Link>
              ) : (
                <div className="bento-fill">
                  <span className="text-xs font-semibold">Today</span>
                  <span className="bento-hero text-[1.75rem] font-bold tracking-[-0.03em]">{dayIndex == null ? "New week" : "Rest day"}</span>
                  <span className="text-xs font-medium opacity-80">{dayIndex == null ? "Last week is saved." : "Recovery counts."}</span>
                </div>
              )}
            </Tile>

            <Tile background={pale} color={ink} glow={p.light} className="row-span-4">
              <button type="button" onClick={() => go(1)} className="bento-fill text-left">
                <span className="text-xs font-semibold">This week</span>
                <span className="text-xs font-medium opacity-80">Sessions done</span>
                <span className="bento-hero relative">
                  <svg viewBox="0 0 100 100" className="absolute size-28" aria-hidden><circle cx="50" cy="50" r="40" fill="none" stroke={`${ink}24`} strokeWidth="7" /><circle cx="50" cy="50" r="40" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(week.done / Math.max(week.planned, 1)) * 251.2} 251.2`} transform="rotate(-90 50 50)" /></svg>
                  <span className="relative text-[2.1rem] font-bold tabular-nums">{week.done}/{week.planned}</span>
                </span>
              </button>
            </Tile>

            <Tile background={deep} color="#fff" glow={p.mid} className="row-span-4">
              <button type="button" onClick={() => setCoachOpen(true)} className="bento-fill gap-2.5 text-left">
                <span className="flex items-center gap-2"><span aria-hidden className="size-6 rounded-full" style={{ background: orb, boxShadow: `0 0 14px ${p.light}b3` }} /><span className="text-xs font-semibold">{coach.name}</span></span>
                <span className="line-clamp-6 font-display text-[0.95rem] font-medium leading-snug text-pretty">{dailyNote ?? `${coach.name} is writing today's note…`}</span>
              </button>
            </Tile>

            <Tile background={deepest} color="#fff" glow={p.deep} className="row-span-4">
              <button type="button" onClick={() => go(2)} className="bento-fill text-left">
                <span className="text-xs font-semibold">Minutes this week</span>
                <span className="mt-1.5 text-[2.1rem] font-bold tabular-nums">{week.minutes}</span>
                <span aria-hidden className="mt-auto flex h-14 items-end gap-1">
                  {week.days.map((state, index) => {
                    const session = plan.sessions.find((item) => item.dayIndex === index);
                    return <span key={index} className="flex-1 rounded-sm" style={{ height: `${session ? 14 + Math.min(minutesOf(session), 60) * 0.6 : 4}px`, background: state === "done" ? p.light : "rgba(255,255,255,.3)" }} />;
                  })}
                </span>
              </button>
            </Tile>

            {dayIndex == null ? (
              <Tile background={`linear-gradient(120deg, ${p.light}, ${mix(p.light, p.mid, 0.55)})`} color={ink} glow={p.mid} className="col-span-2 row-span-2 !flex-row items-center !py-0">
                <span className="relative flex-1 text-[0.95rem] font-semibold">{planning === "error" ? "Couldn't plan the week. Try again." : `${coach.name} can plan this week from last week.`}</span>
                <button type="button" disabled={planning === "busy"} onClick={onPlanNewWeek} className="relative min-h-11 rounded-full px-4 text-sm font-semibold" style={{ background: `${ink}e0`, color: p.light }}>
                  {planning === "busy" ? "Planning…" : "Plan my week"}
                </button>
              </Tile>
            ) : null}
          </section>

          <section aria-label="Week" className="bento-page flex flex-col gap-2.5">
            {DAY_LABELS.map((label, index) => {
              const session = plan.sessions.find((item) => item.dayIndex === index);
              const state = week.days[index];
              const isToday = index === dayIndex;
              const background = !session ? "var(--bento-quiet)" : state === "done" ? `linear-gradient(120deg, ${mix(p.mid, p.deep, 0.45)}, ${p.deep})`
                : session.intensity === "easy" ? `linear-gradient(120deg, ${mix(p.light, "#ffffff", 0.35)}, ${p.light})` : `linear-gradient(120deg, ${p.deep}, ${mix(p.deep, "#000000", 0.35)})`;
              const color = !session ? "var(--bento-quiet-text)" : state !== "done" && session.intensity === "easy" ? ink : "#fff";
              const body = (
                <>
                  <span className="w-11 text-[0.8rem] font-bold">{label.slice(0, 3)}</span>
                  <span className="flex-1 text-base font-semibold">{session?.title ?? "Rest"}{state === "done" ? <span className="sr-only">, done</span> : null}</span>
                  {state === "done" ? <Check size={16} aria-hidden /> : null}
                  <span className="text-[0.8rem] font-semibold tabular-nums">{session ? `${minutesOf(session)} min` : ""}</span>
                </>
              );
              const style: CSSProperties = { background, color, boxShadow: `inset 0 1px 0 rgba(255,255,255,${session ? 0.45 : 0.1})${isToday ? ", 0 0 0 2px var(--bento-text)" : ""}` };
              return session
                ? <Link key={label} href={`/workout/${session.id}`} aria-current={isToday ? "date" : undefined} className="bento-day" style={style}>{body}</Link>
                : <div key={label} className="bento-day" style={style}>{body}</div>;
            })}
          </section>

          <section aria-label="Progress" className="bento-page grid grid-cols-2 auto-rows-[44px] gap-2.5">
            <Tile background={light} color={ink} glow={p.mid} className="row-span-4">
              <span className="text-xs font-semibold">Streak</span>
              <span className="bento-hero"><span className="text-[3.5rem] font-bold tracking-[-0.04em] tabular-nums">{streak}</span><span className="text-sm font-semibold">{streak === 1 ? "session" : "sessions"}</span></span>
              <span className="text-xs font-medium opacity-80">Rest days never break it.</span>
            </Tile>
            <Tile background={deepest} color="#fff" glow={p.deep} className="row-span-4">
              <span className="text-xs font-semibold">Last {weeks.length} {weeks.length === 1 ? "week" : "weeks"}</span>
              <span className="text-xs font-medium opacity-80">{weeks.reduce((sum, item) => sum + item.done, 0)} of {weeks.reduce((sum, item) => sum + item.planned, 0)} planned</span>
              <span role="img" aria-label="Sessions done each day" className="mt-auto grid grid-cols-7 gap-1">
                {weeks.flatMap((item, w) => item.days.map((state, d) => (
                  <span key={`${w}-${d}`} className="aspect-square rounded-[4px]" style={{ background: state === "done" ? (w === weeks.length - 1 ? p.light : p.mid) : state === "rest" ? "rgba(255,255,255,.05)" : "rgba(255,255,255,.14)" }} />
                )))}
              </span>
            </Tile>
            <Tile background={deep} color="#fff" glow={p.mid} className="col-span-2 row-span-4">
              <span className="flex items-baseline justify-between text-xs font-semibold"><span>Minutes per week</span>{change !== null ? <span style={{ color: p.light }}>{change >= 0 ? "Up" : "Down"} {Math.abs(change)}% on last week</span> : null}</span>
              <span className="mt-auto flex items-end gap-3">
                {weeks.map((item, index) => (
                  <span key={item.item.weekStartIso} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="text-xs font-semibold tabular-nums">{item.minutes}</span>
                    <span className="w-full max-w-14 rounded-xl" style={{ height: `${8 + (item.minutes / peak) * 64}px`, background: index === weeks.length - 1 ? `linear-gradient(180deg, #fff, ${p.light})` : "rgba(255,255,255,.22)" }} />
                    <span className="text-[0.7rem] font-medium opacity-80">{index === weeks.length - 1 ? "This week" : new Date(item.item.weekStartIso).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                  </span>
                ))}
              </span>
            </Tile>
            {weeklyNote ? (
              <div className="bento-glass col-span-2 row-span-4 flex items-start gap-3 overflow-hidden p-4">
                <span aria-hidden className="size-7 flex-none rounded-full" style={{ background: orb }} />
                {/* The grid rows are fixed, so the note is clamped to its tile rather than spilling out. */}
                <p className="line-clamp-8 text-sm leading-snug text-pretty">{weeklyNote}</p>
              </div>
            ) : null}
          </section>
        </div>

        <div aria-hidden className="mt-4 flex justify-center gap-1.5">
          {PAGES.map((label, index) => <span key={label} className="bento-dot" data-on={index === page || undefined} />)}
        </div>
      </div>

      <div className="bento-controls" data-open={coachOpen || undefined}>
        {today && !todayLog ? <Link href={`/workout/${today.id}?skip=1`} aria-label={`Skip ${today.title}`} className="bento-glass-button size-14"><X size={20} aria-hidden /></Link> : <span className="size-14" />}
        <span className="size-[76px]" />
        {today && !todayLog ? <Link href={`/workout/${today.id}?checkin=1`} aria-label={`Mark ${today.title} done`} className="bento-done size-14"><Check size={22} aria-hidden /></Link> : <span className="size-14" />}
      </div>

      <CoachGlass open={coachOpen} profile={profile} plan={plan} logs={logs} onClose={() => { setCoachOpen(false); onCoachClosed(); }} />

      <button type="button" onClick={() => setCoachOpen((open) => !open)} aria-label={coachOpen ? `Close ${coach.name}` : `Talk to ${coach.name}`} aria-expanded={coachOpen} className="bento-orb" data-open={coachOpen || undefined}>
        <span aria-hidden className="bento-halo" style={{ background: `radial-gradient(circle, ${p.light}73 0%, transparent 70%)` }} />
        <span aria-hidden className="bento-orb-core" style={{ background: orb, boxShadow: `inset 0 -8px 16px rgba(0,0,0,.28), inset 0 2px 3px rgba(255,255,255,.5), 0 0 0 6px ${p.mid}29, 0 0 40px ${p.light}8c, 0 18px 36px -12px rgba(0,0,0,.8)` }}>
          <Plus size={26} strokeWidth={2.6} className="bento-plus" />
        </span>
      </button>
    </div>
  );
}
