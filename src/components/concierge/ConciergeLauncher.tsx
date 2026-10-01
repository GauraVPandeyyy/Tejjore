"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { conciergeGuardrailCopy, conciergeQuickPrompts } from "@/data/concierge";
import { hotel } from "@/data/hotel";
import { track } from "@/lib/analytics/track";
import type { ConciergeAction, ConciergeMessage, ConciergeReply } from "@/lib/concierge";

type DisplayMessage = ConciergeMessage & {
  id: string;
  actions?: ConciergeAction[];
  dataSource?: ConciergeReply["dataSource"];
  asOf?: string;
};

const welcomeMessage: DisplayMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Welcome to Tejjora. Ask me about rooms, breakfast, parking, directions, the virtual tour or planning your stay.",
  actions: [],
};

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function ConciergeLauncher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([welcomeMessage]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    function openFromExternalAction() {
      setOpen(true);
      track("ai_open", { source: "external_action" });
    }
    window.addEventListener("tejjora:concierge-open", openFromExternalAction);
    return () => window.removeEventListener("tejjora:concierge-open", openFromExternalAction);
  }, []);

  useEffect(() => {
    if (!open) return;
    const node = messagesRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, open, sending]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function toggleConcierge() {
    setOpen((current) => {
      if (!current) track("ai_open");
      return !current;
    });
  }

  async function sendMessage(rawMessage: string) {
    const content = rawMessage.trim();
    if (!content || sending) return;

    const userMessage: DisplayMessage = { id: makeId("user"), role: "user", content };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    track("ai_message", { length: content.length });

    try {
      const response = await fetch("/api/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages
            .filter((message) => message.id !== "welcome")
            .slice(-12)
            .map(({ role, content: messageContent }) => ({ role, content: messageContent })),
        }),
      });

      if (!response.ok) throw new Error("Concierge request failed");
      const answer = (await response.json()) as ConciergeReply;
      setMessages((current) => [
        ...current,
        {
          id: makeId("assistant"),
          role: "assistant",
          content: answer.content,
          actions: answer.actions,
          dataSource: answer.dataSource,
          asOf: answer.asOf,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: makeId("assistant"),
          role: "assistant",
          content:
            "I could not answer that just now. You can still contact Tejjora directly by WhatsApp or phone.",
          actions: [
            {
              label: "WhatsApp hotel",
              href: `https://wa.me/${hotel.whatsappE164}?text=${encodeURIComponent("Hello Tejjora Lake View, I have a question about my stay.")}`,
              external: true,
            },
            { label: "Call hotel", href: `tel:${hotel.phoneE164}`, external: true },
          ],
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  if (pathname.startsWith("/admin")) return null;

  return (
    <div className="concierge" data-open={open ? "true" : "false"}>
      <button
        type="button"
        className="concierge__launcher concierge__launcher--compact"
        aria-expanded={open}
        aria-controls="tejjora-concierge-panel"
        aria-label={open ? "Close Tejjora AI" : "Open Tejjora AI"}
        title="Tejjora AI"
        onClick={toggleConcierge}
      >
        <span className="concierge__launcher-mark" aria-hidden="true">
          <span>T</span>
          <i />
        </span>
        <span className="sr-only">Tejjora AI</span>
        <span className="concierge__launcher-state" aria-hidden="true">{open ? "×" : ""}</span>
      </button>

      {open ? (
        <section
          id="tejjora-concierge-panel"
          ref={panelRef}
          className="concierge-panel"
          aria-label="Tejjora Concierge"
        >
          <header className="concierge-panel__header">
            <div>
              <span className="micro">TEJJORA / CONCIERGE</span>
              <h2>How can we make your stay simpler?</h2>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close concierge">Close</button>
          </header>

          <div className="concierge-panel__messages" ref={messagesRef} aria-live="polite">
            {messages.map((message) => (
              <article key={message.id} className="concierge-message" data-role={message.role}>
                <span className="concierge-message__role">
                  {message.role === "assistant" ? "Concierge" : "You"}
                </span>
                <p>{message.content}</p>
                {message.role === "assistant" && message.dataSource ? (
                  <small className="concierge-message__source">
                    {message.dataSource === "live-operations" ? "Current website data" : "Hotel knowledge"}
                  </small>
                ) : null}
                {message.actions?.length ? (
                  <div className="concierge-message__actions">
                    {message.actions.map((action) =>
                      action.external ? (
                        <a key={`${message.id}-${action.href}`} href={action.href} target={action.href.startsWith("http") ? "_blank" : undefined} rel={action.href.startsWith("http") ? "noreferrer" : undefined}>
                          {action.label}<span aria-hidden="true">↗</span>
                        </a>
                      ) : (
                        <Link key={`${message.id}-${action.href}`} href={action.href} onClick={() => setOpen(false)}>
                          {action.label}<span aria-hidden="true">↗</span>
                        </Link>
                      )
                    )}
                  </div>
                ) : null}
              </article>
            ))}
            {sending ? (
              <div className="concierge-typing" aria-label="Concierge is preparing an answer">
                <span /><span /><span />
              </div>
            ) : null}
          </div>

          {messages.length <= 2 ? (
            <div className="concierge-panel__prompts" aria-label="Quick questions">
              {conciergeQuickPrompts.map((item) => (
                <button key={item.id} type="button" onClick={() => void sendMessage(item.prompt)} disabled={sending}>
                  {item.label}<span aria-hidden="true">↗</span>
                </button>
              ))}
            </div>
          ) : null}

          <form className="concierge-panel__composer" onSubmit={onSubmit}>
            <label htmlFor="concierge-input" className="sr-only">Ask Tejjora Concierge</label>
            <input
              id="concierge-input"
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about your stay…"
              maxLength={800}
              autoComplete="off"
            />
            <button type="submit" disabled={sending || input.trim().length === 0} aria-label="Send message">
              Send <span aria-hidden="true">↗</span>
            </button>
          </form>

          <p className="concierge-panel__guardrail">{conciergeGuardrailCopy}</p>
        </section>
      ) : null}
    </div>
  );
}
