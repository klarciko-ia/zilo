"use client";

import { useState } from "react";
import Link from "next/link";
import { sampleRestaurant } from "@/lib/seed-data";
import { usePayment } from "@/lib/payment-context";

const STAR_FACES = [
  { emoji: "😭", label: "Terrible", color: "from-red-500 to-red-600" },
  { emoji: "😞", label: "Bad", color: "from-orange-500 to-orange-600" },
  { emoji: "😐", label: "Okay", color: "from-yellow-500 to-amber-500" },
  { emoji: "😊", label: "Great", color: "from-lime-500 to-green-500" },
  { emoji: "😎", label: "Awesome!", color: "from-emerald-400 to-teal-500" },
];

export function ReviewClient({ tableId }: { tableId: string }) {
  const { submitReview } = usePayment();
  const [rating, setRating] = useState<number | null>(null);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lowDone, setLowDone] = useState(false);
  const [highThanks, setHighThanks] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const activeStar = hoveredStar ?? rating;
  const face = activeStar ? STAR_FACES[activeStar - 1] : null;

  const onSubmit = async () => {
    if (!rating) {
      setError("Please select a rating.");
      return;
    }
    setError(null);
    setSubmitting(true);

    if (rating >= 4) {
      const result = await submitReview({
        tableId,
        rating,
        redirectedToGoogle: true,
      });
      if (!result.ok) {
        setError(result.error ?? "Could not save review.");
        setSubmitting(false);
        return;
      }
      setHighThanks(true);
      return;
    }

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
    setLowDone(true);
  };

  if (highThanks) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-8 text-center">
        <div className="text-7xl animate-bounce">😎</div>
        <div className="space-y-3">
          <h1 className="text-3xl font-black tracking-tight">Amazing!</h1>
          <p className="text-sm text-slate-500 px-8">
            We&apos;re so glad you enjoyed your experience at {sampleRestaurant.name}.
          </p>
        </div>
        <div className="w-full space-y-3 px-4">
          <a
            href={sampleRestaurant.googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary flex items-center justify-center gap-3 w-full"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.92 3.16-1.92 4.16-1.24 1.24-3.16 2.52-6.88 2.52-6.04 0-10.8-4.88-10.8-10.8s4.76-10.8 10.8-10.8c3.28 0 5.64 1.28 7.4 3.04l2.32-2.32c-2-1.92-4.64-3.44-9.72-3.44-8.92 0-15.36 7.24-15.36 16.12s6.44 16.12 15.36 16.12c4.8 0 8.44-1.6 11.28-4.56 2.92-2.84 3.84-6.84 3.84-10.12 0-.96-.08-1.84-.24-2.72h-14.88z" />
            </svg>
            Review on Google
          </a>
          <Link href={`/table/${tableId}/menu`} className="btn-secondary block w-full">
            Back to menu
          </Link>
        </div>
      </div>
    );
  }

  if (lowDone) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-8 text-center">
        <div className="text-7xl">🙏</div>
        <div className="space-y-3">
          <h1 className="text-2xl font-bold">Thank you for the feedback</h1>
          <p className="text-sm text-slate-500 px-8">
            Your comments have been shared privately with our management team to help us improve.
          </p>
        </div>
        <Link href={`/table/${tableId}/menu`} className="btn-primary w-full max-w-xs">
          Back to menu
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12 pt-6">
      <header className="flex items-center gap-4 px-2">
        <Link href={`/table/${tableId}/menu`} className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-soft border border-slate-100">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
      </header>

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black tracking-tight">How was it?</h1>
        <p className="text-sm text-slate-500">Tap a star to rate your experience.</p>
      </div>

      {/* Emoji face */}
      <div className="flex flex-col items-center justify-center h-28">
        {face ? (
          <div className="animate-in fade-in zoom-in duration-300 flex flex-col items-center gap-2">
            <div className="text-7xl transition-transform duration-200" style={{ transform: `scale(${1 + (activeStar ?? 0) * 0.05})` }}>
              {face.emoji}
            </div>
            <span className={`text-sm font-black uppercase tracking-widest bg-gradient-to-r ${face.color} bg-clip-text text-transparent`}>
              {face.label}
            </span>
          </div>
        ) : (
          <div className="text-5xl text-slate-200">⭐</div>
        )}
      </div>

      {/* Stars */}
      <div className="flex justify-center items-center gap-3 px-4">
        {[1, 2, 3, 4, 5].map((value) => {
          const isActive = activeStar != null && value <= activeStar;
          const isSelected = rating != null && value <= rating;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              onMouseEnter={() => setHoveredStar(value)}
              onMouseLeave={() => setHoveredStar(null)}
              onTouchStart={() => setHoveredStar(value)}
              onTouchEnd={() => setHoveredStar(null)}
              className="group transition-transform duration-200 active:scale-75"
              style={{ transform: isActive ? "scale(1.15)" : "scale(1)" }}
            >
              <svg
                className={`h-14 w-14 transition-all duration-200 ${
                  isActive
                    ? "text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]"
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

      {rating != null && rating <= 3 ? (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400">Private Feedback</p>
          <textarea
            id="feedback"
            className="min-h-32 w-full rounded-[2rem] border-none bg-white p-6 text-sm shadow-soft ring-1 ring-slate-100 transition-all focus:ring-2 focus:ring-accent/30"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Tell us what we could do better..."
          />
        </div>
      ) : rating != null && rating >= 4 ? (
        <div className="text-center animate-in fade-in zoom-in duration-500">
          <p className="text-sm font-medium text-slate-600 italic">&quot;We&apos;d love your review on Google!&quot;</p>
        </div>
      ) : null}

      {error ? <p className="text-center text-sm font-bold text-red-500">{error}</p> : null}

      {rating != null && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="w-full btn-primary py-5 text-base"
          >
            {submitting
              ? "Submitting…"
              : rating >= 4
              ? "Continue"
              : "Submit Feedback"}
          </button>
        </div>
      )}

      <Link
        href={`/table/${tableId}`}
        className="block text-center text-xs font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-brand"
      >
        Skip for now
      </Link>
    </div>
  );
}
