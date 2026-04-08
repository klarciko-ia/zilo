"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { usePayment } from "@/lib/payment-context";
import { confirmedPaidTotal, formatOrderStatus } from "@/lib/order-summary";
import type { GuestOrderMode } from "@/lib/types";

const STAR_FACES = [
  { emoji: "😭", label: "Terrible", color: "from-red-500 to-red-600" },
  { emoji: "😞", label: "Bad", color: "from-orange-500 to-orange-600" },
  { emoji: "😐", label: "Okay", color: "from-yellow-500 to-amber-500" },
  { emoji: "😊", label: "Great", color: "from-lime-500 to-green-500" },
  { emoji: "😎", label: "Awesome!", color: "from-emerald-400 to-teal-500" },
];

/** Non-empty, non-placeholder URLs only — otherwise we skip the Google CTA. */
function isConfiguredGoogleReviewUrl(url: string | null | undefined): url is string {
  if (!url?.trim()) return false;
  if (url.includes("PLACEHOLDER")) return false;
  return true;
}

type Props = {
  tableId: string;
  amount: number;
  method: string;
  paymentId?: string;
  tipAmount?: number;
  guestOrderMode?: GuestOrderMode;
  /** When set to a real place link, show “Share on Google”. Omit for MVP. */
  googleReviewUrl?: string | null;
};

type ReviewPhase =
  | "idle"
  | "low_feedback"
  | "high_prompt"
  | "high_thanks"
  | "submitted";

export function PaymentSuccessClient({
  tableId,
  amount,
  method,
  paymentId,
  tipAmount = 0,
  guestOrderMode,
  googleReviewUrl,
}: Props) {
  const { getOrder, submitReview } = usePayment();
  const order = getOrder(tableId);
  const isCash = method === "cash";

  const kitchenFired = useRef(false);
  const paymentNotified = useRef(false);

  useEffect(() => {
    if (paymentNotified.current) return;
    paymentNotified.current = true;
    fetch(`/api/tables/${encodeURIComponent(tableId)}/payment-complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method }),
    }).catch(() => {});
  }, [tableId, method]);

  useEffect(() => {
    if (guestOrderMode !== "self_service" || kitchenFired.current) return;
    kitchenFired.current = true;
    if (!order?.orderItems?.length) return;
    fetch(`/api/tables/${encodeURIComponent(tableId)}/kitchen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: order.orderItems.map((i: { menuItemId: string; name: string; unitPrice: number; quantityTotal: number }) => ({
          menuItemId: i.menuItemId,
          name: i.name,
          unitPrice: i.unitPrice,
          quantity: i.quantityTotal,
        })),
      }),
    }).catch(() => {});
  }, [guestOrderMode, tableId, order]);
  const total = amount + tipAmount;
  const hasGoogle = isConfiguredGoogleReviewUrl(googleReviewUrl ?? undefined);

  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [reviewPhase, setReviewPhase] = useState<ReviewPhase>("idle");
  const [submitting, setSubmitting] = useState(false);

  const activeStar = hoveredStar ?? rating;
  const face = activeStar ? STAR_FACES[activeStar - 1] : null;

  const menuHref = `/table/${tableId}/menu`;

  const handleStarClick = (value: number) => {
    setRating(value);
    if (value >= 4) {
      setReviewPhase("high_prompt");
    } else {
      setReviewPhase("low_feedback");
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!rating || !feedback.trim()) return;
    setSubmitting(true);
    await submitReview({ tableId, rating, feedbackText: feedback, redirectedToGoogle: false });
    setReviewPhase("submitted");
    setSubmitting(false);
  };

  const handleShareOnGoogle = async () => {
    if (!rating || rating < 4 || !hasGoogle || !googleReviewUrl) return;
    setSubmitting(true);
    await submitReview({ tableId, rating, redirectedToGoogle: true });
    window.open(googleReviewUrl, "_blank", "noopener,noreferrer");
    setReviewPhase("high_thanks");
    setSubmitting(false);
  };

  const handleHighSkipGoogle = async () => {
    if (!rating || rating < 4) return;
    setSubmitting(true);
    await submitReview({ tableId, rating, redirectedToGoogle: false });
    setReviewPhase("high_thanks");
    setSubmitting(false);
  };

  const StarRow = ({ disabled }: { disabled?: boolean }) => (
    <div className="flex justify-center gap-1 sm:gap-2">
      {[1, 2, 3, 4, 5].map((value) => {
        const isActive = activeStar != null && value <= activeStar;
        return (
          <button
            key={value}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && handleStarClick(value)}
            onMouseEnter={() => !disabled && setHoveredStar(value)}
            onMouseLeave={() => !disabled && setHoveredStar(null)}
            onTouchStart={() => !disabled && setHoveredStar(value)}
            onTouchEnd={() => !disabled && setHoveredStar(null)}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl p-1 transition-transform duration-200 active:scale-95 disabled:opacity-50"
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
  );

  return (
    <div className="space-y-5">
      <header className="mb-2 flex items-center gap-4">
        <Link
          href={`/table/${tableId}/checkout`}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 shadow-soft backdrop-blur-sm transition hover:shadow-lift"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-brand">
          {isCash ? "Waiter notified" : "Payment successful"}
        </h1>
      </header>

      {/* Payment confirmation */}
      <div className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-100">
        <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left sm:gap-5">
          <div className="mb-4 flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 sm:mb-0">
            <Check className="h-9 w-9 stroke-[2.5]" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-lg font-bold text-slate-900">
              {isCash ? "Waiter notified" : "You’re all set"}
            </p>
            <p className="text-2xl font-black tracking-tight text-slate-900">
              {total.toFixed(2)} <span className="text-base font-semibold text-slate-500">MAD</span>{" "}
              <span className="text-sm font-normal text-slate-500">{isCash ? "to collect" : "paid"}</span>
            </p>
            {isCash ? (
              <p className="text-sm text-slate-600">
                Your waiter has been notified. Please have{" "}
                <span className="font-semibold text-slate-800">{total.toFixed(2)} MAD</span> ready.
              </p>
            ) : (
              <p className="text-sm text-slate-600">Your {method === "card" ? "card" : method} payment was received.</p>
            )}
          </div>
        </div>

        <div className="mt-5 space-y-1 border-t border-slate-100 pt-4">
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
        {paymentId ? <p className="mt-3 text-xs text-slate-400">Ref: {paymentId}</p> : null}
      </div>

      {order && (
        <div className="glass-card space-y-1 rounded-2xl p-5 text-sm">
          <p className="mb-2 font-medium text-slate-800">Bill overview</p>
          <div className="flex justify-between">
            <span className="text-slate-500">Status</span>
            <span>{formatOrderStatus(order.status)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Total bill</span>
            <span>{order.totalAmount.toFixed(2)} MAD</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Paid (confirmed)</span>
            <span>{confirmedPaidTotal(order.payments).toFixed(2)} MAD</span>
          </div>
          {order.amountCashPending > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">Cash pending</span>
              <span>{order.amountCashPending.toFixed(2)} MAD</span>
            </div>
          )}
          <div className="flex justify-between font-bold">
            <span>Remaining</span>
            <span>{order.remainingAmount.toFixed(2)} MAD</span>
          </div>
        </div>
      )}

      {/* Review CTA */}
      {reviewPhase === "idle" && (
        <div className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-100">
          <p className="text-center text-base font-bold text-slate-800">How was your experience?</p>
          <p className="mt-1 text-center text-sm text-slate-500">Tap a star to rate us</p>

          <div className="flex h-20 flex-col items-center justify-center">
            {face ? (
              <div className="flex animate-in fade-in zoom-in flex-col items-center gap-1 duration-200">
                <span className="text-5xl" style={{ transform: `scale(${1 + (activeStar ?? 0) * 0.04})` }}>
                  {face.emoji}
                </span>
                <span
                  className={`bg-gradient-to-r ${face.color} bg-clip-text text-xs font-bold uppercase tracking-[0.2em] text-transparent`}
                >
                  {face.label}
                </span>
              </div>
            ) : (
              <span className="text-4xl text-slate-200">⭐</span>
            )}
          </div>

          <StarRow />
        </div>
      )}

      {reviewPhase === "low_feedback" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4 rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-100 duration-500">
          <div className="text-center">
            <span className="text-4xl">{face?.emoji}</span>
            <p className="mt-2 text-base font-bold text-slate-800">Tell us what went wrong</p>
            <p className="mt-1 text-sm text-slate-500">We read every message.</p>
          </div>
          <textarea
            className="min-h-28 w-full rounded-2xl border-none bg-slate-50/90 p-4 text-sm ring-1 ring-slate-100 transition-all focus:ring-2 focus:ring-accent/30"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What could we improve?"
            autoFocus
          />
          <button
            type="button"
            onClick={handleFeedbackSubmit}
            disabled={submitting || !feedback.trim()}
            className="w-full rounded-xl bg-[#062946] px-4 py-3 text-center text-sm font-bold text-white shadow-lg transition hover:bg-[#0a3a5e] disabled:opacity-40"
          >
            {submitting ? "Sending…" : "Submit feedback"}
          </button>
          <Link href={menuHref} className="block text-center text-sm text-slate-500 underline">
            Back to menu
          </Link>
        </div>
      )}

      {reviewPhase === "high_prompt" && (
        <div className="animate-in fade-in zoom-in space-y-4 rounded-2xl bg-white p-6 text-center shadow-md ring-1 ring-slate-100 duration-300">
          <span className="text-5xl">{face?.emoji ?? "😊"}</span>
          <p className="text-base font-bold text-slate-800">Thank you!</p>
          {hasGoogle ? (
            <>
              <p className="text-sm text-slate-600">Would you share your experience on Google?</p>
              <button
                type="button"
                onClick={handleShareOnGoogle}
                disabled={submitting}
                className="w-full rounded-xl bg-[#062946] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0a3a5e] disabled:opacity-40"
              >
                {submitting ? "Opening…" : "Leave a Google review"}
              </button>
              <button
                type="button"
                onClick={handleHighSkipGoogle}
                disabled={submitting}
                className="w-full text-sm text-slate-500 underline"
              >
                No thanks
              </button>
            </>
          ) : (
            <p className="text-sm text-slate-600">We’re glad you enjoyed your visit.</p>
          )}
          {!hasGoogle ? (
            <button
              type="button"
              onClick={handleHighSkipGoogle}
              disabled={submitting}
              className="w-full rounded-xl bg-[#062946] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0a3a5e] disabled:opacity-40"
            >
              {submitting ? "Saving…" : "Continue"}
            </button>
          ) : null}
        </div>
      )}

      {reviewPhase === "high_thanks" && (
        <div className="animate-in fade-in zoom-in space-y-3 rounded-2xl bg-white p-6 text-center shadow-md ring-1 ring-slate-100 duration-300">
          <span className="text-5xl">🙏</span>
          <p className="text-base font-bold text-slate-800">Thanks for your support!</p>
          {hasGoogle && googleReviewUrl ? (
            <a
              href={googleReviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm font-medium text-[#062946] underline underline-offset-2"
            >
              Open Google Reviews again
            </a>
          ) : null}
          <Link href={menuHref} className="block text-sm text-slate-500 underline">
            Done — back to menu
          </Link>
        </div>
      )}

      {reviewPhase === "submitted" && (
        <div className="animate-in fade-in zoom-in space-y-3 rounded-2xl bg-white p-6 text-center shadow-md ring-1 ring-slate-100 duration-300">
          <span className="text-4xl">🙏</span>
          <p className="text-base font-bold text-slate-800">Thank you for your feedback</p>
          <p className="text-sm text-slate-500">We’ll use it to improve.</p>
          <Link href={menuHref} className="block text-sm text-slate-500 underline">
            Done — back to menu
          </Link>
        </div>
      )}

      {/* Extra navigation */}
      <div className="space-y-2 pt-2">
        {reviewPhase === "idle" ? (
          <Link href={menuHref} className="block text-center text-sm text-slate-500 underline">
            Back to menu
          </Link>
        ) : null}
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
