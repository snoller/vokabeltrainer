import type { PointerEvent as ReactPointerEvent } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import type { VocabularyCard } from "@/types";
import { formatCardMetaLine } from "@/lib/cardMeta";
import {
  LEARN_SCROLL_SUPPRESS_PIXELS,
  LEARN_SWIPE_MIN_PX,
  qualityFromSwipeVector,
} from "@/lib/learnSwipeRating";
import { playLearnRatingBlip } from "@/lib/learnRatingSound";
import {
  getLearnRatingSound,
  setLearnRatingSound,
  subscribeLearnRatingSound,
} from "@/lib/learnRatingSoundPref";
import { LEARN_CARD_FLY_MS, ratingFlashOverlay } from "@/lib/learnRatingVisual";
import {
  LEARN_FLASHCARD_STORAGE_KEY,
  getLearnFlashcardAppearance,
  setLearnFlashcardAppearance,
  type LearnFlashcardAppearance,
} from "@/lib/learnFlashcardAppearance";
import { recordLearnMotivationReview } from "@/lib/learnMotivation";
import { getActiveProfileId } from "@/lib/profile";
import { getCardsStorageSnapshot, parseCardsSnapshot, saveCards } from "@/lib/storage";
import { normalizeAnswerForCompare } from "@/lib/textNorm";
import { isDue, scheduleNext, type ReviewQuality } from "@/lib/srs";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener("vokabeltrainer:update", cb);
  window.addEventListener("vokabeltrainer:profile", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("vokabeltrainer:update", cb);
    window.removeEventListener("vokabeltrainer:profile", cb);
  };
}

function notify() {
  window.dispatchEvent(new Event("vokabeltrainer:update"));
}

function pickDueQueue(cards: VocabularyCard[], now: number): VocabularyCard[] {
  const due = cards.filter((c) => isDue(c, now));
  due.sort((a, b) => a.srs.dueAt - b.srs.dueAt);
  return due;
}

type CardSwipeUi =
  | { kind: "idle" }
  | { kind: "drag"; tx: number; ty: number; rot: number }
  | { kind: "fly"; q: ReviewQuality; ux: number; uy: number; phase: "start" | "leave" };

export default function Learn() {
  const raw = useSyncExternalStore(subscribe, getCardsStorageSnapshot, () => "[]");
  const cards = useMemo(() => parseCardsSnapshot(raw), [raw]);
  const [now, setNow] = useState(() => Date.now());
  const [mode, setMode] = useState<"reveal" | "front">("front");
  const [method, setMethod] = useState<"flash" | "type">("flash");
  const [typed, setTyped] = useState("");
  /** Nach Eintippen: erst Feedback, dann Weiter-Klick für SRS */
  const [typeFeedback, setTypeFeedback] = useState<null | "correct" | "incorrect">(null);
  const [cardLook, setCardLook] = useState<LearnFlashcardAppearance>(() => getLearnFlashcardAppearance());

  useEffect(() => {
    const onCustomLook = () => setCardLook(getLearnFlashcardAppearance());
    const onStorage = (e: StorageEvent) => {
      if (e.key != null && e.key !== LEARN_FLASHCARD_STORAGE_KEY) return;
      setCardLook(getLearnFlashcardAppearance());
    };
    window.addEventListener("vokabeltrainer:learnCardLook", onCustomLook);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("vokabeltrainer:learnCardLook", onCustomLook);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const queue = useMemo(() => pickDueQueue(cards, now), [cards, now]);
  const current = queue[0];

  /** Niederschwellige Motivation: keine Streaks, nur diese Einheit + Gesamtzähler (s. learnMotivation) */
  const prevHadDueRef = useRef(false);
  const queuedAtLearnWaveStartRef = useRef(0);
  const sessionReviewCountRef = useRef(0);
  const [sessionReviewCount, setSessionReviewCount] = useState(0);

  useLayoutEffect(() => {
    const hasDue = queue.length > 0;
    if (hasDue && !prevHadDueRef.current) {
      queuedAtLearnWaveStartRef.current = queue.length;
      sessionReviewCountRef.current = 0;
      setSessionReviewCount(0);
    }
    prevHadDueRef.current = hasDue;
  }, [queue.length]);

  useEffect(() => {
    setTypeFeedback(null);
    setTyped("");
  }, [current?.id, method]);

  const [focusMode, setFocusMode] = useState(false);

  /** Im Fokus: Erklärtexte bei Rückseite kurz zeigen, dann ausblenden */
  const [focusCoachPeek, setFocusCoachPeek] = useState(false);

  useEffect(() => {
    if (!focusMode || method !== "flash" || mode !== "reveal") {
      setFocusCoachPeek(false);
      return;
    }
    setFocusCoachPeek(true);
    const id = window.setTimeout(() => setFocusCoachPeek(false), 7000);
    return () => window.clearTimeout(id);
  }, [focusMode, method, mode, current?.id]);

  useEffect(() => {
    if (!focusMode) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocusMode(false);
    };
    window.addEventListener("keydown", onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prev;
    };
  }, [focusMode]);

  const ratingSoundOn = useSyncExternalStore(
    subscribeLearnRatingSound,
    getLearnRatingSound,
    getLearnRatingSound
  );

  const flyCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cardSwipe, setCardSwipe] = useState<CardSwipeUi>({ kind: "idle" });
  const [tapGlow, setTapGlow] = useState<ReviewQuality | null>(null);

  const clearFlyCommitTimer = useCallback(() => {
    if (flyCommitTimerRef.current != null) {
      window.clearTimeout(flyCommitTimerRef.current);
      flyCommitTimerRef.current = null;
    }
  }, []);

  const clearTapTimer = useCallback(() => {
    if (tapFeedbackTimerRef.current != null) {
      window.clearTimeout(tapFeedbackTimerRef.current);
      tapFeedbackTimerRef.current = null;
    }
  }, []);

  const persistRating = useCallback(
    (quality: ReviewQuality) => {
      if (!current) return;
      const nowMs = Date.now();
      const nextSrs = scheduleNext(current.srs, quality, nowMs);
      const updated = cards.map((c) => (c.id === current.id ? { ...c, srs: nextSrs } : c));
      saveCards(updated);
      notify();
      setMode("front");
      setTyped("");
      setNow(nowMs);

      sessionReviewCountRef.current += 1;
      const sessionN = sessionReviewCountRef.current;
      setSessionReviewCount(sessionN);
      const remainingDue = pickDueQueue(updated, nowMs).length;
      recordLearnMotivationReview({
        profileId: getActiveProfileId(),
        completedEmptiedQueue: remainingDue === 0,
        sessionReviewsSoFar: sessionN,
        queuedAtSessionStart: Math.max(1, queuedAtLearnWaveStartRef.current),
      });
    },
    [cards, current]
  );

  const persistRatingRef = useRef(persistRating);
  persistRatingRef.current = persistRating;

  const resetLearnMotion = useCallback(() => {
    setCardSwipe({ kind: "idle" });
    setTapGlow(null);
    clearFlyCommitTimer();
    clearTapTimer();
  }, [clearFlyCommitTimer, clearTapTimer]);

  /** Eintippen & direkte Aufrufe */
  const updateCurrent = useCallback(
    (quality: ReviewQuality) => {
      resetLearnMotion();
      persistRating(quality);
    },
    [persistRating, resetLearnMotion]
  );

  const rateFromButton = useCallback(
    (quality: ReviewQuality) => {
      if (cardSwipe.kind === "fly") return;
      clearTapTimer();
      if (ratingSoundOn) playLearnRatingBlip(quality);
      setTapGlow(quality);
      tapFeedbackTimerRef.current = window.setTimeout(() => {
        tapFeedbackTimerRef.current = null;
        setTapGlow(null);
        setCardSwipe({ kind: "idle" });
        persistRatingRef.current(quality);
      }, 110);
    },
    [cardSwipe.kind, clearTapTimer, ratingSoundOn]
  );

  /** Rückseite · Wisch-Tracking */
  const revealSwipeRef = useRef<{
    pointerId: number | null;
    x0: number;
    y0: number;
    scrollTop0: number;
  }>({ pointerId: null, x0: 0, y0: 0, scrollTop0: 0 });

  useEffect(() => {
    revealSwipeRef.current.pointerId = null;
    resetLearnMotion();
  }, [mode, current?.id, resetLearnMotion]);

  useEffect(() => {
    return () => {
      clearFlyCommitTimer();
      clearTapTimer();
    };
  }, [clearFlyCommitTimer, clearTapTimer]);

  const flyLeaveQ: ReviewQuality | null =
    cardSwipe.kind === "fly" && cardSwipe.phase === "leave" ? cardSwipe.q : null;

  useEffect(() => {
    if (flyLeaveQ == null) return;
    clearFlyCommitTimer();
    flyCommitTimerRef.current = window.setTimeout(() => {
      flyCommitTimerRef.current = null;
      setCardSwipe({ kind: "idle" });
      persistRatingRef.current(flyLeaveQ);
    }, LEARN_CARD_FLY_MS);
    return clearFlyCommitTimer;
  }, [flyLeaveQ, clearFlyCommitTimer]);

  const onRevealPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (cardSwipe.kind === "fly" || method !== "flash" || mode !== "reveal") return;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      revealSwipeRef.current = {
        pointerId: e.pointerId,
        x0: e.clientX,
        y0: e.clientY,
        scrollTop0: e.currentTarget.scrollTop,
      };
    },
    [cardSwipe.kind, method, mode]
  );

  const onRevealPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const s = revealSwipeRef.current;
      if (s.pointerId == null || s.pointerId !== e.pointerId || method !== "flash" || mode !== "reveal")
        return;
      if (cardSwipe.kind === "fly") return;
      const rdx = e.clientX - s.x0;
      const rdy = e.clientY - s.y0;
      if (Math.hypot(rdx, rdy) < 14) return;
      const cap = (n: number) => Math.sign(n) * Math.min(Math.abs(n), 62);
      setCardSwipe({
        kind: "drag",
        tx: cap(rdx * 0.28),
        ty: cap(rdy * 0.28),
        rot: Math.max(-7, Math.min(7, rdx * 0.05)),
      });
    },
    [cardSwipe.kind, method, mode]
  );

  const finalizeRevealSwipe = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const s = revealSwipeRef.current;
      if (s.pointerId == null || s.pointerId !== e.pointerId) return;
      revealSwipeRef.current = { pointerId: null, x0: 0, y0: 0, scrollTop0: 0 };

      const scrollMoved = Math.abs(e.currentTarget.scrollTop - s.scrollTop0);
      const dx = e.clientX - s.x0;
      const dy = e.clientY - s.y0;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      const clearDrag = () => setCardSwipe((c) => (c.kind === "drag" ? { kind: "idle" } : c));

      if (scrollMoved >= LEARN_SCROLL_SUPPRESS_PIXELS) {
        clearDrag();
        return;
      }
      if (ax < LEARN_SWIPE_MIN_PX && ay < LEARN_SWIPE_MIN_PX) {
        clearDrag();
        return;
      }

      const q = qualityFromSwipeVector(dx, dy);
      if (!q) {
        clearDrag();
        return;
      }
      if (ratingSoundOn) playLearnRatingBlip(q);
      const mag = Math.hypot(dx, dy) || 1;
      const ux = dx / mag;
      const uy = dy / mag;
      setCardSwipe({ kind: "fly", q, ux, uy, phase: "start" });
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setCardSwipe((prev) =>
            prev.kind === "fly" && prev.phase === "start" ? { ...prev, phase: "leave" } : prev
          );
        });
      });
    },
    [ratingSoundOn]
  );

  const onRevealPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      finalizeRevealSwipe(e);
    },
    [finalizeRevealSwipe]
  );

  const onRevealPointerCancel = useCallback(() => {
    revealSwipeRef.current.pointerId = null;
    setCardSwipe((c) => (c.kind === "drag" ? { kind: "idle" } : c));
  }, []);

  const checkTyped = useCallback(() => {
    if (!current || typeFeedback !== null) return;
    if (!typed.trim()) return;
    const ok =
      normalizeAnswerForCompare(typed) === normalizeAnswerForCompare(current.back);
    setTypeFeedback(ok ? "correct" : "incorrect");
  }, [current, typed, typeFeedback]);

  const proceedAfterTypeFeedback = useCallback(() => {
    if (!current || typeFeedback === null) return;
    setTypeFeedback(null);
    updateCurrent(typeFeedback === "correct" ? "good" : "again");
  }, [current, typeFeedback, updateCurrent]);

  if (cards.length === 0) {
    return (
      <div>
        <h1 style={{ marginTop: 0 }}>Lernen</h1>
        <p style={{ color: "var(--ink-muted)" }}>Noch keine Karten. Lege welche in der Bibliothek an oder nutze den Foto-Scan.</p>
      </div>
    );
  }

  if (!current) {
    return (
      <div>
        <h1 style={{ marginTop: 0 }}>Lernen</h1>
        <p style={{ color: "var(--ink-muted)", maxWidth: "48ch" }}>
          Alles erledigt für den Moment. Komm später wieder – die nächsten Wiederholungen sind zeitgestaffelt.
        </p>
        <button
          type="button"
          onClick={() => setNow(Date.now())}
          style={{
            marginTop: "1rem",
            padding: "0.65rem 1.2rem",
            borderRadius: 999,
            border: "1px solid rgba(232, 234, 239, 0.2)",
            background: "var(--bg-raised)",
            color: "var(--ink)",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Erneut prüfen
        </button>
      </div>
    );
  }

  const currentMeta = formatCardMetaLine(current);
  const flashReveal = method === "flash" && mode === "reveal";

  const shellStyle: CSSProperties = focusMode
    ? {
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        width: "100%",
        height: "100%",
        minHeight: "100dvh",
        maxHeight: "100dvh",
        background:
          "linear-gradient(180deg, #0f1218 0%, #12151c 36%, var(--bg-deep) 100%)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxSizing: "border-box",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }
    : {};

  /** Im Fokus: Nur so hoch wie nötig; innerCol zentriert den Block vertikal auf dem Bildschirm */
  const focusWrapStyle: CSSProperties = focusMode
    ? {
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "flex-start",
        width: "min(560px, calc(100vw - 1.5rem))",
        flex: "0 1 auto",
        minHeight: 0,
        maxHeight:
          "calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - clamp(6.75rem, 18dvh, 9rem))",
        gap: "clamp(0.4rem, 1.5dvh, 0.75rem)",
        boxSizing: "border-box",
      }
    : { display: "contents" };

  const innerColStyle: CSSProperties = focusMode
    ? {
        flex: 1,
        minHeight: 0,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding:
          "max(3rem, calc(env(safe-area-inset-top) + 1.85rem)) 0.75rem max(0.75rem, env(safe-area-inset-bottom))",
        overflow: flashReveal ? "visible" : "hidden",
      }
    : {};

  const cardStageStyle: CSSProperties = focusMode
    ? {
        flex: "0 1 auto",
        minHeight: 0,
        minWidth: 0,
        width: "100%",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "center",
        overflow: flashReveal ? "visible" : "hidden",
        maxHeight: "calc(100% - 1px)",
      }
    : {};

  const cardBoxStyle: CSSProperties = focusMode
    ? {
        width: "100%",
        maxHeight: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
      }
    : {};

  const vw = typeof window !== "undefined" ? window.innerWidth : 420;
  const travelLeavePx = Math.min(vw * 0.38, 280);
  const travelStartPx = 52;

  let cardTx = 0;
  let cardTy = 0;
  let cardRot = 0;
  let cardScale = 1;
  let cardOpacity = 1;
  let cardTransit: CSSProperties["transition"];

  if (cardSwipe.kind === "drag") {
    cardTx = cardSwipe.tx;
    cardTy = cardSwipe.ty;
    cardRot = cardSwipe.rot;
  } else if (cardSwipe.kind === "fly") {
    const d = cardSwipe.phase === "start" ? travelStartPx : travelLeavePx;
    cardTx = cardSwipe.ux * d;
    cardTy = cardSwipe.uy * d;
    cardRot = cardSwipe.ux * 12 + cardSwipe.uy * -3;
    if (cardSwipe.phase === "leave") {
      cardScale = 0.82;
      cardOpacity = 0;
      cardTransit = `transform ${LEARN_CARD_FLY_MS}ms cubic-bezier(0.34, 1.12, 0.45, 1), opacity ${Math.max(80, LEARN_CARD_FLY_MS - 36)}ms ease-out`;
    } else {
      cardTransit = "none";
    }
  }

  const glowQ: ReviewQuality | null = tapGlow ?? (cardSwipe.kind === "fly" ? cardSwipe.q : null);
  const glowOverlay = glowQ ? ratingFlashOverlay(glowQ) : null;

  const cardMotionStyle: CSSProperties = flashReveal
    ? {
        transform: `translate3d(${cardTx}px, ${cardTy}px, 0) rotate(${cardRot}deg) scale(${cardScale})`,
        opacity: cardOpacity,
        transition: cardTransit,
        willChange:
          cardSwipe.kind === "fly" && cardSwipe.phase === "leave" ? "transform, opacity" : undefined,
        pointerEvents: cardSwipe.kind === "fly" ? "none" : "auto",
      }
    : {};

  return (
    <div style={shellStyle}>
      {!focusMode && (
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
            <h1 style={{ margin: 0 }}>Lernen</h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.85rem", alignItems: "center", justifyContent: "flex-end" }}>
            <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
              <span style={{ color: "var(--ink-muted)", fontSize: "0.9rem" }} id="learn-cardlook-label">
                Karteikarte
              </span>
              <select
                value={cardLook}
                aria-labelledby="learn-cardlook-label"
                onChange={(e) => {
                  const next = e.target.value as LearnFlashcardAppearance;
                  setCardLook(next);
                  setLearnFlashcardAppearance(next);
                }}
                style={{
                  padding: "0.4rem 0.75rem",
                  borderRadius: 8,
                  border: "1px solid rgba(232, 234, 239, 0.15)",
                  background: "var(--bg-raised)",
                  color: "var(--ink)",
                  fontFamily: "var(--font-ui)",
                }}
              >
                <option value="paper">Weiß liniiert</option>
                <option value="dark">Dunkel</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
              <span style={{ color: "var(--ink-muted)", fontSize: "0.9rem" }} id="learn-method-label">
                Methode
              </span>
              <select
                aria-labelledby="learn-method-label"
                value={method}
                onChange={(e) => {
                  setMethod(e.target.value as "flash" | "type");
                  setMode("front");
                  setTyped("");
                }}
                style={{
                  padding: "0.4rem 0.75rem",
                  borderRadius: 8,
                  border: "1px solid rgba(232, 234, 239, 0.15)",
                  background: "var(--bg-raised)",
                  color: "var(--ink)",
                  fontFamily: "var(--font-ui)",
                }}
              >
                <option value="flash">Karteikarten</option>
                <option value="type">Eintippen</option>
              </select>
            </div>
            <label
              htmlFor="learn-rating-sound"
              title="Kurzton bei Bewertung (Swipe oder Tipp auf die Buttons)"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                cursor: "pointer",
                fontSize: "0.88rem",
                color: "var(--ink-muted)",
                userSelect: "none",
                fontFamily: "var(--font-ui)",
              }}
            >
              <input
                id="learn-rating-sound"
                type="checkbox"
                checked={ratingSoundOn}
                onChange={(e) => setLearnRatingSound(e.target.checked)}
                style={{ width: "0.92rem", height: "0.92rem", flexShrink: 0 }}
              />
              <span>Ton bei Bewertung</span>
            </label>

            <button
              type="button"
              onClick={() => setFocusMode(true)}
              style={{
                padding: "0.45rem 1rem",
                borderRadius: 999,
                border: "1px solid rgba(201, 162, 39, 0.45)",
                background: "rgba(201, 162, 39, 0.12)",
                color: "var(--accent)",
                fontWeight: 700,
                fontSize: "0.92rem",
                cursor: "pointer",
                fontFamily: "var(--font-ui)",
              }}
            >
              Fokus
            </button>
          </div>
          </div>
        </div>
      )}

      {focusMode && (
        <div
          style={{
            position: "absolute",
            top: "max(0.65rem, env(safe-area-inset-top))",
            left: "max(0.65rem, env(safe-area-inset-left))",
            right: "max(0.65rem, env(safe-area-inset-right))",
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            gap: "0.2rem",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.5rem",
              width: "100%",
            }}
          >
          <button
            type="button"
            onClick={() => setLearnRatingSound(!ratingSoundOn)}
            aria-pressed={ratingSoundOn}
            title="Ton bei Bewertung"
            style={{
              pointerEvents: "auto",
              padding: "0.4rem 0.72rem",
              borderRadius: 999,
              border: ratingSoundOn
                ? "1px solid rgba(201, 162, 39, 0.5)"
                : "1px solid rgba(232, 234, 239, 0.2)",
              background: ratingSoundOn ? "rgba(201, 162, 39, 0.14)" : "var(--bg-raised)",
              color: ratingSoundOn ? "var(--accent)" : "var(--ink-muted)",
              fontWeight: 600,
              fontSize: "0.8rem",
              cursor: "pointer",
              fontFamily: "var(--font-ui)",
            }}
          >
            Ton {ratingSoundOn ? "an" : "aus"}
          </button>
          <button
            type="button"
            onClick={() => setFocusMode(false)}
            aria-label="Fokus-Modus beenden"
            style={{
              pointerEvents: "auto",
              marginLeft: "auto",
              padding: "0.45rem 0.9rem",
              borderRadius: 999,
              border: "1px solid rgba(232, 234, 239, 0.2)",
              background: "var(--bg-raised)",
              color: "var(--ink)",
              fontWeight: 600,
              fontSize: "0.88rem",
              cursor: "pointer",
              fontFamily: "var(--font-ui)",
            }}
          >
            Beenden
          </button>
          </div>
          {current != null && queue.length > 0 && (
            <p
              style={{
                margin: 0,
                textAlign: "center",
                fontSize: "0.76rem",
                color: "var(--ink-muted)",
                lineHeight: 1.35,
                fontWeight: 500,
              }}
            >
              Einheit:&nbsp;<strong>{sessionReviewCount}</strong> · noch&nbsp;<strong>{queue.length}</strong> fällig
            </p>
          )}
        </div>
      )}

      {!focusMode && (
        <p style={{ color: "var(--ink-muted)", marginTop: 0, fontSize: "0.95rem" }}>
          {sessionReviewCount > 0 && (
            <>
              Schon <strong>{sessionReviewCount}</strong>{" "}
              {sessionReviewCount === 1 ? "Bewertung" : "Bewertungen"} in dieser Einheit ·{" "}
            </>
          )}
          Noch <strong>{queue.length}</strong> fällig · bewerte ehrlich, der Algorithmus passt die Abstände an
        </p>
      )}

      <div style={innerColStyle}>
        <div style={focusWrapStyle}>
        <div style={cardStageStyle}>
          <div style={cardBoxStyle}>
            <div
              style={{
                position: "relative",
                width: "100%",
                marginBottom: focusMode ? 0 : "1.25rem",
              }}
            >
              {flashReveal && glowOverlay && (
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 14,
                    pointerEvents: "none",
                    zIndex: 3,
                    opacity: 0.62,
                    transition: "opacity 0.14s ease",
                    ...glowOverlay,
                  }}
                />
              )}
              <div
                className={`learn-flashcard learn-flashcard--${cardLook}`}
                role="button"
                tabIndex={0}
                onPointerDown={(e) => {
                  setCardSwipe({ kind: "idle" });
                  onRevealPointerDown(e);
                }}
                onPointerMove={onRevealPointerMove}
                onPointerUp={onRevealPointerUp}
                onPointerCancel={onRevealPointerCancel}
                onLostPointerCapture={onRevealPointerCancel}
                onClick={() => method === "flash" && setMode((m) => (m === "front" ? "reveal" : m))}
                onKeyDown={(e) => {
                  if (method === "flash" && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    setMode((m) => (m === "front" ? "reveal" : m));
                  }
                }}
                style={{
                  position: "relative",
                  zIndex: 2,
                  ...(focusMode
                    ? {
                        width: "100%",
                        maxHeight: "min(72dvh, calc(100dvh - 14rem))",
                        overflowY: "auto",
                        WebkitOverflowScrolling: "touch",
                      }
                    : {}),
                  minHeight: focusMode ? undefined : 220,
                  cursor: method === "flash" && mode === "front" ? "pointer" : "default",
                  ...(method === "flash" && mode === "reveal"
                    ? ({
                        WebkitUserSelect: "none",
                        userSelect: "none",
                        touchAction: "manipulation",
                      } satisfies CSSProperties)
                    : {}),
                  ...cardMotionStyle,
                }}
              >
              {currentMeta && !focusMode && (
                <div className="learn-fc-meta" style={{ fontSize: "0.85rem", marginBottom: "0.55rem" }}>
                  {currentMeta}
                </div>
              )}
              {current.hint && !focusMode && (
                <div className="learn-fc-muted" style={{ fontSize: "0.9rem", marginBottom: "0.75rem" }}>
                  {current.hint}
                </div>
              )}
              {method === "flash" && (
                <>
                  <div className="learn-fc-front" style={{ fontSize: "clamp(1.35rem, 3.5vw, 1.85rem)", fontWeight: 600 }}>
                    {current.front}
                  </div>
                  {mode === "reveal" && <div className="learn-fc-back">{current.back}</div>}
                  {mode === "front" && !focusMode && (
                    <p className="learn-fc-hint-tip" style={{ marginTop: "2rem" }}>
                      Tippen oder Enter – Karte umdrehen
                    </p>
                  )}
                </>
              )}
              {method === "type" && (
                <div>
                  <div
                    className="learn-fc-front"
                    style={{ fontSize: "clamp(1.25rem, 3vw, 1.6rem)", fontWeight: 600, marginBottom: "1rem" }}
                  >
                    Übersetzung für:{" "}
                    <span className="learn-fc-meta" style={{ fontWeight: 700 }}>
                      {current.front}
                    </span>
                  </div>

                  <input
                    type="text"
                    className={`learn-fc-input${typeFeedback === "incorrect" ? " feedback-incorrect" : ""}${typeFeedback === "correct" ? " feedback-correct" : ""}`}
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (typeFeedback === null) checkTyped();
                        else proceedAfterTypeFeedback();
                      }
                    }}
                    placeholder="Antwort…"
                    autoComplete="off"
                    disabled={typeFeedback !== null}
                    aria-invalid={typeFeedback === "incorrect" ? true : undefined}
                    autoFocus={typeFeedback === null}
                  />

                  {typeFeedback === "correct" && (
                    <div
                      role="status"
                      style={
                        cardLook === "paper"
                          ? {
                              marginTop: "1rem",
                              padding: "1rem 1.1rem",
                              borderRadius: 12,
                              border: "1px solid rgba(46,130,96,0.4)",
                              background: "rgba(230,246,237,0.95)",
                              color: "var(--fc-success-text)",
                              fontWeight: 600,
                            }
                          : {
                              marginTop: "1rem",
                              padding: "1rem 1.1rem",
                              borderRadius: 12,
                              border: "1px solid rgba(91,185,140,0.45)",
                              background: "rgba(91,185,140,0.08)",
                              color: "var(--success)",
                              fontWeight: 600,
                            }
                      }
                    >
                      ✓ Richtig
                    </div>
                  )}

                  {typeFeedback === "incorrect" && (
                    <div
                      role="alert"
                      style={
                        cardLook === "paper"
                          ? {
                              marginTop: "1rem",
                              padding: "1rem 1.1rem",
                              borderRadius: 12,
                              border: "1px solid rgba(180,70,70,0.4)",
                              background: "rgba(252, 236, 236, 0.95)",
                              color: "var(--fc-ink)",
                            }
                          : {
                              marginTop: "1rem",
                              padding: "1rem 1.1rem",
                              borderRadius: 12,
                              border: "1px solid rgba(224,122,122,0.45)",
                              background: "rgba(224,122,122,0.06)",
                              color: "var(--ink)",
                            }
                      }
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          color: cardLook === "paper" ? "#a83838" : "var(--danger)",
                          marginBottom: "0.5rem",
                        }}
                      >
                        ✕ Falsch
                      </div>
                      <div className="learn-fc-muted" style={{ fontSize: "0.95rem" }}>
                        Richtige Antwort:
                      </div>
                      <div
                        style={{
                          fontSize: "1.1rem",
                          color: cardLook === "paper" ? "var(--fc-success-text)" : "var(--success)",
                          fontWeight: 600,
                          marginTop: "0.25rem",
                        }}
                      >
                        {current.back}
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: "1rem", display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
                    {typeFeedback === null ? (
                      <button
                        type="button"
                        disabled={!typed.trim()}
                        onClick={checkTyped}
                        style={{
                          padding: "0.65rem 1.35rem",
                          borderRadius: 999,
                          border: "none",
                          background: typed.trim() ? "var(--accent)" : "var(--bg-raised)",
                          color: typed.trim() ? "#12151c" : "var(--ink-muted)",
                          fontWeight: 700,
                          cursor: typed.trim() ? "pointer" : "not-allowed",
                        }}
                      >
                        Prüfen
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={proceedAfterTypeFeedback}
                        autoFocus
                        style={{
                          padding: "0.65rem 1.35rem",
                          borderRadius: 999,
                          border: "none",
                          background: "var(--accent)",
                          color: "#12151c",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Weiter
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>
        </div>

        {method === "flash" && mode === "reveal" && (
          <div
            style={{
              flexShrink: 0,
              width: "100%",
            }}
          >
            {(!focusMode || focusCoachPeek) && (
              <>
                <p
                  style={{
                    margin: "0 0 0.65rem",
                    fontSize: "0.95rem",
                    color: "var(--ink-muted)",
                    textAlign: "center",
                    fontWeight: 500,
                    transition: "opacity 0.45s ease",
                  }}
                >
                  Wie gut erinnert?
                </p>
                <p
                  style={{
                    margin: "0 0 0.85rem",
                    fontSize: "0.82rem",
                    color: "var(--ink-muted)",
                    textAlign: "center",
                    lineHeight: 1.45,
                    opacity: 0.92,
                    transition: "opacity 0.45s ease",
                  }}
                >
                  Auf der Karte wischen:&nbsp;rechts · <strong>einfach</strong>, links&nbsp;· <strong>
                    gar&nbsp;nicht
                  </strong>, nach oben · <strong>gut</strong>, nach unten · <strong>schlecht</strong>
                </p>
              </>
            )}
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: "0.45rem",
                width: "100%",
              }}
            >
              <RatingButton
                compact={focusMode}
                label="gar nicht"
                tone="danger"
                disabled={cardSwipe.kind === "fly"}
                onClick={() => rateFromButton("again")}
              />
              <RatingButton
                compact={focusMode}
                label="schlecht"
                tone="muted"
                disabled={cardSwipe.kind === "fly"}
                onClick={() => rateFromButton("hard")}
              />
              <RatingButton
                compact={focusMode}
                label="gut"
                tone="accent"
                disabled={cardSwipe.kind === "fly"}
                onClick={() => rateFromButton("good")}
              />
              <RatingButton
                compact={focusMode}
                label="einfach"
                tone="good"
                disabled={cardSwipe.kind === "fly"}
                onClick={() => rateFromButton("easy")}
              />
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

function RatingButton({
  label,
  tone,
  onClick,
  compact,
  disabled,
}: {
  label: string;
  tone: "danger" | "muted" | "accent" | "good";
  onClick: () => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  const border =
    tone === "danger"
      ? "rgba(224,122,122,0.45)"
      : tone === "good"
        ? "rgba(91,185,140,0.45)"
        : tone === "accent"
          ? "rgba(201,162,39,0.45)"
          : "rgba(139,148,168,0.35)";
  const toneColor =
    tone === "danger"
      ? "var(--danger)"
      : tone === "good"
        ? "var(--success)"
        : tone === "accent"
          ? "var(--accent)"
          : "var(--ink-muted)";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      style={{
        flex: 1,
        minWidth: 0,
        padding: compact ? "0.55rem 0.25rem" : "0.7rem 0.4rem",
        borderRadius: 12,
        border: `1px solid ${border}`,
        background: disabled ? "var(--bg-deep)" : "var(--bg-raised)",
        color: disabled ? "var(--ink-muted)" : toneColor,
        cursor: disabled ? "not-allowed" : "pointer",
        textAlign: "center",
        fontWeight: 600,
        fontSize: compact ? "clamp(0.7rem, 2.6vw, 0.85rem)" : "clamp(0.78rem, 2.4vw, 0.95rem)",
        lineHeight: 1.2,
        fontFamily: "var(--font-ui)",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {label}
    </button>
  );
}
