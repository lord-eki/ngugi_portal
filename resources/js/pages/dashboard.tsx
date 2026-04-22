import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { dashboard } from '@/routes';

// ── Types matching your exact DB field names ───────────────────────
interface OrderItem {
    id: number;
    type: 'new' | 'refill';
    size: string;
    quantity: number;
    is_bundled: boolean;
    bundle_quantity: number | null;
    bundle_size: number | null;
    amount: number;
    label: string;         // computed by model accessor
}

interface OrderCharge {
    id: number;
    label: string;
    amount: number;
}

interface DeliveryInfo {
    location_mode: 'pin' | 'manual' | 'someone-else';
    address: string;              // computed accessor: pin_address ?? manual_address
    recepient_name: string | null;   // your spelling
    recepient_phone: string | null;
    schedule_label: string;       // computed accessor
    notes: string | null;
}

interface PaymentInfo {
    method: 'mpesa-stk' | 'mpesa-till' | 'card';
    method_label: string;         // computed accessor
    status: 'pending' | 'verified' | 'failed';
    phone: string | null;
    transaction_code: string | null;
}

interface Order {
    id: number;
    delivery_speed: 'standard' | 'instant';
    status: 'pending' | 'confirmed' | 'out_for_delivery' | 'delivered' | 'cancelled';
    status_label: string;
    grand_total: number;
    can_cancel: boolean;
    created_at: string;
    items: OrderItem[];
    charges: OrderCharge[];
    delivery: DeliveryInfo | null;
    payment: PaymentInfo | null;
}

interface Stats {
    totalOrders: number;
    totalSpent: number;
    activeOrders: number;
    deliveredCount: number;
}

interface Props {
    stats: Stats;
    orders: { data: Order[]; last_page: number; current_page: number };
}

// ── Config ─────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { dot: string; badge: string }> = {
    pending:          { dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-800 border-amber-200' },
    confirmed:        { dot: 'bg-[#1A78C2]',   badge: 'bg-[#DDEEFF] text-[#1A4A7A] border-[#B8D4EC]' },
    out_for_delivery: { dot: 'bg-orange-400',  badge: 'bg-orange-50 text-orange-800 border-orange-200' },
    delivered:        { dot: 'bg-green-500',   badge: 'bg-green-50 text-green-800 border-green-200' },
    cancelled:        { dot: 'bg-red-400',     badge: 'bg-red-50 text-red-700 border-red-200' },
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
    pending:  'bg-amber-50 text-amber-800 border-amber-200',
    verified: 'bg-green-50 text-green-800 border-green-200',
    failed:   'bg-red-50 text-red-700 border-red-200',
};

function fmt(n: number) {
    return `KES ${n.toLocaleString()}`;
}

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60)  return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24)  return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

// ── Stat card ──────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon }: {
    label: string; value: string | number; sub?: string; icon: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-2xl border border-[#D4E8F5] p-5 flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#EEF6FF] flex items-center justify-center flex-shrink-0 text-[#1A78C2]">
                {icon}
            </div>
            <div>
                <p className="text-xs text-[#8AA8C0] font-medium">{label}</p>
                <p className="text-xl font-black text-[#0D2A47] mt-0.5 leading-tight">{value}</p>
                {sub && <p className="text-xs text-[#8AA8C0] mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

// ── Order card ─────────────────────────────────────────────────────
function OrderCard({ order }: { order: Order }) {
    const [open, setOpen] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    const sc = STATUS_STYLES[order.status] ?? STATUS_STYLES.pending;

    const handleCancel = () => {
        if (!confirm(`Cancel order #${order.id}? This cannot be undone.`)) return;
        setCancelling(true);
        router.post(
            `/orders/${order.id}/cancel`,
            {},
            { onFinish: () => setCancelling(false) },
        );
    };

    return (
        <div className="bg-white rounded-2xl border border-[#D4E8F5] overflow-hidden transition-shadow hover:shadow-sm">

            {/* ── Collapsed header ── */}
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between p-5 text-left"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${sc.dot}`} />
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[#0D2A47] text-sm">Order #{order.id}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sc.badge}`}>
                                {order.status_label}
                            </span>
                            {order.delivery_speed === 'instant' && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-orange-50 text-orange-700 border-orange-200">
                                    ⚡ Instant
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-[#8AA8C0] mt-0.5">
                            {timeAgo(order.created_at)}
                            {' · '}
                            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <span className="font-black text-[#1A4A7A]">{fmt(order.grand_total)}</span>
                    <svg
                        width="16" height="16" viewBox="0 0 16 16" fill="none"
                        className={`text-[#8AA8C0] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    >
                        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
            </button>

            {/* ── Expanded detail ── */}
            {open && (
                <div className="border-t border-[#D4E8F5] p-5 space-y-5">
                    <div className="grid md:grid-cols-3 gap-5">

                        {/* Items + charges */}
                        <div>
                            <p className="text-[10px] font-bold text-[#8AA8C0] uppercase tracking-wider mb-3">Items</p>
                            <div className="space-y-2">
                                {order.items.map(item => (
                                    <div key={item.id} className="flex justify-between text-sm gap-2">
                                        <span className="text-[#4A6A8A]">{item.label}</span>
                                        {item.amount > 0 && (
                                            <span className="text-[#0D2A47] font-medium flex-shrink-0">{fmt(item.amount)}</span>
                                        )}
                                    </div>
                                ))}
                                {order.charges.map(charge => (
                                    <div key={charge.id} className="flex justify-between text-sm gap-2">
                                        <span className="text-[#8AA8C0]">{charge.label}</span>
                                        <span className="text-[#8AA8C0] flex-shrink-0">{fmt(charge.amount)}</span>
                                    </div>
                                ))}
                                <div className="border-t border-[#D4E8F5] pt-2 flex justify-between text-sm font-bold">
                                    <span className="text-[#0D2A47]">Total</span>
                                    <span className="text-[#1A4A7A]">{fmt(order.grand_total)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Delivery */}
                        <div>
                            <p className="text-[10px] font-bold text-[#8AA8C0] uppercase tracking-wider mb-3">Delivery</p>
                            {order.delivery ? (
                                <div className="space-y-2 text-sm">
                                    <Row label="To"   value={order.delivery.address} />
                                    <Row label="When" value={order.delivery.schedule_label} />
                                    {order.delivery.recepient_name && (
                                        <Row
                                            label="For"
                                            value={`${order.delivery.recepient_name} · ${order.delivery.recepient_phone ?? ''}`}
                                        />
                                    )}
                                    {order.delivery.notes && (
                                        <Row label="Note" value={order.delivery.notes} italic />
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-[#8AA8C0]">No delivery info</p>
                            )}
                        </div>

                        {/* Payment */}
                        <div>
                            <p className="text-[10px] font-bold text-[#8AA8C0] uppercase tracking-wider mb-3">Payment</p>
                            {order.payment ? (
                                <div className="space-y-2 text-sm">
                                    <Row label="Via" value={order.payment.method_label} />
                                    <div className="flex items-center gap-2">
                                        <span className="text-[#8AA8C0] text-sm">Status</span>
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${PAYMENT_STATUS_STYLES[order.payment.status]}`}>
                                            {order.payment.status.charAt(0).toUpperCase() + order.payment.status.slice(1)}
                                        </span>
                                    </div>
                                    {order.payment.transaction_code && (
                                        <Row label="Ref" value={order.payment.transaction_code} mono />
                                    )}
                                    {order.payment.phone && (
                                        <Row label="Phone" value={`+254${order.payment.phone}`} />
                                    )}
                                    {order.payment.status === 'pending' && order.payment.method === 'mpesa-till' && (
                                        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800">
                                            ⏳ Awaiting till payment verification
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-[#8AA8C0]">No payment info</p>
                            )}
                        </div>
                    </div>

                    {/* Cancel action */}
                    {order.can_cancel && (
                        <div className="border-t border-[#D4E8F5] pt-4">
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={cancelling}
                                className="text-xs font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {cancelling ? 'Cancelling…' : 'Cancel this order'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Small helper for label/value rows
function Row({ label, value, italic = false, mono = false }: {
    label: string; value: string; italic?: boolean; mono?: boolean;
}) {
    return (
        <div className="flex gap-2 text-sm">
            <span className="text-[#8AA8C0] flex-shrink-0 w-10">{label}</span>
            <span className={`text-[#0D2A47] font-medium break-words ${italic ? 'italic' : ''} ${mono ? 'font-mono' : ''}`}>
                {value}
            </span>
        </div>
    );
}

// ── Main ───────────────────────────────────────────────────────────
export default function Dashboard({ stats, orders }: Props) {
    const [tab, setTab] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');

    const filtered = orders.data.filter(o => {
        if (tab === 'active')    return ['pending', 'confirmed', 'out_for_delivery'].includes(o.status);
        if (tab === 'delivered') return o.status === 'delivered';
        if (tab === 'cancelled') return o.status === 'cancelled';
        return true;
    });

    return (
        <>
            <Head title="Dashboard" />

            <div className="flex flex-col gap-6 p-4 md:p-6 max-w-5xl mx-auto w-full">

                {/* ── Stats ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard
                        label="Total orders"
                        value={stats.totalOrders}
                        icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M7 4V3a1 1 0 012 0v1M11 4V3a1 1 0 012 0v1M7 9h6M7 13h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>}
                    />
                    <StatCard
                        label="Active"
                        value={stats.activeOrders}
                        sub={stats.activeOrders > 0 ? 'In progress' : 'All clear'}
                        icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M10 6v4l2.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    />
                    <StatCard
                        label="Delivered"
                        value={stats.deliveredCount}
                        icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10.5l4 4L16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    />
                    <StatCard
                        label="Total spent"
                        value={fmt(stats.totalSpent)}
                        icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="5" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M2 9h16" stroke="currentColor" strokeWidth="1.5"/><circle cx="6" cy="13" r="1" fill="currentColor"/></svg>}
                    />
                </div>

                {/* ── Orders ── */}
                <div>
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                        <h2 className="text-base font-bold text-[#0D2A47]">My orders</h2>

                        {/* Tab filter */}
                        <div className="flex gap-1 bg-[#F5F8FC] p-1 rounded-xl border border-[#D4E8F5]">
                            {(['all', 'active', 'delivered', 'cancelled'] as const).map(t => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setTab(t)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                                        tab === t
                                            ? 'bg-white text-[#1A4A7A] shadow-sm border border-[#D4E8F5]'
                                            : 'text-[#8AA8C0] hover:text-[#1A4A7A]'
                                    }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {filtered.length > 0 ? (
                        <div className="space-y-3">
                            {filtered.map(order => (
                                <OrderCard key={order.id} order={order} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 text-[#8AA8C0]">
                            <svg className="mx-auto mb-3 opacity-30" width="44" height="44" viewBox="0 0 48 48" fill="none">
                                <path d="M24 4C24 4 10 17 10 28a14 14 0 0028 0C38 17 24 4 24 4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                                <path d="M18 30a6 6 0 0012 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            <p className="text-sm font-medium">
                                {tab === 'all' ? 'No orders yet' : `No ${tab} orders`}
                            </p>
                            {tab === 'all' && (
                                <a href="/" className="mt-3 inline-block text-sm font-semibold text-[#1A78C2] hover:underline">
                                    Place your first order →
                                </a>
                            )}
                        </div>
                    )}

                    {/* Pagination */}
                    {orders.last_page > 1 && (
                        <div className="flex justify-center gap-2 mt-6">
                            {Array.from({ length: orders.last_page }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    type="button"
                                    onClick={() => router.get('/dashboard', { page }, { preserveState: true })}
                                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                        page === orders.current_page
                                            ? 'bg-[#1A4A7A] text-white'
                                            : 'bg-white border border-[#D4E8F5] text-[#4A6A8A] hover:border-[#1A4A7A]'
                                    }`}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};