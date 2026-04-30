import { useState } from "react";
import StepOrder from "./StepOrder";
import StepDelivery from "./StepDelivery";
import StepPayment from "./StepPayment";
import StepSuccess from "./StepSuccess";

export interface OrderData {
    selectedTypes: string[];
    refillSizes: Record<string, { qty: number; isBundle: boolean; bundleQty: number; bundleSize: number }>;
    newSizes: Record<string, { qty: number; isBundle: boolean; bundleQty: number; bundleSize: number }>;
    deliverySpeed: 'standard' | 'instant';
    lineItems: { label: string; amount: number }[];
    grandTotal: number;
}

export interface DeliveryData {
    locationMode: 'pin' | 'manual' | 'someone-else';
    pinLocation: { lat: number; lng: number } | null;
    pinAddress: string;
    manualAddress: string;
    contactName:string,
    contactPhone:string,
    recipientName: string;
    recipientPhone: string;
    scheduleType: 'asap' | 'later' | 'next-day';
    scheduledTime: string;
    notes: string;
}

export interface PaymentData {
    method: 'mpesa-stk' | 'mpesa-till' | 'card';
    phone: string;
    tillCode: string;
    transactionCode: string;
    cardNumber: string;
    cardExpiry: string;
    cardCvv: string;
}

interface Props { onClose: () => void }

// Progress bar steps
const STEPS = ['Order', 'Delivery', 'Payment', 'Done'];

export default function Wizard({ onClose }: Props) {
    const [step, setStep] = useState(1);

    const [orderData, setOrderData] = useState<OrderData | null>(null);
    const [deliveryData, setDeliveryData] = useState<DeliveryData | null>(null);
    const [paymentData, setPaymentData] = useState<PaymentData | null>(null);

    const handleOrderNext = (data: OrderData) => {
        setOrderData(data);
        setStep(2);
    };

    const handleDeliveryNext = (data: DeliveryData) => {
        setDeliveryData(data);

        setStep(3);
    };

    const handlePaymentNext = (data: PaymentData) => {
        setPaymentData(data);

        setStep(4);
    };

    const back = () => setStep(s => s - 1);

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-[#F5F3EE] w-full max-w-2xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col relative overflow-hidden">

                {/* ── Header ── */}
                <div className="bg-white border-b border-[#D4E8F5] px-6 pt-5 pb-4 flex-shrink-0">
                    {/* Logo + close */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#1A4A7A] flex items-center justify-center">
                                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                    <path d="M8 1C8 1 3 6.5 3 10a5 5 0 0010 0C13 6.5 8 1 8 1z" fill="white" />
                                </svg>
                            </div>
                            <span className="font-bold text-[#0D2A47] tracking-tight">bhebha</span>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-7 h-7 rounded-full bg-[#F5F8FC] border border-[#D4E8F5] flex items-center justify-center text-[#6A8AA8] hover:bg-[#DDEEFF] transition-colors"
                        >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>

                    {/* Step progress */}
                    <div className="flex items-center gap-0">
                        {STEPS.map((label, i) => {
                            const stepNum = i + 1;
                            const done = step > stepNum;
                            const active = step === stepNum;
                            const upcoming = step < stepNum;
                            return (
                                <div key={label} className="flex items-center flex-1 last:flex-none">
                                    <div className="flex flex-col items-center gap-1">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${done ? 'bg-[#1A4A7A] border-[#1A4A7A] text-white' :
                                            active ? 'bg-white border-[#1A4A7A] text-[#1A4A7A]' :
                                                'bg-white border-[#D4E8F5] text-[#C4DDEF]'
                                            }`}>
                                            {done
                                                ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                : stepNum
                                            }
                                        </div>
                                        <span className={`text-[10px] font-medium ${active ? 'text-[#1A4A7A]' : upcoming ? 'text-[#C4DDEF]' : 'text-[#6A8AA8]'}`}>
                                            {label}
                                        </span>
                                    </div>
                                    {i < STEPS.length - 1 && (
                                        <div className={`flex-1 h-0.5 mx-1 mb-4 rounded-full transition-colors ${done ? 'bg-[#1A4A7A]' : 'bg-[#D4E8F5]'}`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Scrollable content ── */}
                <div className="overflow-y-auto flex-1 p-6">
                    {step === 1 && (
                        <StepOrder
                            onNext={handleOrderNext}
                        />
                    )}
                    {step === 2 && orderData && (
                        <StepDelivery
                            orderData={orderData}
                            onNext={handleDeliveryNext}
                            onBack={back}
                        />
                    )}
                    {step === 3 && orderData && deliveryData && (
                        <StepPayment
                            orderData={orderData}
                            deliveryData={deliveryData}
                            onNext={handlePaymentNext}
                            onBack={back}
                        />
                    )}
                    {step === 4 && orderData && deliveryData && paymentData && (
                        <StepSuccess
                            orderData={orderData}
                            deliveryData={deliveryData}
                            paymentData={paymentData}
                            onClose={onClose}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}