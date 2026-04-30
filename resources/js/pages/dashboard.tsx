import { Head, router } from '@inertiajs/react';
import { useState, useMemo, useRef, useEffect } from 'react';
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
    sizes: { size: string; quantity: number; type: string }[];
    total_per_cycle: number; created_at: string;
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
const SUB_STYLE: Record<string, string> = {
    active:  'bg-green-50 text-green-800 border-green-200',
    paused:  'bg-amber-50 text-amber-800 border-amber-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
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
    const [cancelling, setCancelling] = useState(false);
    const sc = S_STYLE[order.status] ?? S_STYLE.pending;


    const handleCancel = () => {
        if (!confirm(`Cancel order #${order.id}?`)) return;
        setCancelling(true);
        router.post(`/orders/${order.id}/cancel`, {}, { onFinish: () => setCancelling(false) });
    };

    // Determine who receives the delivery
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
                        </div>
                        <p className="text-xs text-[#8AA8C0] mt-0.5">
                            {timeAgo(order.created_at)} · {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                            {order.delivery?.address ? ` · ${order.delivery.address.slice(0, 30)}${order.delivery.address.length > 30 ? '…' : ''}` : ''}
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
                                                item.type === 'refill'
                                                    ? 'bg-[#DDEEFF] text-[#1A4A7A]'
                                                    : 'bg-green-50 text-green-700'
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
                                {/* Charges */}
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
                                    {/* Address */}
                                    <div className="bg-[#F5F8FC] rounded-xl p-3 border border-[#D4E8F5]">
                                        <p className="text-[10px] text-[#8AA8C0] font-semibold mb-1">📍 Delivery address</p>
                                        <p className="text-sm font-medium text-[#0D2A47]">{order.delivery.address || '—'}</p>
                                    </div>
                                    {/* Receiver */}
                                    {receiver ? (
                                        <div className="bg-[#EEF6FF] rounded-xl p-3 border border-[#C4DDEF]">
                                            <p className="text-[10px] text-[#6A8AA8] font-semibold mb-1">
                                                {order.delivery.location_mode === 'someone-else' ? '👤 Recipient' : '👤 Contact'}
                                            </p>
                                            <p className="text-sm font-bold text-[#0D2A47]">{receiver.name}</p>
                                            {receiver.phone && (
                                                <p className="text-xs text-[#1A78C2] mt-0.5 font-medium">+254{receiver.phone}</p>
                                            )}
                                        </div>
                                    ) : null}
                                    <InfoRow label="When" value={order.delivery.schedule_label} />
                                    {order.delivery.notes && (
                                        <InfoRow label="Note" value={order.delivery.notes} italic />
                                    )}
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
                                    {order.payment.phone && (
                                        <InfoRow label="Phone" value={`+254${order.payment.phone}`} />
                                    )}
                                    {order.payment.transaction_code && (
                                        <InfoRow label="Ref" value={order.payment.transaction_code} mono />
                                    )}
                                    {order.payment.status === 'pending' && order.payment.method === 'mpesa-till' && (
                                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800">
                                            ⏳ Awaiting manual verification by admin
                                        </div>
                                    )}
                                </div>
                            ) : <p className="text-xs text-[#8AA8C0]">No payment info</p>}
                        </div>
                    </div>

                    {/* Cancel */}
                    {order.can_cancel && (
                        <div className="border-t border-[#D4E8F5] pt-4">
                            <button type="button" onClick={handleCancel} disabled={cancelling}
                                className="text-xs font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                                {cancelling ? 'Cancelling…' : 'Cancel this order'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Subscription card ──────────────────────────────────────────────
function SubscriptionCard({ sub }: { sub: Subscription }) {
    const [pausing, setPausing] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    const handlePause = () => {
        setPausing(true);
        router.post(`/subscriptions/${sub.id}/pause`, {}, { onFinish: () => setPausing(false) });
    };
    const handleCancel = () => {
        if (!confirm('Cancel this subscription?')) return;
        setCancelling(true);
        router.post(`/subscriptions/${sub.id}/cancel`, {}, { onFinish: () => setCancelling(false) });
    };
    const handleResume = () => {
        router.post(`/subscriptions/${sub.id}/resume`);
    };

    return (
        <div className="bg-white rounded-2xl border border-[#D4E8F5] p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#0D2A47]">{sub.frequency_label} delivery</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${SUB_STYLE[sub.status] ?? SUB_STYLE.active}`}>
                            {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                        </span>
                    </div>
                    <p className="text-xs text-[#8AA8C0] mt-1">
                        {sub.next_delivery_at
                            ? `Next delivery: ${new Date(sub.next_delivery_at).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })}`
                            : 'No upcoming delivery scheduled'}
                    </p>
                </div>
                <span className="font-black text-[#1A4A7A] text-base flex-shrink-0">{fmt(sub.total_per_cycle)}<span className="text-xs text-[#8AA8C0] font-normal">/cycle</span></span>
            </div>

            {/* Items */}
            <div className="bg-[#F5F8FC] rounded-xl p-3 border border-[#D4E8F5] mb-4">
                <p className="text-[10px] text-[#8AA8C0] font-bold mb-2">ITEMS PER DELIVERY</p>
                <div className="space-y-1">
                    {sub.sizes.map((s, i) => (
                        <div key={i} className="flex justify-between text-xs">
                            <span className="text-[#4A6A8A]">
                                <span className={`font-semibold ${s.type === 'refill' ? 'text-[#1A78C2]' : 'text-green-700'}`}>
                                    {s.type === 'refill' ? 'Refill' : 'New'}
                                </span>{' '}{s.size} × {s.quantity}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                {sub.status === 'active' && (
                    <button type="button" onClick={handlePause} disabled={pausing}
                        className="flex-1 py-2 rounded-xl border-2 border-[#D4E8F5] text-[#4A6A8A] text-xs font-semibold hover:bg-[#F5F8FC] transition-all disabled:opacity-50">
                        {pausing ? 'Pausing…' : '⏸ Pause'}
                    </button>
                )}
                {sub.status === 'paused' && (
                    <button type="button" onClick={handleResume}
                        className="flex-1 py-2 rounded-xl bg-[#1A4A7A] text-white text-xs font-semibold hover:bg-[#0D2A47] transition-all">
                        ▶ Resume
                    </button>
                )}
                {sub.status !== 'cancelled' && (
                    <button type="button" onClick={handleCancel} disabled={cancelling}
                        className="flex-1 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-semibold bg-red-50 hover:bg-red-100 transition-all disabled:opacity-50">
                        {cancelling ? 'Cancelling…' : '✕ Cancel'}
                    </button>
                )}
            </div>
        </div>
    );
}

const BOTTLE_SIZES = ['500ml','1L','5L','10L','15L','20L'];
const FREQ_OPTIONS = [
    { id: 'daily',     label: 'Daily',     sub: 'Every day' },
    { id: 'weekly',    label: 'Weekly',    sub: 'Once a week' },
    { id: 'biweekly',  label: 'Biweekly',  sub: 'Every 2 weeks' },
    { id: 'monthly',   label: 'Monthly',   sub: 'Once a month' },
];
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const TIMES = ['06:00–08:00','08:00–10:00','10:00–12:00','12:00–14:00','14:00–16:00','16:00–18:00'];

function NewSubscriptionForm({ onCancel }: { onCancel: () => void }) {
    const [step, setStep] = useState(1);
    const [freq, setFreq] = useState('weekly');
    const [days, setDays] = useState<string[]>([]);
    const [time, setTime] = useState('');
    const [sizes, setSizes] = useState<Record<string, { qty: number; type: 'refill'|'new' }>>({});
    const [payMethod, setPayMethod] = useState('mpesa-stk');
    const [submitting, setSubmitting] = useState(false);

    const toggleDay = (d: string) => setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
    const toggleSize = (s: string) => setSizes(prev => {
        const n = { ...prev };
        if (n[s]) delete n[s]; else n[s] = { qty: 1, type: 'refill' };
        return n;
    });
    const updateSize = (s: string, patch: Partial<{ qty: number; type: 'refill'|'new' }>) =>
        setSizes(prev => ({ ...prev, [s]: { ...prev[s], ...patch } }));

    const canNext1 = freq !== '' && (freq === 'daily' || days.length > 0) && time !== '';
    const canNext2 = Object.keys(sizes).length > 0;
    const canSubmit = payMethod !== '';

    const handleSubmit = () => {
        setSubmitting(true);
        router.post('/subscriptions', { frequency: freq, days, time, sizes, payment_method: payMethod }, {
            onSuccess: onCancel,
            onFinish: () => setSubmitting(false),
        });
    };

    return (
        <div className="bg-white rounded-2xl border-2 border-[#1A4A7A] p-5 space-y-5">
            {/* Step header */}
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#0D2A47]">New subscription</h3>
                <div className="flex gap-1.5">
                    {[1,2,3].map(n => (
                        <div key={n} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                            step === n ? 'bg-[#1A4A7A] border-[#1A4A7A] text-white' :
                            step > n  ? 'bg-[#DDEEFF] border-[#1A4A7A] text-[#1A4A7A]' :
                                        'bg-white border-[#D4E8F5] text-[#C4DDEF]'
                        }`}>{step > n ? '✓' : n}</div>
                    ))}
                </div>
            </div>

            {/* Step 1 — Frequency & schedule */}
            {step === 1 && (
                <div className="space-y-4">
                    <div>
                        <p className="text-xs font-bold text-[#2A4A6A] mb-2">Delivery frequency</p>
                        <div className="grid grid-cols-2 gap-2">
                            {FREQ_OPTIONS.map(f => (
                                <button key={f.id} type="button" onClick={() => { setFreq(f.id); setDays([]); }}
                                    className={`rounded-xl border-2 p-3 text-left transition-all ${freq === f.id ? 'border-[#1A4A7A] bg-[#EEF6FF]' : 'border-[#D4E8F5] hover:border-[#9ECBE8]'}`}>
                                    <div className="font-bold text-[#0D2A47] text-sm">{f.label}</div>
                                    <div className="text-xs text-[#6A8AA8]">{f.sub}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {freq !== 'daily' && (
                        <div>
                            <p className="text-xs font-bold text-[#2A4A6A] mb-2">
                                Delivery day{freq === 'weekly' ? '' : 's'}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {DAYS.map(d => (
                                    <button key={d} type="button" onClick={() => toggleDay(d)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                            days.includes(d) ? 'bg-[#1A4A7A] border-[#1A4A7A] text-white' : 'bg-white border-[#D4E8F5] text-[#4A6A8A] hover:border-[#1A4A7A]'
                                        }`}>
                                        {d.slice(0, 3)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <p className="text-xs font-bold text-[#2A4A6A] mb-2">Preferred time slot</p>
                        <div className="grid grid-cols-3 gap-2">
                            {TIMES.map(t => (
                                <button key={t} type="button" onClick={() => setTime(t)}
                                    className={`py-2 px-1 rounded-lg border text-xs font-medium text-center transition-all ${
                                        time === t ? 'bg-[#1A4A7A] border-[#1A4A7A] text-white' : 'bg-white border-[#D4E8F5] text-[#4A6A8A] hover:border-[#9ECBE8]'
                                    }`}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2 — Items */}
            {step === 2 && (
                <div className="space-y-3">
                    <p className="text-xs font-bold text-[#2A4A6A]">Select sizes & quantities per delivery</p>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                        {BOTTLE_SIZES.map(s => (
                            <button key={s} type="button" onClick={() => toggleSize(s)}
                                className={`rounded-xl border-2 p-2.5 text-left transition-all ${sizes[s] ? 'border-[#1A4A7A] bg-[#EEF6FF]' : 'border-[#D4E8F5] hover:border-[#9ECBE8]'}`}>
                                <div className="font-bold text-[#0D2A47] text-sm">{s}</div>
                            </button>
                        ))}
                    </div>
                    {Object.keys(sizes).length > 0 && (
                        <div className="space-y-2">
                            {BOTTLE_SIZES.filter(s => sizes[s]).map(s => (
                                <div key={s} className="bg-[#F5F8FC] rounded-xl p-3 border border-[#D4E8F5] flex items-center gap-3 flex-wrap">
                                    <span className="font-bold text-[#0D2A47] text-sm w-12">{s}</span>
                                    {/* Type toggle */}
                                    <div className="flex gap-1.5">
                                        {(['refill','new'] as const).map(t => (
                                            <button key={t} type="button" onClick={() => updateSize(s, { type: t })}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                                                    sizes[s].type === t ? 'bg-[#1A4A7A] border-[#1A4A7A] text-white' : 'bg-white border-[#D4E8F5] text-[#4A6A8A]'
                                                }`}>
                                                {t === 'refill' ? 'Refill' : 'New'}
                                            </button>
                                        ))}
                                    </div>
                                    {/* Qty */}
                                    <div className="flex items-center gap-2 ml-auto">
                                        <button type="button" onClick={() => updateSize(s, { qty: Math.max(1, sizes[s].qty - 1) })}
                                            className="w-7 h-7 rounded-lg bg-[#DDEEFF] text-[#1A4A7A] font-bold text-sm flex items-center justify-center hover:bg-[#C4DDEF]">−</button>
                                        <span className="w-6 text-center font-bold text-[#0D2A47] text-sm">{sizes[s].qty}</span>
                                        <button type="button" onClick={() => updateSize(s, { qty: sizes[s].qty + 1 })}
                                            className="w-7 h-7 rounded-lg bg-[#DDEEFF] text-[#1A4A7A] font-bold text-sm flex items-center justify-center hover:bg-[#C4DDEF]">+</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Step 3 — Payment */}
            {step === 3 && (
                <div className="space-y-3">
                    <p className="text-xs font-bold text-[#2A4A6A]">Auto-billing method</p>
                    <div className="space-y-2">
                        {[
                            { id: 'mpesa-stk',  label: 'M-Pesa Auto-Charge', sub: 'STK push before each delivery' },
                            { id: 'card',       label: 'Card Auto-Billing',  sub: 'Visa / Mastercard recurring charge' },
                        ].map(p => (
                            <button key={p.id} type="button" onClick={() => setPayMethod(p.id)}
                                className={`w-full flex items-start justify-between rounded-xl border-2 px-4 py-3 text-left transition-all ${
                                    payMethod === p.id ? 'border-[#1A4A7A] bg-[#EEF6FF]' : 'border-[#D4E8F5] hover:border-[#9ECBE8]'
                                }`}>
                                <div>
                                    <div className={`text-sm font-semibold ${payMethod === p.id ? 'text-[#1A4A7A]' : 'text-[#0D2A47]'}`}>{p.label}</div>
                                    <div className="text-xs text-[#6A8AA8] mt-0.5">{p.sub}</div>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${payMethod === p.id ? 'border-[#1A4A7A] bg-[#1A4A7A]' : 'border-[#C4DDEF]'}`}>
                                    {payMethod === p.id && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l1.8 1.8L6.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                </div>
                            </button>
                        ))}
                    </div>
                    {/* Summary */}
                    <div className="bg-[#EEF6FF] border border-[#C4DDEF] rounded-xl p-4 text-sm space-y-1.5">
                        <p className="font-bold text-[#1A4A7A] mb-2">Subscription summary</p>
                        <div className="flex justify-between"><span className="text-[#6A8AA8]">Frequency</span><span className="font-medium text-[#0D2A47]">{FREQ_OPTIONS.find(f => f.id === freq)?.label}</span></div>
                        {days.length > 0 && <div className="flex justify-between"><span className="text-[#6A8AA8]">Days</span><span className="font-medium text-[#0D2A47]">{days.map(d => d.slice(0,3)).join(', ')}</span></div>}
                        <div className="flex justify-between"><span className="text-[#6A8AA8]">Time slot</span><span className="font-medium text-[#0D2A47]">{time}</span></div>
                        <div className="flex justify-between"><span className="text-[#6A8AA8]">Items</span><span className="font-medium text-[#0D2A47]">{Object.keys(sizes).length} size{Object.keys(sizes).length !== 1 ? 's' : ''}</span></div>
                    </div>
                </div>
            )}

            {/* Nav */}
            <div className="flex gap-3 pt-1">
                <button type="button" onClick={step === 1 ? onCancel : () => setStep(s => s - 1)}
                    className="flex-1 py-3 rounded-xl border-2 border-[#D4E8F5] text-[#4A6A8A] text-sm font-semibold hover:bg-[#F5F8FC] transition-all">
                    {step === 1 ? 'Cancel' : '← Back'}
                </button>
                {step < 3 ? (
                    <button type="button" onClick={() => setStep(s => s + 1)}
                        disabled={step === 1 ? !canNext1 : !canNext2}
                        className="flex-[2] py-3 rounded-xl bg-[#1A4A7A] text-white text-sm font-semibold hover:bg-[#0D2A47] transition-all shadow-lg shadow-[#1A4A7A]/20 disabled:opacity-40 disabled:cursor-not-allowed">
                        Continue →
                    </button>
                ) : (
                    <button type="button" onClick={handleSubmit} disabled={!canSubmit || submitting}
                        className="flex-[2] py-3 rounded-xl bg-[#1A4A7A] text-white text-sm font-semibold hover:bg-[#0D2A47] transition-all shadow-lg shadow-[#1A4A7A]/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        {submitting && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/></svg>}
                        {submitting ? 'Creating…' : 'Start subscription'}
                    </button>
                )}
            </div>
        </div>
    );
}

// ── Main ───────────────────────────────────────────────────────────
export default function Dashboard({ stats, orders, subscriptions }: Props) {
    const [mainTab, setMainTab] = useState<'orders' | 'subscriptions'>('orders');
    const [statusTab, setStatusTab] = useState<'all'|'active'|'delivered'|'cancelled'>('all');
    const [search, setSearch] = useState('');
    const [showNewSub, setShowNewSub] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);

    // Client-side search across order id, address, items, payment ref
    const filtered = useMemo(() => {
        let list = orders.data;
        // Status filter
        if (statusTab === 'active')    list = list.filter(o => ['pending','confirmed','out_for_delivery'].includes(o.status));
        if (statusTab === 'delivered') list = list.filter(o => o.status === 'delivered');
        if (statusTab === 'cancelled') list = list.filter(o => o.status === 'cancelled');
        // Search
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
                    <StatCard label="Total spent" value={fmt(stats.totalSpent)} accent
                        icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="5" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M2 9h16" stroke="currentColor" strokeWidth="1.5"/><circle cx="6" cy="13" r="1" fill="currentColor"/></svg>}
                    />
                </div>

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
                        {/* Search + status filter row */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            {/* Search */}
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
                            {/* Status tabs */}
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

                        {/* Results count */}
                        {search && (
                            <p className="text-xs text-[#8AA8C0]">
                                {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"
                            </p>
                        )}

                        {/* Order list */}
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
                                {!search && statusTab === 'all' && (
                                    <a href="/" className="mt-3 inline-block text-sm font-semibold text-[#1A78C2] hover:underline">Place your first order →</a>
                                )}
                            </div>
                        )}

                        {/* Pagination */}
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
                                {subscriptions.length > 0 ? `${subscriptions.length} subscription${subscriptions.length !== 1 ? 's' : ''}` : 'No subscriptions yet'}
                            </p>
                            {!showNewSub && (
                                <button type="button" onClick={() => setShowNewSub(true)}
                                    className="flex items-center gap-2 bg-[#1A4A7A] text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-[#0D2A47] transition-all shadow-lg shadow-[#1A4A7A]/20">
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                                    New subscription
                                </button>
                            )}
                        </div>

                        {showNewSub && <NewSubscriptionForm onCancel={() => setShowNewSub(false)} />}

                        {subscriptions.length > 0 ? (
                            <div className="space-y-3">
                                {subscriptions.map(sub => <SubscriptionCard key={sub.id} sub={sub} />)}
                            </div>
                        ) : !showNewSub ? (
                            <div className="text-center py-14 text-[#8AA8C0] bg-white rounded-2xl border border-[#D4E8F5]">
                                <svg className="mx-auto mb-3 opacity-30" width="40" height="40" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 2C12 2 5 9 5 14a7 7 0 0014 0C19 9 12 2 12 2z" stroke="currentColor" strokeWidth="1.5"/>
                                    <circle cx="12" cy="14" r="2" stroke="currentColor" strokeWidth="1.5"/>
                                </svg>
                                <p className="text-sm font-medium">No subscriptions yet</p>
                                <p className="text-xs mt-1">Set up recurring water delivery and never run out</p>
                                <button type="button" onClick={() => setShowNewSub(true)}
                                    className="mt-4 inline-flex items-center gap-2 bg-[#1A4A7A] text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-[#0D2A47] transition-all">
                                    + Set up a subscription
                                </button>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};