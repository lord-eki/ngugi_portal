import { Head, router, useForm } from "@inertiajs/react";
import { useState } from "react";

interface Rider {
    id: number;
    name: string;
    email: string;
    phone: string;
    national_id: string;
    payout_method: string;
    transport_type: string;
    commission_percentage: number | null;
    is_active: boolean;
    created_at: string;
    email_verified_at: string | null;
    is_online: boolean;
}
interface Props {
    riders: Rider[];
}

export default function AdminRiders({ riders }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: "",
        email: "",
        phone: "",
        commission_percentage: "",
        national_id: "",
        payout_method: "mpesa",
        transport_type: "bike",
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post("/admin/riders", { onSuccess: () => reset() });
    };

    return (
        <>
            <Head title="Riders" />
            <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
                <h1 className="text-xl font-bold text-[#0D2A47]">Riders</h1>

                <form
                    onSubmit={submit}
                    className="space-y-3 rounded-2xl border border-[#D4E8F5] bg-white p-5"
                >
                    <p className="text-[10px] font-bold tracking-widest text-[#8AA8C0] uppercase">
                        Add a rider
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                        <div>
                            <input
                                value={data.name}
                                onChange={(e) =>
                                    setData("name", e.target.value)
                                }
                                placeholder="Full name"
                                className="w-full rounded-lg border border-[#D4E8F5] px-3 py-2 text-sm"
                            />
                            {errors.name && (
                                <p className="mt-1 text-xs text-red-600">
                                    {errors.name}
                                </p>
                            )}
                        </div>
                        <div>
                            <input
                                value={data.email}
                                onChange={(e) =>
                                    setData("email", e.target.value)
                                }
                                placeholder="Email"
                                type="email"
                                className="w-full rounded-lg border border-[#D4E8F5] px-3 py-2 text-sm"
                            />
                            {errors.email && (
                                <p className="mt-1 text-xs text-red-600">
                                    {errors.email}
                                </p>
                            )}
                        </div>
                        <div>
                            <input
                                value={data.phone}
                                onChange={(e) =>
                                    setData("phone", e.target.value)
                                }
                                placeholder="2547XXXXXXXX"
                                className="w-full rounded-lg border border-[#D4E8F5] px-3 py-2 text-sm"
                            />
                            {errors.phone && (
                                <p className="mt-1 text-xs text-red-600">
                                    {errors.phone}
                                </p>
                            )}
                        </div>
                        <div>
                            <input
                                value={data.national_id}
                                onChange={(e) =>
                                    setData("national_id", e.target.value)
                                }
                                placeholder="National ID number"
                                className="w-full rounded-lg border border-[#D4E8F5] px-3 py-2 text-sm"
                            />
                            {errors.national_id && (
                                <p className="mt-1 text-xs text-red-600">
                                    {errors.national_id}
                                </p>
                            )}
                        </div>
                        <div>
                            <select
                                value={data.transport_type}
                                onChange={(e) =>
                                    setData("transport_type", e.target.value)
                                }
                                className="w-full rounded-lg border border-[#D4E8F5] bg-white px-3 py-2 text-sm"
                            >
                                <option value="bike">Motorbike</option>
                                <option value="bicycle">Bicycle</option>
                                <option value="walking">Walking</option>
                            </select>
                        </div>
                        <div>
                            <select
                                value={data.payout_method}
                                onChange={(e) =>
                                    setData("payout_method", e.target.value)
                                }
                                className="w-full rounded-lg border border-[#D4E8F5] bg-white px-3 py-2 text-sm"
                            >
                                <option value="mpesa">M-Pesa</option>
                                <option value="airtel" disabled>
                                    {" "}
                                    Airtel Money (coming soon)
                                </option>
                                <option value="bank" disabled>
                                    Bank (coming soon)
                                </option>
                            </select>
                        </div>
                        <div>
                            <input
                                value={data.commission_percentage}
                                onChange={(e) =>
                                    setData(
                                        "commission_percentage",
                                        e.target.value,
                                    )
                                }
                                placeholder="Commission % (optional)"
                                type="number"
                                step="0.01"
                                className="w-full rounded-lg border border-[#D4E8F5] px-3 py-2 text-sm"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-lg bg-[#1A4A7A] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        Create rider
                    </button>
                </form>

                <div className="overflow-hidden rounded-2xl border border-[#D4E8F5] bg-white">
                    <table className="w-full text-sm">
                        <thead className="bg-[#F5F8FC] text-xs text-[#8AA8C0]">
                            <tr>
                                <th className="px-4 py-2.5 text-left font-semibold">
                                    Name
                                </th>
                                <th className="px-4 py-2.5 text-left font-semibold">
                                    Phone
                                </th>
                                <th className="px-4 py-2.5 text-left font-semibold">
                                    Transport
                                </th>
                                <th className="px-4 py-2.5 text-left font-semibold">
                                    Payout Method
                                </th>
                                <th className="px-4 py-2.5 text-left font-semibold">
                                    Natinal ID Number
                                </th>
                                <th className="px-4 py-2.5 text-left font-semibold">
                                    Commission
                                </th>
                                <th className="px-4 py-2.5 text-left font-semibold">
                                    Password
                                </th>
                                <th className="px-4 py-2.5 text-left font-semibold">
                                    Status
                                </th>
                                <th className="px-4 py-2.5 text-left font-semibold">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {riders.map((r) => (
                                <RiderRow key={r.id} rider={r} />
                            ))}
                            {riders.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-4 py-6 text-center text-[#8AA8C0]"
                                    >
                                        No riders yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}

function RiderRow({ rider }: { rider: Rider }) {
    const [commission, setCommission] = useState(
        rider.commission_percentage ?? "",
    );
    const [revealed, setRevealed] = useState<string | null>(null);
    const [revealing, setRevealing] = useState(false);
    const [busy, setBusy] = useState(false);

    const saveCommission = () => {
        router.patch(
            `/admin/riders/${rider.id}`,
            {
                phone: rider.phone,
                commission_percentage: commission === "" ? null : commission,
            },
            { preserveScroll: true },
        );
    };

    const toggleStatus = () => {
        setBusy(true);
        router.post(
            `/admin/riders/${rider.id}/toggle-status`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setBusy(false),
            },
        );
    };

    const resetPassword = () => {
        if (!confirm(`Generate and email a new password to ${rider.name}?`)) {
            return;
        }

        setBusy(true);
        router.post(
            `/admin/riders/${rider.id}/reset-password`,
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setBusy(false);
                    setRevealed(null);
                },
            },
        );
    };

    const togglePassword = async () => {
        if (revealed) {
            setRevealed(null);

            return;
        }

        setRevealing(true);

        try {
            const res = await fetch(`/admin/riders/${rider.id}/password`);
            const json = await res.json();
            setRevealed(json.password);
        } finally {
            setRevealing(false);
        }
    };

    return (
        <tr className="border-t border-[#D4E8F5] align-top">
            <td className="px-4 py-2.5">
                <p className="flex items-center gap-1.5 font-medium text-[#0D2A47]">
                    <span
                        className={`h-2.5 w-2.5 rounded-full ${rider.is_online ? "bg-green-500" : "bg-gray-300"}`}
                    />
                    {rider.name}
                    <span
                        className={`rounded-full p-1 text-xs ${rider.is_online ? "bg-green-500" : "bg-gray-300"}`}
                    >
                        {rider.is_online ? "online" : "offline"}
                    </span>
                </p>
                <p className="text-xs text-[#8AA8C0]">{rider.email}</p>
            </td>
            <td className="px-4 py-2.5 text-[#4A6A8A]">{rider.phone}</td>
            <td className="px-4 py-2.5 text-[#4A6A8A] capitalize">
                {rider.transport_type}
            </td>
            <td className="px-4 py-2.5 text-[#4A6A8A] capitalize">
                {rider.payout_method}
            </td>
            <td className="px-4 py-2.5 text-[#4A6A8A]">{rider.national_id}</td>
            <td className="px-4 py-2.5">
                <input
                    type="number"
                    step="0.01"
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    onBlur={saveCommission}
                    className="w-16 rounded-lg border border-[#D4E8F5] px-2 py-1 text-sm"
                />
                %
            </td>
            <td className="px-4 py-2.5">
                <button
                    type="button"
                    onClick={togglePassword}
                    disabled={revealing}
                    className="font-mono text-xs text-[#1A78C2] hover:underline"
                >
                    {revealing ? "…" : revealed ? revealed : "••••••••"}
                </button>
            </td>
            <td className="px-4 py-2.5">
                <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                        rider.is_active
                            ? "border-green-200 bg-green-50 text-green-800"
                            : "border-red-200 bg-red-50 text-red-700"
                    }`}
                >
                    {rider.is_active ? "Active" : "Suspended"}
                </span>
                <span
                    className={`ml-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                        rider.email_verified_at
                            ? "border-blue-200 bg-blue-50 text-blue-800"
                            : "border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                >
                    {rider.email_verified_at ? "Verified" : "Unverified"}
                </span>
            </td>
            <td className="px-4 py-2.5">
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={toggleStatus}
                        disabled={busy}
                        className="text-xs font-semibold text-[#1A4A7A] hover:underline disabled:opacity-50"
                    >
                        {rider.is_active ? "Suspend" : "Activate"}
                    </button>
                    <button
                        type="button"
                        onClick={resetPassword}
                        disabled={busy}
                        className="text-xs font-semibold text-[#1A4A7A] hover:underline disabled:opacity-50"
                    >
                        Reset password
                    </button>
                </div>
            </td>
        </tr>
    );
}
