import { Head } from '@inertiajs/react';
import { OrderCard, RIDER_STATUS_ACTIONS } from '@/pages/dashboard';
import { useForm } from '@inertiajs/react';


interface Earning { id: number; order_id: number; amount: number; percentage: number; created_at: string }
interface Props {
    stats: { outForDelivery: number; deliveredToday: number; assignedTotal: number; totalEarned: number; availableBalance: number };
    orders: { data: any[] };
    recentEarnings: Earning[];
}

export default function RiderDashboard({ stats, orders, recentEarnings }: Props) {
    return (
        <>
            <Head title="Rider Dashboard" />
            <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                        <OrderCard key={order.id} order={order} statusActions={RIDER_STATUS_ACTIONS} />
                    ))}
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