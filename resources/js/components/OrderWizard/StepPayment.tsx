import axios from "axios";
import { useState, useRef } from "react";
import type { OrderData, DeliveryData, PaymentData } from "./Wizard";

type PaymentMethod = "mpesa-stk" | "mpesa-till" | "card";

interface Props {
    orderData: OrderData;
    deliveryData: DeliveryData;
    onNext: (data: PaymentData) => void;
    onBack: () => void;
}

function SectionCard({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`rounded-2xl border border-[#D4E8F5] bg-white p-5 ${className}`}
        >
            {children}
        </div>
    );
}

const TILL_NUMBER = "123456";

export default function StepPayment({
    orderData,
    deliveryData,
    onNext,
    onBack,
}: Props) {
    const [method, setMethod] = useState<PaymentMethod>("mpesa-till");
    const [phone, setPhone] = useState("");
    const [cardNumber, setCardNumber] = useState("");
    const [cardExpiry, setCardExpiry] = useState("");
    const [cardCvv, setCardCvv] = useState("");
    const [stkStatus, setStkStatus] = useState<
        "idle" | "waiting" | "success" | "failed"
    >("idle");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const submittingRef = useRef(false);

    const total = orderData.grandTotal;

    const buildPayload = (paymentData: PaymentData) => ({
        // Order details
        order: {
            selectedTypes: orderData.selectedTypes,
            refillSizes: orderData.refillSizes,
            newSizes: orderData.newSizes,
            deliverySpeed: orderData.deliverySpeed,
            lineItems: orderData.lineItems,
            grandTotal: orderData.grandTotal,
        },
        // Delivery details
        delivery: {
            locationMode: deliveryData.locationMode,
            pinLocation: deliveryData.pinLocation,
            pinAddress: deliveryData.pinAddress,
            manualAddress: deliveryData.manualAddress,
            contactName: deliveryData.contactName,
            contactPhone: deliveryData.contactPhone,
            contactEmail: deliveryData.contactEmail,
            recipientName: deliveryData.recipientName,
            recipientPhone: deliveryData.recipientPhone,
            recipientEmail: deliveryData.recipientEmail,
            scheduleType: deliveryData.scheduleType,
            scheduledTime: deliveryData.scheduledTime,
            notes: deliveryData.notes,
        },
        // Payment details
        payment: paymentData,
    });

    const handleStkPush = async () => {
        if (submittingRef.current) {
            return;
        }

        if (!phone || phone.length < 9) {
            setError("Enter a valid phone number");

            return;
        }

        submittingRef.current = true;
        setError("");
        setSubmitting(true);
        setStkStatus("waiting");

        try {
            const paymentData: PaymentData = {
                method,
                phone,
                tillCode: method === "mpesa-till" ? TILL_NUMBER : "",
                transactionCode: "",
                cardNumber: "",
                cardExpiry: "",
                cardCvv: "",
            };

            const response = await axios.post(
                "/orders",
                buildPayload(paymentData),
            );
            const orderId = response.data.order_id;

            if (!orderId) {
                throw new Error("Order ID was not returned by the server");
            }

            setStkStatus("waiting");

            const checkPaymentStatus = async () => {
                try {
                    const statusResponse = await axios.get(
                        `/orders/${orderId}/payment-status`,
                    );
                    const status = statusResponse.data.status;

                    if (status === "paid") {
                        setStkStatus("success");
                        setSubmitting(false);
                        submittingRef.current = false;

                        setTimeout(() => {
                            onNext(paymentData);
                        }, 1000);

                        return;
                    }

                    if (status === "failed") {
                        setStkStatus("failed");
                        setSubmitting(false);
                        submittingRef.current = false;
                        setError(
                            statusResponse.data.message ||
                                "Mpesa payment failed. Please try again",
                        );

                        return;
                    }

                    setTimeout(checkPaymentStatus, 3000);
                } catch (error) {
                    console.error("Payment status check failed:", error);
                    setStkStatus("failed");
                    setSubmitting(false);
                    submittingRef.current = false;
                    setError(
                        "Unable to check payment status. Please try again",
                    );
                }
            };

            setTimeout(checkPaymentStatus, 3000);
        } catch (e: any) {
            setStkStatus("failed");
            setSubmitting(false);
            submittingRef.current = false;
            setError(
                e?.response?.data?.message ||
                    e?.message ||
                    "Unable to initiate Mpesa payment.",
            );
        }
    };

    // ── Card payment flow
    const handleCardSubmit = async () => {
        if (submittingRef.current) {
            return;
        }

        if (!cardNumber || !cardExpiry || !cardCvv) {
            setError("Fill in all card details");

            return;
        }

        submittingRef.current = true;
        setError("");
        setSubmitting(true);

        try {
            const paymentData: PaymentData = {
                method: "card",
                phone: "",
                tillCode: "",
                transactionCode: "",
                cardNumber,
                cardExpiry,
                cardCvv,
            };
            await axios.post("/orders", buildPayload(paymentData));
            onNext(paymentData);
        } catch (e: any) {
            setError(
                e?.response?.data?.message ||
                    "Card payment failed. Please try again.",
            );
        } finally {
            setSubmitting(false);
            submittingRef.current = false;
        }
    };

    const formatCard = (v: string) =>
        v
            .replace(/\D/g, "")
            .replace(/(.{4})/g, "$1 ")
            .trim()
            .slice(0, 19);
    const formatExpiry = (v: string) =>
        v
            .replace(/\D/g, "")
            .replace(/^(\d{2})(\d)/, "$1/$2")
            .slice(0, 5);

    return (
        <div className="space-y-5">
            {/* Order summary recap */}
            <div className="space-y-2 rounded-2xl border border-[#C4DDEF] bg-[#EEF6FF] p-4">
                <p className="mb-2 text-xs font-semibold text-[#1A4A7A]">
                    Order recap
                </p>
                {orderData.lineItems.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs">
                        <span
                            className={
                                item.label.includes("fee")
                                    ? "text-[#8AA8C0]"
                                    : "text-[#4A6A8A]"
                            }
                        >
                            {item.label}
                        </span>
                        <span
                            className={
                                item.label.includes("fee")
                                    ? "text-[#8AA8C0]"
                                    : "font-medium text-[#0D2A47]"
                            }
                        >
                            KES {item.amount.toLocaleString()}
                        </span>
                    </div>
                ))}
                <div className="flex justify-between border-t border-[#C4DDEF] pt-2">
                    <span className="text-sm font-bold text-[#0D2A47]">
                        Total
                    </span>
                    <span className="text-sm font-black text-[#1A4A7A]">
                        KES {total.toLocaleString()}
                    </span>
                </div>
                <div className="border-t border-[#C4DDEF] pt-2 text-xs text-[#6A8AA8]">
                    📍{" "}
                    {deliveryData.locationMode === "pin"
                        ? deliveryData.pinAddress || "Pinned on map"
                        : deliveryData.manualAddress}
                    {" · "}
                    {deliveryData.scheduleType === "asap"
                        ? "ASAP"
                        : deliveryData.scheduledTime}
                </div>
            </div>

            {/* Payment method selector */}
            <SectionCard>
                <h2 className="mb-1 font-bold text-[#0D2A47]">
                    Payment method
                </h2>
                <p className="mb-4 text-xs text-[#8AA8C0]">
                    Choose how you'd like to pay
                </p>

                <div className="space-y-2">
                    {(
                        [
                            // { id: 'mpesa-stk' as const, label: 'M-Pesa STK Push', sub: 'You\'ll get a prompt on your phone', badge: 'Recommended' },
                            {
                                id: "mpesa-till" as const,
                                label: "M-Pesa Till Number",
                                sub: "We'll send a prompt to your phone",
                                badge: null,
                            },
                            // { id: 'card' as const, label: 'Visa / Mastercard', sub: 'Secure card payment via Flutterwave', badge: null },
                        ] as const
                    ).map((opt) => {
                        const active = method === opt.id;

                        return (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                    setMethod(opt.id);
                                    setError("");
                                    setStkStatus("idle");
                                }}
                                className={`flex w-full items-start justify-between rounded-xl border-2 px-4 py-3.5 text-left transition-all ${
                                    active
                                        ? "border-[#1A4A7A] bg-[#EEF6FF]"
                                        : "border-[#D4E8F5] bg-[#F9FBFD] hover:border-[#9ECBE8]"
                                }`}
                            >
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`text-sm font-semibold ${active ? "text-[#1A4A7A]" : "text-[#0D2A47]"}`}
                                        >
                                            {opt.label}
                                        </span>
                                        {opt.badge && (
                                            <span className="rounded-full bg-[#1A78C2] px-2 py-0.5 text-[10px] font-semibold text-white">
                                                {opt.badge}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-0.5 text-xs text-[#6A8AA8]">
                                        {opt.sub}
                                    </div>
                                </div>
                                <div
                                    className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${active ? "border-[#1A4A7A] bg-[#1A4A7A]" : "border-[#C4DDEF] bg-white"}`}
                                >
                                    {active && (
                                        <svg
                                            width="8"
                                            height="8"
                                            viewBox="0 0 8 8"
                                            fill="none"
                                        >
                                            <path
                                                d="M1.5 4l1.8 1.8L6.5 2.5"
                                                stroke="white"
                                                strokeWidth="1.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </SectionCard>

            {/* ── M-Pesa (STK push) — covers both 'mpesa-stk' and 'mpesa-till' ── */}
            {(method === "mpesa-stk" || method === "mpesa-till") && (
                <SectionCard>
                    <h3 className="mb-1 font-bold text-[#0D2A47]">
                        {method === "mpesa-till"
                            ? `Pay via M-Pesa Till ${TILL_NUMBER}`
                            : "Enter your M-Pesa number"}
                    </h3>
                    <p className="mb-4 text-xs text-[#8AA8C0]">
                        We'll send a payment prompt straight to your phone —
                        enter your M-Pesa PIN to confirm.
                    </p>
                    <div className="mb-4 flex gap-2">
                        <div className="flex flex-shrink-0 items-center rounded-xl border border-[#C4DDEF] bg-[#F5F8FC] px-3 text-xs font-medium text-[#4A6A8A]">
                            🇰🇪 +254
                        </div>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) =>
                                setPhone(
                                    e.target.value
                                        .replace(/\D/g, "")
                                        .slice(0, 10),
                                )
                            }
                            placeholder="07XX XXX XXX"
                            className="flex-1 rounded-xl border border-[#C4DDEF] bg-white px-4 py-3 text-sm text-[#0D2A47] placeholder:text-[#A8C0D4] focus:ring-2 focus:ring-[#1A78C2] focus:outline-none"
                        />
                    </div>

                    {/* STK status states */}
                    {stkStatus === "waiting" && (
                        <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#F5D78A] bg-[#FFF8E8] p-4">
                            <svg
                                className="mt-0.5 h-5 w-5 flex-shrink-0 animate-spin text-[#B07A10]"
                                viewBox="0 0 24 24"
                                fill="none"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"
                                />
                            </svg>
                            <div>
                                <p className="text-sm font-semibold text-[#7A5A10]">
                                    Waiting for payment…
                                </p>
                                <p className="mt-0.5 text-xs text-[#9A7A30]">
                                    Check your phone and enter your M-Pesa PIN
                                    to confirm KES {total.toLocaleString()}.
                                </p>
                            </div>
                        </div>
                    )}
                    {stkStatus === "success" && (
                        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#9AD49A] bg-[#E8F5E8] p-4">
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 20 20"
                                fill="none"
                            >
                                <circle cx="10" cy="10" r="10" fill="#3A7A3A" />
                                <path
                                    d="M6 10l3 3 5-5"
                                    stroke="white"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                            <p className="text-sm font-semibold text-[#2A5A2A]">
                                Payment received ✓
                            </p>
                        </div>
                    )}
                    {stkStatus === "failed" && (
                        <div className="mb-4 rounded-xl border border-[#F5AAAA] bg-[#FEF0F0] p-4">
                            <p className="text-sm font-semibold text-red-700">
                                Payment failed
                            </p>
                            <p className="mt-0.5 text-xs text-red-500">
                                {error}
                            </p>
                        </div>
                    )}

                    {stkStatus === "idle" || stkStatus === "failed" ? (
                        <button
                            type="button"
                            onClick={handleStkPush}
                            disabled={submitting || phone.length < 9}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A4A7A] py-3.5 font-semibold text-white shadow-lg shadow-[#1A4A7A]/20 transition-all hover:bg-[#0D2A47] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {submitting ? (
                                <svg
                                    className="h-4 w-4 animate-spin"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"
                                    />
                                </svg>
                            ) : null}
                            Pay KES {total.toLocaleString()}{" "}
                            {method === "mpesa-till"
                                ? "via Till"
                                : "via M-Pesa"}
                        </button>
                    ) : null}
                </SectionCard>
            )}

            {/* ── Card ── */}
            {method === "card" && (
                <SectionCard>
                    <h3 className="mb-1 font-bold text-[#0D2A47]">
                        Card details
                    </h3>
                    <p className="mb-4 text-xs text-[#8AA8C0]">
                        Processed securely via Flutterwave. We never store your
                        card.
                    </p>
                    <div className="space-y-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-[#2A4A6A]">
                                Card number
                            </label>
                            <input
                                value={cardNumber}
                                onChange={(e) =>
                                    setCardNumber(formatCard(e.target.value))
                                }
                                placeholder="1234 5678 9012 3456"
                                maxLength={19}
                                className="w-full rounded-xl border border-[#C4DDEF] bg-white px-4 py-3 font-mono text-sm tracking-widest text-[#0D2A47] placeholder:text-[#A8C0D4] focus:ring-2 focus:ring-[#1A78C2] focus:outline-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-[#2A4A6A]">
                                    Expiry
                                </label>
                                <input
                                    value={cardExpiry}
                                    onChange={(e) =>
                                        setCardExpiry(
                                            formatExpiry(e.target.value),
                                        )
                                    }
                                    placeholder="MM/YY"
                                    maxLength={5}
                                    className="w-full rounded-xl border border-[#C4DDEF] bg-white px-4 py-3 font-mono text-sm text-[#0D2A47] placeholder:text-[#A8C0D4] focus:ring-2 focus:ring-[#1A78C2] focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-[#2A4A6A]">
                                    CVV
                                </label>
                                <input
                                    value={cardCvv}
                                    onChange={(e) =>
                                        setCardCvv(
                                            e.target.value
                                                .replace(/\D/g, "")
                                                .slice(0, 4),
                                        )
                                    }
                                    placeholder="•••"
                                    maxLength={4}
                                    type="password"
                                    className="w-full rounded-xl border border-[#C4DDEF] bg-white px-4 py-3 font-mono text-sm text-[#0D2A47] placeholder:text-[#A8C0D4] focus:ring-2 focus:ring-[#1A78C2] focus:outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#8AA8C0]">
                            <svg
                                width="12"
                                height="12"
                                viewBox="0 0 16 16"
                                fill="none"
                            >
                                <rect
                                    x="2"
                                    y="7"
                                    width="12"
                                    height="8"
                                    rx="1.5"
                                    stroke="currentColor"
                                    strokeWidth="1.4"
                                />
                                <path
                                    d="M5 7V5a3 3 0 016 0v2"
                                    stroke="currentColor"
                                    strokeWidth="1.4"
                                    strokeLinecap="round"
                                />
                            </svg>
                            Secured by Flutterwave. Your card details are never
                            stored.
                        </div>
                        <button
                            type="button"
                            onClick={handleCardSubmit}
                            disabled={
                                submitting ||
                                !cardNumber ||
                                !cardExpiry ||
                                !cardCvv
                            }
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A4A7A] py-3.5 font-semibold text-white shadow-lg shadow-[#1A4A7A]/20 transition-all hover:bg-[#0D2A47] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {submitting && (
                                <svg
                                    className="h-4 w-4 animate-spin"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"
                                    />
                                </svg>
                            )}
                            Pay KES {total.toLocaleString()}
                        </button>
                    </div>
                </SectionCard>
            )}

            {/* Global error */}
            {error && method === "card" && (
                <div className="rounded-xl border border-[#F5AAAA] bg-[#FEF0F0] px-4 py-3 text-sm text-red-600">
                    {error}
                </div>
            )}

            {/* Back */}
            <button
                type="button"
                onClick={onBack}
                className="w-full rounded-xl border-2 border-[#D4E8F5] py-3 font-semibold text-[#1A4A7A] transition-all hover:bg-[#EEF6FF]"
            >
                ← Back to delivery
            </button>
        </div>
    );
}
