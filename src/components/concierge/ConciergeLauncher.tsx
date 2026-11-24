"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  conciergeGuardrailCopy,
  conciergeQuickActions,
  conciergeFollowUps,
} from "@/data/concierge";
import { hotel } from "@/data/hotel";
import { track } from "@/lib/analytics/track";
import { todayInIndia } from "@/lib/booking/validation";
import type {
  ConciergeAction,
  ConciergeCard,
  ConciergeMessage,
  ConciergeReply,
} from "@/lib/concierge";
import { Icon } from "@/components/ui/Icon";
import { ConciergeCards } from "./ConciergeCards";
import { CONCIERGE_NAME, CONCIERGE_ROLE, ConciergeMark } from "./ConciergeMark";

// The living-water header is an enhancement: client-only, loaded when the panel first opens.
const LakeAmbient = dynamic(
  () =>
    import("@/components/immersive/LakeAmbient").then((mod) => mod.LakeAmbient),
  { ssr: false },
);

/** Opens Mezbaan from anywhere (dock, Ask sheet, Smart Arrival). `detail.topic` frames the chat. */
export const CONCIERGE_OPEN_EVENT = "tejjora:concierge-open";

type DisplayMessage = ConciergeMessage & {
  id: string;
  intent?: string;
  actions?: ConciergeAction[];
  cards?: ConciergeCard[];
  dataSource?: ConciergeReply["dataSource"];
  asOf?: string;
  failed?: boolean;
};

const MAX_LENGTH = 800;
const EXAMPLE_QUESTIONS = ["Do you have paneer tikka?", "How do I get there from the airport?", "Compare the three room categories."];

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** What the thinking state says while the answer is prepared (a hint, not a claim). */
function thinkingCopy(message: string) {
  const text = message.toLowerCase();
  if (
    /\d{4}-\d{2}-\d{2}|available|availability|tonight|tomorrow|weekend|vacan/.test(
      text,
    )
  )
    return "Checking the booking system for your dates";
  if (/rate|price|tariff|cost|how much/.test(text))
    return "Reading today’s direct rates";
  if (
    /menu|dish|food|eat|breakfast|dinner|restaurant|paneer|tea|coffee/.test(
      text,
    )
  )
    return "Opening the hotel’s menu";
  if (/where|route|airport|station|direction|reach|mall|nearby/.test(text))
    return "Finding the way";
  return "Looking through the hotel’s information";
}

function timeLabel(iso?: string) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

export function ConciergeLauncher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [datesOpen, setDatesOpen] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const openPanel = useCallback(
    (source?: string, nextTopic?: string | null) => {
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      if (nextTopic !== undefined) setTopic(nextTopic);
      setOpen(true);
      setEverOpened(true);
      track("ai_open", source ? { source } : undefined);
    },
    [],
  );

  const closePanel = useCallback(() => {
    setOpen(false);
    const target = returnFocusRef.current ?? launcherRef.current;
    window.setTimeout(() => target?.focus?.({ preventScroll: true }), 0);
  }, []);

  const [teaser, setTeaser] = useState(false);
  useEffect(() => {
    if (open || pathname.startsWith("/book") || pathname.startsWith("/manage-booking") || pathname.startsWith("/admin")) return;
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    try {
      if (sessionStorage.getItem("tejjora-ai-teaser")) return;
    } catch {
      return;
    }
    const show = window.setTimeout(() => setTeaser(true), 7000);
    const hide = window.setTimeout(() => setTeaser(false), 17000);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [open, pathname]);
  const dismissTeaser = useCallback(() => {
    setTeaser(false);
    try {
      sessionStorage.setItem("tejjora-ai-teaser", "1");
    } catch {
      /* storage unavailable: the teaser simply may reappear on the next page */
    }
  }, []);

  useEffect(() => {
    function onExternalOpen(event: Event) {
      const detail = (event as CustomEvent<{ topic?: string } | undefined>)
        .detail;
      openPanel("external_action", detail?.topic ?? null);
    }
    window.addEventListener(CONCIERGE_OPEN_EVENT, onExternalOpen);
    return () =>
      window.removeEventListener(CONCIERGE_OPEN_EVENT, onExternalOpen);
  }, [openPanel]);

  // Focus the composer on open; on phones the panel is full-screen, so lock the page behind it.
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(
      () => inputRef.current?.focus({ preventScroll: true }),
      90,
    );
    document.documentElement.setAttribute("data-ai-open", "");
    return () => {
      window.clearTimeout(timer);
      document.documentElement.removeAttribute("data-ai-open");
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const node = threadRef.current;
    if (!node) return;
    // A new answer is read from its first line (a long answer must not scroll its start away); the
    // welcome reads from the top; while waiting, the thread follows the newest line.
    const last = messages[messages.length - 1];
    if (last?.role === "assistant" && messages.length > 1 && !sending) {
      const answer = node.querySelector<HTMLElement>(`[data-msg-id="${last.id}"]`);
      if (answer) {
        node.scrollTo({ top: Math.max(0, answer.offsetTop - 14), behavior: "smooth" });
        return;
      }
    }
    if (messages.length || datesOpen) node.scrollTo({ top: node.scrollHeight, behavior: messages.length > 1 ? "smooth" : "auto" });
  }, [messages, open, sending, datesOpen]);

  // Escape closes; Tab stays inside the panel while it covers the screen (phones and tablets).
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closePanel();
        return;
      }
      if (
        event.key !== "Tab" ||
        !panelRef.current ||
        !window.matchMedia("(max-width: 1023px)").matches
      )
        return;
      const focusable = [
        ...panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((node) => node.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, closePanel]);

  // Grow the composer with its text, up to five lines.
  useEffect(() => {
    const node = inputRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 132)}px`;
  }, [input, open]);

  async function sendMessage(rawMessage: string, resend = false) {
    const content = rawMessage.trim().slice(0, MAX_LENGTH);
    if (!content || sending) return;
    setDatesOpen(false);
    const userMessage: DisplayMessage = {
      id: makeId("user"),
      role: "user",
      content,
    };
    // A retry re-asks the question already in the thread, so it is not added a second time.
    const nextMessages = resend ? messages.filter((message) => !message.failed) : [...messages.filter((message) => !message.failed), userMessage];
    setMessages((current) => (resend ? current.filter((message) => !message.failed) : [...current, userMessage]));
    setInput("");
    setSending(thinkingCopy(content));
    track("ai_message", { length: content.length });

    try {
      const response = await fetch("/api/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages
            .slice(-12)
            .map(({ role, content: text, intent }) => ({ role, content: text, ...(intent && /^[a-z0-9-]{1,40}$/.test(intent) ? { intent } : {}) })),
        }),
      });
      const answer = (await response.json().catch(() => null)) as
        | (ConciergeReply & { error?: { message?: string } })
        | null;
      if (!response.ok || !answer?.content)
        throw new Error(answer?.error?.message ?? "Concierge request failed");
      setMessages((current) => [
        ...current,
        {
          id: makeId("assistant"),
          role: "assistant",
          content: answer.content,
          intent: answer.intent,
          actions: answer.actions,
          cards: answer.cards,
          dataSource: answer.dataSource,
          asOf: answer.asOf,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: makeId("assistant"),
          role: "assistant",
          failed: true,
          content:
            error instanceof Error &&
            error.message !== "Concierge request failed"
              ? error.message
              : "I couldn’t answer that just now. The hotel team can help straight away on WhatsApp or by phone.",
          actions: [
            {
              label: "WhatsApp the hotel",
              href: `https://wa.me/${hotel.whatsappE164}?text=${encodeURIComponent("Hello Tejjora Lake View, I have a question about my stay.")}`,
              external: true,
            },
            {
              label: `Call ${hotel.phoneDisplay}`,
              href: `tel:${hotel.phoneE164}`,
              external: true,
            },
          ],
        },
      ]);
    } finally {
      setSending(null);
    }
  }

  function retryLast() {
    const question = [...messages].reverse().find((message) => message.role === "user");
    if (question) void sendMessage(question.content, true);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function onComposerKey(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  function runAction(
    action:
      | (typeof conciergeQuickActions)[number]
      | (typeof conciergeFollowUps)[string][number],
  ) {
    if ("dates" in action && action.dates) {
      setDatesOpen(true);
      return;
    }
    const prompt =
      topic && "topical" in action && action.topical
        ? action.topical.replace("{topic}", topic)
        : action.prompt;
    void sendMessage(prompt);
  }

  function startOver() {
    setMessages([]);
    setTopic(null);
    setDatesOpen(false);
    inputRef.current?.focus();
  }

  // Leaving the chat for a page closes the full-screen sheet on phones; on desktop it stays beside the page.
  function afterNavigate() {
    if (window.matchMedia("(max-width: 1023px)").matches) setOpen(false);
  }

  if (pathname.startsWith("/admin")) return null;

  const lastAssistant = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");
  const followUps =
    conciergeFollowUps[lastAssistant?.intent ?? ""] ??
    conciergeFollowUps.default;
  const empty = messages.length === 0;

  return (
    <div className="tj-ai" data-open={open ? "true" : "false"}>
      <button
        ref={launcherRef}
        type="button"
        className="tj-ai-launcher"
        aria-expanded={open}
        aria-controls="tejjora-concierge-panel"
        aria-label={
          open
            ? `Close ${CONCIERGE_NAME}`
            : `Ask ${CONCIERGE_NAME}, ${CONCIERGE_ROLE}`
        }
        onClick={() => (open ? closePanel() : openPanel())}
      >
        <span className="tj-ai-launcher__orb" aria-hidden="true">
          <ConciergeMark size={30} />
        </span>
        <span className="tj-ai-launcher__text" aria-hidden="true">
          <small>Ask</small>
          {CONCIERGE_NAME}
        </span>
      </button>

      {teaser && !open ? (
        <div className="tj-ai-teaser" role="status">
          <button
            type="button"
            className="tj-ai-teaser__ask"
            onClick={() => {
              dismissTeaser();
              openPanel("teaser");
            }}
          >
            Questions about rooms, rates or the menu? <strong>Ask {CONCIERGE_NAME}</strong>
          </button>
          <button type="button" className="tj-ai-teaser__close" onClick={dismissTeaser} aria-label="Dismiss">
            <Icon name="close" size={14} />
          </button>
        </div>
      ) : null}

      {open ? (
        <div className="tj-ai-scrim" aria-hidden="true" onClick={closePanel} />
      ) : null}

      <section
        id="tejjora-concierge-panel"
        ref={panelRef}
        className="tj-ai-panel"
        role="dialog"
        aria-modal="false"
        aria-labelledby="tj-ai-title"
        hidden={!open}
      >
        <header className="tj-ai-head">
          <div className="tj-ai-head__ambient" aria-hidden="true">
            {everOpened ? <LakeAmbient /> : null}
          </div>
          <span className="tj-ai-head__mark" aria-hidden="true">
            <ConciergeMark size={34} />
          </span>
          <div className="tj-ai-head__id">
            <p className="tj-ai-head__eyebrow">
              <span className="tj-ai-head__brand">Tejjora Lake View · </span>AI
              host
            </p>
            <h2 id="tj-ai-title">{CONCIERGE_NAME}</h2>
            <p className="tj-ai-head__status">
              <span className="tj-ai-live" aria-hidden="true" /> Answers from
              hotel data
            </p>
          </div>
          <div className="tj-ai-head__tools">
            {!empty ? (
              <button
                type="button"
                className="tj-ai-icon-btn"
                onClick={startOver}
                aria-label="Start a new conversation"
                title="New conversation"
              >
                <Icon name="plus" size={18} />
              </button>
            ) : null}
            <button
              type="button"
              className="tj-ai-icon-btn"
              onClick={closePanel}
              aria-label={`Close ${CONCIERGE_NAME}`}
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        </header>

        <div
          className="tj-ai-thread"
          ref={threadRef}
          aria-live="polite"
          aria-busy={Boolean(sending)}
        >
          {empty ? (
            <div className="tj-ai-welcome">
              <p className="tj-ai-welcome__hello">Namaste.</p>
              <p className="tj-ai-welcome__intro">
                I’m {CONCIERGE_NAME}, {CONCIERGE_ROLE}. I answer from the
                hotel’s booking system and published information, and I’ll tell
                you plainly when I don’t know.
              </p>
              {topic ? (
                <p className="tj-ai-topic">
                  <span>About</span> {topic}
                  <button
                    type="button"
                    onClick={() => setTopic(null)}
                    aria-label="Clear topic"
                  >
                    <Icon name="close" size={14} />
                  </button>
                </p>
              ) : null}
              <ul className="tj-ai-actions" aria-label="Start with">
                {conciergeQuickActions.map((action) => (
                  <li key={action.id}>
                    <button
                      type="button"
                      onClick={() => runAction(action)}
                      disabled={Boolean(sending)}
                    >
                      <span className="tj-ai-actions__icon" aria-hidden="true">
                        <Icon name={action.icon} size={20} />
                      </span>
                      <strong>
                        {topic && /room/i.test(topic) && action.topicalLabel
                          ? action.topicalLabel.replace("{topic}", topic)
                          : action.label}
                      </strong>
                      <small>{action.hint}</small>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="tj-ai-welcome__try">Or ask in your own words:</p>
              <ul className="tj-ai-try" aria-label="Example questions">
                {EXAMPLE_QUESTIONS.map((question) => (
                  <li key={question}>
                    <button type="button" onClick={() => void sendMessage(question)} disabled={Boolean(sending)}>
                      {question}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            messages.map((message) => (
              <article
                key={message.id}
                data-msg-id={message.id}
                className="tj-ai-msg"
                data-role={message.role}
                data-failed={message.failed ? "true" : undefined}
              >
                {message.role === "assistant" ? (
                  <span className="tj-ai-msg__avatar" aria-hidden="true">
                    <ConciergeMark size={20} />
                  </span>
                ) : null}
                <div className="tj-ai-msg__body">
                  <span className="sr-only">
                    {message.role === "assistant"
                      ? `${CONCIERGE_NAME}:`
                      : "You:"}
                  </span>
                  <p className="tj-ai-msg__text">{message.content}</p>
                  {message.failed ? (
                    <button type="button" className="tj-ai-retry" onClick={retryLast} disabled={Boolean(sending)}>
                      Try again
                    </button>
                  ) : null}
                  {message.cards?.length ? (
                    <ConciergeCards
                      cards={message.cards}
                      onNavigate={afterNavigate}
                    />
                  ) : null}
                  {message.actions?.length ? (
                    <div className="tj-ai-msg__actions">
                      {message.actions.map((action) =>
                        action.external ? (
                          <a
                            key={`${message.id}-${action.href}`}
                            href={action.href}
                            target={
                              action.href.startsWith("http")
                                ? "_blank"
                                : undefined
                            }
                            rel={
                              action.href.startsWith("http")
                                ? "noreferrer"
                                : undefined
                            }
                          >
                            {action.label}
                            <Icon name="arrow-up-right" size={14} />
                          </a>
                        ) : (
                          <Link
                            key={`${message.id}-${action.href}`}
                            href={action.href}
                            onClick={afterNavigate}
                          >
                            {action.label}
                            <Icon name="arrow-right" size={14} />
                          </Link>
                        ),
                      )}
                    </div>
                  ) : null}
                  {message.role === "assistant" && message.dataSource ? (
                    <small
                      className="tj-ai-msg__source"
                      data-source={message.dataSource}
                    >
                      {message.dataSource === "live-operations" ? (
                        <>
                          <span className="tj-ai-live" aria-hidden="true" />{" "}
                          Current website data
                          {message.asOf ? ` · ${timeLabel(message.asOf)}` : ""}
                        </>
                      ) : (
                        "Hotel knowledge"
                      )}
                    </small>
                  ) : null}
                </div>
              </article>
            ))
          )}

          {datesOpen ? (
            <DateCheck
              topic={topic}
              onCheck={(text) => void sendMessage(text)}
              onCancel={() => setDatesOpen(false)}
            />
          ) : null}

          {sending ? (
            <div className="tj-ai-thinking" role="status">
              <span
                className="tj-ai-msg__avatar tj-ai-msg__avatar--thinking"
                aria-hidden="true"
              >
                <ConciergeMark size={20} />
              </span>
              <span className="tj-ai-thinking__body">
                <span className="tj-ai-thinking__text">
                  {sending}
                  <span className="tj-ai-thinking__dots" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                </span>
                <span className="tj-ai-skeleton" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              </span>
            </div>
          ) : null}
        </div>

        <footer className="tj-ai-foot">
          {!empty && !sending ? (
            <div className="tj-ai-suggest" aria-label="Suggestions">
              {followUps.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => runAction(action)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
          <form className="tj-ai-composer" onSubmit={onSubmit}>
            <label htmlFor="concierge-input" className="sr-only">
              Ask {CONCIERGE_NAME} about your stay
            </label>
            <textarea
              id="concierge-input"
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(event) =>
                setInput(event.target.value.slice(0, MAX_LENGTH))
              }
              onKeyDown={onComposerKey}
              placeholder={
                topic ? `Ask about the ${topic}…` : "Ask about your stay…"
              }
              maxLength={MAX_LENGTH}
              autoComplete="off"
              enterKeyHint="send"
            />
            <button
              type="button"
              className="tj-ai-icon-btn tj-ai-composer__dates"
              onClick={() => setDatesOpen((value) => !value)}
              aria-label="Check dates"
              aria-pressed={datesOpen}
              title="Check dates"
            >
              <Icon name="calendar" size={18} />
            </button>
            <button
              type="submit"
              className="tj-ai-send"
              disabled={Boolean(sending) || input.trim().length === 0}
              aria-label="Send message"
            >
              <Icon name="arrow-up-right" size={18} />
            </button>
          </form>
          <p className="tj-ai-foot__guardrail">
            {conciergeGuardrailCopy}
            {input.length > MAX_LENGTH - 120 ? (
              <span> · {MAX_LENGTH - input.length} characters left</span>
            ) : null}
          </p>
        </footer>
      </section>
    </div>
  );
}

/** "8 Oct 2026": readable in the thread, and a format the server's date parser understands. */
function spokenDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(new Date(`${date}T12:00:00Z`))
    .replace("Sept", "Sep");
}

/** Inline date tool: two dates in, one grounded availability question out. */
function DateCheck({
  topic,
  onCheck,
  onCancel,
}: {
  topic: string | null;
  onCheck: (text: string) => void;
  onCancel: () => void;
}) {
  const today = todayInIndia();
  const [checkIn, setCheckIn] = useState(addDays(today, 1));
  const [checkOut, setCheckOut] = useState(addDays(today, 2));
  const valid = checkIn >= today && checkOut > checkIn;
  const roomLabel = topic && /room/i.test(topic) ? `the ${topic}` : "a room";
  return (
    <form
      className="tj-ai-card tj-ai-dates"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid)
          onCheck(
            `Is ${roomLabel} available from ${spokenDate(checkIn)} to ${spokenDate(checkOut)}?`,
          );
      }}
    >
      <header className="tj-ai-card__head">
        <span className="tj-ai-card__eyebrow">Check your dates</span>
      </header>
      <div className="tj-ai-dates__fields">
        <label>
          <span>Check-in</span>
          <input
            type="date"
            min={today}
            value={checkIn}
            onChange={(event) => {
              const next = event.target.value;
              setCheckIn(next);
              if (next && checkOut <= next) setCheckOut(addDays(next, 1));
            }}
            required
          />
        </label>
        <label>
          <span>Check-out</span>
          <input
            type="date"
            min={addDays(checkIn || today, 1)}
            value={checkOut}
            onChange={(event) => setCheckOut(event.target.value)}
            required
          />
        </label>
      </div>
      <div className="tj-ai-card__buttons">
        <button
          type="submit"
          className="tj-ai-btn tj-ai-btn--solid"
          disabled={!valid}
        >
          Check live rates
        </button>
        <button type="button" className="tj-ai-btn" onClick={onCancel}>
          Not now
        </button>
      </div>
    </form>
  );
}
