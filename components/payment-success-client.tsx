"use client";

import { useState } from "react";
import Link from "next/link";
import { usePayment } from "@/lib/payment-context";
import { confirmedPaidTotal, formatOrderStatus } from "@/lib/order-summary";
import { sampleRestaurant } from "@/lib/seed-data";

const STAR_FACES = [
  { emoji: "😭", label: "Terrible", color: "from-red-500 to-red-600" },
  { emoji: "😞", label: "Bad", color: "from-orange-500 to-orange-600" },
  { emoji: "😐", label: "Okay", color: "from-yellow-500 to-amber-500" },
  { emoji: "😊", label: "Great", color: "from-lime-500 to-green-500" },
  { emoji: "😎", label: "Awesome!", color: "from-emerald-400 to-teal-500" },
];

type Props = {
  tableId: string;
  amount: number;
  method: string;
  paymentId?: string;
  tipAmount?: number;
};

export function PaymentSuccessClient({ tableId, amount, method, paymentId, tipAmount = 0 }: Props) {
  const { getOrder, submitReview } = usePayment();
  const order = getOrder(tableId);
  const isCash = method === "cash";
  const total = amount + tipAmount;

  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [reviewState, setReviewState] = useState<"idle" | "low_feedback" | "submitted" | "redirecting">("idle");
  const [submitting, setSubmitting] = useState(false);

  const activeStar = hoveredStar ?? rating;
  const face = activeStar ? STAR_FACES[activeStar - 1] : null;

  const handleStarClick = async (value: number) => {
    setRating(value);

    if (value >= 4) {
      setReviewState("redirecting");
      await submitReview({ tableId, rating: value, redirectedToGoogle: true });
      window.open(sampleRestaurant.googleReviewUrl, "_blank", "noopener,noreferrer");
    } else {
      setReviewState("low_feedback");
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!rating || !feedback.trim()) return;
    setSubmitting(true);
    await submitReview({ tableId, rating, feedbackText: feedback, redirectedToGoogle: false });
    setReviewState("submitted");
    setSubmitting(false);
  };

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4 mb-2">
        <Link href={`/table/${tableId}/checkout`} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 shadow-soft backdrop-blur-sm transition hover:shadow-lift">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-brand">
          {isCash ? "Cash payment recorded" : "Payment successful"}
        </h1>
      </header>

      {/* Payment Summary */}
      <div className="glass-card space-y-3 rounded-2xl p-6">
        {isCash ? (
          <p className="text-sm text-slate-700">
            Your cash payment is <span className="font-medium">pending staff confirmation</span>. Please pay your
            waiter <span className="font-semibold">{total.toFixed(2)} MAD</span>.
          </p>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-emerald-100">
              <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-slate-600">Your card payment went through.</p>
          </div>
        )}

        <div className="border-t border-slate-100 pt-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Order amount</span>
            <span>{amount.toFixed(2)} MAD</span>
          </div>
          {tipAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Tip</span>
              <span>{tipAmount.toFixed(2)} MAD</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold">
            <span>Total</span>
            <span>{total.toFixed(2)} MAD</span>
          </div>
        </div>
        {paymentId && <p className="text-xs text-slate-400">Ref: {paymentId}</p>}
      </div>

      {order && (
        <div className="glass-card space-y-1 rounded-2xl p-5 text-sm">
          <p className="font-medium text-slate-800 mb-2">Bill overview</p>
          <div className="flex justify-between"><span className="text-slate-500">Status</span><span>{formatOrderStatus(order.status)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Total bill</span><span>{order.totalAmount.toFixed(2)} MAD</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Paid (confirmed)</span><span>{confirmedPaidTotal(order.payments).toFixed(2)} MAD</span></div>
          {order.amountCashPending > 0 && (
            <div className="flex justify-between"><span className="text-slate-500">Cash pending</span><span>{order.amountCashPending.toFixed(2)} MAD</span></div>
          )}
          <div className="flex justify-between font-bold"><span>Remaining</span><span>{order.remainingAmount.toFixed(2)} MAD</span></div>
        </div>
      )}

      {/* Inline Rating */}
      {reviewState === "idle" && (
        <div className="glass-card space-y-5 rounded-2xl p-6">
          <p className="text-center text-sm font-bold text-slate-700">How was your experience?</p>

          <div className="flex flex-col items-center h-20 justify-center">
            {face ? (
              <div className="flex flex-col items-center gap-1 animate-in fade-in zoom-in duration-200">
                <span className="text-5xl" style={{ transform: `scale(${1 + (activeStar ?? 0) * 0.04})` }}>{face.emoji}</span>
                <span className={`text-xs font-bold uppercase tracking-[0.2em] bg-gradient-to-r ${face.color} bg-clip-text text-transparent`}>{face.label}</span>
              </div>
            ) : (
              <span className="text-4xl text-slate-200">⭐</span>
            )}
          </div>

          <div className="flex justify-center items-center gap-3">
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
                  className="transition-transform duration-200 active:scale-75"
                  style={{ transform: isActive ? "scale(1.15)" : "scale(1)" }}
                >
                  <svg
                    className={`h-12 w-12 transition-all duration-200 ${
                      isActive
                        ? "text-accent drop-shadow-[0_0_14px_rgba(255,107,91,0.45)]"
                        : "text-slate-200"
                    }`}
                    fill={isActive ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth={isActive ? "0" : "1.5"}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Low rating: feedback form */}
      {reviewState === "low_feedback" && (
        <div className="glass-card space-y-4 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center">
            <span className="text-4xl">{face?.emoji}</span>
            <p className="mt-2 text-sm font-bold text-slate-700">What could we improve?</p>
          </div>
          <textarea
            className="min-h-28 w-full rounded-2xl border-none bg-slate-50/90 p-4 text-sm ring-1 ring-slate-100 transition-all focus:ring-2 focus:ring-accent/30"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Tell us what happened..."
            autoFocus
          />
          <button
            type="button"
            onClick={handleFeedbackSubmit}
            disabled={submitting || !feedback.trim()}
            className="w-full rounded-xl bg-brand px-4 py-3 text-center text-sm font-bold text-white shadow-lg shadow-brand/25 transition hover:shadow-lift disabled:opacity-40"
          >
            {submitting ? "Sending…" : "Send Feedback"}
          </button>
        </div>
      )}

      {/* High rating: redirected to Google */}
      {reviewState === "redirecting" && (
        <div className="glass-card space-y-3 rounded-2xl p-6 text-center animate-in fade-in zoom-in duration-300">
          <span className="text-5xl">😎</span>
          <p className="text-sm font-bold text-slate-700">Thanks! We opened Google Reviews for you.</p>
          <a
            href={sampleRestaurant.googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm font-semibold text-accent underline decoration-accent/40 underline-offset-2"
          >
            Open Google Reviews again
          </a>
        </div>
      )}

      {/* Feedback submitted */}
      {reviewState === "submitted" && (
        <div className="glass-card space-y-2 rounded-2xl p-6 text-center animate-in fade-in zoom-in duration-300">
          <span className="text-4xl">🙏</span>
          <p className="text-sm font-bold text-slate-700">Thank you for your feedback!</p>
          <p className="text-xs text-slate-500">We&apos;ll use it to improve.</p>
        </div>
      )}

      {/* Navigation */}
      <div className="space-y-2 pt-2">
        {order && order.remainingAmount > 0.01 && (
          <Link
            href={`/table/${tableId}/checkout`}
            className="block rounded-2xl border border-slate-200/90 bg-white/80 px-4 py-3 text-center text-sm font-medium text-brand backdrop-blur-sm transition hover:border-coral-mid/50"
          >
            Back to checkout
          </Link>
        )}
        <Link href={`/table/${tableId}/hub`} className="block text-center text-sm text-slate-600">
          Table hub
        </Link>
      </div>
    </div>
  );
}
