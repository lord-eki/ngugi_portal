import type { OrderData, DeliveryData, PaymentData } from './Wizard';

interface Props {
    orderData:    OrderData;
    deliveryData: DeliveryData;
    paymentData:  PaymentData;
    onClose:      () => void;
}

const METHOD_LABELS: Record<string, string> = {
    // 'mpesa-stk':  'M-Pesa STK Push',
    'mpesa-till': 'M-Pesa Till',
    // 'card':       'Card payment',
};

const ORDER_NUM = `BH${Date.now().toString().slice(-6)}`;

export default function StepSuccess({ orderData, deliveryData, paymentData, onClose }: Props) {
    const isTill = paymentData.method === 'mpesa-till';

    return (
        <div className="space-y-5">
            {/* ── Status banner ── */}
            <div className={`rounded-2xl p-5 flex items-start gap-4 ${isTill ? 'bg-[#FFF8E8] border border-[#F5D78A]' : 'bg-[#E8F5E8] border border-[#9AD49A]'}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${isTill ? 'bg-[#F5D78A]' : 'bg-[#3A7A3A]'}`}>
                    {isTill
                        ? <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 7v4M11 15h.01" stroke="#7A5A10" strokeWidth="2" strokeLinecap="round"/></svg>
                        : <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 11l5 5L17 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    }
                </div>
                <div>
                    <h2 className={`font-bold text-base ${isTill ? 'text-[#7A5A10]' : 'text-[#2A5A2A]'}`}>
                        {isTill ? 'Order pending verification' : 'Order confirmed!'}
                    </h2>
                    <p className={`text-xs mt-1 leading-relaxed ${isTill ? 'text-[#9A7A30]' : 'text-[#3A6A3A]'}`}>
                        {isTill
                            ? 'Your order has been received. Our team will verify your till payment and confirm your order shortly.'
                            : 'Payment received. Your water order is confirmed and being processed.'
                        }
                    </p>
                </div>
            </div>

            {/* ── Order number ── */}
            <div className="bg-white rounded-2xl border border-[#D4E8F5] p-5 text-center">
                <p className="text-xs text-[#8AA8C0] mb-1">Order number</p>
                <p className="text-2xl font-black text-[#1A4A7A] tracking-widest">{ORDER_NUM}</p>
                <p className="text-xs text-[#8AA8C0] mt-1">Save this for reference</p>
            </div>

            {/* ── Order breakdown ── */}
            <div className="bg-white rounded-2xl border border-[#D4E8F5] p-5 space-y-3">
                <p className="text-xs font-bold text-[#1A4A7A] uppercase tracking-wider">Order details</p>

                {/* Items */}
                <div className="space-y-1.5">
                    {orderData.lineItems.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                            <span className={item.label.includes('fee') ? 'text-[#8AA8C0]' : 'text-[#4A6A8A]'}>{item.label}</span>
                            <span className={item.label.includes('fee') ? 'text-[#8AA8C0]' : 'font-medium text-[#0D2A47]'}>KES {item.amount.toLocaleString()}</span>
                        </div>
                    ))}
                    <div className="border-t border-[#D4E8F5] pt-2 flex justify-between font-bold">
                        <span className="text-[#0D2A47]">Total paid</span>
                        <span className="text-[#1A4A7A]">KES {orderData.grandTotal.toLocaleString()}</span>
                    </div>
                </div>

                <div className="border-t border-[#D4E8F5] pt-3 space-y-2 text-sm">
                    {/* Delivery location */}
                    <div className="flex justify-between">
                        <span className="text-[#8AA8C0]">Deliver to</span>
                        <span className="text-[#0D2A47] font-medium text-right max-w-[55%] truncate">
                            {deliveryData.locationMode === 'pin' ? deliveryData.pinAddress || 'Pinned location' : deliveryData.manualAddress}
                        </span>
                    </div>
                    {/* Recipient if someone else */}
                    {deliveryData.locationMode === 'someone-else' && (
                        <div className="flex justify-between">
                            <span className="text-[#8AA8C0]">Recipient</span>
                            <span className="text-[#0D2A47] font-medium">{deliveryData.recipientName}</span>
                        </div>
                    )}
                    {/* Schedule */}
                    <div className="flex justify-between">
                        <span className="text-[#8AA8C0]">Schedule</span>
                        <span className="text-[#0D2A47] font-medium">
                            {deliveryData.scheduleType === 'asap' ? 'As soon as possible' : deliveryData.scheduledTime}
                        </span>
                    </div>
                    {/* Payment method */}
                    <div className="flex justify-between">
                        <span className="text-[#8AA8C0]">Paid via</span>
                        <span className="text-[#0D2A47] font-medium">{METHOD_LABELS[paymentData.method]}</span>
                    </div>
                    {/* Transaction code for till */}
                    {isTill && paymentData.transactionCode && (
                        <div className="flex justify-between">
                            <span className="text-[#8AA8C0]">Transaction</span>
                            <span className="text-[#0D2A47] font-mono font-medium">{paymentData.transactionCode}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Delivery estimate ── */}
            <div className="bg-[#EEF6FF] border border-[#C4DDEF] rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#DDEEFF] flex items-center justify-center flex-shrink-0">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <rect x="2" y="5" width="12" height="8" rx="1.5" stroke="#1A4A7A" strokeWidth="1.5"/>
                        <path d="M14 9l2 1.5v2.5h-2" stroke="#1A4A7A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="5.5" cy="14.5" r="1.5" stroke="#1A4A7A" strokeWidth="1.3"/>
                        <circle cx="13.5" cy="14.5" r="1.5" stroke="#1A4A7A" strokeWidth="1.3"/>
                    </svg>
                </div>
                <div>
                    <p className="text-xs text-[#6A8AA8]">Estimated delivery</p>
                    <p className="text-sm font-bold text-[#0D2A47]">
                        {deliveryData.scheduleType === 'asap'
                            ? orderData.deliverySpeed === 'instant' ? 'Within 30–60 minutes' : 'Within 2–4 hours'
                            : deliveryData.scheduledTime}
                    </p>
                    <p className="text-xs text-[#8AA8C0] mt-0.5">You'll get an SMS update when your rider sets off</p>
                </div>
            </div>

            {/* ── CTAs ── */}
            <div className="flex gap-3">
                <button onClick={onClose}
                    className="flex-1 py-3.5 rounded-xl bg-[#1A4A7A] text-white font-semibold hover:bg-[#0D2A47] transition-all shadow-lg shadow-[#1A4A7A]/20">
                    Done
                </button>
                <button onClick={() => window.location.reload()}
                    className="flex-1 py-3.5 rounded-xl border-2 border-[#C4DDEF] text-[#1A4A7A] font-semibold hover:bg-[#EEF6FF] transition-all">
                    New order
                </button>
            </div>
        </div>
    );
}