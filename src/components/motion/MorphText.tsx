"use client";

/**
 * MorphText — rotating words that morph letter by letter; letters the two words share glide to
 * their new positions while the rest fade out and in.
 *
 * This is an ORIGINAL Tejjora component (FLIP technique, Web Animations API). It is NOT the React
 * Bits Pro "Text Morph" component: that one is licence-gated (REACTBITS_LICENSE_KEY + the
 * @reactbits-starter registry) and no licence is configured in this repository. If the licensed
 * component is installed later it can replace this behind the same props. See docs/qa/.
 *
 * Accessibility: the visible morphing text is aria-hidden; a visually hidden copy lists every word.
 * Under reduced motion the first word is shown and nothing rotates. Rotation pauses off-screen,
 * on hover/focus and while the tab is hidden.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

type Snapshot = { char: string; left: number; top: number };

/** Longest common subsequence of characters (case-insensitive) → pairs [oldIndex, newIndex]. */
function matchLetters(from: string, to: string): Array<[number, number]> {
  const a = Array.from(from.toLowerCase());
  const b = Array.from(to.toLowerCase());
  const table = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const pairs: Array<[number, number]> = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      pairs.push([i, j]);
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) i += 1;
    else j += 1;
  }
  return pairs;
}

export type MorphTextProps = {
  words: readonly string[];
  /** Milliseconds each word holds before the next morph. */
  hold?: number;
  /** Milliseconds a morph takes. */
  duration?: number;
  className?: string;
};

export function MorphText({ words, hold = 2600, duration = 760, className = "" }: MorphTextProps) {
  const [index, setIndex] = useState(0);
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const letterRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const previous = useRef<{ word: string; letters: Snapshot[]; width: number } | null>(null);
  const paused = useRef(false);
  const visible = useRef(true);
  const reduced = useRef(false);

  const word = words[index % words.length];
  const letters = Array.from(word);

  // FLIP: after the new word is laid out, animate each shared letter from where it was.
  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const origin = root.getBoundingClientRect();
    const current: Snapshot[] = letters.map((char, i) => {
      const rect = letterRefs.current[i]?.getBoundingClientRect();
      return { char, left: (rect?.left ?? origin.left) - origin.left, top: (rect?.top ?? origin.top) - origin.top };
    });
    const before = previous.current;
    previous.current = { word, letters: current, width: origin.width };
    if (!before || before.word === word || reduced.current) return;

    const pairs = matchLetters(before.word, word);
    const shared = new Map(pairs.map(([from, to]) => [to, from]));
    const keptOld = new Set(pairs.map(([from]) => from));
    const animations: Animation[] = [];

    letters.forEach((_, i) => {
      const el = letterRefs.current[i];
      if (!el) return;
      const fromIndex = shared.get(i);
      if (fromIndex === undefined) {
        animations.push(
          el.animate(
            [
              { opacity: 0, transform: "translateY(0.45em)", filter: "blur(6px)" },
              { opacity: 1, transform: "translateY(0)", filter: "blur(0)" },
            ],
            { duration: duration * 0.8, delay: duration * 0.25, easing: EASE, fill: "backwards" },
          ),
        );
        return;
      }
      const from = before.letters[fromIndex];
      const dx = from.left - current[i].left;
      const dy = from.top - current[i].top;
      animations.push(el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }], { duration, easing: EASE, fill: "backwards" }));
    });

    // Letters that leave: ghosts at their old positions that fade up and away.
    before.letters.forEach((old, i) => {
      if (keptOld.has(i)) return;
      const ghost = document.createElement("span");
      ghost.textContent = old.char;
      ghost.setAttribute("aria-hidden", "true");
      ghost.className = "tj-morph__ghost";
      ghost.style.left = `${old.left}px`;
      ghost.style.top = `${old.top}px`;
      root.appendChild(ghost);
      const ghostAnimation = ghost.animate(
        [
          { opacity: 1, transform: "translateY(0)", filter: "blur(0)" },
          { opacity: 0, transform: "translateY(-0.45em)", filter: "blur(6px)" },
        ],
        { duration: duration * 0.6, easing: EASE, fill: "forwards" },
      );
      ghostAnimation.onfinish = () => ghost.remove();
      animations.push(ghostAnimation);
    });

    // Width glides so the words around it do not jump.
    root.style.display = "inline-block";
    animations.push(root.animate([{ width: `${before.width}px` }, { width: `${origin.width}px` }], { duration, easing: EASE }));

    return () => {
      animations.forEach((animation) => animation.cancel());
      root.querySelectorAll(".tj-morph__ghost").forEach((ghost) => ghost.remove());
    };
    // `letters` derives from `word`; the effect should run once per word change.
  }, [word, duration]);

  // Rotation clock.
  useEffect(() => {
    const root = rootRef.current;
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!root || reduced.current || words.length < 2) return undefined;

    const observer = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting;
    });
    observer.observe(root);
    const pause = () => {
      paused.current = true;
    };
    const resume = () => {
      paused.current = false;
    };
    root.addEventListener("pointerenter", pause);
    root.addEventListener("pointerleave", resume);
    root.addEventListener("focusin", pause);
    root.addEventListener("focusout", resume);

    const timer = window.setInterval(() => {
      if (paused.current || !visible.current || document.hidden) return;
      setIndex((value) => (value + 1) % words.length);
    }, hold + duration);

    return () => {
      window.clearInterval(timer);
      observer.disconnect();
      root.removeEventListener("pointerenter", pause);
      root.removeEventListener("pointerleave", resume);
      root.removeEventListener("focusin", pause);
      root.removeEventListener("focusout", resume);
    };
  }, [words, hold, duration]);

  return (
    <span className={`tj-morph ${className}`.trim()}>
      <span className="sr-only">{words.join(", ")}</span>
      <span ref={rootRef} className="tj-morph__stage" aria-hidden="true">
        {letters.map((char, i) => (
          <span
            key={`${word}-${i}`}
            ref={(el) => {
              letterRefs.current[i] = el;
            }}
            className="tj-morph__letter"
          >
            {char === " " ? " " : char}
          </span>
        ))}
      </span>
    </span>
  );
}

export default MorphText;
