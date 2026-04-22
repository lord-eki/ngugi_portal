import { useState } from 'react';
import axios from 'axios';
import type { OrderData, DeliveryData, PaymentData } from './Wizard';

type PaymentMethod = 'mpesa-stk' | 'mpesa-till' | 'card';

interface Props {
    orderData: OrderData;
    deliveryData: DeliveryData;
    onNext: (data: PaymentData) => void;
    onBack: () => void;
}

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <div className={`bg-white rounded-2xl border border-[#D4E8F5] p-5 ${className}`}>{children}</div>;
}

const TILL_NUMBER = '123456';

export default function StepPayment({ orderData, deliveryData, onNext, onBack }: Props) {
    const [method, setMethod] = useState<PaymentMethod>('mpesa-stk');
    const [phone, setPhone] = useState('');
    const [tillCode, setTillCode] = useState('');
    const [transactionCode, setTransactionCode] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvv, setCardCvv] = useState('');
    const [stkStatus, setStkStatus] = useState<'idle' | 'waiting' | 'success' | 'failed'>('idle');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const total = orderData.grandTotal;

    const buildPayload = (paymentData: PaymentData) => ({
        // Order details
        order: {
            selectedTypes: orderData.selectedTypes,
            refillSizes: orderData.refillSizes,
            newSizes: orderData.newSizes,
            deliverySpeed: orderData.deliverySpeed,
            lineItems: orderData.lineItems,
            grandTotal: orderData.grandTotal,
        },
        // Delivery details
        delivery: {
            locationMode: deliveryData.locationMode,
            pinLocation: deliveryData.pinLocation,
            pinAddress: deliveryData.pinAddress,
            manualAddress: deliveryData.manualAddress,
            recipientName: deliveryData.recipientName,
            recipientPhone: deliveryData.recipientPhone,
            scheduleType: deliveryData.scheduleType,
            scheduledTime: deliveryData.scheduledTime,
            notes: deliveryData.notes,
        },
        // Payment details
        payment: paymentData,
    });

    const handleStkPush = async () => {
        if (!phone || phone.length < 9) { setError('Enter a valid phone number'); return; }
        setError('');
        setSubmitting(true);
        setStkStatus('waiting');

        try {
            const paymentData: PaymentData = { method: 'mpesa-stk', phone, tillCode: '', transactionCode: '', cardNumber: '', cardExpiry: '', cardCvv: '' };

            await axios.post('/order', buildPayload(paymentData));
            setStkStatus('success');
            setTimeout(() => { onNext(paymentData); }, 1500);
        } catch (e: any) {
            setStkStatus('failed');
            setError(e?.response?.data?.message || 'Payment failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Manual till flow 
    const handleTillSubmit = async () => {
        if (!transactionCode.trim()) { setError('Enter your M-Pesa transaction code'); return; }
        setError('');
        setSubmitting(true);

        try {
            const paymentData: PaymentData = { method: 'mpesa-till', phone: '', tillCode, transactionCode, cardNumber: '', cardExpiry: '', cardCvv: '' };

            let res = await axios.post('/order', buildPayload(paymentData));
            console.log(res);

            onNext(paymentData);
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Submission failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Card payment flow 
    const handleCardSubmit = async () => {
        if (!cardNumber || !cardExpiry || !cardCvv) { setError('Fill in all card details'); return; }
        setError('');
        setSubmitting(true);

        try {
            const paymentData: PaymentData = { method: 'card', phone: '', tillCode: '', transactionCode: '', cardNumber, cardExpiry, cardCvv };
            await axios.post('/order', buildPayload(paymentData));
            onNext(paymentData);
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Card payment failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const formatCard = (v: string) => v.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19);
    const formatExpiry = (v: string) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1/$2').slice(0, 5);

    return (
        <div className="space-y-5">

            {/* Order summary recap */}
            <div className="bg-[#EEF6FF] border border-[#C4DDEF] rounded-2xl p-4 space-y-2">
                <p className="text-xs font-semibold text-[#1A4A7A] mb-2">Order recap</p>
                {orderData.lineItems.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs">
                        <span className={item.label.includes('fee') ? 'text-[#8AA8C0]' : 'text-[#4A6A8A]'}>{item.label}</span>
                        <span className={item.label.includes('fee') ? 'text-[#8AA8C0]' : 'text-[#0D2A47] font-medium'}>KES {item.amount.toLocaleString()}</span>
                    </div>
                ))}
                <div className="border-t border-[#C4DDEF] pt-2 flex justify-between">
                    <span className="text-sm font-bold text-[#0D2A47]">Total</span>
                    <span className="text-sm font-black text-[#1A4A7A]">KES {total.toLocaleString()}</span>
                </div>
                <div className="border-t border-[#C4DDEF] pt-2 text-xs text-[#6A8AA8]">
                    📍 {deliveryData.locationMode === 'pin' ? deliveryData.pinAddress || 'Pinned on map' : deliveryData.manualAddress}
                    {' · '}
                    {deliveryData.scheduleType === 'asap' ? 'ASAP' : deliveryData.scheduledTime}
                </div>
            </div>

            {/* Payment method selector */}
            <SectionCard>
                <h2 className="font-bold text-[#0D2A47] mb-1">Payment method</h2>
                <p className="text-xs text-[#8AA8C0] mb-4">Choose how you'd like to pay</p>

                <div className="space-y-2">
                    {([
                        { id: 'mpesa-stk' as const, label: 'M-Pesa STK Push', sub: 'You\'ll get a prompt on your phone', badge: 'Recommended' },
                        { id: 'mpesa-till' as const, label: 'M-Pesa Till Number', sub: 'Pay manually via M-Pesa menu', badge: null },
                        { id: 'card' as const, label: 'Visa / Mastercard', sub: 'Secure card payment via Flutterwave', badge: null },
                    ] as const).map(opt => {
                        const active = method === opt.id;
                        return (
                            <button key={opt.id} type="button" onClick={() => { setMethod(opt.id); setError(''); setStkStatus('idle'); }}
                                className={`w-full flex items-start justify-between rounded-xl border-2 px-4 py-3.5 text-left transition-all ${active ? 'border-[#1A4A7A] bg-[#EEF6FF]' : 'border-[#D4E8F5] bg-[#F9FBFD] hover:border-[#9ECBE8]'
                                    }`}>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm font-semibold ${active ? 'text-[#1A4A7A]' : 'text-[#0D2A47]'}`}>{opt.label}</span>
                                        {opt.badge && <span className="text-[10px] font-semibold text-white bg-[#1A78C2] px-2 py-0.5 rounded-full">{opt.badge}</span>}
                                    </div>
                                    <div className="text-xs text-[#6A8AA8] mt-0.5">{opt.sub}</div>
                                </div>
                                <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${active ? 'border-[#1A4A7A] bg-[#1A4A7A]' : 'border-[#C4DDEF] bg-white'}`}>
                                    {active && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l1.8 1.8L6.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </SectionCard>

            {/* ── M-Pesa STK Push ── */}
            {method === 'mpesa-stk' && (
                <SectionCard>
                    <h3 className="font-bold text-[#0D2A47] mb-4">Enter your M-Pesa number</h3>
                    <div className="flex gap-2 mb-4">
                        <div className="flex items-center px-3 bg-[#F5F8FC] border border-[#C4DDEF] rounded-xl text-xs text-[#4A6A8A] font-medium flex-shrink-0">🇰🇪 +254</div>
                        <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))} placeholder="7XX XXX XXX"
                            className="flex-1 px-4 py-3 bg-white border border-[#C4DDEF] rounded-xl text-[#0D2A47] placeholder:text-[#A8C0D4] focus:outline-none focus:ring-2 focus:ring-[#1A78C2] text-sm"
                        />
                    </div>

                    {/* STK status states */}
                    {stkStatus === 'waiting' && (
                        <div className="bg-[#FFF8E8] border border-[#F5D78A] rounded-xl p-4 flex items-start gap-3 mb-4">
                            <svg className="animate-spin w-5 h-5 text-[#B07A10] flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                            </svg>
                            <div>
                                <p className="text-sm font-semibold text-[#7A5A10]">Waiting for payment…</p>
                                <p className="text-xs text-[#9A7A30] mt-0.5">Check your phone and enter your M-Pesa PIN to confirm KES {total.toLocaleString()}.</p>
                            </div>
                        </div>
                    )}
                    {stkStatus === 'success' && (
                        <div className="bg-[#E8F5E8] border border-[#9AD49A] rounded-xl p-4 flex items-center gap-3 mb-4">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="#3A7A3A" /><path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            <p className="text-sm font-semibold text-[#2A5A2A]">Payment received ✓</p>
                        </div>
                    )}
                    {stkStatus === 'failed' && (
                        <div className="bg-[#FEF0F0] border border-[#F5AAAA] rounded-xl p-4 mb-4">
                            <p className="text-sm font-semibold text-red-700">Payment failed</p>
                            <p className="text-xs text-red-500 mt-0.5">{error}</p>
                        </div>
                    )}

                    {stkStatus === 'idle' || stkStatus === 'failed' ? (
                        <button type="button" onClick={handleStkPush} disabled={submitting || phone.length < 9}
                            className="w-full py-3.5 rounded-xl bg-[#1A4A7A] text-white font-semibold hover:bg-[#0D2A47] transition-all shadow-lg shadow-[#1A4A7A]/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            {submitting ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" /></svg> : null}
                            Pay KES {total.toLocaleString()} via M-Pesa
                        </button>
                    ) : null}
                </SectionCard>
            )}

            {/* ── M-Pesa Till ── */}
            {method === 'mpesa-till' && (
                <SectionCard>
                    <h3 className="font-bold text-[#0D2A47] mb-4">Pay via M-Pesa Till</h3>
                    <div className="bg-[#EEF6FF] border border-[#C4DDEF] rounded-xl p-4 mb-5 space-y-2">
                        <p className="text-xs text-[#6A8AA8]">Follow these steps:</p>
                        {[
                            'Go to M-Pesa on your phone',
                            'Select Lipa na M-Pesa → Buy Goods',
                            `Enter Till Number: ${TILL_NUMBER}`,
                            `Amount: KES ${total.toLocaleString()}`,
                            'Enter your M-Pesa PIN and confirm',
                        ].map((step, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-[#0D2A47]">
                                <span className="w-5 h-5 rounded-full bg-[#1A4A7A] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                                <span className={i === 2 ? 'font-bold text-[#1A4A7A]' : ''}>{step}</span>
                            </div>
                        ))}
                    </div>
                    <div className="text-center mb-5">
                        <div className="text-xs text-[#8AA8C0] mb-1">Till Number</div>
                        <div className="text-3xl font-black text-[#1A4A7A] tracking-widest">{TILL_NUMBER}</div>
                    </div>
                    <label className="block text-sm font-semibold text-[#2A4A6A] mb-1.5">Enter M-Pesa transaction code <span className="text-red-400">*</span></label>
                    <input value={transactionCode} onChange={e => setTransactionCode(e.target.value.toUpperCase())} placeholder="e.g. QWE1R2T3YU"
                        className="w-full px-4 py-3 bg-white border border-[#C4DDEF] rounded-xl text-[#0D2A47] placeholder:text-[#A8C0D4] focus:outline-none focus:ring-2 focus:ring-[#1A78C2] text-sm font-mono tracking-widest mb-4"
                    />
                    <button type="button" onClick={handleTillSubmit} disabled={submitting || !transactionCode.trim()}
                        className="w-full py-3.5 rounded-xl bg-[#1A4A7A] text-white font-semibold hover:bg-[#0D2A47] transition-all shadow-lg shadow-[#1A4A7A]/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        {submitting && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" /></svg>}
                        I have paid — confirm order
                    </button>
                </SectionCard>
            )}

            {/* ── Card ── */}
            {method === 'card' && (
                <SectionCard>
                    <h3 className="font-bold text-[#0D2A47] mb-1">Card details</h3>
                    <p className="text-xs text-[#8AA8C0] mb-4">Processed securely via Flutterwave. We never store your card.</p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#2A4A6A] mb-1.5">Card number</label>
                            <input value={cardNumber} onChange={e => setCardNumber(formatCard(e.target.value))} placeholder="1234 5678 9012 3456" maxLength={19}
                                className="w-full px-4 py-3 bg-white border border-[#C4DDEF] rounded-xl text-[#0D2A47] placeholder:text-[#A8C0D4] focus:outline-none focus:ring-2 focus:ring-[#1A78C2] text-sm font-mono tracking-widest"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-semibold text-[#2A4A6A] mb-1.5">Expiry</label>
                                <input value={cardExpiry} onChange={e => setCardExpiry(formatExpiry(e.target.value))} placeholder="MM/YY" maxLength={5}
                                    className="w-full px-4 py-3 bg-white border border-[#C4DDEF] rounded-xl text-[#0D2A47] placeholder:text-[#A8C0D4] focus:outline-none focus:ring-2 focus:ring-[#1A78C2] text-sm font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#2A4A6A] mb-1.5">CVV</label>
                                <input value={cardCvv} onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="•••" maxLength={4} type="password"
                                    className="w-full px-4 py-3 bg-white border border-[#C4DDEF] rounded-xl text-[#0D2A47] placeholder:text-[#A8C0D4] focus:outline-none focus:ring-2 focus:ring-[#1A78C2] text-sm font-mono"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#8AA8C0]">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="2" y="7" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" /><path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                            Secured by Flutterwave. Your card details are never stored.
                        </div>
                        <button type="button" onClick={handleCardSubmit} disabled={submitting || !cardNumber || !cardExpiry || !cardCvv}
                            className="w-full py-3.5 rounded-xl bg-[#1A4A7A] text-white font-semibold hover:bg-[#0D2A47] transition-all shadow-lg shadow-[#1A4A7A]/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            {submitting && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" /></svg>}
                            Pay KES {total.toLocaleString()}
                        </button>
                    </div>
                </SectionCard>
            )}

            {/* Global error */}
            {error && method !== 'mpesa-stk' && (
                <div className="bg-[#FEF0F0] border border-[#F5AAAA] rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
            )}

            {/* Back */}
            <button type="button" onClick={onBack}
                className="w-full py-3 rounded-xl border-2 border-[#D4E8F5] text-[#1A4A7A] font-semibold hover:bg-[#EEF6FF] transition-all">
                ← Back to delivery
            </button>
        </div>
    );
}