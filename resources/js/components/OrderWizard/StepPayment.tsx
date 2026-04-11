import { useState } from 'react';

export default function StepPayment({ onNext, data, setData, onBack }) {
    const [mpesaCode, setMpesaCode] = useState('');

    const handleSubmit = () => {
        if (!mpesaCode) return;

        // TODO: send to backend
        onNext();
    };

    return (
        <div>
            <h2 className="text-xl font-bold mb-4">Payment</h2>
            <div className="bg-[#F5F8FC] rounded-xl p-4 text-left space-y-2">
                <p className="text-xs text-[#8AA8C0]">Payment Details</p>
                <p className="text-sm font-semibold text-[#0D2A47]">
                    Dummy info on how to pay
                </p>
            </div>

            <p className="text-sm text-gray-500 mb-4 pt-4">
                Enter your M-Pesa confirmation code
            </p>

            <input
                value={mpesaCode}
                onChange={e => setMpesaCode(e.target.value)}
                placeholder="e.g. QWE123ABC"
                className="w-full border p-3 rounded-lg mb-4"
            />

            <div className="flex justify-between gap-2">
                <button onClick={onBack} className="flex-1 py-3 rounded-xl bg-white border border-[#1A4A7A] text-[#1A4A7A] font-semibold transition"
                >Back</button>
                <button onClick={handleSubmit} className="flex-1 py-3 rounded-xl bg-[#1A4A7A] text-white font-semibold hover:bg-[#0D2A47] transition"
                >
                    Confirm Payment
                </button>
            </div>
        </div>
    );
}