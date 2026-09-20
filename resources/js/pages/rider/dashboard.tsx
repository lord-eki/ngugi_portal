import { Head } from '@inertiajs/react';

export default function RiderDashboard({ rider }: { rider: { name: string } }) {
    return (
        <>
            <Head title="Rider Dashboard" />
            <div className="p-6">
                <h1 className="text-xl font-bold">Welcome, {rider.name}</h1>
                <p className="text-sm text-gray-500 mt-2">Assigned orders will show up here soon.</p>
            </div>
        </>
    );
}