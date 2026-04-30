import { Link, router } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import Wizard from '@/components/OrderWizard/Wizard';

// ── Subscription modal constants ───────────────────────────────────
const BOTTLE_SIZES = [
    { id: '500ml', refillPrice: 15,  newPrice: 30  },
    { id: '1L',    refillPrice: 25,  newPrice: 50  },
    { id: '5L',    refillPrice: 80,  newPrice: 150 },
    { id: '10L',   refillPrice: 120, newPrice: 250 },
    { id: '15L',   refillPrice: 160, newPrice: 350 },
    { id: '20L',   refillPrice: 200, newPrice: 450 },
];

const FREQ_OPTIONS = [
    { id: 'daily',    label: 'Daily',    sub: 'Every day',       save: '5% off',  color: 'bg-[#1A3A5C]' },
    { id: 'weekly',   label: 'Weekly',   sub: 'Once a week',     save: '8% off',  color: 'bg-[#1A4A7A]' },
    { id: 'biweekly', label: 'Biweekly', sub: 'Every 2 weeks',   save: '10% off', color: 'bg-[#1A5A9A]' },
    { id: 'monthly',  label: 'Monthly',  sub: 'Once a month',    save: '15% off', color: 'bg-[#1A78C2]' },
] as const;

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const TIMES = ['06:00–08:00','08:00–10:00','10:00–12:00','12:00–14:00','14:00–16:00','16:00–18:00'];
const PAY_METHODS = [
    { id: 'mpesa-stk', label: 'M-Pesa Auto-Charge', sub: 'STK push before each delivery' },
    { id: 'card',      label: 'Card Auto-Billing',  sub: 'Visa / Mastercard recurring' },
];

type FreqId = 'daily' | 'weekly' | 'biweekly' | 'monthly';

interface SizeEntry { qty: number; type: 'refill' | 'new' }

// ── Step progress indicator ────────────────────────────────────────
function StepDots({ current, total }: { current: number; total: number }) {
    return (
        <div className="flex items-center gap-1.5">
            {Array.from({ length: total }, (_, i) => (
                <div key={i} className={`rounded-full transition-all duration-300 ${
                    i + 1 === current ? 'w-5 h-2 bg-[#1A78C2]' :
                    i + 1 < current   ? 'w-2 h-2 bg-[#1A4A7A]' :
                                        'w-2 h-2 bg-[#D4E8F5]'
                }`} />
            ))}
        </div>
    );
}

// ── Subscription modal ─────────────────────────────────────────────
function SubscriptionModal({ onClose }: { onClose: () => void }) {
    const [step, setStep]         = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone]         = useState(false);

    // Step 1 — personal details
    const [name,    setName]    = useState('');
    const [phone,   setPhone]   = useState('');
    const [email,   setEmail]   = useState('');
    const [address, setAddress] = useState('');

    // Step 2 — frequency + schedule
    const [freq,  setFreq]  = useState<FreqId>('weekly');
    const [days,  setDays]  = useState<string[]>([]);
    const [time,  setTime]  = useState('');

    // Step 3 — items
    const [sizes, setSizes] = useState<Record<string, SizeEntry>>({});

    // Step 4 — payment
    const [payMethod, setPayMethod] = useState('mpesa-stk');

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const toggleDay  = (d: string) => setDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);
    const toggleSize = (id: string) => setSizes(p => {
        const n = { ...p };
        if (n[id]) delete n[id]; else n[id] = { qty: 1, type: 'refill' };
        return n;
    });
    const patchSize = (id: string, patch: Partial<SizeEntry>) =>
        setSizes(p => ({ ...p, [id]: { ...p[id], ...patch } }));

    // Calculated per-cycle total
    const cycleTotal = Object.entries(sizes).reduce((acc, [id, entry]) => {
        const sz = BOTTLE_SIZES.find(s => s.id === id);
        if (!sz) return acc;
        const unit = entry.type === 'refill' ? sz.refillPrice : sz.newPrice;
        return acc + unit * entry.qty;
    }, 0) + (Object.keys(sizes).length > 0 ? 150 : 0); // + delivery fee

    // Validation per step
    const canStep1 = name.trim().length > 1 && phone.trim().length >= 9;
    const canStep2 = (freq === 'daily' || days.length > 0) && time !== '';
    const canStep3 = Object.keys(sizes).length > 0;
    const canStep4 = payMethod !== '';

    const handleSubmit = () => {
        setSubmitting(true);
        const payload = {
            // Personal
            name, phone, email, address,
            // Schedule
            frequency: freq,
            days,
            time_slot: time,
            // Items
            sizes: Object.entries(sizes).map(([id, entry]) => ({
                size: id, quantity: entry.qty, type: entry.type,
            })),
            // Payment
            payment_method: payMethod,
            // Totals
            total_per_cycle: cycleTotal,
        };

        router.post('/subscriptions', payload, {
            onSuccess: () => { setDone(true); setSubmitting(false); },
            onError:   () => setSubmitting(false),
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

                {/* ── Header ── */}
                <div className="bg-[#0D2A47] px-6 pt-6 pb-5 flex-shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                    <path d="M8 1C8 1 3 6.5 3 10a5 5 0 0010 0C13 6.5 8 1 8 1z" fill="#1A4A7A"/>
                                </svg>
                            </div>
                            <span className="font-bold text-white text-sm tracking-tight">bhebha</span>
                        </div>
                        <button onClick={onClose}
                            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 transition-colors">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                            </svg>
                        </button>
                    </div>

                    {!done && (
                        <>
                            <h2 className="text-white font-extrabold text-xl leading-tight mb-1">
                                {step === 1 && 'Your details'}
                                {step === 2 && 'Delivery schedule'}
                                {step === 3 && 'What do you need?'}
                                {step === 4 && 'Payment method'}
                            </h2>
                            <p className="text-[#8AB8D8] text-xs mb-4">
                                {step === 1 && "No account needed — just your name and phone number"}
                                {step === 2 && "Choose how often you want water delivered"}
                                {step === 3 && "Pick your bottle sizes and quantities per delivery"}
                                {step === 4 && "How we'll charge you each cycle"}
                            </p>
                            <div className="flex items-center justify-between">
                                <StepDots current={step} total={4} />
                                <span className="text-[10px] text-[#7AB8E0] font-medium">Step {step} of 4</span>
                            </div>
                        </>
                    )}
                </div>

                {/* ── Body ── */}
                <div className="overflow-y-auto flex-1 p-6">

                    {/* ── Done state ── */}
                    {done && (
                        <div className="text-center py-8 space-y-4">
                            <div className="w-16 h-16 bg-[#E8F5E8] rounded-full flex items-center justify-center mx-auto">
                                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                                    <path d="M6 14l6 6L22 8" stroke="#3A7A3A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-[#0D2A47]">Subscription confirmed!</h3>
                                <p className="text-[#6A8AA8] text-sm mt-2 max-w-xs mx-auto">
                                    We'll reach out to {name.split(' ')[0]} on <span className="font-semibold text-[#1A4A7A]">+254{phone}</span> to confirm your first delivery details.
                                </p>
                            </div>
                            <div className="bg-[#EEF6FF] border border-[#C4DDEF] rounded-2xl p-4 text-sm text-left space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-[#8AA8C0]">Frequency</span>
                                    <span className="font-semibold text-[#0D2A47]">{FREQ_OPTIONS.find(f => f.id === freq)?.label}</span>
                                </div>
                                {days.length > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-[#8AA8C0]">Days</span>
                                        <span className="font-semibold text-[#0D2A47]">{days.map(d => d.slice(0,3)).join(', ')}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-[#8AA8C0]">Time slot</span>
                                    <span className="font-semibold text-[#0D2A47]">{time}</span>
                                </div>
                                <div className="flex justify-between border-t border-[#D4E8F5] pt-2 mt-2">
                                    <span className="text-[#8AA8C0]">Per cycle</span>
                                    <span className="font-black text-[#1A4A7A]">KES {cycleTotal.toLocaleString()}</span>
                                </div>
                            </div>
                            <button onClick={onClose}
                                className="w-full py-3.5 rounded-xl bg-[#1A4A7A] text-white font-semibold hover:bg-[#0D2A47] transition-all">
                                Done
                            </button>
                        </div>
                    )}

                    {/* ── Step 1: Personal details ── */}
                    {!done && step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-[#2A4A6A] mb-1.5">
                                    Full name <span className="text-red-400">*</span>
                                </label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)}
                                    placeholder="e.g. Jane Wanjiru"
                                    className="w-full px-4 py-3 bg-[#F5F8FC] border border-[#C4DDEF] rounded-xl text-[#0D2A47] placeholder:text-[#A8C0D4] focus:outline-none focus:ring-2 focus:ring-[#1A78C2] focus:bg-white transition-all text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#2A4A6A] mb-1.5">
                                    Phone number <span className="text-red-400">*</span>
                                    <span className="font-normal text-[#8AA8C0] ml-1">— for M-Pesa & SMS</span>
                                </label>
                                <div className="flex gap-2">
                                    <div className="flex items-center px-3 bg-[#F5F8FC] border border-[#C4DDEF] rounded-xl text-xs text-[#4A6A8A] font-semibold flex-shrink-0">
                                        🇰🇪 +254
                                    </div>
                                    <input type="tel" value={phone}
                                        onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                                        placeholder="7XX XXX XXX"
                                        className="flex-1 px-4 py-3 bg-[#F5F8FC] border border-[#C4DDEF] rounded-xl text-[#0D2A47] placeholder:text-[#A8C0D4] focus:outline-none focus:ring-2 focus:ring-[#1A78C2] focus:bg-white transition-all text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#2A4A6A] mb-1.5">
                                    Email address
                                    <span className="font-normal text-[#8AA8C0] ml-1">— optional, for confirmation</span>
                                </label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                    placeholder="jane@example.com"
                                    className="w-full px-4 py-3 bg-[#F5F8FC] border border-[#C4DDEF] rounded-xl text-[#0D2A47] placeholder:text-[#A8C0D4] focus:outline-none focus:ring-2 focus:ring-[#1A78C2] focus:bg-white transition-all text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#2A4A6A] mb-1.5">
                                    Delivery address
                                    <span className="font-normal text-[#8AA8C0] ml-1">— optional for now</span>
                                </label>
                                <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                                    placeholder="e.g. Westlands, Nairobi"
                                    className="w-full px-4 py-3 bg-[#F5F8FC] border border-[#C4DDEF] rounded-xl text-[#0D2A47] placeholder:text-[#A8C0D4] focus:outline-none focus:ring-2 focus:ring-[#1A78C2] focus:bg-white transition-all text-sm"
                                />
                            </div>
                            <p className="text-xs text-[#8AA8C0] bg-[#F5F8FC] rounded-xl px-3 py-2.5">
                                🔒 Your details are used only for delivery and billing. We never share them.
                            </p>
                        </div>
                    )}

                    {/* ── Step 2: Frequency + schedule ── */}
                    {!done && step === 2 && (
                        <div className="space-y-5">
                            {/* Frequency cards */}
                            <div>
                                <p className="text-xs font-bold text-[#2A4A6A] mb-2.5">How often?</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {FREQ_OPTIONS.map(f => (
                                        <button key={f.id} type="button"
                                            onClick={() => { setFreq(f.id); setDays([]); }}
                                            className={`relative rounded-2xl border-2 p-4 text-left transition-all ${
                                                freq === f.id ? 'border-[#1A4A7A] bg-[#EEF6FF]' : 'border-[#D4E8F5] hover:border-[#9ECBE8]'
                                            }`}>
                                            <div className={`absolute top-2.5 right-2.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white ${f.color}`}>
                                                {f.save}
                                            </div>
                                            <div className="font-bold text-[#0D2A47] text-sm mt-1">{f.label}</div>
                                            <div className="text-xs text-[#6A8AA8] mt-0.5">{f.sub}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Day picker — not for daily */}
                            {freq !== 'daily' && (
                                <div>
                                    <p className="text-xs font-bold text-[#2A4A6A] mb-2.5">
                                        Which day{freq !== 'weekly' ? 's' : ''}?
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {DAYS.map(d => (
                                            <button key={d} type="button" onClick={() => toggleDay(d)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                                                    days.includes(d)
                                                        ? 'bg-[#1A4A7A] border-[#1A4A7A] text-white'
                                                        : 'bg-white border-[#D4E8F5] text-[#4A6A8A] hover:border-[#1A4A7A]'
                                                }`}>
                                                {d.slice(0, 3)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Time slot */}
                            <div>
                                <p className="text-xs font-bold text-[#2A4A6A] mb-2.5">Preferred time slot</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {TIMES.map(t => (
                                        <button key={t} type="button" onClick={() => setTime(t)}
                                            className={`py-2.5 px-1 rounded-xl border-2 text-xs font-medium text-center transition-all ${
                                                time === t
                                                    ? 'bg-[#1A4A7A] border-[#1A4A7A] text-white'
                                                    : 'bg-white border-[#D4E8F5] text-[#4A6A8A] hover:border-[#9ECBE8]'
                                            }`}>
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Step 3: Items ── */}
                    {!done && step === 3 && (
                        <div className="space-y-4">
                            <p className="text-xs font-bold text-[#2A4A6A]">Select sizes for each delivery</p>

                            {/* Size toggle grid */}
                            <div className="grid grid-cols-3 gap-2">
                                {BOTTLE_SIZES.map(s => (
                                    <button key={s.id} type="button" onClick={() => toggleSize(s.id)}
                                        className={`rounded-xl border-2 p-3 text-left transition-all ${
                                            sizes[s.id] ? 'border-[#1A4A7A] bg-[#EEF6FF]' : 'border-[#D4E8F5] hover:border-[#9ECBE8]'
                                        }`}>
                                        {sizes[s.id] && (
                                            <span className="block w-3.5 h-3.5 bg-[#1A4A7A] rounded-full mb-1 flex items-center justify-center">
                                                <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                                                    <path d="M1 3.5l1.8 1.8L6 1.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            </span>
                                        )}
                                        <div className="font-bold text-[#0D2A47] text-sm">{s.id}</div>
                                        <div className="text-[10px] text-[#8AA8C0]">from KES {s.refillPrice}</div>
                                    </button>
                                ))}
                            </div>

                            {/* Per-size config */}
                            {Object.keys(sizes).length > 0 && (
                                <div className="space-y-2">
                                    {BOTTLE_SIZES.filter(s => sizes[s.id]).map(s => {
                                        const entry = sizes[s.id];
                                        const unit  = entry.type === 'refill' ? s.refillPrice : s.newPrice;
                                        return (
                                            <div key={s.id} className="flex items-center gap-3 bg-[#F5F8FC] rounded-xl px-4 py-3 border border-[#D4E8F5]">
                                                <span className="font-bold text-[#0D2A47] text-sm w-10 flex-shrink-0">{s.id}</span>

                                                {/* Refill / New toggle */}
                                                <div className="flex gap-1 flex-shrink-0">
                                                    {(['refill','new'] as const).map(t => (
                                                        <button key={t} type="button" onClick={() => patchSize(s.id, { type: t })}
                                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                                                                entry.type === t
                                                                    ? 'bg-[#1A4A7A] border-[#1A4A7A] text-white'
                                                                    : 'bg-white border-[#D4E8F5] text-[#4A6A8A] hover:border-[#1A4A7A]'
                                                            }`}>
                                                            {t === 'refill' ? 'Refill' : 'New'}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Qty stepper */}
                                                <div className="flex items-center gap-2 ml-auto">
                                                    <button type="button"
                                                        onClick={() => patchSize(s.id, { qty: Math.max(1, entry.qty - 1) })}
                                                        className="w-7 h-7 rounded-lg bg-[#DDEEFF] text-[#1A4A7A] font-bold flex items-center justify-center hover:bg-[#C4DDEF] text-sm">−</button>
                                                    <span className="w-5 text-center font-bold text-[#0D2A47] text-sm">{entry.qty}</span>
                                                    <button type="button"
                                                        onClick={() => patchSize(s.id, { qty: entry.qty + 1 })}
                                                        className="w-7 h-7 rounded-lg bg-[#DDEEFF] text-[#1A4A7A] font-bold flex items-center justify-center hover:bg-[#C4DDEF] text-sm">+</button>
                                                </div>

                                                {/* Line total */}
                                                <span className="text-xs font-bold text-[#1A78C2] flex-shrink-0 w-16 text-right">
                                                    KES {(unit * entry.qty).toLocaleString()}
                                                </span>
                                            </div>
                                        );
                                    })}

                                    {/* Cycle total */}
                                    <div className="flex justify-between items-center pt-2 px-1">
                                        <span className="text-xs text-[#8AA8C0]">Delivery fee per cycle</span>
                                        <span className="text-xs text-[#8AA8C0]">KES 150</span>
                                    </div>
                                    <div className="flex justify-between items-center border-t border-[#D4E8F5] pt-2 px-1">
                                        <span className="text-sm font-bold text-[#0D2A47]">Total per cycle</span>
                                        <span className="text-base font-black text-[#1A4A7A]">KES {cycleTotal.toLocaleString()}</span>
                                    </div>
                                </div>
                            )}

                            {Object.keys(sizes).length === 0 && (
                                <p className="text-center text-xs text-[#8AA8C0] py-4">
                                    Tap the sizes above to add them to your subscription
                                </p>
                            )}
                        </div>
                    )}

                    {/* ── Step 4: Payment + summary ── */}
                    {!done && step === 4 && (
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs font-bold text-[#2A4A6A] mb-2.5">Auto-billing method</p>
                                {PAY_METHODS.map(p => (
                                    <button key={p.id} type="button" onClick={() => setPayMethod(p.id)}
                                        className={`w-full flex items-start justify-between rounded-xl border-2 px-4 py-3.5 text-left transition-all mb-2 ${
                                            payMethod === p.id ? 'border-[#1A4A7A] bg-[#EEF6FF]' : 'border-[#D4E8F5] hover:border-[#9ECBE8]'
                                        }`}>
                                        <div>
                                            <div className={`text-sm font-semibold ${payMethod === p.id ? 'text-[#1A4A7A]' : 'text-[#0D2A47]'}`}>{p.label}</div>
                                            <div className="text-xs text-[#6A8AA8] mt-0.5">{p.sub}</div>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                                            payMethod === p.id ? 'border-[#1A4A7A] bg-[#1A4A7A]' : 'border-[#C4DDEF]'
                                        }`}>
                                            {payMethod === p.id && (
                                                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                                    <path d="M1.5 4l1.8 1.8L6.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Full summary before submit */}
                            <div className="bg-[#F5F8FC] border border-[#D4E8F5] rounded-2xl p-4 space-y-2.5 text-sm">
                                <p className="text-[10px] font-bold text-[#8AA8C0] uppercase tracking-wider mb-3">Subscription summary</p>

                                <div className="flex justify-between">
                                    <span className="text-[#8AA8C0]">Name</span>
                                    <span className="font-medium text-[#0D2A47]">{name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#8AA8C0]">Phone</span>
                                    <span className="font-medium text-[#0D2A47]">+254{phone}</span>
                                </div>
                                {email && (
                                    <div className="flex justify-between">
                                        <span className="text-[#8AA8C0]">Email</span>
                                        <span className="font-medium text-[#0D2A47] truncate ml-4 max-w-[55%]">{email}</span>
                                    </div>
                                )}
                                {address && (
                                    <div className="flex justify-between">
                                        <span className="text-[#8AA8C0]">Area</span>
                                        <span className="font-medium text-[#0D2A47]">{address}</span>
                                    </div>
                                )}
                                <div className="border-t border-[#D4E8F5] pt-2.5 mt-1" />
                                <div className="flex justify-between">
                                    <span className="text-[#8AA8C0]">Frequency</span>
                                    <span className="font-medium text-[#0D2A47]">{FREQ_OPTIONS.find(f => f.id === freq)?.label}</span>
                                </div>
                                {days.length > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-[#8AA8C0]">Days</span>
                                        <span className="font-medium text-[#0D2A47]">{days.map(d => d.slice(0,3)).join(', ')}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-[#8AA8C0]">Time slot</span>
                                    <span className="font-medium text-[#0D2A47]">{time}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#8AA8C0]">Items</span>
                                    <span className="font-medium text-[#0D2A47]">{Object.keys(sizes).length} size{Object.keys(sizes).length !== 1 ? 's' : ''}</span>
                                </div>
                                <div className="border-t border-[#D4E8F5] pt-2.5 mt-1 flex justify-between font-bold">
                                    <span className="text-[#0D2A47]">Per cycle</span>
                                    <span className="text-[#1A4A7A] text-base">KES {cycleTotal.toLocaleString()}</span>
                                </div>
                            </div>

                            <p className="text-[11px] text-[#8AA8C0] text-center leading-relaxed">
                                You'll receive an SMS on +254{phone} before every charge. Cancel anytime.
                            </p>
                        </div>
                    )}
                </div>

                {/* ── Footer nav ── */}
                {!done && (
                    <div className="border-t border-[#D4E8F5] px-6 py-4 flex gap-3 flex-shrink-0 bg-white">
                        <button type="button"
                            onClick={step === 1 ? onClose : () => setStep(s => s - 1)}
                            className="flex-1 py-3 rounded-xl border-2 border-[#D4E8F5] text-[#4A6A8A] text-sm font-semibold hover:bg-[#F5F8FC] transition-all">
                            {step === 1 ? 'Cancel' : '← Back'}
                        </button>
                        {step < 4 ? (
                            <button type="button"
                                onClick={() => setStep(s => s + 1)}
                                disabled={step === 1 ? !canStep1 : step === 2 ? !canStep2 : !canStep3}
                                className="flex-[2] py-3 rounded-xl bg-[#1A4A7A] text-white text-sm font-semibold hover:bg-[#0D2A47] transition-all shadow-lg shadow-[#1A4A7A]/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none">
                                Continue →
                            </button>
                        ) : (
                            <button type="button" onClick={handleSubmit}
                                disabled={!canStep4 || submitting}
                                className="flex-[2] py-3 rounded-xl bg-[#1A4A7A] text-white text-sm font-semibold hover:bg-[#0D2A47] transition-all shadow-lg shadow-[#1A4A7A]/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                {submitting ? (
                                    <>
                                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                                        </svg>
                                        Confirming…
                                    </>
                                ) : 'Confirm subscription'}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main welcome page ──────────────────────────────────────────────
export default function Welcome() {
    const [scrolled, setScrolled]   = useState(false);
    const [orderOpen, setOrderOpen] = useState(false);
    const [subOpen, setSubOpen]     = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div className="min-h-screen bg-[#F5F3EE] font-sans">

            {/* NAV */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}>
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#1A4A7A] flex items-center justify-center">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M8 1C8 1 3 6.5 3 10a5 5 0 0010 0C13 6.5 8 1 8 1z" fill="white"/>
                            </svg>
                        </div>
                        <span className="text-xl font-bold tracking-tight text-[#0D2A47]">bhebha</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#3A5A7C]">
                        <a href="#how-it-works" className="hover:text-[#1A4A7A] transition-colors">How it works</a>
                        <a href="#pricing" className="hover:text-[#1A4A7A] transition-colors">Pricing</a>
                        <a href="#subscriptions" className="hover:text-[#1A4A7A] transition-colors">Subscribe</a>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/login" className="text-sm font-medium text-[#3A5A7C] hover:text-[#1A4A7A] transition-colors">Sign in</Link>
                        <Link href="/register" className="text-sm font-semibold bg-[#1A4A7A] text-white px-4 py-2 rounded-full hover:bg-[#0D2A47] transition-colors">
                            Get started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* HERO */}
            <section className="relative min-h-screen flex items-center overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-[-80px] right-[-120px] w-[600px] h-[600px] rounded-full bg-[#DDEEFF] opacity-60 blur-3xl"/>
                    <div className="absolute bottom-[-60px] left-[-80px] w-[400px] h-[400px] rounded-full bg-[#C8E0F5] opacity-40 blur-3xl"/>
                    <div className="absolute top-[40%] left-[35%] w-[300px] h-[300px] rounded-full bg-[#EBF5FB] opacity-50 blur-2xl"/>
                </div>

                <div className="relative max-w-6xl mx-auto px-6 pt-28 pb-16 grid md:grid-cols-2 gap-16 items-center">
                    <div>
                        <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#1A78C2] bg-[#DDEEFF] px-3 py-1 rounded-full mb-6">
                            Water delivery · Machakos
                        </span>
                        <h1 className="text-5xl md:text-6xl font-extrabold leading-[1.1] text-[#0D2A47] mb-6">
                            Thirst Meets<br/>
                            <span className="text-[#1A78C2]">Speed.</span>
                        </h1>
                        <p className="text-lg text-[#4A6A8A] leading-relaxed mb-10 max-w-md">
                            Refillable or brand new bottles — delivered to your door in hours. Choose your size, set your schedule, pay your way.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <button onClick={() => setOrderOpen(true)}
                                className="inline-flex bg-[#1A78C2] items-center gap-2 text-white font-semibold text-base px-7 py-3.5 rounded-full hover:bg-[#1A4A7A] transition-all shadow-lg shadow-[#1A4A7A]/20">
                                Order Now
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                            <a href="#how-it-works"
                                className="inline-flex items-center gap-2 border border-[#B8D4EC] text-[#1A4A7A] font-semibold text-base px-7 py-3.5 rounded-full hover:bg-white transition-all">
                                See how it works
                            </a>
                        </div>

                        {/* Trust badges */}
                        <div className="flex items-center gap-6 mt-10 pt-10 border-t border-[#D4E8F5]">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-[#0D2A47]">2h</div>
                                <div className="text-xs text-[#6A8AA8] mt-0.5">Avg. delivery</div>
                            </div>
                            <div className="w-px h-10 bg-[#D4E8F5]"/>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-[#0D2A47]">6 sizes</div>
                                <div className="text-xs text-[#6A8AA8] mt-0.5">500ml → 20L</div>
                            </div>
                            <div className="w-px h-10 bg-[#D4E8F5]"/>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-[#0D2A47]">M-Pesa</div>
                                <div className="text-xs text-[#6A8AA8] mt-0.5">& card accepted</div>
                            </div>
                        </div>
                    </div>

                    {/* Right card */}
                    <div className="relative flex justify-center">
                        <div className="relative w-72">
                            <div className="absolute top-4 left-4 w-full h-full bg-[#C8E0F5] rounded-3xl rotate-3"/>
                            <div className="relative bg-white rounded-3xl p-6 shadow-2xl shadow-[#1A4A7A]/10">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-xs font-semibold text-[#1A78C2] bg-[#DDEEFF] px-2 py-0.5 rounded-full">Instant delivery</span>
                                    <span className="text-xs text-[#6A8AA8]">Now available</span>
                                </div>
                                <div className="flex justify-center py-6">
                                    <svg width="80" height="140" viewBox="0 0 80 140" fill="none">
                                        <rect x="28" y="0" width="24" height="14" rx="4" fill="#B8D4EC"/>
                                        <rect x="24" y="12" width="32" height="6" rx="3" fill="#9EC8E8"/>
                                        <rect x="10" y="18" width="60" height="100" rx="12" fill="#DDEEFF"/>
                                        <rect x="10" y="18" width="60" height="30" rx="12" fill="#C8E0F5"/>
                                        <rect x="18" y="30" width="10" height="60" rx="5" fill="white" opacity="0.5"/>
                                        <ellipse cx="40" cy="118" rx="30" ry="8" fill="#C8E0F5" opacity="0.5"/>
                                    </svg>
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-[#0D2A47] text-lg">20L Refillable</p>
                                    <p className="text-[#6A8AA8] text-sm">KES 200 · 2 hr delivery</p>
                                </div>
                                <div className="mt-4 flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-[#DDEEFF] rounded-full overflow-hidden">
                                        <div className="h-full w-3/4 bg-[#1A78C2] rounded-full"/>
                                    </div>
                                    <span className="text-xs text-[#6A8AA8]">3 left</span>
                                </div>
                                <div className="mt-4 flex items-center gap-2 text-xs text-[#3A7A3A] bg-[#E8F5E8] px-3 py-2 rounded-xl">
                                    <span className="w-1.5 h-1.5 bg-[#3A7A3A] rounded-full animate-pulse"/>
                                    Order #247 out for delivery
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-[#8AA8C0] animate-bounce">
                    <span className="text-xs tracking-widest uppercase">Scroll</span>
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                        <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section id="how-it-works" className="py-24 bg-white">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <span className="text-xs font-semibold tracking-widest uppercase text-[#1A78C2]">Simple process</span>
                        <h2 className="text-4xl font-extrabold text-[#0D2A47] mt-3">Order in 3 steps</h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { step: '01', title: 'Choose your water', desc: 'Pick refillable or brand new bottles. Select your sizes and quantities — no limits.', icon: <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 3C14 3 7 10 7 16a7 7 0 0014 0C21 10 14 3 14 3z" stroke="#1A78C2" strokeWidth="2" strokeLinejoin="round"/><path d="M10 17a4 4 0 008 0" stroke="#1A78C2" strokeWidth="1.5" strokeLinecap="round"/></svg> },
                            { step: '02', title: 'Set your location', desc: 'Pin your delivery spot on the map — or order for someone else anywhere in the city.', icon: <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="12" r="4" stroke="#1A78C2" strokeWidth="2"/><path d="M14 4C9.58 4 6 7.58 6 12c0 6 8 16 8 16s8-10 8-16c0-4.42-3.58-8-8-8z" stroke="#1A78C2" strokeWidth="2" strokeLinejoin="round"/></svg> },
                            { step: '03', title: 'Pay & relax', desc: 'M-Pesa STK push, till number, or card. Instant SMS confirmation the moment it goes through.', icon: <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="4" y="8" width="20" height="14" rx="3" stroke="#1A78C2" strokeWidth="2"/><path d="M4 13h20" stroke="#1A78C2" strokeWidth="2"/><circle cx="9" cy="18" r="1.5" fill="#1A78C2"/></svg> },
                        ].map(item => (
                            <div key={item.step} className="relative bg-[#F5F8FC] rounded-2xl p-7 hover:shadow-md transition-shadow">
                                <span className="absolute top-6 right-6 text-4xl font-black text-[#DDEEFF] select-none">{item.step}</span>
                                <div className="w-12 h-12 bg-[#DDEEFF] rounded-xl flex items-center justify-center mb-4">{item.icon}</div>
                                <h3 className="font-bold text-[#0D2A47] text-lg mb-2">{item.title}</h3>
                                <p className="text-[#5A7A9A] text-sm leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* PRICING */}
            <section id="pricing" className="py-24 bg-[#F5F3EE]">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <span className="text-xs font-semibold tracking-widest uppercase text-[#1A78C2]">Flexible sizing</span>
                        <h2 className="text-4xl font-extrabold text-[#0D2A47] mt-3">Every size, your price</h2>
                        <p className="text-[#5A7A9A] mt-3 max-w-md mx-auto">From a quick 500ml to a full 20L for the whole family. Refill or brand new — you decide.</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                            { size: '500ml', refill: 'KES 15',  new: 'KES 30'  },
                            { size: '1L',    refill: 'KES 25',  new: 'KES 50'  },
                            { size: '5L',    refill: 'KES 80',  new: 'KES 150' },
                            { size: '10L',   refill: 'KES 120', new: 'KES 250' },
                            { size: '15L',   refill: 'KES 160', new: 'KES 350' },
                            { size: '20L',   refill: 'KES 200', new: 'KES 450', popular: true },
                        ].map(item => (
                            <div key={item.size} className={`bg-white rounded-2xl p-5 relative ${item.popular ? 'ring-2 ring-[#1A78C2]' : ''}`}>
                                {item.popular && (
                                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs font-semibold text-white bg-[#1A78C2] px-3 py-0.5 rounded-full whitespace-nowrap">Most popular</span>
                                )}
                                <div className="text-2xl font-black text-[#0D2A47] mb-3">{item.size}</div>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-sm"><span className="text-[#6A8AA8]">Refill</span><span className="font-semibold text-[#1A4A7A]">{item.refill}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-[#6A8AA8]">Brand new</span><span className="font-semibold text-[#1A4A7A]">{item.new}</span></div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="text-center mt-8">
                        <button onClick={() => setOrderOpen(true)}
                            className="inline-flex items-center gap-2 bg-[#1A4A7A] text-white font-semibold px-8 py-3.5 rounded-full hover:bg-[#0D2A47] transition-all shadow-lg shadow-[#1A4A7A]/20">
                            Start your order
                        </button>
                    </div>
                </div>
            </section>

            {/* SUBSCRIPTIONS — now with inline form trigger */}
            <section id="subscriptions" className="py-24 bg-[#0D2A47]">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <span className="text-xs font-semibold tracking-widest uppercase text-[#7AB8E0]">Never run out</span>
                            <h2 className="text-4xl font-extrabold text-white mt-3 mb-5">Subscribe & save</h2>
                            <p className="text-[#8AB8D8] leading-relaxed mb-8">
                                Set a daily, weekly, biweekly, or monthly schedule. We auto-bill via M-Pesa or card and notify you before every charge. <span className="text-white font-semibold">No account needed</span> — just your name and phone.
                            </p>
                            <ul className="space-y-3 mb-8">
                                {['Automated M-Pesa billing', 'SMS before every delivery', 'Pause or cancel anytime', 'Priority scheduling'].map(f => (
                                    <li key={f} className="flex items-center gap-3 text-[#A8C8E8]">
                                        <span className="w-5 h-5 bg-[#1A78C2] rounded-full flex items-center justify-center flex-shrink-0">
                                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                                <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </span>
                                        <span className="text-sm">{f}</span>
                                    </li>
                                ))}
                            </ul>
                            {/* CTA — opens modal */}
                            <button onClick={() => setSubOpen(true)}
                                className="inline-flex items-center gap-2 bg-white text-[#0D2A47] font-bold px-7 py-3.5 rounded-full hover:bg-[#F5F3EE] transition-all shadow-xl">
                                Set up my subscription
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                        </div>

                        {/* Frequency cards — now clickable */}
                        <div className="grid grid-cols-2 gap-4">
                            {FREQ_OPTIONS.map(s => (
                                <button key={s.id} type="button" onClick={() => setSubOpen(true)}
                                    className={`${s.color} rounded-2xl p-5 text-left hover:opacity-90 transition-opacity cursor-pointer`}>
                                    <div className="text-white font-bold text-lg mb-1">{s.label}</div>
                                    <div className="text-[#7AB8E0] text-sm mb-3">{s.save}</div>
                                    <div className="text-[10px] text-[#7AB8E0]/70 font-medium">Click to subscribe →</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA FOOTER */}
            <section className="py-20 bg-white text-center">
                <div className="max-w-xl mx-auto px-6">
                    <h2 className="text-3xl font-extrabold text-[#0D2A47] mb-4">Ready for your first delivery?</h2>
                    <p className="text-[#5A7A9A] mb-8">Join thousands of households in Machakos who've switched to Bhebha.</p>
                    <button onClick={() => setOrderOpen(true)}
                        className="inline-flex items-center gap-2 bg-[#1A4A7A] text-white font-semibold text-lg px-10 py-4 rounded-full hover:bg-[#0D2A47] transition-all shadow-xl shadow-[#1A4A7A]/20">
                        Order Now — it's fast
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="bg-[#F5F3EE] border-t border-[#D4E8F5] py-10">
                <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#1A4A7A] flex items-center justify-center">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                <path d="M8 1C8 1 3 6.5 3 10a5 5 0 0010 0C13 6.5 8 1 8 1z" fill="white"/>
                            </svg>
                        </div>
                        <span className="font-bold text-[#0D2A47]">bhebha</span>
                    </div>
                    <p className="text-sm text-[#6A8AA8]">© {new Date().getFullYear()} Bhebha. Machakos, Kenya.</p>
                    <div className="flex gap-6 text-sm text-[#6A8AA8]">
                        <a href="#" className="hover:text-[#1A4A7A]">Privacy</a>
                        <a href="#" className="hover:text-[#1A4A7A]">Terms</a>
                        <a href="#" className="hover:text-[#1A4A7A]">Contact</a>
                    </div>
                </div>
            </footer>

            {/* Modals */}
            {orderOpen && <Wizard onClose={() => setOrderOpen(false)} />}
            {subOpen   && <SubscriptionModal onClose={() => setSubOpen(false)} />}
        </div>
    );
}