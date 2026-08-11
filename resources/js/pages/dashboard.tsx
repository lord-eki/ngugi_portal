import { Head, router } from '@inertiajs/react';
import { useState, useMemo, useRef } from 'react';
import { dashboard } from '@/routes';

// ── Types ──────────────────────────────────────────────────────────
interface OrderItem {
    id: number; type: 'new' | 'refill'; size: string; quantity: number;
    is_bundled: boolean; bundle_quantity: number | null; bundle_size: number | null;
    amount: number; label: string;
}
interface OrderCharge { id: number; label: string; amount: number; }
interface DeliveryInfo {
    location_mode: string; address: string;
    contact_name: string | null; contact_phone: string | null;
    recepient_name: string | null; recepient_phone: string | null;
    schedule_label: string; notes: string | null;
}
interface PaymentInfo {
    method: string; method_label: string; status: string;
    phone: string | null; transaction_code: string | null;
}
interface Order {
    id: number; delivery_speed: string; status: string; status_label: string;
    grand_total: number; can_cancel: boolean; created_at: string;
    items: OrderItem[]; charges: OrderCharge[];
    delivery: DeliveryInfo | null; payment: PaymentInfo | null;
}
interface Subscription {
    id: number; frequency: string; frequency_label: string;
    status: string; next_delivery_at: string | null;
    sizes: { size: string; quantity: number; type: string; amount?: number }[];
    total_per_cycle: number; created_at: string;
    name?: string; phone?: string; email?: string; address?: string;
    payment_method?: string;
}
interface Stats {
    totalOrders: number; totalSpent: number; activeOrders: number; deliveredCount: number;
}
interface Props {
    stats: Stats;
    orders: { data: Order[]; last_page: number; current_page: number };
    subscriptions: Subscription[];
}

// ── Style maps ─────────────────────────────────────────────────────
const S_STYLE: Record<string, { dot: string; badge: string }> = {
    pending:          { dot: 'bg-amber-400',  badge: 'bg-amber-50 text-amber-800 border-amber-200' },
    confirmed:        { dot: 'bg-[#1A78C2]',  badge: 'bg-[#DDEEFF] text-[#1A4A7A] border-[#B8D4EC]' },
    out_for_delivery: { dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-800 border-orange-200' },
    delivered:        { dot: 'bg-green-500',  badge: 'bg-green-50 text-green-800 border-green-200' },
    cancelled:        { dot: 'bg-red-400',    badge: 'bg-red-50 text-red-700 border-red-200' },
};
const PAY_STYLE: Record<string, string> = {
    pending:  'bg-amber-50 text-amber-800 border-amber-200',
    verified: 'bg-green-50 text-green-800 border-green-200',
    failed:   'bg-red-50 text-red-700 border-red-200',
};
const SUB_STYLE: Record<string, { badge: string; dot: string }> = {
    active:    { badge: 'bg-green-50 text-green-800 border-green-200',  dot: 'bg-green-500' },
    paused:    { badge: 'bg-amber-50 text-amber-800 border-amber-200',  dot: 'bg-amber-400' },
    cancelled: { badge: 'bg-red-50 text-red-700 border-red-200',        dot: 'bg-red-400' },
    pending:   { badge: 'bg-[#DDEEFF] text-[#1A4A7A] border-[#B8D4EC]', dot: 'bg-[#1A78C2]' },
};

// Order status transitions for admin
const ORDER_STATUS_ACTIONS: Record<string, { label: string; next: string; cls: string }[]> = {
    pending:          [
        { label: 'Confirm',         next: 'confirmed',        cls: 'bg-[#1A4A7A] text-white hover:bg-[#0D2A47]' },
        { label: 'Cancel',          next: 'cancelled',        cls: 'border border-red-200 text-red-600 bg-red-50 hover:bg-red-100' },
    ],
    confirmed:        [
        { label: 'Mark Out for Delivery', next: 'out_for_delivery', cls: 'bg-orange-500 text-white hover:bg-orange-600' },
        { label: 'Cancel',                next: 'cancelled',         cls: 'border border-red-200 text-red-600 bg-red-50 hover:bg-red-100' },
    ],
    out_for_delivery: [
        { label: 'Mark Delivered',  next: 'delivered',        cls: 'bg-green-600 text-white hover:bg-green-700' },
    ],
    delivered:        [],
    cancelled:        [],
};

function fmt(n: number) { return `KES ${n.toLocaleString()}`; }
function timeAgo(iso: string) {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (d === 0) {
        const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
        return h < 1 ? 'Just now' : `${h}h ago`;
    }
    return d === 1 ? 'Yesterday' : `${d}d ago`;
}
function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Sub-components ─────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, accent = false }: {
    label: string; value: string | number; sub?: string;
    icon: React.ReactNode; accent?: boolean;
}) {
    return (
        <div className={`rounded-2xl border p-5 flex items-start gap-4 ${accent ? 'bg-[#0D2A47] border-[#1A4A7A]' : 'bg-white border-[#D4E8F5]'}`}>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${accent ? 'bg-[#1A4A7A] text-[#7AB8E0]' : 'bg-[#EEF6FF] text-[#1A78C2]'}`}>
                {icon}
            </div>
            <div>
                <p className={`text-xs font-medium ${accent ? 'text-[#7AB8E0]' : 'text-[#8AA8C0]'}`}>{label}</p>
                <p className={`text-xl font-black mt-0.5 leading-tight ${accent ? 'text-white' : 'text-[#0D2A47]'}`}>{value}</p>
                {sub && <p className={`text-xs mt-0.5 ${accent ? 'text-[#7AB8E0]' : 'text-[#8AA8C0]'}`}>{sub}</p>}
            </div>
        </div>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return <p className="text-[10px] font-bold text-[#8AA8C0] uppercase tracking-widest mb-2.5">{children}</p>;
}

function InfoRow({ label, value, mono = false, italic = false }: {
    label: string; value: string; mono?: boolean; italic?: boolean;
}) {
    return (
        <div className="flex gap-2 text-sm leading-snug">
            <span className="text-[#8AA8C0] flex-shrink-0 w-14 pt-px">{label}</span>
            <span className={`text-[#0D2A47] font-medium break-words flex-1 ${mono ? 'font-mono text-xs' : ''} ${italic ? 'italic text-[#6A8AA8]' : ''}`}>
                {value}
            </span>
        </div>
    );
}

// ── Order card ─────────────────────────────────────────────────────
function OrderCard({ order }: { order: Order }) {
    const [open, setOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [verifyingPayment, setVerifyingPayment] = useState(false);
    const sc = S_STYLE[order.status] ?? S_STYLE.pending;
    const actions = ORDER_STATUS_ACTIONS[order.status] ?? [];

    const handleStatusChange = (next: string) => {
        if (!confirm(`Change order #${order.id} status to "${next.replace(/_/g, ' ')}"?`)) return;
        setActionLoading(next);
        router.post(`/orders/${order.id}/status`, { status: next }, {
            onFinish: () => setActionLoading(null),
        });
    };

    const handleVerifyPayment = () => {
        if (!confirm(`Verify payment for order #${order.id}?`)) return;
        setVerifyingPayment(true);
        router.post(`/orders/${order.id}/verify-payment`, {}, {
            onFinish: () => setVerifyingPayment(false),
        });
    };

    const receiver = (() => {
        if (!order.delivery) return null;
        const d = order.delivery;
        if (d.recepient_name) return { name: d.recepient_name, phone: d.recepient_phone };
        if (d.contact_name)   return { name: d.contact_name,   phone: d.contact_phone };
        return null;
    })();

    return (
        <div className="bg-white rounded-2xl border border-[#D4E8F5] overflow-hidden">
            {/* Header */}
            <button type="button" onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between p-4 md:p-5 text-left hover:bg-[#F9FBFD] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${sc.dot}`} />
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[#0D2A47] text-sm">#{order.id}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sc.badge}`}>
                                {order.status_label}
                            </span>
                            {order.delivery_speed === 'instant' && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">⚡ Instant</span>
                            )}
                            {order.payment?.status === 'pending' && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">⏳ Payment unverified</span>
                            )}
                        </div>
                        <p className="text-xs text-[#8AA8C0] mt-0.5">
                            {timeAgo(order.created_at)} · {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                            {receiver ? ` · ${receiver.name}` : ''}
                            {order.delivery?.address ? ` · ${order.delivery.address.slice(0, 28)}${order.delivery.address.length > 28 ? '…' : ''}` : ''}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <span className="font-black text-[#1A4A7A] text-sm">{fmt(order.grand_total)}</span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                        className={`text-[#8AA8C0] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
                        <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
            </button>

            {/* Expanded */}
            {open && (
                <div className="border-t border-[#D4E8F5] p-4 md:p-5 space-y-5">
                    <div className="grid md:grid-cols-3 gap-5">

                        {/* ── Items ── */}
                        <div className="md:col-span-1">
                            <SectionLabel>What was ordered</SectionLabel>
                            <div className="space-y-2">
                                {order.items.map(item => (
                                    <div key={item.id} className="flex justify-between gap-2 text-sm">
                                        <div className="flex items-start gap-2 min-w-0">
                                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0 ${
                                                item.type === 'refill' ? 'bg-[#DDEEFF] text-[#1A4A7A]' : 'bg-green-50 text-green-700'
                                            }`}>
                                                {item.type === 'refill' ? 'Refill' : 'New'}
                                            </span>
                                            <span className="text-[#4A6A8A] break-words">{item.size}
                                                {item.is_bundled
                                                    ? ` · bundle ×${item.bundle_quantity} (pack ${item.bundle_size})`
                                                    : ` · qty ${item.quantity}`}
                                            </span>
                                        </div>
                                        {item.amount > 0 && (
                                            <span className="text-[#0D2A47] font-semibold flex-shrink-0">{fmt(item.amount)}</span>
                                        )}
                                    </div>
                                ))}
                                {order.charges.map(c => (
                                    <div key={c.id} className="flex justify-between text-xs gap-2">
                                        <span className="text-[#8AA8C0]">{c.label}</span>
                                        <span className="text-[#8AA8C0] flex-shrink-0">{fmt(c.amount)}</span>
                                    </div>
                                ))}
                                <div className="border-t border-[#D4E8F5] pt-2 flex justify-between font-bold text-sm">
                                    <span className="text-[#0D2A47]">Total</span>
                                    <span className="text-[#1A4A7A]">{fmt(order.grand_total)}</span>
                                </div>
                            </div>
                        </div>

                        {/* ── Delivery ── */}
                        <div>
                            <SectionLabel>Delivery details</SectionLabel>
                            {order.delivery ? (
                                <div className="space-y-2">
                                    <div className="bg-[#F5F8FC] rounded-xl p-3 border border-[#D4E8F5]">
                                        <p className="text-[10px] text-[#8AA8C0] font-semibold mb-1">📍 Delivery address</p>
                                        <p className="text-sm font-medium text-[#0D2A47]">{order.delivery.address || '—'}</p>
                                    </div>
                                    {receiver && (
                                        <div className="bg-[#EEF6FF] rounded-xl p-3 border border-[#C4DDEF]">
                                            <p className="text-[10px] text-[#6A8AA8] font-semibold mb-1">
                                                {order.delivery.location_mode === 'someone-else' ? '👤 Recipient' : '👤 Contact'}
                                            </p>
                                            <p className="text-sm font-bold text-[#0D2A47]">{receiver.name}</p>
                                            {receiver.phone && (
                                                <p className="text-xs text-[#1A78C2] mt-0.5 font-medium">+254{receiver.phone}</p>
                                            )}
                                        </div>
                                    )}
                                    <InfoRow label="When" value={order.delivery.schedule_label} />
                                    {order.delivery.notes && <InfoRow label="Note" value={order.delivery.notes} italic />}
                                </div>
                            ) : <p className="text-xs text-[#8AA8C0]">No delivery info recorded</p>}
                        </div>

                        {/* ── Payment ── */}
                        <div>
                            <SectionLabel>Payment</SectionLabel>
                            {order.payment ? (
                                <div className="space-y-2">
                                    <div className="bg-[#F5F8FC] rounded-xl p-3 border border-[#D4E8F5]">
                                        <p className="text-[10px] text-[#8AA8C0] font-semibold mb-1">💳 Method</p>
                                        <p className="text-sm font-bold text-[#0D2A47]">{order.payment.method_label}</p>
                                        <span className={`mt-1 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${PAY_STYLE[order.payment.status] ?? PAY_STYLE.pending}`}>
                                            {order.payment.status.charAt(0).toUpperCase() + order.payment.status.slice(1)}
                                        </span>
                                    </div>
                                    {order.payment.phone && <InfoRow label="Phone" value={`+254${order.payment.phone}`} />}
                                    {order.payment.transaction_code && <InfoRow label="Ref" value={order.payment.transaction_code} mono />}

                                    {/* Payment verification action */}
                                    {order.payment.status === 'pending' && (
                                        <div className="space-y-2">
                                            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800">
                                                ⏳ Awaiting manual verification by admin
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleVerifyPayment}
                                                disabled={verifyingPayment}
                                                className="w-full py-2 rounded-xl bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                                            >
                                                {verifyingPayment ? 'Verifying…' : '✓ Mark Payment Verified'}
                                            </button>
                                        </div>
                                    )}
                                    {order.payment.status === 'verified' && (
                                        <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-800">
                                            ✓ Payment verified
                                        </div>
                                    )}
                                </div>
                            ) : <p className="text-xs text-[#8AA8C0]">No payment info</p>}
                        </div>
                    </div>

                    {/* ── Admin Actions ── */}
                    {actions.length > 0 && (
                        <div className="border-t border-[#D4E8F5] pt-4">
                            <p className="text-[10px] font-bold text-[#8AA8C0] uppercase tracking-widest mb-3">Admin Actions</p>
                            <div className="flex flex-wrap gap-2">
                                {actions.map(action => (
                                    <button
                                        key={action.next}
                                        type="button"
                                        onClick={() => handleStatusChange(action.next)}
                                        disabled={actionLoading !== null}
                                        className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${action.cls}`}
                                    >
                                        {actionLoading === action.next ? 'Updating…' : action.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Subscriptions Table ────────────────────────────────────────────
function SubscriptionsTable({ subscriptions }: { subscriptions: Subscription[] }) {
    const [actionLoading, setActionLoading] = useState<{ id: number; action: string } | null>(null);
    const [expandedRow, setExpandedRow] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'cancelled' | 'pending'>('all');

    const filtered = useMemo(() => {
        if (statusFilter === 'all') return subscriptions;
        return subscriptions.filter(s => s.status === statusFilter);
    }, [subscriptions, statusFilter]);

    const handleAction = (sub: Subscription, action: 'pause' | 'resume' | 'activate' | 'cancel') => {
        const confirmMsg = action === 'cancel'
            ? `Cancel subscription #${sub.id}? This cannot be undone.`
            : `${action.charAt(0).toUpperCase() + action.slice(1)} subscription #${sub.id}?`;
        if (!confirm(confirmMsg)) return;
        setActionLoading({ id: sub.id, action });
        router.post(`/subscriptions/${sub.id}/${action}`, {}, {
            onFinish: () => setActionLoading(null),
        });
    };

    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = { all: subscriptions.length, active: 0, paused: 0, cancelled: 0, pending: 0 };
        subscriptions.forEach(s => { if (counts[s.status] !== undefined) counts[s.status]++; });
        return counts;
    }, [subscriptions]);

    if (subscriptions.length === 0) {
        return (
            <div className="text-center py-16 text-[#8AA8C0] bg-white rounded-2xl border border-[#D4E8F5]">
                <svg className="mx-auto mb-3 opacity-30" width="40" height="40" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C12 2 5 9 5 14a7 7 0 0014 0C19 9 12 2 12 2z" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="12" cy="14" r="2" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <p className="text-sm font-medium">No subscriptions yet</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filter pills */}
            <div className="flex gap-1 bg-[#F5F8FC] p-1 rounded-xl border border-[#D4E8F5] w-fit flex-wrap">
                {(['all', 'active', 'pending', 'paused', 'cancelled'] as const).map(s => (
                    <button key={s} type="button" onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                            statusFilter === s ? 'bg-white text-[#1A4A7A] shadow-sm border border-[#D4E8F5]' : 'text-[#8AA8C0] hover:text-[#1A4A7A]'
                        }`}>
                        {s} {statusCounts[s] > 0 && s !== 'all' ? `(${statusCounts[s]})` : s === 'all' ? `(${statusCounts.all})` : ''}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-[#D4E8F5] overflow-hidden">
                {/* Table header */}
                <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1.5fr] gap-4 px-5 py-3 bg-[#F5F8FC] border-b border-[#D4E8F5] text-[10px] font-bold text-[#8AA8C0] uppercase tracking-wider">
                    <span>Subscriber</span>
                    <span>Frequency / Schedule</span>
                    <span>Items</span>
                    <span>Amount/cycle</span>
                    <span>Status</span>
                    <span>Actions</span>
                </div>

                <div className="divide-y divide-[#F0F6FC]">
                    {filtered.map(sub => {
                        const sc = SUB_STYLE[sub.status] ?? SUB_STYLE.active;
                        const isExpanded = expandedRow === sub.id;
                        const loading = actionLoading?.id === sub.id ? actionLoading.action : null;

                        return (
                            <div key={sub.id}>
                                {/* Main row */}
                                <div className="px-4 md:px-5 py-4">
                                    {/* Mobile layout */}
                                    <div className="md:hidden space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-[#0D2A47] text-sm">#{sub.id}</span>
                                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sc.badge}`}>
                                                        {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                                                    </span>
                                                </div>
                                                {sub.name && <p className="text-sm font-medium text-[#0D2A47] mt-0.5">{sub.name}</p>}
                                                {sub.phone && <p className="text-xs text-[#8AA8C0]">+254{sub.phone}</p>}
                                            </div>
                                            <span className="font-black text-[#1A4A7A] text-sm flex-shrink-0">
                                                {fmt(sub.total_per_cycle)}<span className="text-[10px] text-[#8AA8C0] font-normal">/cycle</span>
                                            </span>
                                        </div>
                                        <div className="flex gap-2 flex-wrap">
                                            <span className="text-xs text-[#6A8AA8] bg-[#F5F8FC] px-2 py-1 rounded-lg border border-[#D4E8F5]">
                                                {sub.frequency_label}
                                            </span>
                                            <span className="text-xs text-[#6A8AA8] bg-[#F5F8FC] px-2 py-1 rounded-lg border border-[#D4E8F5]">
                                                {sub.sizes.length} item type{sub.sizes.length !== 1 ? 's' : ''}
                                            </span>
                                            {sub.next_delivery_at && (
                                                <span className="text-xs text-[#6A8AA8]">
                                                    Next: {new Date(sub.next_delivery_at).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                </span>
                                            )}
                                        </div>
                                        <AdminSubActions sub={sub} loading={loading} onAction={handleAction} />
                                    </div>

                                    {/* Desktop layout */}
                                    <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1.5fr] gap-4 items-center">
                                        {/* Subscriber */}
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.dot}`} />
                                                <span className="font-semibold text-[#0D2A47] text-sm">#{sub.id}</span>
                                            </div>
                                            {sub.name
                                                ? <p className="text-xs text-[#4A6A8A] mt-0.5 pl-4">{sub.name}</p>
                                                : <p className="text-xs text-[#C4DDEF] mt-0.5 pl-4 italic">No name</p>
                                            }
                                            {sub.phone && <p className="text-xs text-[#8AA8C0] pl-4">+254{sub.phone}</p>}
                                        </div>

                                        {/* Frequency */}
                                        <div>
                                            <p className="text-sm font-medium text-[#0D2A47]">{sub.frequency_label}</p>
                                            {sub.next_delivery_at ? (
                                                <p className="text-xs text-[#8AA8C0] mt-0.5">
                                                    Next: {new Date(sub.next_delivery_at).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                </p>
                                            ) : <p className="text-xs text-[#C4DDEF] mt-0.5 italic">Not scheduled</p>}
                                        </div>

                                        {/* Items */}
                                        <div>
                                            <button
                                                type="button"
                                                onClick={() => setExpandedRow(isExpanded ? null : sub.id)}
                                                className="text-xs text-[#1A78C2] hover:underline font-medium"
                                            >
                                                {sub.sizes.length} type{sub.sizes.length !== 1 ? 's' : ''} ↓
                                            </button>
                                        </div>

                                        {/* Amount */}
                                        <div>
                                            <p className="font-bold text-[#1A4A7A] text-sm">{fmt(sub.total_per_cycle)}</p>
                                            <p className="text-xs text-[#8AA8C0]">per cycle</p>
                                        </div>

                                        {/* Status */}
                                        <div>
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sc.badge}`}>
                                                {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                                            </span>
                                            <p className="text-[10px] text-[#8AA8C0] mt-1">{fmtDate(sub.created_at)}</p>
                                        </div>

                                        {/* Actions */}
                                        <AdminSubActions sub={sub} loading={loading} onAction={handleAction} />
                                    </div>
                                </div>

                                {/* Expanded items detail */}
                                {isExpanded && (
                                    <div className="px-5 pb-4 border-t border-[#F0F6FC] bg-[#FAFCFF]">
                                        <div className="pt-3">
                                            <p className="text-[10px] font-bold text-[#8AA8C0] uppercase tracking-widest mb-2">Items per delivery</p>
                                            <div className="flex flex-wrap gap-2">
                                                {sub.sizes.map((s, i) => (
                                                    <span key={i} className="text-xs bg-white border border-[#D4E8F5] px-3 py-1.5 rounded-lg text-[#4A6A8A] font-medium">
                                                        <span className={`font-bold ${s.type === 'refill' ? 'text-[#1A78C2]' : 'text-green-700'}`}>
                                                            {s.type === 'refill' ? 'Refill' : 'New'}
                                                        </span>{' '}{s.size} × {s.quantity}
                                                        {s.amount ? <span className="text-[#8AA8C0] ml-1">({fmt(s.amount)})</span> : ''}
                                                    </span>
                                                ))}
                                            </div>
                                            {sub.address && (
                                                <p className="text-xs text-[#6A8AA8] mt-2">📍 {sub.address}</p>
                                            )}
                                            {sub.payment_method && (
                                                <p className="text-xs text-[#6A8AA8] mt-1">
                                                    💳 {sub.payment_method === 'mpesa-stk' ? 'M-Pesa Auto-Charge' : 'Card Auto-Billing'}
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

function AdminSubActions({ sub, loading, onAction }: {
    sub: Subscription;
    loading: string | null;
    onAction: (sub: Subscription, action: 'pause' | 'resume' | 'activate' | 'cancel') => void;
}) {
    return (
        <div className="flex gap-2 flex-wrap">
            {sub.status === 'active' && (
                <button
                    type="button"
                    onClick={() => onAction(sub, 'pause')}
                    disabled={loading !== null}
                    className="px-3 py-1.5 rounded-lg border-2 border-[#D4E8F5] text-[#4A6A8A] text-xs font-semibold hover:bg-[#F5F8FC] transition-all disabled:opacity-50"
                >
                    {loading === 'pause' ? 'Pausing…' : '⏸ Pause'}
                </button>
            )}
            {sub.status === 'paused' && (
                <button
                    type="button"
                    onClick={() => onAction(sub, 'resume')}
                    disabled={loading !== null}
                    className="px-3 py-1.5 rounded-lg bg-[#1A4A7A] text-white text-xs font-semibold hover:bg-[#0D2A47] transition-all disabled:opacity-50"
                >
                    {loading === 'resume' ? 'Resuming…' : '▶ Resume'}
                </button>
            )}
            {sub.status === 'pending' && (
                <button
                    type="button"
                    onClick={() => onAction(sub, 'activate')}
                    disabled={loading !== null}
                    className="px-3 py-1.5 rounded-lg bg-[#1A4A7A] text-white text-xs font-semibold hover:bg-[#0D2A47] transition-all disabled:opacity-50"
                >
                    {loading === 'activate' ? 'Activating…' : '▶ Activate'}
                </button>
            )}
            {sub.status !== 'cancelled' && (
                <button
                    type="button"
                    onClick={() => onAction(sub, 'cancel')}
                    disabled={loading !== null}
                    className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold bg-red-50 hover:bg-red-100 transition-all disabled:opacity-50"
                >
                    {loading === 'cancel' ? 'Cancelling…' : '✕ Cancel'}
                </button>
            )}
            {sub.status === 'cancelled' && (
                <span className="text-xs text-[#C4DDEF] italic">No actions available</span>
            )}
        </div>
    );
}

// ── Main ───────────────────────────────────────────────────────────
export default function Dashboard({ stats, orders, subscriptions }: Props) {
    const [mainTab, setMainTab] = useState<'orders' | 'subscriptions'>('orders');
    const [statusTab, setStatusTab] = useState<'all'|'active'|'delivered'|'cancelled'>('all');
    const [search, setSearch] = useState('');
    const searchRef = useRef<HTMLInputElement>(null);

    const filtered = useMemo(() => {
        let list = orders.data;
        if (statusTab === 'active')    list = list.filter(o => ['pending','confirmed','out_for_delivery'].includes(o.status));
        if (statusTab === 'delivered') list = list.filter(o => o.status === 'delivered');
        if (statusTab === 'cancelled') list = list.filter(o => o.status === 'cancelled');
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(o =>
                String(o.id).includes(q) ||
                o.delivery?.address?.toLowerCase().includes(q) ||
                o.delivery?.recepient_name?.toLowerCase().includes(q) ||
                o.delivery?.contact_name?.toLowerCase().includes(q) ||
                o.payment?.transaction_code?.toLowerCase().includes(q) ||
                o.items.some(i => i.size.toLowerCase().includes(q) || i.label.toLowerCase().includes(q))
            );
        }
        return list;
    }, [orders.data, statusTab, search]);

    const pendingPayments = orders.data.filter(o => o.payment?.status === 'pending').length;

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex flex-col gap-6 p-4 md:p-6 max-w-5xl mx-auto w-full">

                {/* ── Stats ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard label="Total orders" value={stats.totalOrders}
                        icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M7 4V3a1 1 0 012 0v1M11 4V3a1 1 0 012 0v1M7 9h6M7 13h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>}
                    />
                    <StatCard label="Active" value={stats.activeOrders} sub={stats.activeOrders > 0 ? 'In progress' : 'All clear'}
                        icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M10 6v4l2.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    />
                    <StatCard label="Delivered" value={stats.deliveredCount}
                        icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10.5l4 4L16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    />
                    <StatCard label="Total revenue" value={fmt(stats.totalSpent)} accent
                        icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="5" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M2 9h16" stroke="currentColor" strokeWidth="1.5"/><circle cx="6" cy="13" r="1" fill="currentColor"/></svg>}
                    />
                </div>

                {/* ── Pending payments alert ── */}
                {pendingPayments > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="text-amber-600 flex-shrink-0">
                            <path d="M10 3L2 17h16L10 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                            <path d="M10 8v4M10 14.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <p className="text-sm text-amber-800 font-medium">
                            {pendingPayments} order{pendingPayments !== 1 ? 's' : ''} awaiting payment verification
                        </p>
                        <button
                            type="button"
                            onClick={() => { setMainTab('orders'); setStatusTab('active'); }}
                            className="ml-auto text-xs font-semibold text-amber-700 hover:text-amber-900 underline flex-shrink-0"
                        >
                            Review →
                        </button>
                    </div>
                )}

                {/* ── Main tabs ── */}
                <div className="flex gap-1 bg-[#F5F8FC] p-1 rounded-xl border border-[#D4E8F5] w-fit">
                    {(['orders','subscriptions'] as const).map(t => (
                        <button key={t} type="button" onClick={() => setMainTab(t)}
                            className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                                mainTab === t ? 'bg-white text-[#1A4A7A] shadow-sm border border-[#D4E8F5]' : 'text-[#8AA8C0] hover:text-[#1A4A7A]'
                            }`}>
                            {t}
                            {t === 'subscriptions' && subscriptions.length > 0 && (
                                <span className="ml-1.5 text-[10px] bg-[#1A4A7A] text-white rounded-full px-1.5 py-0.5">{subscriptions.length}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Orders tab ── */}
                {mainTab === 'orders' && (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8AA8C0]">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                                        <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                    </svg>
                                </div>
                                <input
                                    ref={searchRef}
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search by order #, address, item size, M-Pesa ref…"
                                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#C4DDEF] rounded-xl text-[#0D2A47] placeholder:text-[#A8C0D4] focus:outline-none focus:ring-2 focus:ring-[#1A78C2] text-sm"
                                />
                                {search && (
                                    <button type="button" onClick={() => setSearch('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8AA8C0] hover:text-[#1A4A7A]">
                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-1 bg-[#F5F8FC] p-1 rounded-xl border border-[#D4E8F5] flex-shrink-0">
                                {(['all','active','delivered','cancelled'] as const).map(t => (
                                    <button key={t} type="button" onClick={() => setStatusTab(t)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                                            statusTab === t ? 'bg-white text-[#1A4A7A] shadow-sm border border-[#D4E8F5]' : 'text-[#8AA8C0] hover:text-[#1A4A7A]'
                                        }`}>
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {search && (
                            <p className="text-xs text-[#8AA8C0]">
                                {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"
                            </p>
                        )}

                        {filtered.length > 0 ? (
                            <div className="space-y-3">
                                {filtered.map(order => <OrderCard key={order.id} order={order} />)}
                            </div>
                        ) : (
                            <div className="text-center py-16 text-[#8AA8C0]">
                                <svg className="mx-auto mb-3 opacity-30" width="44" height="44" viewBox="0 0 48 48" fill="none">
                                    <path d="M24 4C24 4 10 17 10 28a14 14 0 0028 0C38 17 24 4 24 4z" stroke="currentColor" strokeWidth="2"/>
                                    <path d="M18 30a6 6 0 0012 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                                <p className="text-sm font-medium">{search ? `No orders match "${search}"` : statusTab === 'all' ? 'No orders yet' : `No ${statusTab} orders`}</p>
                            </div>
                        )}

                        {orders.last_page > 1 && !search && (
                            <div className="flex justify-center gap-2 mt-4">
                                {Array.from({ length: orders.last_page }, (_, i) => i + 1).map(page => (
                                    <button key={page} type="button"
                                        onClick={() => router.get('/dashboard', { page }, { preserveState: true })}
                                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                            page === orders.current_page ? 'bg-[#1A4A7A] text-white' : 'bg-white border border-[#D4E8F5] text-[#4A6A8A] hover:border-[#1A4A7A]'
                                        }`}>
                                        {page}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Subscriptions tab ── */}
                {mainTab === 'subscriptions' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-[#6A8AA8]">
                                {subscriptions.length > 0
                                    ? `${subscriptions.length} subscription${subscriptions.length !== 1 ? 's' : ''}`
                                    : 'No subscriptions yet'}
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
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};