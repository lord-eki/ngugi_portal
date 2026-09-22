import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

interface Refiller {
    id: number;
    name: string;
    phone: string;
    commission_percentage: number;
    is_active: boolean;
}
interface Props {
    refillers: Refiller[];
}

export default function AdminRefillers({ refillers }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        phone: '',
        commission_percentage: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/refillers', { onSuccess: () => reset() });
    };

    return (
        <>
            <Head title="Refillers" />
            <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
                <div>
                    <h1 className="text-xl font-bold text-[#0D2A47]">Refillers</h1>
                    <p className="text-xs text-[#8AA8C0] mt-1">
                        Refill stations don't log in — their share is sent to their phone automatically when a delivery they supplied is confirmed.
                    </p>
                </div>

                <form onSubmit={submit} className="bg-white rounded-2xl border border-[#D4E8F5] p-5 space-y-3">
                    <p className="text-[10px] font-bold text-[#8AA8C0] uppercase tracking-widest">Add a refiller</p>
                    <div className="grid md:grid-cols-3 gap-3">
                        <div>
                            <input
                                value={data.name}
                                onChange={e => setData('name', e.target.value)}
                                placeholder="Station / owner name"
                                className="w-full text-sm rounded-lg border border-[#D4E8F5] px-3 py-2"
                            />
                            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <input
                                value={data.phone}
                                onChange={e => setData('phone', e.target.value)}
                                placeholder="2547XXXXXXXX"
                                className="w-full text-sm rounded-lg border border-[#D4E8F5] px-3 py-2"
                            />
                            {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
                        </div>
                        <div>
                            <input
                                value={data.commission_percentage}
                                onChange={e => setData('commission_percentage', e.target.value)}
                                placeholder="Commission %"
                                type="number"
                                step="0.01"
                                className="w-full text-sm rounded-lg border border-[#D4E8F5] px-3 py-2"
                            />
                            {errors.commission_percentage && <p className="text-xs text-red-600 mt-1">{errors.commission_percentage}</p>}
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={processing}
                        className="bg-[#1A4A7A] text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                        Add refiller
                    </button>
                </form>

                <div className="bg-white rounded-2xl border border-[#D4E8F5] overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-[#F5F8FC] text-[#8AA8C0] text-xs">
                            <tr>
                                <th className="text-left font-semibold px-4 py-2.5">Name</th>
                                <th className="text-left font-semibold px-4 py-2.5">Phone</th>
                                <th className="text-left font-semibold px-4 py-2.5">Commission</th>
                                <th className="text-left font-semibold px-4 py-2.5">Status</th>
                                <th className="text-left font-semibold px-4 py-2.5">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {refillers.map(r => <RefillerRow key={r.id} refiller={r} />)}
                            {refillers.length === 0 && (
                                <tr><td colSpan={5} className="px-4 py-6 text-center text-[#8AA8C0]">No refillers yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}

function RefillerRow({ refiller }: { refiller: Refiller }) {
    const [commission, setCommission] = useState(refiller.commission_percentage);
    const [busy, setBusy] = useState(false);

    const saveCommission = () => {
        router.patch(`/admin/refillers/${refiller.id}`, {
            phone: refiller.phone,
            commission_percentage: commission,
        }, { preserveScroll: true });
    };

    const toggleStatus = () => {
        setBusy(true);
        router.post(`/admin/refillers/${refiller.id}/toggle-status`, {}, {
            preserveScroll: true,
            onFinish: () => setBusy(false),
        });
    };

    return (
        <tr className="border-t border-[#D4E8F5]">
            <td className="px-4 py-2.5 font-medium text-[#0D2A47]">{refiller.name}</td>
            <td className="px-4 py-2.5 text-[#4A6A8A]">{refiller.phone}</td>
            <td className="px-4 py-2.5">
                <input
                    type="number" step="0.01" value={commission}
                    onChange={e => setCommission(Number(e.target.value))}
                    onBlur={saveCommission}
                    className="w-16 text-sm rounded-lg border border-[#D4E8F5] px-2 py-1"
                />%
            </td>
            <td className="px-4 py-2.5">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    refiller.is_active ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                    {refiller.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td className="px-4 py-2.5">
                <button type="button" onClick={toggleStatus} disabled={busy}
                    className="text-xs font-semibold text-[#1A4A7A] hover:underline disabled:opacity-50">
                    {refiller.is_active ? 'Deactivate' : 'Activate'}
                </button>
            </td>
        </tr>
    );
}

AdminRefillers.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Refillers', href: '/admin/refillers' },
    ],
};