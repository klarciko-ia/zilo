"use client";

import { useState } from "react";
import Link from "next/link";
import { sampleRestaurant } from "@/lib/seed-data";
import { usePayment } from "@/lib/payment-context";

export function ReviewClient({ tableId }: { tableId: string }) {
  const { submitReview } = usePayment();
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lowDone, setLowDone] = useState(false);
  const [highThanks, setHighThanks] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
        <div className="h-24 w-24 rounded-full bg-accent/10 flex items-center justify-center">
          <svg className="h-12 w-12 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
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
          <Link href={`/table/${tableId}`} className="btn-secondary block w-full">
            Back to menu
          </Link>
        </div>
      </div>
    );
  }

  if (lowDone) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-8 text-center">
        <div className="h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center">
          <svg className="h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <div className="space-y-3">
          <h1 className="text-2xl font-bold">Thank you for the feedback</h1>
          <p className="text-sm text-slate-500 px-8">
            Your comments have been shared privately with our management team to help us improve.
          </p>
        </div>
        <Link href={`/table/${tableId}`} className="btn-primary w-full max-w-xs">
          Back to menu
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12 pt-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black tracking-tight">How was it?</h1>
        <p className="text-sm text-slate-500">Your feedback helps us serve you better.</p>
      </div>

      <div className="flex justify-between items-center px-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            className={`group relative flex h-14 w-14 items-center justify-center rounded-2xl transition-all active:scale-90 ${
              rating === value
                ? "bg-black text-white shadow-xl scale-110"
                : "bg-white text-slate-400 border border-slate-100 shadow-soft"
            }`}
          >
            <span className="text-xl font-black">{value}</span>
            {value >= 4 && (
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-accent border-2 border-white" />
            )}
          </button>
        ))}
      </div>

      {rating != null && rating <= 3 ? (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400">Private Feedback</p>
          <textarea
            id="feedback"
            className="min-h-32 w-full rounded-[2rem] border-none bg-white p-6 text-sm shadow-soft ring-1 ring-slate-100 focus:ring-2 focus:ring-black transition-all"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Tell us what we could do better..."
          />
        </div>
      ) : rating != null ? (
        <div className="text-center animate-in fade-in zoom-in duration-500">
          <p className="text-sm font-medium text-slate-600 italic">&quot;Excellent choice! We&apos;d love to hear more.&quot;</p>
        </div>
      ) : null}

      {error ? <p className="text-center text-sm font-bold text-red-500">{error}</p> : null}

      <div className="space-y-4">
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className={`w-full btn-primary py-5 text-base ${!rating ? "opacity-50 pointer-events-none" : ""}`}
        >
          {submitting
            ? "Submitting…"
            : rating && rating >= 4
            ? "Share on Google"
            : "Submit Feedback"}
        </button>
        <Link
          href={`/table/${tableId}`}
          className="block text-center text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-black transition-colors"
        >
          Skip for now
        </Link>
      </div>
    </div>
  );
}
