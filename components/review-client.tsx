"use client";

import { useState } from "react";
import Link from "next/link";
import { usePayment } from "@/lib/payment-context";

const STAR_FACES = [
  { emoji: "😭", label: "Terrible", color: "from-red-500 to-red-600" },
  { emoji: "😞", label: "Bad", color: "from-orange-500 to-orange-600" },
  { emoji: "😐", label: "Okay", color: "from-yellow-500 to-amber-500" },
  { emoji: "😊", label: "Great", color: "from-lime-500 to-green-500" },
  { emoji: "😎", label: "Awesome!", color: "from-emerald-400 to-teal-500" },
];

function isConfiguredGoogleReviewUrl(url: string | null | undefined): url is string {
  if (!url?.trim()) return false;
  if (url.includes("PLACEHOLDER")) return false;
  return true;
}

type Phase = "pick" | "low_feedback" | "high_prompt" | "done_low" | "done_high";

type Props = {
  tableId: string;
  googleReviewUrl?: string | null;
};

export function ReviewClient({ tableId, googleReviewUrl }: Props) {
  const { submitReview } = usePayment();
  const hasGoogle = isConfiguredGoogleReviewUrl(googleReviewUrl ?? undefined);
  const menuHref = `/table/${tableId}/menu`;

  const [phase, setPhase] = useState<Phase>("pick");
  const [rating, setRating] = useState<number | null>(null);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const activeStar = hoveredStar ?? rating;
  const face = activeStar ? STAR_FACES[activeStar - 1] : null;

  const handleStarClick = (value: number) => {
    setError(null);
    setRating(value);
    if (value >= 4) {
      setPhase("high_prompt");
    } else {
      setPhase("low_feedback");
    }
  };

  const handleLowSubmit = async () => {
    if (!rating || rating > 3) return;
    if (!feedback.trim()) {
      setError("Please tell us a bit about what went wrong.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await submitReview({
      tableId,
      rating,
      feedbackText: feedback,
      redirectedToGoogle: false,
    });
    if (!result.ok) {
      setError(result.error ?? "Could not save feedback.");
      setSubmitting(false);
      return;
    }
    setPhase("done_low");
    setSubmitting(false);
  };

  const handleShareGoogle = async () => {
    if (!rating || rating < 4) return;
    if (!hasGoogle || !googleReviewUrl) return;
    setError(null);
    setSubmitting(true);
    const result = await submitReview({
      tableId,
      rating,
      redirectedToGoogle: true,
    });
    if (!result.ok) {
      setError(result.error ?? "Could not save your rating.");
      setSubmitting(false);
      return;
    }
    window.open(googleReviewUrl, "_blank", "noopener,noreferrer");
    setPhase("done_high");
    setSubmitting(false);
  };

  const handleHighSkip = async () => {
    if (!rating || rating < 4) return;
    setError(null);
    setSubmitting(true);
    const result = await submitReview({
      tableId,
      rating,
      redirectedToGoogle: false,
    });
    if (!result.ok) {
      setError(result.error ?? "Could not save your rating.");
      setSubmitting(false);
      return;
    }
    setPhase("done_high");
    setSubmitting(false);
  };

  if (phase === "done_high") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-8 px-4 text-center">
        <div className="text-7xl">🙏</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Thank you!</h1>
          <p className="text-sm text-slate-600">
            {hasGoogle ? "We’re grateful you took the time to rate us." : "We’re glad you enjoyed your visit."}
          </p>
        </div>
        {hasGoogle && googleReviewUrl ? (
          <a
            href={googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-[#062946] underline underline-offset-2"
          >
            Open Google Reviews again
          </a>
        ) : null}
        <Link href={menuHref} className="text-sm text-slate-500 underline">
          Back to menu
        </Link>
      </div>
    );
  }

  if (phase === "done_low") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-8 px-4 text-center">
        <div className="text-7xl">🙏</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Thank you for the feedback</h1>
          <p className="text-sm text-slate-600">
            Your comments are shared privately with our team so we can improve.
          </p>
        </div>
        <Link href={menuHref} className="text-sm text-slate-500 underline">
          Back to menu
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 pt-6">
      <header className="flex items-center justify-between gap-4 px-2">
        <Link
          href={menuHref}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-white shadow-soft"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <Link href={menuHref} className="text-sm text-slate-500 underline">
          Skip
        </Link>
      </header>

      {phase === "pick" && (
        <>
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-black tracking-tight text-slate-900">How was your experience?</h1>
            <p className="text-sm text-slate-500">Tap a star to rate (1–5)</p>
          </div>

          <div className="flex h-28 flex-col items-center justify-center">
            {face ? (
              <div className="flex animate-in fade-in zoom-in flex-col items-center gap-2 duration-300">
                <div
                  className="text-7xl transition-transform duration-200"
                  style={{ transform: `scale(${1 + (activeStar ?? 0) * 0.05})` }}
                >
                  {face.emoji}
                </div>
                <span
                  className={`bg-gradient-to-r ${face.color} bg-clip-text text-sm font-black uppercase tracking-widest text-transparent`}
                >
                  {face.label}
                </span>
              </div>
            ) : (
              <div className="text-5xl text-slate-200">⭐</div>
            )}
          </div>

          <div className="flex justify-center gap-1 px-4 sm:gap-2">
            {[1, 2, 3, 4, 5].map((value) => {
              const isActive = activeStar != null && value <= activeStar;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleStarClick(value)}
                  onMouseEnter={() => setHoveredStar(value)}
                  onMouseLeave={() => setHoveredStar(null)}
                  onTouchStart={() => setHoveredStar(value)}
                  onTouchEnd={() => setHoveredStar(null)}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl p-1 transition-transform duration-200 active:scale-95"
                  aria-label={`Rate ${value} out of 5`}
                >
                  <svg
                    className={`h-8 w-8 transition-all duration-200 ${
                      isActive
                        ? "text-accent drop-shadow-[0_0_14px_rgba(255,107,91,0.45)]"
                        : "text-slate-200"
                    }`}
                    fill={isActive ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth={isActive ? "0" : "1.5"}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                    />
                  </svg>
                </button>
              );
            })}
          </div>
        </>
      )}

      {phase === "low_feedback" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4 px-2 duration-500">
          <div className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-100">
            <div className="text-center">
              <span className="text-4xl">{face?.emoji}</span>
              <p className="mt-2 text-base font-bold text-slate-800">Tell us what went wrong</p>
              <p className="mt-1 text-sm text-slate-500">We read every message.</p>
            </div>
            <textarea
              className="mt-4 min-h-32 w-full rounded-2xl border-none bg-slate-50/90 p-4 text-sm ring-1 ring-slate-100 transition-all focus:ring-2 focus:ring-accent/30"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What could we improve?"
              autoFocus
            />
            {error ? <p className="mt-2 text-center text-sm font-medium text-red-600">{error}</p> : null}
            <button
              type="button"
              onClick={handleLowSubmit}
              disabled={submitting}
              className="mt-4 w-full rounded-xl bg-[#062946] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0a3a5e] disabled:opacity-40"
            >
              {submitting ? "Sending…" : "Submit feedback"}
            </button>
            <Link href={menuHref} className="mt-3 block text-center text-sm text-slate-500 underline">
              Back to menu
            </Link>
          </div>
        </div>
      )}

      {phase === "high_prompt" && (
        <div className="animate-in fade-in zoom-in space-y-4 px-2 duration-300">
          <div className="rounded-2xl bg-white p-6 text-center shadow-md ring-1 ring-slate-100">
            <span className="text-5xl">{face?.emoji ?? "😊"}</span>
            <p className="mt-3 text-base font-bold text-slate-800">Thank you!</p>
            {hasGoogle ? (
              <>
                <p className="mt-2 text-sm text-slate-600">Would you share your experience on Google?</p>
                <button
                  type="button"
                  onClick={handleShareGoogle}
                  disabled={submitting}
                  className="mt-4 w-full rounded-xl bg-[#062946] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0a3a5e] disabled:opacity-40"
                >
                  {submitting ? "Opening…" : "Leave a Google review"}
                </button>
                <button
                  type="button"
                  onClick={handleHighSkip}
                  disabled={submitting}
                  className="mt-3 w-full text-sm text-slate-500 underline"
                >
                  No thanks
                </button>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-slate-600">We’re glad you enjoyed your visit.</p>
                <button
                  type="button"
                  onClick={handleHighSkip}
                  disabled={submitting}
                  className="mt-4 w-full rounded-xl bg-[#062946] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0a3a5e] disabled:opacity-40"
                >
                  {submitting ? "Saving…" : "Continue"}
                </button>
              </>
            )}
            {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}
          </div>
        </div>
      )}
    </div>
  );
}
