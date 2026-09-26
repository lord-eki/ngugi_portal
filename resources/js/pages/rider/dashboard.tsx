import { Head, router } from "@inertiajs/react";
import { useForm } from "@inertiajs/react";
import { useState } from "react";
import { RIDER_STATUS_ACTIONS } from "@/pages/dashboard";

interface Earning {
    id: number;
    order_id: number;
    amount: number;
    percentage: number;
    created_at: string;
}
interface Props {
    stats: {
        outForDelivery: number;
        deliveredToday: number;
        assignedTotal: number;
        totalEarned: number;
        availableBalance: number;
    };
    orders: { data: any[] };
    recentEarnings: Earning[];
    emailVerified: boolean;
    isOnline: boolean;
}

interface DeliveryInfo {
    address: string;
    recepient_name: string | null;
    recepient_phone: string | null;
    contact_name: string | null;
    contact_phone: string | null;
    schedule_label: string;
    notes: string | null;
}
interface Order {
    id: number;
    status: string;
    status_label: string;
    delivery: DeliveryInfo | null;
}

function RiderOrderCard({ order }: { order: Order }) {
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [deliveryCode, setDeliveryCode] = useState("");
    const [codeError, setCodeError] = useState<string | null>(null);
    const actions = RIDER_STATUS_ACTIONS[order.status] ?? [];

    const handleStatusChange = (
        next: string,
        extra: Record<string, string> = {},
    ) => {
        setActionLoading(next);
        setCodeError(null);
        router.post(
            `/orders/${order.id}/status`,
            { status: next, ...extra },
            {
                preserveScroll: true,
                onError: (errors) =>
                    setCodeError(errors.status ?? "Incorrect code"),
                onFinish: () => setActionLoading(null),
            },
        );
    };

    const recipientName =
        order.delivery?.recepient_name || order.delivery?.contact_name;
    const recipientPhone =
        order.delivery?.recepient_phone || order.delivery?.contact_phone;

    return (
        <div className="space-y-3 rounded-2xl border border-[#D4E8F5] bg-white p-4">
            <div className="flex items-center justify-between">
                <p className="font-semibold text-[#0D2A47]">
                    Order #{order.id}
                </p>
                <span className="rounded-full border border-[#D4E8F5] bg-[#F5F8FC] px-2 py-0.5 text-[10px] font-semibold text-[#4A6A8A]">
                    {order.status_label}
                </span>
            </div>

            <div className="space-y-1.5 rounded-xl bg-[#F5F8FC] p-3 text-sm">
                <p className="font-medium text-[#0D2A47]">
                    {recipientName ?? "No name provided"}
                </p>
                <p className="text-[#4A6A8A]">
                    {recipientPhone ?? "No phone provided"}
                </p>
                <p className="text-[#4A6A8A]">{order.delivery?.address}</p>
                {order.delivery?.schedule_label && (
                    <p className="text-xs text-[#8AA8C0]">
                        {order.delivery.schedule_label}
                    </p>
                )}
                {order.delivery?.notes && (
                    <p className="text-xs text-[#8AA8C0] italic">
                        "{order.delivery.notes}"
                    </p>
                )}
            </div>

            {order.status === "out_for_delivery" ? (
                <div className="space-y-2">
                    <input
                        value={deliveryCode}
                        onChange={(e) => setDeliveryCode(e.target.value)}
                        placeholder="Ask customer for their 4-digit code"
                        maxLength={4}
                        className="w-full rounded-lg border border-[#D4E8F5] px-3 py-2 text-sm tracking-widest"
                    />
                    {codeError && (
                        <p className="text-xs text-red-600">{codeError}</p>
                    )}
                    <button
                        type="button"
                        onClick={() =>
                            handleStatusChange("delivered", {
                                delivery_code: deliveryCode,
                            })
                        }
                        disabled={
                            actionLoading !== null || deliveryCode.length !== 4
                        }
                        className="w-full rounded-xl bg-green-600 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                        {actionLoading === "delivered"
                            ? "Confirming…"
                            : "Confirm Delivered"}
                    </button>
                </div>
            ) : (
                actions.length > 0 && (
                    <div className="flex gap-2">
                        {actions.map((action) => (
                            <button
                                key={action.next}
                                type="button"
                                onClick={() => handleStatusChange(action.next)}
                                disabled={actionLoading !== null}
                                className={`flex-1 rounded-xl py-2 text-xs font-semibold disabled:opacity-50 ${action.cls}`}
                            >
                                {actionLoading === action.next
                                    ? "Updating…"
                                    : action.label}
                            </button>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}

export default function RiderDashboard({
    stats,
    orders,
    recentEarnings,
    emailVerified,
    isOnline,
}: Props) {
    return (
        <>
            <Head title="Rider Dashboard" />
            {!emailVerified && (
                <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <div>
                        <p className="text-sm font-semibold text-amber-800">
                            Verify your email
                        </p>
                        <p className="mt-0.5 text-xs text-amber-700">
                            You won't be assigned new deliveries until you do -
                            check your inbox.
                        </p>
                        <button
                            type="button"
                            onClick={() =>
                                router.post(
                                    "/rider/resend-verification",
                                    {},
                                    { preserveScroll: true },
                                )
                            }
                            className="flex-shrink-0 text-xs font-semibold text-amber-900 underline"
                        >
                            Resend Email
                        </button>
                    </div>
                </div>
            )}
            <div
                className={`mt-4 flex items-center justify-between rounded-2xl border p-4 ${
                    isOnline
                        ? "border-green-200 bg-green-50"
                        : "border-[#D4E8F5] bg-[#F5F8FC]"
                }`}
            >
                <div>
                    <p
                        className={`text-sm font-bold ${isOnline ? "text-green-800" : "text-[#4A6A8A]"}`}
                    >
                        {isOnline ? "You are online" : "You are offline"}
                    </p>
                    <p className="mt-0.5 text-xs text-[#8AA8C0]">
                        {isOnline
                            ? "You can receive new deliveries"
                            : "You won't be assigned new deliveries"}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() =>
                        router.post(
                            "/rider/toggle-availability",
                            {},
                            { preserveScroll: true },
                        )
                    }
                    className={`rounded-xl px-4 py-2 text-xs font-semibold ${
                        isOnline
                            ? "border border-green-300 bg-white text-green-800"
                            : "bg-[#1A4A7A] text-white"
                    }`}
                >
                    {isOnline ? "Go Offline" : "Go Online"}
                </button>
            </div>
            <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    <WithdrawForm availableBalance={stats.availableBalance} />
                    <StatBox
                        label="Out for delivery"
                        value={stats.outForDelivery}
                    />
                    <StatBox
                        label="Delivered today"
                        value={stats.deliveredToday}
                    />
                    <StatBox
                        label="Total earned"
                        value={`KES ${stats.totalEarned.toLocaleString()}`}
                    />
                    <StatBox
                        label="Available balance"
                        value={`KES ${stats.availableBalance.toLocaleString()}`}
                        accent
                    />
                </div>

                <div className="space-y-3">
                    {orders.data.length === 0 && (
                        <p className="text-sm text-[#8AA8C0]">
                            No orders assigned to you yet.
                        </p>
                    )}
                    {orders.data.map((order) => (
                        <RiderOrderCard key={order.id} order={order} />
                    ))}
                </div>

                {recentEarnings.length > 0 && (
                    <div className="rounded-2xl border border-[#D4E8F5] bg-white p-4">
                        <p className="mb-2.5 text-[10px] font-bold tracking-widest text-[#8AA8C0] uppercase">
                            Recent earnings
                        </p>
                        <div className="space-y-1.5">
                            {recentEarnings.map((e) => (
                                <div
                                    key={e.id}
                                    className="flex justify-between text-sm"
                                >
                                    <span className="text-[#4A6A8A]">
                                        Order #{e.order_id} · {e.percentage}%
                                    </span>
                                    <span className="font-semibold text-[#0D2A47]">
                                        KES {e.amount.toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

function StatBox({
    label,
    value,
    accent = false,
}: {
    label: string;
    value: number | string;
    accent?: boolean;
}) {
    return (
        <div
            className={`rounded-2xl border p-4 ${accent ? "border-[#1A4A7A] bg-[#0D2A47]" : "border-[#D4E8F5] bg-white"}`}
        >
            <p
                className={`text-xs font-medium ${accent ? "text-[#7AB8E0]" : "text-[#8AA8C0]"}`}
            >
                {label}
            </p>
            <p
                className={`mt-0.5 text-xl font-black ${accent ? "text-white" : "text-[#0D2A47]"}`}
            >
                {value}
            </p>
        </div>
    );
}

function WithdrawForm({ availableBalance }: { availableBalance: number }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        amount: "",
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post("/rider/withdrawals", { onSuccess: () => reset() });
    };

    return (
        <form
            onSubmit={submit}
            className="space-y-2 rounded-2xl border border-[#D4E8F5] bg-white p-4"
        >
            <p className="text-[10px] font-bold tracking-widest text-[#8AA8C0] uppercase">
                Withdraw earnings
            </p>
            <div className="flex gap-2">
                <input
                    type="number"
                    min={10}
                    max={availableBalance}
                    value={data.amount}
                    onChange={(e) => setData("amount", e.target.value)}
                    placeholder={`Up to KES ${availableBalance.toLocaleString()}`}
                    className="flex-1 rounded-lg border border-[#D4E8F5] px-3 py-2 text-sm"
                />
                <button
                    type="submit"
                    disabled={processing || availableBalance <= 0}
                    className="rounded-lg bg-[#1A4A7A] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                    Withdraw
                </button>
            </div>
            {errors.amount && (
                <p className="text-xs text-red-600">{errors.amount}</p>
            )}
        </form>
    );
}
