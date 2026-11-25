import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { OrderData, DeliveryData, PaymentData } from "./Wizard";

interface Props {
    orderData: OrderData;
    deliveryData: DeliveryData;
    onNext: (data: PaymentData, orderId: number) => void;
    onBack: () => void;
}

const POLL_EVERY_MS = 3000;
const GIVE_UP_AFTER_MS = 120_000;

function toMsisdn(raw: string): string | null {
    let d = raw.replace(/\D/g, "");

    if (d.startsWith("0")) {
        d = "254" + d.slice(1);
    } else if (/^[17]\d{8}$/.test(d)) {
        d = "254" + d;
    }

    return /^254[17]\d{8}$/.test(d) ? d : null;
}

const newKey = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`rounded-2xl border border-[#D4E8F5] bg-white p-5 ${className}`}>{children}</div>
    );
}

export default function StepPayment({ orderData, deliveryData, onNext, onBack }: Props) {
    const [phone, setPhone] = useState("");
    const [stkStatus, setStkStatus] = useState<"idle" | "waiting" | "success" | "failed">("idle");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const submittingRef = useRef(false);
    const idempotencyKey = useRef(newKey());
    const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;

        return () => {
            mounted.current = false;

            if (pollTimer.current) {
                clearTimeout(pollTimer.current);
            }
        };
    }, []);

    const total = orderData.grandTotal;
    const msisdn = toMsisdn(phone);

    const fail = (message: string) => {
        if (!mounted.current) {
            return;
        }

        idempotencyKey.current = newKey(); 
        submittingRef.current = false;
        setSubmitting(false);
        setStkStatus("failed");
        setError(message);
        toast.error(message);
    };

    const poll = (publicId: string, startedAt: number) => {
        pollTimer.current = setTimeout(async () => {
            if (!mounted.current) {
                return;
            }

            try {
                const { data } = await axios.get(`/checkout/${publicId}/status`);

                if (!mounted.current) {
                    return;
                }

                if (data.status === "paid") {
                    submittingRef.current = false;
                    setSubmitting(false);
                    setStkStatus("success");
                    toast.success("Payment received. Your order is confirmed!");
                    setTimeout(
                        () => mounted.current && onNext({ method: "mpesa-stk", phone: msisdn ?? phone }, data.order_id),
                        800,
                    );

                    return;
                }

                if (data.status === "failed" || data.status === "expired") {
                    fail(data.message || "The payment was not completed.");

                    return;
                }
            } catch {
            }

            if (Date.now() - startedAt > GIVE_UP_AFTER_MS) {
                fail("We haven't received a confirmation yet. If M-Pesa deducted money, contact us with your M-Pesa message.");

                return;
            }

            poll(publicId, startedAt);
        }, POLL_EVERY_MS);
    };

    const handlePay = async () => {
        if (submittingRef.current) {
            return;
        }

        if (!msisdn) {
            const msg = "Enter a valid Safaricom number, e.g. 0712 345 678";
            setError(msg);
            toast.error(msg);

            return;
        }

        submittingRef.current = true;
        setError("");
        setSubmitting(true);
        setStkStatus("waiting");

        try {
            const { data } = await axios.post("/checkout", {
                idempotency_key: idempotencyKey.current,
                phone: msisdn,
                order: {
                    refillSizes: orderData.refillSizes,
                    newSizes: orderData.newSizes,
                    deliverySpeed: orderData.deliverySpeed,
                },
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
            });

            toast.info("Check your phone and enter your M-Pesa PIN.");
            poll(data.public_id, Date.now());
        } catch (e: any) {
            const firstValidation = e?.response?.data?.errors
                ? (Object.values(e.response.data.errors)[0] as string[])[0]
                : null;

            fail(firstValidation || e?.response?.data?.message || "Could not start the payment. Please try again.");
        }
    };

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


          
                <SectionCard>
                    <h3 className="mb-1 font-bold text-[#0D2A47]">
                       Pay With Mpesa
                    </h3>
                    <p className="mb-4 text-xs text-[#8AA8C0]">
                        We'll send a payment prompt straight to your phone —
                        enter your M-Pesa PIN to confirm.
                    </p>
                    <div className="mb-4 flex gap-2">
                        <div className="flex flex-shrink-0 items-center rounded-xl border border-[#C4DDEF] bg-[#F5F8FC] px-3 text-xs font-medium text-[#4A6A8A]">
                             +254
                        </div>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) =>
                                setPhone(
                                    e.target.value
                                        .replace(/\D/g, "")
                                        .slice(0, 12),
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
                            onClick={handlePay}
                            disabled={submitting || !msisdn}
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
                            Pay KES {total.toLocaleString()} via M-Pesa
                            
                        </button>
                    ) : null}
                </SectionCard>
            

            {/* Back */}
            <button
                type="button"
                disabled={submitting}
                onClick={onBack}
                className="w-full rounded-xl border-2 border-[#D4E8F5] py-3 font-semibold text-[#1A4A7A] transition-all hover:bg-[#EEF6FF]"
            >
                ← Back to delivery
            </button>
        </div>
    );
}
