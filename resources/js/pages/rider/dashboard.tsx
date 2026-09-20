import { Head } from '@inertiajs/react';
import { OrderCard, RIDER_STATUS_ACTIONS } from '@/pages/dashboard';

interface Props {
    stats: { outForDelivery: number; deliveredToday: number; assignedTotal: number };
    orders: { data: any[] };
}

export default function RiderDashboard({ stats, orders }: Props) {
    return (
        <>
            <Head title="Rider Dashboard" />
            <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
                <div className="grid grid-cols-3 gap-3">
                    <StatBox label="Out for delivery" value={stats.outForDelivery} />
                    <StatBox label="Delivered today" value={stats.deliveredToday} />
                    <StatBox label="Total assigned" value={stats.assignedTotal} />
                </div>
                <div className="space-y-3">
                    {orders.data.length === 0 && (
                        <p className="text-sm text-[#8AA8C0]">No orders assigned to you yet.</p>
                    )}
                    {orders.data.map(order => (
                        <OrderCard key={order.id} order={order} statusActions={RIDER_STATUS_ACTIONS} />
                    ))}
                </div>
            </div>
        </>
    );
}

function StatBox({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-2xl border border-[#D4E8F5] bg-white p-4">
            <p className="text-xs text-[#8AA8C0] font-medium">{label}</p>
            <p className="text-xl font-black text-[#0D2A47] mt-0.5">{value}</p>
        </div>
    );
}