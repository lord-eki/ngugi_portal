type Props = {
    onClose: () => void;
};

export default function StepSuccess({ onClose }: Props) {
    return (
        <div className="space-y-6">

            {/* Header (same pattern as other steps) */}
            <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-[#1A4A7A] text-white">
                    ✓
                </div>
                <div>
                    <h2 className="font-bold text-[#0D2A47]">Order confirmed</h2>
                    <p className="text-xs text-[#8AA8C0]">Your water is on the way</p>
                </div>
            </div>

            {/* Main card */}
            <div className="bg-white rounded-2xl border border-[#D4E8F5] p-6 text-center">

                {/* Success icon */}
                <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-[#DDEEFF] flex items-center justify-center">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M5 13l4 4L19 7"
                                stroke="#1A4A7A"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                </div>

                {/* Message */}
                <h3 className="text-lg font-bold text-[#0D2A47]">
                    Payment received 
                </h3>

                <p className="text-sm text-[#6A8AA8] mt-2 max-w-sm mx-auto">
                    We’ve received your order and it’s being processed. You’ll get an update shortly.
                </p>

                {/* Divider */}
                <div className="border-t border-[#D4E8F5] my-5" />

                {/* Delivery info */}
                <div className="bg-[#F5F8FC] rounded-xl p-4 text-left space-y-2">
                    <p className="text-xs text-[#8AA8C0]">Estimated delivery</p>
                    <p className="text-sm font-semibold text-[#0D2A47]">
                        Within 2 – 4 hours
                    </p>
                </div>
            </div>

            {/* CTA buttons */}
            <div className="flex gap-3">
                <button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl bg-[#1A4A7A] text-white font-semibold hover:bg-[#0D2A47] transition"
                >
                    Done
                </button>

                <button
                    onClick={() => window.location.reload()}
                    className="flex-1 py-3 rounded-xl border border-[#C4DDEF] text-[#1A4A7A] font-semibold hover:bg-[#EEF6FF] transition"
                >
                    New Order
                </button>
            </div>
        </div>
    );
}