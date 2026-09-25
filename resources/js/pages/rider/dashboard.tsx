import { Head, router } from '@inertiajs/react';
import { RIDER_STATUS_ACTIONS } from '@/pages/dashboard';
import { useForm } from '@inertiajs/react';
import { useState } from 'react';



interface Earning { id: number; order_id: number; amount: number; percentage: number; created_at: string }
interface Props {
    stats: { outForDelivery: number; deliveredToday: number; assignedTotal: number; totalEarned: number; availableBalance: number };
    orders: { data: any[] };
    recentEarnings: Earning[];
    emailVerified: boolean;
    isOnline:boolean;
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
    const [deliveryCode, setDeliveryCode] = useState('');
    const [codeError, setCodeError] = useState<string | null>(null);
    const actions = RIDER_STATUS_ACTIONS[order.status] ?? [];

    const handleStatusChange = (next: string, extra: Record<string, string> = {}) => {
        setActionLoading(next);
        setCodeError(null);
        router.post(`/orders/${order.id}/status`, { status: next, ...extra }, {
            preserveScroll: true,
            onError: (errors) => setCodeError(errors.status ?? 'Incorrect code'),
            onFinish: () => setActionLoading(null),
        });
    };

    const recipientName = order.delivery?.recepient_name || order.delivery?.contact_name;
    const recipientPhone = order.delivery?.recepient_phone || order.delivery?.contact_phone;

    return (
        <div className="bg-white rounded-2xl border border-[#D4E8F5] p-4 space-y-3">
            <div className="flex items-center justify-between">
                <p className="font-semibold text-[#0D2A47]">Order #{order.id}</p>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F5F8FC] text-[#4A6A8A] border border-[#D4E8F5]">
                    {order.status_label}
                </span>
            </div>

            <div className="bg-[#F5F8FC] rounded-xl p-3 space-y-1.5 text-sm">
                <p className="text-[#0D2A47] font-medium">{recipientName ?? 'No name provided'}</p>
                <p className="text-[#4A6A8A]">{recipientPhone ?? 'No phone provided'}</p>
                <p className="text-[#4A6A8A]">{order.delivery?.address}</p>
                {order.delivery?.schedule_label && (
                    <p className="text-[#8AA8C0] text-xs">{order.delivery.schedule_label}</p>
                )}
                {order.delivery?.notes && (
                    <p className="text-[#8AA8C0] text-xs italic">"{order.delivery.notes}"</p>
                )}
            </div>

            {order.status === 'out_for_delivery' ? (
                <div className="space-y-2">
                    <input
                        value={deliveryCode}
                        onChange={e => setDeliveryCode(e.target.value)}
                        placeholder="Ask customer for their 4-digit code"
                        maxLength={4}
                        className="w-full text-sm rounded-lg border border-[#D4E8F5] px-3 py-2 tracking-widest"
                    />
                    {codeError && <p className="text-xs text-red-600">{codeError}</p>}
                    <button
                        type="button"
                        onClick={() => handleStatusChange('delivered', { delivery_code: deliveryCode })}
                        disabled={actionLoading !== null || deliveryCode.length !== 4}
                        className="w-full py-2 rounded-xl bg-green-600 text-white text-xs font-semibold disabled:opacity-50"
                    >
                        {actionLoading === 'delivered' ? 'Confirming…' : 'Confirm Delivered'}
                    </button>
                </div>
            ) : (
                actions.length > 0 && (
                    <div className="flex gap-2">
                        {actions.map(action => (
                            <button key={action.next} type="button" onClick={() => handleStatusChange(action.next)}
                                disabled={actionLoading !== null}
                                className={`flex-1 py-2 rounded-xl text-xs font-semibold disabled:opacity-50 ${action.cls}`}>
                                {actionLoading === action.next ? 'Updating…' : action.label}
                            </button>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}

export default function RiderDashboard({ stats, orders, recentEarnings, emailVerified,isOnline }: Props) {
    return (
        <>
            <Head title="Rider Dashboard" />
            {!emailVerified && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-2 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-amber-800">Verify your email</p>
                        <p className="text-xs text-amber-700 mt-0.5">You won't be assigned new deliveries until you do - check your inbox.</p>
                        <button type="button" onClick={() => router.post('/rider/resend-verification', {}, { preserveScroll: true })} className="text-xs font-semibold text-amber-900 underline flex-shrink-0">
                            Resend Email
                        </button>
                    </div>
                </div>
            )}
            <div className={`rounded-2xl p-4 mt-4 flex items-center justify-between border ${isOnline ? 'bg-green-50 border-green-200' : 'bg-[#F5F8FC] border-[#D4E8F5]'
                }`}>
                <div>
                    <p className={`text-sm font-bold ${isOnline ? 'text-green-800' : 'text-[#4A6A8A]'}`}>
                        {isOnline ? 'You are online' : 'You are offline'}
                    </p>
                    <p className="text-xs text-[#8AA8C0] mt-0.5">
                        {isOnline ? 'You can receive new deliveries' : "You won't be assigned new deliveries"}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => router.post('/rider/toggle-availability', {}, { preserveScroll: true })}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold ${isOnline ? 'bg-white border border-green-300 text-green-800' : 'bg-[#1A4A7A] text-white'
                        }`}
                >
                    {isOnline ? 'Go Offline' : 'Go Online'}
                </button>
            </div>
            <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <WithdrawForm availableBalance={stats.availableBalance} />
                    <StatBox label="Out for delivery" value={stats.outForDelivery} />
                    <StatBox label="Delivered today" value={stats.deliveredToday} />
                    <StatBox label="Total earned" value={`KES ${stats.totalEarned.toLocaleString()}`} />
                    <StatBox label="Available balance" value={`KES ${stats.availableBalance.toLocaleString()}`} accent />
                </div>

                <div className="space-y-3">
                    {orders.data.length === 0 && (
                        <p className="text-sm text-[#8AA8C0]">No orders assigned to you yet.</p>
                    )}
                    {orders.data.map(order => (
                        <RiderOrderCard key={order.id} order={order} />))}
                </div>

                {recentEarnings.length > 0 && (
                    <div className="bg-white rounded-2xl border border-[#D4E8F5] p-4">
                        <p className="text-[10px] font-bold text-[#8AA8C0] uppercase tracking-widest mb-2.5">Recent earnings</p>
                        <div className="space-y-1.5">
                            {recentEarnings.map(e => (
                                <div key={e.id} className="flex justify-between text-sm">
                                    <span className="text-[#4A6A8A]">Order #{e.order_id} · {e.percentage}%</span>
                                    <span className="font-semibold text-[#0D2A47]">KES {e.amount.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

function StatBox({ label, value, accent = false }: { label: string; value: number | string; accent?: boolean }) {
    return (
        <div className={`rounded-2xl border p-4 ${accent ? 'bg-[#0D2A47] border-[#1A4A7A]' : 'bg-white border-[#D4E8F5]'}`}>
            <p className={`text-xs font-medium ${accent ? 'text-[#7AB8E0]' : 'text-[#8AA8C0]'}`}>{label}</p>
            <p className={`text-xl font-black mt-0.5 ${accent ? 'text-white' : 'text-[#0D2A47]'}`}>{value}</p>
        </div>
    );
}

function WithdrawForm({ availableBalance }: { availableBalance: number }) {
    const { data, setData, post, processing, errors, reset } = useForm({ amount: '' });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/rider/withdrawals', { onSuccess: () => reset() });
    };

    return (
        <form onSubmit={submit} className="bg-white rounded-2xl border border-[#D4E8F5] p-4 space-y-2">
            <p className="text-[10px] font-bold text-[#8AA8C0] uppercase tracking-widest">Withdraw earnings</p>
            <div className="flex gap-2">
                <input
                    type="number"
                    min={10}
                    max={availableBalance}
                    value={data.amount}
                    onChange={e => setData('amount', e.target.value)}
                    placeholder={`Up to KES ${availableBalance.toLocaleString()}`}
                    className="flex-1 text-sm rounded-lg border border-[#D4E8F5] px-3 py-2"
                />
                <button
                    type="submit"
                    disabled={processing || availableBalance <= 0}
                    className="bg-[#1A4A7A] text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
                >
                    Withdraw
                </button>
            </div>
            {errors.amount && <p className="text-xs text-red-600">{errors.amount}</p>}
        </form>
    );
}