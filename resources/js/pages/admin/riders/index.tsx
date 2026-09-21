import { Head, useForm } from '@inertiajs/react';

interface Rider {
    id: number;
    name: string;
    email: string;
    phone: string;
    commission_percentage: number | null;
    created_at: string;
}
interface Props {
    riders: Rider[];
}

export default function AdminRiders({ riders }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        phone: '',
        commission_percentage: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/riders', { onSuccess: () => reset() });
    };

    return (
        <>
            <Head title="Riders" />
            <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
                <h1 className="text-xl font-bold text-[#0D2A47]">Riders</h1>

                {/* ── Create form ── */}
                <form onSubmit={submit} className="bg-white rounded-2xl border border-[#D4E8F5] p-5 space-y-3">
                    <p className="text-[10px] font-bold text-[#8AA8C0] uppercase tracking-widest">Add a rider</p>
                    <div className="grid md:grid-cols-2 gap-3">
                        <div>
                            <input
                                value={data.name}
                                onChange={e => setData('name', e.target.value)}
                                placeholder="Full name"
                                className="w-full text-sm rounded-lg border border-[#D4E8F5] px-3 py-2"
                            />
                            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <input
                                value={data.email}
                                onChange={e => setData('email', e.target.value)}
                                placeholder="Email"
                                type="email"
                                className="w-full text-sm rounded-lg border border-[#D4E8F5] px-3 py-2"
                            />
                            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
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
                                placeholder="Commission % (optional)"
                                type="number"
                                step="0.01"
                                className="w-full text-sm rounded-lg border border-[#D4E8F5] px-3 py-2"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={processing}
                        className="bg-[#1A4A7A] text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                        Create rider
                    </button>
                </form>

                {/* ── Rider list ── */}
                <div className="bg-white rounded-2xl border border-[#D4E8F5] overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-[#F5F8FC] text-[#8AA8C0] text-xs">
                            <tr>
                                <th className="text-left font-semibold px-4 py-2.5">Name</th>
                                <th className="text-left font-semibold px-4 py-2.5">Phone</th>
                                <th className="text-left font-semibold px-4 py-2.5">Commission</th>
                                <th className="text-left font-semibold px-4 py-2.5">Joined</th>
                            </tr>
                        </thead>
                        <tbody>
                            {riders.map(r => (
                                <tr key={r.id} className="border-t border-[#D4E8F5]">
                                    <td className="px-4 py-2.5">
                                        <p className="font-medium text-[#0D2A47]">{r.name}</p>
                                        <p className="text-xs text-[#8AA8C0]">{r.email}</p>
                                    </td>
                                    <td className="px-4 py-2.5 text-[#4A6A8A]">{r.phone}</td>
                                    <td className="px-4 py-2.5 text-[#4A6A8A]">{r.commission_percentage ?? '—'}%</td>
                                    <td className="px-4 py-2.5 text-[#8AA8C0]">{new Date(r.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                            {riders.length === 0 && (
                                <tr><td colSpan={4} className="px-4 py-6 text-center text-[#8AA8C0]">No riders yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}

AdminRiders.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Riders', href: '/admin/riders' },
    ],
};