import { Head, router } from "@inertiajs/react";
import { useState, useMemo, useRef } from "react";
import { dashboard } from "@/routes";

// ── Types ──────────────────────────────────────────────────────────
interface OrderItem {
    id: number;
    type: "new" | "refill";
    size: string;
    quantity: number;
    is_bundled: boolean;
    bundle_quantity: number | null;
    bundle_size: number | null;
    amount: number;
    label: string;
}
interface OrderCharge {
    id: number;
    label: string;
    amount: number;
}

interface RefillerOption {
    id: number;
    name: string;
}

interface DeliveryInfo {
    location_mode: string;
    address: string;
    contact_name: string | null;
    contact_phone: string | null;
    recepient_name: string | null;
    recepient_phone: string | null;
    schedule_label: string;
    notes: string | null;
    rider?: { id: number; name: string } | null;
}
interface PaymentInfo {
    method: string;
    method_label: string;
    status: string;
    phone: string | null;
    transaction_code: string | null;
}
interface Order {
    id: number;
    delivery_speed: string;
    status: string;
    status_label: string;
    grand_total: number;
    can_cancel: boolean;
    created_at: string;
    items: OrderItem[];
    charges: OrderCharge[];
    delivery: DeliveryInfo | null;
    payment: PaymentInfo | null;
    refiller?: { id: number; name: string } | null;
}
interface Subscription {
    id: number;
    frequency: string;
    frequency_label: string;
    status: string;
    next_delivery_at: string | null;
    sizes: { size: string; quantity: number; type: string; amount?: number }[];
    total_per_cycle: number;
    created_at: string;
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    payment_method?: string;
}
interface Stats {
    totalOrders: number;
    totalSpent: number;
    activeOrders: number;
    deliveredCount: number;
}
interface Rider {
    id: number;
    name: string;
}

interface Props {
    stats: Stats;
    orders: { data: Order[]; last_page: number; current_page: number };
    subscriptions: Subscription[];
    riders?: Rider[];
    refillers?: RefillerOption[];
}

// ── Style maps ─────────────────────────────────────────────────────
const S_STYLE: Record<string, { dot: string; badge: string }> = {
    pending: {
        dot: "bg-amber-400",
        badge: "bg-amber-50 text-amber-800 border-amber-200",
    },
    confirmed: {
        dot: "bg-[#1A78C2]",
        badge: "bg-[#DDEEFF] text-[#1A4A7A] border-[#B8D4EC]",
    },
    out_for_delivery: {
        dot: "bg-orange-400",
        badge: "bg-orange-50 text-orange-800 border-orange-200",
    },
    delivered: {
        dot: "bg-green-500",
        badge: "bg-green-50 text-green-800 border-green-200",
    },
    cancelled: {
        dot: "bg-red-400",
        badge: "bg-red-50 text-red-700 border-red-200",
    },
};
const PAY_STYLE: Record<string, string> = {
    pending: "bg-amber-50 text-amber-800 border-amber-200",
    verified: "bg-green-50 text-green-800 border-green-200",
    failed: "bg-red-50 text-red-700 border-red-200",
};
const SUB_STYLE: Record<string, { badge: string; dot: string }> = {
    active: {
        badge: "bg-green-50 text-green-800 border-green-200",
        dot: "bg-green-500",
    },
    paused: {
        badge: "bg-amber-50 text-amber-800 border-amber-200",
        dot: "bg-amber-400",
    },
    cancelled: {
        badge: "bg-red-50 text-red-700 border-red-200",
        dot: "bg-red-400",
    },
    pending: {
        badge: "bg-[#DDEEFF] text-[#1A4A7A] border-[#B8D4EC]",
        dot: "bg-[#1A78C2]",
    },
};

// Order status transitions for admin
const ORDER_STATUS_ACTIONS: Record<
    string,
    { label: string; next: string; cls: string }[]
> = {
    pending: [
        {
            label: "Confirm",
            next: "confirmed",
            cls: "bg-[#1A4A7A] text-white hover:bg-[#0D2A47]",
        },
        {
            label: "Cancel",
            next: "cancelled",
            cls: "border border-red-200 text-red-600 bg-red-50 hover:bg-red-100",
        },
    ],
    confirmed: [
        {
            label: "Mark Out for Delivery",
            next: "out_for_delivery",
            cls: "bg-orange-500 text-white hover:bg-orange-600",
        },
        {
            label: "Cancel",
            next: "cancelled",
            cls: "border border-red-200 text-red-600 bg-red-50 hover:bg-red-100",
        },
    ],
    out_for_delivery: [
        {
            label: "Mark Delivered",
            next: "delivered",
            cls: "bg-green-600 text-white hover:bg-green-700",
        },
    ],
    delivered: [],
    cancelled: [],
};

export const RIDER_STATUS_ACTIONS: Record<
    string,
    { label: string; next: string; cls: string }[]
> = {
    pending: [],
    cancelled: [],
    delivered: [],
    confirmed: [
        {
            label: "Mark Out for Delivery",
            next: "out_for_delivery",
            cls: "bg-orange-500 text-white hover:bg-orange-600",
        },
    ],
    out_for_delivery: [
        {
            label: "Mark Delivered",
            next: "delivered",
            cls: "bg-green-600 text-white hover:bg-green-700",
        },
    ],
};

function fmt(n: number) {
    return `KES ${n.toLocaleString()}`;
}
function timeAgo(iso: string) {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

    if (d === 0) {
        const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);

        return h < 1 ? "Just now" : `${h}h ago`;
    }

    return d === 1 ? "Yesterday" : `${d}d ago`;
}
function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-KE", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

// ── Sub-components ─────────────────────────────────────────────────
function StatCard({
    label,
    value,
    sub,
    icon,
    accent = false,
}: {
    label: string;
    value: string | number;
    sub?: string;
    icon: React.ReactNode;
    accent?: boolean;
}) {
    return (
        <div
            className={`flex items-start gap-4 rounded-2xl border p-5 ${accent ? "border-[#1A4A7A] bg-[#0D2A47]" : "border-[#D4E8F5] bg-white"}`}
        >
            <div
                className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${accent ? "bg-[#1A4A7A] text-[#7AB8E0]" : "bg-[#EEF6FF] text-[#1A78C2]"}`}
            >
                {icon}
            </div>
            <div>
                <p
                    className={`text-xs font-medium ${accent ? "text-[#7AB8E0]" : "text-[#8AA8C0]"}`}
                >
                    {label}
                </p>
                <p
                    className={`mt-0.5 text-xl leading-tight font-black ${accent ? "text-white" : "text-[#0D2A47]"}`}
                >
                    {value}
                </p>
                {sub && (
                    <p
                        className={`mt-0.5 text-xs ${accent ? "text-[#7AB8E0]" : "text-[#8AA8C0]"}`}
                    >
                        {sub}
                    </p>
                )}
            </div>
        </div>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="mb-2.5 text-[10px] font-bold tracking-widest text-[#8AA8C0] uppercase">
            {children}
        </p>
    );
}

function InfoRow({
    label,
    value,
    mono = false,
    italic = false,
}: {
    label: string;
    value: string;
    mono?: boolean;
    italic?: boolean;
}) {
    return (
        <div className="flex gap-2 text-sm leading-snug">
            <span className="w-14 flex-shrink-0 pt-px text-[#8AA8C0]">
                {label}
            </span>
            <span
                className={`flex-1 font-medium break-words text-[#0D2A47] ${mono ? "font-mono text-xs" : ""} ${italic ? "text-[#6A8AA8] italic" : ""}`}
            >
                {value}
            </span>
        </div>
    );
}

// ── Order card ─────────────────────────────────────────────────────
export function OrderCard({
    order,
    statusActions = ORDER_STATUS_ACTIONS,
    showAssign = false,
    riders = [],
    refillers = [],
}: {
    order: Order;
    statusActions?: typeof ORDER_STATUS_ACTIONS;
    showAssign?: boolean;
    riders?: Rider[];
    refillers?: RefillerOption[];
}) {
    const [open, setOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [verifyingPayment, setVerifyingPayment] = useState(false);
    const sc = S_STYLE[order.status] ?? S_STYLE.pending;
    const actions = statusActions[order.status] ?? [];

    const handleStatusChange = (next: string) => {
        if (
            !confirm(
                `Change order #${order.id} status to "${next.replace(/_/g, " ")}"?`,
            )
        ) {
            return;
        }

        setActionLoading(next);
        router.post(
            `/orders/${order.id}/status`,
            { status: next },
            {
                onFinish: () => setActionLoading(null),
            },
        );
    };

    const handleVerifyPayment = () => {
        if (!confirm(`Verify payment for order #${order.id}?`)) {
            return;
        }

        setVerifyingPayment(true);
        router.post(
            `/orders/${order.id}/verify-payment`,
            {},
            {
                onFinish: () => setVerifyingPayment(false),
            },
        );
    };

    const receiver = (() => {
        if (!order.delivery) {
            return null;
        }

        const d = order.delivery;

        if (d.recepient_name) {
            return { name: d.recepient_name, phone: d.recepient_phone };
        }

        if (d.contact_name) {
            return { name: d.contact_name, phone: d.contact_phone };
        }

        return null;
    })();

    return (
        <div className="overflow-hidden rounded-2xl border border-[#D4E8F5] bg-white">
            {/* Header */}
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-[#F9FBFD] md:p-5"
            >
                <div className="flex min-w-0 items-center gap-3">
                    <span
                        className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${sc.dot}`}
                    />
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-[#0D2A47]">
                                #{order.id}
                            </span>
                            <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sc.badge}`}
                            >
                                {order.status_label}
                            </span>
                            {order.delivery_speed === "instant" && (
                                <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                                    ⚡ Instant
                                </span>
                            )}
                            {order.payment?.status === "pending" && (
                                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                    ⏳ Payment unverified
                                </span>
                            )}
                        </div>
                        <p className="mt-0.5 text-xs text-[#8AA8C0]">
                            {timeAgo(order.created_at)} · {order.items.length}{" "}
                            item{order.items.length !== 1 ? "s" : ""}
                            {receiver ? ` · ${receiver.name}` : ""}
                            {order.delivery?.address
                                ? ` · ${order.delivery.address.slice(0, 28)}${order.delivery.address.length > 28 ? "…" : ""}`
                                : ""}
                        </p>
                    </div>
                </div>
                <div className="ml-3 flex flex-shrink-0 items-center gap-3">
                    <span className="text-sm font-black text-[#1A4A7A]">
                        {fmt(order.grand_total)}
                    </span>
                    <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        className={`text-[#8AA8C0] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                    >
                        <path
                            d="M3 5l4 4 4-4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
            </button>

            {/* Expanded */}
            {open && (
                <div className="space-y-5 border-t border-[#D4E8F5] p-4 md:p-5">
                    <div className="grid gap-5 md:grid-cols-3">
                        {/* ── Items ── */}
                        <div className="md:col-span-1">
                            <SectionLabel>What was ordered</SectionLabel>
                            <div className="space-y-2">
                                {order.items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex justify-between gap-2 text-sm"
                                    >
                                        <div className="flex min-w-0 items-start gap-2">
                                            <span
                                                className={`mt-0.5 flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                                    item.type === "refill"
                                                        ? "bg-[#DDEEFF] text-[#1A4A7A]"
                                                        : "bg-green-50 text-green-700"
                                                }`}
                                            >
                                                {item.type === "refill"
                                                    ? "Refill"
                                                    : "New"}
                                            </span>
                                            <span className="break-words text-[#4A6A8A]">
                                                {item.size}
                                                {item.is_bundled
                                                    ? ` · bundle ×${item.bundle_quantity} (pack ${item.bundle_size})`
                                                    : ` · qty ${item.quantity}`}
                                            </span>
                                        </div>
                                        {item.amount > 0 && (
                                            <span className="flex-shrink-0 font-semibold text-[#0D2A47]">
                                                {fmt(item.amount)}
                                            </span>
                                        )}
                                    </div>
                                ))}
                                {order.charges.map((c) => (
                                    <div
                                        key={c.id}
                                        className="flex justify-between gap-2 text-xs"
                                    >
                                        <span className="text-[#8AA8C0]">
                                            {c.label}
                                        </span>
                                        <span className="flex-shrink-0 text-[#8AA8C0]">
                                            {fmt(c.amount)}
                                        </span>
                                    </div>
                                ))}
                                <div className="flex justify-between border-t border-[#D4E8F5] pt-2 text-sm font-bold">
                                    <span className="text-[#0D2A47]">
                                        Total
                                    </span>
                                    <span className="text-[#1A4A7A]">
                                        {fmt(order.grand_total)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {order.delivery?.delivery_code &&
                            order.status === "out_for_delivery" && (
                                <div className="flex items-center justify-between rounded-xl border border-[#D4E8F5] bg-[#F5F8FC] p-3">
                                    <div>
                                        <p className="text-[10px] font-semibold text-[#8AA8C0]">
                                            Delivery code
                                        </p>
                                        <p className="font-mono font-bold text-[#0D2A47]">
                                            {order.delivery.delivery_code}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            router.post(
                                                `/orders/${order.id}/resend-delivery-code`,
                                                {},
                                                { preserveScroll: true },
                                            )
                                        }
                                        className="text-xs font-semibold text-[#1A4A7A] hover:underline"
                                    >
                                        Resend
                                    </button>
                                </div>
                            )}

                        {/* ── Delivery ── */}
                        <div>
                            <SectionLabel>Delivery details</SectionLabel>
                            {order.delivery ? (
                                <div className="space-y-2">
                                    <div className="rounded-xl border border-[#D4E8F5] bg-[#F5F8FC] p-3">
                                        <p className="mb-1 text-[10px] font-semibold text-[#8AA8C0]">
                                            Delivery address
                                        </p>
                                        <p className="text-sm font-medium text-[#0D2A47]">
                                            {order.delivery.address || "—"}
                                        </p>
                                    </div>
                                    {receiver && (
                                        <div className="rounded-xl border border-[#C4DDEF] bg-[#EEF6FF] p-3">
                                            <p className="mb-1 text-[10px] font-semibold text-[#6A8AA8]">
                                                {order.delivery
                                                    .location_mode ===
                                                "someone-else"
                                                    ? "Recipient"
                                                    : " Contact"}
                                            </p>
                                            <p className="text-sm font-bold text-[#0D2A47]">
                                                {receiver.name}
                                            </p>
                                            {receiver.phone && (
                                                <p className="mt-0.5 text-xs font-medium text-[#1A78C2]">
                                                    +254{receiver.phone}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    <InfoRow
                                        label="When"
                                        value={order.delivery.schedule_label}
                                    />
                                    {order.delivery.notes && (
                                        <InfoRow
                                            label="Note"
                                            value={order.delivery.notes}
                                            italic
                                        />
                                    )}
                                    {showAssign && (
                                        <div className="rounded-xl border border-[#D4E8F5] bg-[#F5F8FC] p-3">
                                            <p className="mb-1.5 text-[10px] font-semibold text-[#8AA8C0]">
                                                Assigned rider
                                            </p>
                                            <select
                                                defaultValue={
                                                    order.delivery.rider?.id ??
                                                    ""
                                                }
                                                onChange={(e) => {
                                                    const riderId = e.target
                                                        .value
                                                        ? Number(e.target.value)
                                                        : null;
                                                    router.post(
                                                        `/admin/orders/${order.id}/assign-rider`,
                                                        { rider_id: riderId },
                                                    );
                                                }}
                                                className="w-full rounded-lg border border-[#D4E8F5] bg-white px-2 py-1.5 text-sm text-[#0D2A47]"
                                            >
                                                <option value="">
                                                    — Unassigned —
                                                </option>
                                                {riders.map((r) => (
                                                    <option
                                                        key={r.id}
                                                        value={r.id}
                                                    >
                                                        {r.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {showAssign && (
                                        <div className="rounded-xl border border-[#D4E8F5] bg-[#F5F8FC] p-3">
                                            <p className="mb-1.5 text-[10px] font-semibold text-[#8AA8C0]">
                                                💧 Refiller
                                            </p>
                                            <select
                                                defaultValue={
                                                    order.refiller?.id ?? ""
                                                }
                                                onChange={(e) => {
                                                    const refillerId = e.target
                                                        .value
                                                        ? Number(e.target.value)
                                                        : null;
                                                    router.post(
                                                        `/admin/orders/${order.id}/assign-refiller`,
                                                        {
                                                            refiller_id:
                                                                refillerId,
                                                        },
                                                    );
                                                }}
                                                className="w-full rounded-lg border border-[#D4E8F5] bg-white px-2 py-1.5 text-sm text-[#0D2A47]"
                                            >
                                                <option value="">
                                                    — Unassigned —
                                                </option>
                                                {refillers.map((r) => (
                                                    <option
                                                        key={r.id}
                                                        value={r.id}
                                                    >
                                                        {r.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-[#8AA8C0]">
                                    No delivery info recorded
                                </p>
                            )}
                        </div>

                        {/* ── Payment ── */}
                        <div>
                            <SectionLabel>Payment</SectionLabel>
                            {order.payment ? (
                                <div className="space-y-2">
                                    <div className="rounded-xl border border-[#D4E8F5] bg-[#F5F8FC] p-3">
                                        <p className="mb-1 text-[10px] font-semibold text-[#8AA8C0]">
                                            Method
                                        </p>
                                        <p className="text-sm font-bold text-[#0D2A47]">
                                            {order.payment.method_label}
                                        </p>
                                        <span
                                            className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${PAY_STYLE[order.payment.status] ?? PAY_STYLE.pending}`}
                                        >
                                            {order.payment.status
                                                .charAt(0)
                                                .toUpperCase() +
                                                order.payment.status.slice(1)}
                                        </span>
                                    </div>
                                    {order.payment.phone && (
                                        <InfoRow
                                            label="Phone"
                                            value={`+254${order.payment.phone}`}
                                        />
                                    )}
                                    {order.payment.transaction_code && (
                                        <InfoRow
                                            label="Ref"
                                            value={
                                                order.payment.transaction_code
                                            }
                                            mono
                                        />
                                    )}

                                    {/* Payment verification action */}
                                    {order.payment.status === "pending" && (
                                        <div className="space-y-2">
                                            {order.payment.method ===
                                            "mpesa-till" ? (
                                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                                    Waiting for M-Pesa
                                                    confirmation — this updates
                                                    automatically, usually
                                                    within seconds.
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                                        Awaiting manual
                                                        verification by admin
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={
                                                            handleVerifyPayment
                                                        }
                                                        disabled={
                                                            verifyingPayment
                                                        }
                                                        className="w-full rounded-xl bg-green-600 py-2 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                                                    >
                                                        {verifyingPayment
                                                            ? "Verifying…"
                                                            : "✓ Mark Payment Verified"}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                    {order.payment.status === "verified" && (
                                        <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
                                            ✓ Payment verified
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-[#8AA8C0]">
                                    No payment info
                                </p>
                            )}
                        </div>
                    </div>

                    {/* ── Admin Actions ── */}
                    {actions.length > 0 && (
                        <div className="border-t border-[#D4E8F5] pt-4">
                            <p className="mb-3 text-[10px] font-bold tracking-widest text-[#8AA8C0] uppercase">
                                Admin Actions
                            </p>
                            {actions.map((action) => {
                                const needsRider =
                                    action.next === "out_for_delivery" &&
                                    !order.delivery?.rider;

                                return (
                                    <button
                                        key={action.next}
                                        type="button"
                                        onClick={() =>
                                            handleStatusChange(action.next)
                                        }
                                        disabled={
                                            actionLoading !== null || needsRider
                                        }
                                        title={
                                            needsRider
                                                ? "Assign a rider first"
                                                : undefined
                                        }
                                        className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${action.cls}`}
                                    >
                                        {actionLoading === action.next
                                            ? "Updating…"
                                            : action.label}
                                    </button>
                                );
                            })}
                            {actions.some(
                                (a) => a.next === "out_for_delivery",
                            ) &&
                                !order.delivery?.rider && (
                                    <p className="mt-2 text-[11px] text-[#8AA8C0]">
                                        Assign a rider above before dispatching
                                        this order.
                                    </p>
                                )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Subscriptions Table ────────────────────────────────────────────
function SubscriptionsTable({
    subscriptions,
}: {
    subscriptions: Subscription[];
}) {
    const [actionLoading, setActionLoading] = useState<{
        id: number;
        action: string;
    } | null>(null);
    const [expandedRow, setExpandedRow] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState<
        "all" | "active" | "paused" | "cancelled" | "pending"
    >("all");

    const filtered = useMemo(() => {
        if (statusFilter === "all") {
            return subscriptions;
        }

        return subscriptions.filter((s) => s.status === statusFilter);
    }, [subscriptions, statusFilter]);

    const handleAction = (
        sub: Subscription,
        action: "pause" | "resume" | "activate" | "cancel",
    ) => {
        const confirmMsg =
            action === "cancel"
                ? `Cancel subscription #${sub.id}? This cannot be undone.`
                : `${action.charAt(0).toUpperCase() + action.slice(1)} subscription #${sub.id}?`;

        if (!confirm(confirmMsg)) {
            return;
        }

        setActionLoading({ id: sub.id, action });
        router.post(
            `/subscriptions/${sub.id}/${action}`,
            {},
            {
                onFinish: () => setActionLoading(null),
            },
        );
    };

    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = {
            all: subscriptions.length,
            active: 0,
            paused: 0,
            cancelled: 0,
            pending: 0,
        };
        subscriptions.forEach((s) => {
            if (counts[s.status] !== undefined) {
                counts[s.status]++;
            }
        });

        return counts;
    }, [subscriptions]);

    if (subscriptions.length === 0) {
        return (
            <div className="rounded-2xl border border-[#D4E8F5] bg-white py-16 text-center text-[#8AA8C0]">
                <svg
                    className="mx-auto mb-3 opacity-30"
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                >
                    <path
                        d="M12 2C12 2 5 9 5 14a7 7 0 0014 0C19 9 12 2 12 2z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    />
                    <circle
                        cx="12"
                        cy="14"
                        r="2"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    />
                </svg>
                <p className="text-sm font-medium">No subscriptions yet</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filter pills */}
            <div className="flex w-fit flex-wrap gap-1 rounded-xl border border-[#D4E8F5] bg-[#F5F8FC] p-1">
                {(
                    ["all", "active", "pending", "paused", "cancelled"] as const
                ).map((s) => (
                    <button
                        key={s}
                        type="button"
                        onClick={() => setStatusFilter(s)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                            statusFilter === s
                                ? "border border-[#D4E8F5] bg-white text-[#1A4A7A] shadow-sm"
                                : "text-[#8AA8C0] hover:text-[#1A4A7A]"
                        }`}
                    >
                        {s}{" "}
                        {statusCounts[s] > 0 && s !== "all"
                            ? `(${statusCounts[s]})`
                            : s === "all"
                              ? `(${statusCounts.all})`
                              : ""}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-2xl border border-[#D4E8F5] bg-white">
                {/* Table header */}
                <div className="hidden grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1.5fr] gap-4 border-b border-[#D4E8F5] bg-[#F5F8FC] px-5 py-3 text-[10px] font-bold tracking-wider text-[#8AA8C0] uppercase md:grid">
                    <span>Subscriber</span>
                    <span>Frequency / Schedule</span>
                    <span>Items</span>
                    <span>Amount/cycle</span>
                    <span>Status</span>
                    <span>Actions</span>
                </div>

                <div className="divide-y divide-[#F0F6FC]">
                    {filtered.map((sub) => {
                        const sc = SUB_STYLE[sub.status] ?? SUB_STYLE.active;
                        const isExpanded = expandedRow === sub.id;
                        const loading =
                            actionLoading?.id === sub.id
                                ? actionLoading.action
                                : null;

                        return (
                            <div key={sub.id}>
                                {/* Main row */}
                                <div className="px-4 py-4 md:px-5">
                                    {/* Mobile layout */}
                                    <div className="space-y-3 md:hidden">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-sm font-bold text-[#0D2A47]">
                                                        #{sub.id}
                                                    </span>
                                                    <span
                                                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sc.badge}`}
                                                    >
                                                        {sub.status
                                                            .charAt(0)
                                                            .toUpperCase() +
                                                            sub.status.slice(1)}
                                                    </span>
                                                </div>
                                                {sub.name && (
                                                    <p className="mt-0.5 text-sm font-medium text-[#0D2A47]">
                                                        {sub.name}
                                                    </p>
                                                )}
                                                {sub.phone && (
                                                    <p className="text-xs text-[#8AA8C0]">
                                                        +254{sub.phone}
                                                    </p>
                                                )}
                                            </div>
                                            <span className="flex-shrink-0 text-sm font-black text-[#1A4A7A]">
                                                {fmt(sub.total_per_cycle)}
                                                <span className="text-[10px] font-normal text-[#8AA8C0]">
                                                    /cycle
                                                </span>
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="rounded-lg border border-[#D4E8F5] bg-[#F5F8FC] px-2 py-1 text-xs text-[#6A8AA8]">
                                                {sub.frequency_label}
                                            </span>
                                            <span className="rounded-lg border border-[#D4E8F5] bg-[#F5F8FC] px-2 py-1 text-xs text-[#6A8AA8]">
                                                {sub.sizes.length} item type
                                                {sub.sizes.length !== 1
                                                    ? "s"
                                                    : ""}
                                            </span>
                                            {sub.next_delivery_at && (
                                                <span className="text-xs text-[#6A8AA8]">
                                                    Next:{" "}
                                                    {new Date(
                                                        sub.next_delivery_at,
                                                    ).toLocaleDateString(
                                                        "en-KE",
                                                        {
                                                            weekday: "short",
                                                            day: "numeric",
                                                            month: "short",
                                                        },
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                        <AdminSubActions
                                            sub={sub}
                                            loading={loading}
                                            onAction={handleAction}
                                        />
                                    </div>

                                    {/* Desktop layout */}
                                    <div className="hidden grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1.5fr] items-center gap-4 md:grid">
                                        {/* Subscriber */}
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`h-2 w-2 flex-shrink-0 rounded-full ${sc.dot}`}
                                                />
                                                <span className="text-sm font-semibold text-[#0D2A47]">
                                                    #{sub.id}
                                                </span>
                                            </div>
                                            {sub.name ? (
                                                <p className="mt-0.5 pl-4 text-xs text-[#4A6A8A]">
                                                    {sub.name}
                                                </p>
                                            ) : (
                                                <p className="mt-0.5 pl-4 text-xs text-[#C4DDEF] italic">
                                                    No name
                                                </p>
                                            )}
                                            {sub.phone && (
                                                <p className="pl-4 text-xs text-[#8AA8C0]">
                                                    +254{sub.phone}
                                                </p>
                                            )}
                                        </div>

                                        {/* Frequency */}
                                        <div>
                                            <p className="text-sm font-medium text-[#0D2A47]">
                                                {sub.frequency_label}
                                            </p>
                                            {sub.next_delivery_at ? (
                                                <p className="mt-0.5 text-xs text-[#8AA8C0]">
                                                    Next:{" "}
                                                    {new Date(
                                                        sub.next_delivery_at,
                                                    ).toLocaleDateString(
                                                        "en-KE",
                                                        {
                                                            weekday: "short",
                                                            day: "numeric",
                                                            month: "short",
                                                        },
                                                    )}
                                                </p>
                                            ) : (
                                                <p className="mt-0.5 text-xs text-[#C4DDEF] italic">
                                                    Not scheduled
                                                </p>
                                            )}
                                        </div>

                                        {/* Items */}
                                        <div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setExpandedRow(
                                                        isExpanded
                                                            ? null
                                                            : sub.id,
                                                    )
                                                }
                                                className="text-xs font-medium text-[#1A78C2] hover:underline"
                                            >
                                                {sub.sizes.length} type
                                                {sub.sizes.length !== 1
                                                    ? "s"
                                                    : ""}{" "}
                                                ↓
                                            </button>
                                        </div>

                                        {/* Amount */}
                                        <div>
                                            <p className="text-sm font-bold text-[#1A4A7A]">
                                                {fmt(sub.total_per_cycle)}
                                            </p>
                                            <p className="text-xs text-[#8AA8C0]">
                                                per cycle
                                            </p>
                                        </div>

                                        {/* Status */}
                                        <div>
                                            <span
                                                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sc.badge}`}
                                            >
                                                {sub.status
                                                    .charAt(0)
                                                    .toUpperCase() +
                                                    sub.status.slice(1)}
                                            </span>
                                            <p className="mt-1 text-[10px] text-[#8AA8C0]">
                                                {fmtDate(sub.created_at)}
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <AdminSubActions
                                            sub={sub}
                                            loading={loading}
                                            onAction={handleAction}
                                        />
                                    </div>
                                </div>

                                {/* Expanded items detail */}
                                {isExpanded && (
                                    <div className="border-t border-[#F0F6FC] bg-[#FAFCFF] px-5 pb-4">
                                        <div className="pt-3">
                                            <p className="mb-2 text-[10px] font-bold tracking-widest text-[#8AA8C0] uppercase">
                                                Items per delivery
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {sub.sizes.map((s, i) => (
                                                    <span
                                                        key={i}
                                                        className="rounded-lg border border-[#D4E8F5] bg-white px-3 py-1.5 text-xs font-medium text-[#4A6A8A]"
                                                    >
                                                        <span
                                                            className={`font-bold ${s.type === "refill" ? "text-[#1A78C2]" : "text-green-700"}`}
                                                        >
                                                            {s.type === "refill"
                                                                ? "Refill"
                                                                : "New"}
                                                        </span>{" "}
                                                        {s.size} × {s.quantity}
                                                        {s.amount ? (
                                                            <span className="ml-1 text-[#8AA8C0]">
                                                                ({fmt(s.amount)}
                                                                )
                                                            </span>
                                                        ) : (
                                                            ""
                                                        )}
                                                    </span>
                                                ))}
                                            </div>
                                            {sub.address && (
                                                <p className="mt-2 text-xs text-[#6A8AA8]">
                                                    📍 {sub.address}
                                                </p>
                                            )}
                                            {sub.payment_method && (
                                                <p className="mt-1 text-xs text-[#6A8AA8]">
                                                    💳{" "}
                                                    {sub.payment_method ===
                                                    "mpesa-stk"
                                                        ? "M-Pesa Auto-Charge"
                                                        : "Card Auto-Billing"}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function AdminSubActions({
    sub,
    loading,
    onAction,
}: {
    sub: Subscription;
    loading: string | null;
    onAction: (
        sub: Subscription,
        action: "pause" | "resume" | "activate" | "cancel",
    ) => void;
}) {
    return (
        <div className="flex flex-wrap gap-2">
            {sub.status === "active" && (
                <button
                    type="button"
                    onClick={() => onAction(sub, "pause")}
                    disabled={loading !== null}
                    className="rounded-lg border-2 border-[#D4E8F5] px-3 py-1.5 text-xs font-semibold text-[#4A6A8A] transition-all hover:bg-[#F5F8FC] disabled:opacity-50"
                >
                    {loading === "pause" ? "Pausing…" : "⏸ Pause"}
                </button>
            )}
            {sub.status === "paused" && (
                <button
                    type="button"
                    onClick={() => onAction(sub, "resume")}
                    disabled={loading !== null}
                    className="rounded-lg bg-[#1A4A7A] px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-[#0D2A47] disabled:opacity-50"
                >
                    {loading === "resume" ? "Resuming…" : "▶ Resume"}
                </button>
            )}
            {sub.status === "pending" && (
                <button
                    type="button"
                    onClick={() => onAction(sub, "activate")}
                    disabled={loading !== null}
                    className="rounded-lg bg-[#1A4A7A] px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-[#0D2A47] disabled:opacity-50"
                >
                    {loading === "activate" ? "Activating…" : "▶ Activate"}
                </button>
            )}
            {sub.status !== "cancelled" && (
                <button
                    type="button"
                    onClick={() => onAction(sub, "cancel")}
                    disabled={loading !== null}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-all hover:bg-red-100 disabled:opacity-50"
                >
                    {loading === "cancel" ? "Cancelling…" : "✕ Cancel"}
                </button>
            )}
            {sub.status === "cancelled" && (
                <span className="text-xs text-[#C4DDEF] italic">
                    No actions available
                </span>
            )}
        </div>
    );
}

// ── Main ───────────────────────────────────────────────────────────
export default function Dashboard({
    stats,
    orders,
    subscriptions,
    riders = [],
    refillers = [],
}: Props) {
    const [mainTab, setMainTab] = useState<"orders" | "subscriptions">(
        "orders",
    );
    const [statusTab, setStatusTab] = useState<
        "all" | "active" | "delivered" | "pending" | "cancelled"
    >("all");
    const [search, setSearch] = useState("");
    const [onlyUnverified, setOnlyUnverified] = useState(false);

    const searchRef = useRef<HTMLInputElement>(null);

    const filtered = useMemo(() => {
        let list = orders.data;

        if (statusTab === "active") {
            list = list.filter((o) =>
                ["pending", "confirmed", "out_for_delivery"].includes(o.status),
            );
        }

        if (statusTab === "delivered") {
            list = list.filter((o) => o.status === "delivered");
        }

        if (statusTab === "pending") {
            list = list.filter((o) => o.status === "pending");
        }

        if (statusTab === "cancelled") {
            list = list.filter((o) => o.status === "cancelled");
        }

        if (onlyUnverified) {
            list = list.filter((o) => o.payment?.status === "pending");
        }

        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(
                (o) =>
                    String(o.id).includes(q) ||
                    o.delivery?.address?.toLowerCase().includes(q) ||
                    o.delivery?.recepient_name?.toLowerCase().includes(q) ||
                    o.delivery?.contact_name?.toLowerCase().includes(q) ||
                    o.payment?.transaction_code?.toLowerCase().includes(q) ||
                    o.items.some(
                        (i) =>
                            i.size.toLowerCase().includes(q) ||
                            i.label.toLowerCase().includes(q),
                    ),
            );
        }

        return list;
    }, [orders.data, statusTab, search, onlyUnverified]);

    const pendingPayments = orders.data.filter(
        (o) => o.payment?.status === "pending",
    ).length;

    return (
        <>
            <Head title="Dashboard" />
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6">
                {/* ── Stats ── */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <StatCard
                        label="Total orders"
                        value={stats.totalOrders}
                        icon={
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 20 20"
                                fill="none"
                            >
                                <rect
                                    x="3"
                                    y="4"
                                    width="14"
                                    height="13"
                                    rx="2"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                />
                                <path
                                    d="M7 4V3a1 1 0 012 0v1M11 4V3a1 1 0 012 0v1M7 9h6M7 13h4"
                                    stroke="currentColor"
                                    strokeWidth="1.4"
                                    strokeLinecap="round"
                                />
                            </svg>
                        }
                    />
                    <StatCard
                        label="Active"
                        value={stats.activeOrders}
                        sub={
                            stats.activeOrders > 0 ? "In progress" : "All clear"
                        }
                        icon={
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 20 20"
                                fill="none"
                            >
                                <circle
                                    cx="10"
                                    cy="10"
                                    r="7"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                />
                                <path
                                    d="M10 6v4l2.5 2"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        }
                    />
                    <StatCard
                        label="Delivered"
                        value={stats.deliveredCount}
                        icon={
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 20 20"
                                fill="none"
                            >
                                <path
                                    d="M4 10.5l4 4L16 6"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        }
                    />
                    <StatCard
                        label="Total revenue"
                        value={fmt(stats.netRevenue)}
                        accent
                        icon={
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 20 20"
                                fill="none"
                            >
                                <rect
                                    x="2"
                                    y="5"
                                    width="16"
                                    height="11"
                                    rx="2"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                />
                                <path
                                    d="M2 9h16"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                />
                                <circle
                                    cx="6"
                                    cy="13"
                                    r="1"
                                    fill="currentColor"
                                />
                            </svg>
                        }
                    />
                </div>

                {/* ── Pending payments alert ── */}
                {pendingPayments > 0 && (
                    <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 20 20"
                            fill="none"
                            className="flex-shrink-0 text-amber-600"
                        >
                            <path
                                d="M10 3L2 17h16L10 3z"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M10 8v4M10 14.5v.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            />
                        </svg>
                        <p className="text-sm font-medium text-amber-800">
                            {pendingPayments} order
                            {pendingPayments !== 1 ? "s" : ""} awaiting payment
                            verification
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setMainTab("orders");
                                setStatusTab("active");
                                setSearch("");
                                setOnlyUnverified(true);
                            }}
                            className="ml-auto flex-shrink-0 text-xs font-semibold text-amber-700 underline hover:text-amber-900"
                        >
                            Review →
                        </button>
                    </div>
                )}

                {/* ── Main tabs ── */}
                <div className="flex w-fit gap-1 rounded-xl border border-[#D4E8F5] bg-[#F5F8FC] p-1">
                    {(["orders", "subscriptions"] as const).map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setMainTab(t)}
                            className={`rounded-lg px-5 py-2 text-sm font-semibold capitalize transition-all ${
                                mainTab === t
                                    ? "border border-[#D4E8F5] bg-white text-[#1A4A7A] shadow-sm"
                                    : "text-[#8AA8C0] hover:text-[#1A4A7A]"
                            }`}
                        >
                            {t}
                            {t === "subscriptions" &&
                                subscriptions.length > 0 && (
                                    <span className="ml-1.5 rounded-full bg-[#1A4A7A] px-1.5 py-0.5 text-[10px] text-white">
                                        {subscriptions.length}
                                    </span>
                                )}
                        </button>
                    ))}
                </div>

                {/* ── Orders tab ── */}
                {mainTab === "orders" && (
                    <div className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <div className="relative flex-1">
                                <div className="absolute top-1/2 left-3 -translate-y-1/2 text-[#8AA8C0]">
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 16 16"
                                        fill="none"
                                    >
                                        <circle
                                            cx="7"
                                            cy="7"
                                            r="4.5"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                        />
                                        <path
                                            d="M10.5 10.5l3 3"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                </div>
                                <input
                                    ref={searchRef}
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by order #, address, item size, M-Pesa ref…"
                                    className="w-full rounded-xl border border-[#C4DDEF] bg-white py-2.5 pr-4 pl-9 text-sm text-[#0D2A47] placeholder:text-[#A8C0D4] focus:ring-2 focus:ring-[#1A78C2] focus:outline-none"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch("")}
                                        className="absolute top-1/2 right-3 -translate-y-1/2 text-[#8AA8C0] hover:text-[#1A4A7A]"
                                    >
                                        <svg
                                            width="14"
                                            height="14"
                                            viewBox="0 0 14 14"
                                            fill="none"
                                        >
                                            <path
                                                d="M2 2l10 10M12 2L2 12"
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-shrink-0 gap-1 rounded-xl border border-[#D4E8F5] bg-[#F5F8FC] p-1">
                                {(
                                    [
                                        "all",
                                        "active",
                                        "delivered",
                                        "pending",
                                        "cancelled",
                                    ] as const
                                ).map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setStatusTab(t)}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                                            statusTab === t
                                                ? "border border-[#D4E8F5] bg-white text-[#1A4A7A] shadow-sm"
                                                : "text-[#8AA8C0] hover:text-[#1A4A7A]"
                                        }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {search && (
                            <p className="text-xs text-[#8AA8C0]">
                                {filtered.length} result
                                {filtered.length !== 1 ? "s" : ""} for "{search}
                                "
                            </p>
                        )}

                        {onlyUnverified && (
                            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                <span>
                                    Showing only orders with unverified payments
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setOnlyUnverified(false)}
                                    className="ml-auto font-semibold underline"
                                >
                                    Clear ✕
                                </button>
                            </div>
                        )}

                        {filtered.length > 0 ? (
                            <div className="space-y-3">
                                {filtered.map((order) => (
                                    <OrderCard
                                        key={order.id}
                                        order={order}
                                        showAssign
                                        riders={riders}
                                        refillers={refillers}
                                    />
                                ))}{" "}
                            </div>
                        ) : (
                            <div className="py-16 text-center text-[#8AA8C0]">
                                <svg
                                    className="mx-auto mb-3 opacity-30"
                                    width="44"
                                    height="44"
                                    viewBox="0 0 48 48"
                                    fill="none"
                                >
                                    <path
                                        d="M24 4C24 4 10 17 10 28a14 14 0 0028 0C38 17 24 4 24 4z"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    />
                                    <path
                                        d="M18 30a6 6 0 0012 0"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <p className="text-sm font-medium">
                                    {search
                                        ? `No orders match "${search}"`
                                        : statusTab === "all"
                                          ? "No orders yet"
                                          : `No ${statusTab} orders`}
                                </p>
                            </div>
                        )}

                        {orders.last_page > 1 && !search && (
                            <div className="mt-4 flex justify-center gap-2">
                                {Array.from(
                                    { length: orders.last_page },
                                    (_, i) => i + 1,
                                ).map((page) => (
                                    <button
                                        key={page}
                                        type="button"
                                        onClick={() =>
                                            router.get(
                                                "/dashboard",
                                                { page },
                                                { preserveState: true },
                                            )
                                        }
                                        className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                                            page === orders.current_page
                                                ? "bg-[#1A4A7A] text-white"
                                                : "border border-[#D4E8F5] bg-white text-[#4A6A8A] hover:border-[#1A4A7A]"
                                        }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Subscriptions tab ── */}
                {mainTab === "subscriptions" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-[#6A8AA8]">
                                {subscriptions.length > 0
                                    ? `${subscriptions.length} subscription${subscriptions.length !== 1 ? "s" : ""}`
                                    : "No subscriptions yet"}
                            </p>
                        </div>
                        <SubscriptionsTable subscriptions={subscriptions} />
                    </div>
                )}
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [{ title: "Dashboard", href: dashboard() }],
};
