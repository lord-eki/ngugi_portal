import { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';

//  Pricing config 
const BOTTLE_SIZES = [
    { id: '500ml', label: '500ml', refillPrice: 15,  newPrice: 30,  hasBundle: true  },
    { id: '1L',    label: '1L',    refillPrice: 25,  newPrice: 50,  hasBundle: true  },
    { id: '5L',    label: '5L',    refillPrice: 80,  newPrice: 150, hasBundle: false },
    { id: '10L',   label: '10L',   refillPrice: 120, newPrice: 250, hasBundle: false },
    { id: '15L',   label: '15L',   refillPrice: 160, newPrice: 350, hasBundle: false },
    { id: '20L',   label: '20L',   refillPrice: 200, newPrice: 450, hasBundle: false },
];

const BUNDLE_OPTIONS: Record<string, number[]> = {
    '500ml': [6, 12, 24],
    '1L':    [6, 12],
};

const DELIVERY_FEE    = 150;
const INSTANT_FEE_ADD = 200;

type WaterType = 'refill' | 'new';

interface SizeEntry {
    qty: number;
    isBundle: boolean;
    bundleQty: number;
    bundleSize: number;
}

type SizeMap = Record<string, SizeEntry>;

//  Sub-components 

function StepBadge({ n, active }: { n: number; active: boolean }) {
    return (
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
            active ? 'bg-[#1A4A7A] text-white' : 'bg-[#D4E8F5] text-[#6A8AA8]'
        }`}>{n}</div>
    );
}

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`bg-white rounded-2xl border border-[#D4E8F5] p-6 ${className}`}>
            {children}
        </div>
    );
}

function QtyButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-8 h-8 rounded-lg bg-[#DDEEFF] text-[#1A4A7A] font-bold flex items-center justify-center hover:bg-[#C4DDEF] transition-colors text-sm"
        >
            {children}
        </button>
    );
}

//  Main component 

export default function StepOrder({onNext, setData, data}) {
    const [selectedTypes, setSelectedTypes] = useState<Set<WaterType>>(new Set());

    const [refillSizes, setRefillSizes] = useState<SizeMap>({});
    const [newSizes,    setNewSizes]    = useState<SizeMap>({});

    const [deliveryType, setDeliveryType] = useState<'standard' | 'instant'>('standard');

    const toggleType = (type: WaterType) => {
        setSelectedTypes(prev => {
            const next = new Set(prev);
            if (next.has(type)) {
                next.delete(type);
                if (type === 'refill') setRefillSizes({});
                if (type === 'new')    setNewSizes({});
            } else {
                next.add(type);
            }
            return next;
        });
    };

    const getMap    = (t: WaterType) => t === 'refill' ? refillSizes : newSizes;
    const setMap    = (t: WaterType) => t === 'refill' ? setRefillSizes : setNewSizes;

    const toggleSize = (type: WaterType, sizeId: string) => {
        const map = { ...getMap(type) };
        if (map[sizeId]) {
            delete map[sizeId];
        } else {
            map[sizeId] = { qty: 1, isBundle: false, bundleQty: 1, bundleSize: BUNDLE_OPTIONS[sizeId]?.[0] ?? 0 };
        }
        setMap(type)(map);
    };

    const updateEntry = (type: WaterType, sizeId: string, patch: Partial<SizeEntry>) => {
        setMap(type)(prev => ({ ...prev, [sizeId]: { ...prev[sizeId], ...patch } }));
    };

    const adjustQty = (type: WaterType, sizeId: string, delta: number) => {
        const current = getMap(type)[sizeId]?.qty ?? 1;
        const next = Math.max(1, current + delta);
        updateEntry(type, sizeId, { qty: next });
    };

    const adjustBundleQty = (type: WaterType, sizeId: string, delta: number) => {
        const current = getMap(type)[sizeId]?.bundleQty ?? 1;
        const next = Math.max(1, current + delta);
        updateEntry(type, sizeId, { bundleQty: next });
    };

    // ── Price calculation ──
    const lineTotal = (entry: SizeEntry, size: typeof BOTTLE_SIZES[0], type: WaterType): number => {
        const unitPrice = type === 'refill' ? size.refillPrice : size.newPrice;
        if (type === 'new' && size.hasBundle && entry.isBundle) {
            return entry.bundleSize * entry.bundleQty * unitPrice;
        }
        return entry.qty * unitPrice;
    };

    const { subtotal, grandTotal, lineItems } = useMemo(() => {
        const items: { label: string; amount: number }[] = [];
        let sub = 0;

        const processMap = (map: SizeMap, type: WaterType) => {
            BOTTLE_SIZES.forEach(size => {
                const entry = map[size.id];
                if (!entry) return;
                const amount = lineTotal(entry, size, type);
                const label = type === 'refill'
                    ? `Refill ${size.label}`
                    : entry.isBundle
                        ? `New ${size.label} × bundle of ${entry.bundleSize} × ${entry.bundleQty}`
                        : `New ${size.label}`;
                items.push({ label, amount });
                sub += amount;
            });
        };

        if (selectedTypes.has('refill')) processMap(refillSizes, 'refill');
        if (selectedTypes.has('new'))    processMap(newSizes,    'new');

        const delivery = sub > 0 ? DELIVERY_FEE : 0;
        const instant  = deliveryType === 'instant' && sub > 0 ? INSTANT_FEE_ADD : 0;

        if (delivery) items.push({ label: 'Delivery fee', amount: delivery });
        if (instant)  items.push({ label: 'Instant delivery fee', amount: instant });

        return { subtotal: sub, grandTotal: sub + delivery + instant, lineItems: items };
    }, [selectedTypes, refillSizes, newSizes, deliveryType]);

    const hasItems = lineItems.some(i => !i.label.includes('fee'));

    const handleContinue = () => {
        onNext({
                selectedTypes,
                refillSizes,
                newSizes,
                deliveryType,
                grandTotal,
        });
    };

    const renderSizeRow = (type: WaterType) => {
        const map = getMap(type);
        return (
            <div className="space-y-3">
                {/* Size toggles */}
                <div className="grid grid-cols-3 gap-2">
                    {BOTTLE_SIZES.map(size => {
                        const selected = !!map[size.id];
                        const unitPrice = type === 'refill' ? size.refillPrice : size.newPrice;
                        return (
                            <button
                                key={size.id}
                                type="button"
                                onClick={() => toggleSize(type, size.id)}
                                className={`relative rounded-xl border-2 p-3 text-left transition-all ${
                                    selected
                                        ? 'border-[#1A4A7A] bg-[#EEF6FF]'
                                        : 'border-[#D4E8F5] bg-white hover:border-[#9ECBE8]'
                                }`}
                            >
                                {selected && (
                                    <span className="absolute top-2 right-2 w-4 h-4 bg-[#1A4A7A] rounded-full flex items-center justify-center">
                                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                            <path d="M1.5 4l1.8 1.8L6.5 2.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </span>
                                )}
                                <div className="font-bold text-[#0D2A47] text-sm">{size.label}</div>
                                <div className="text-xs text-[#6A8AA8] mt-0.5">KES {unitPrice}</div>
                            </button>
                        );
                    })}
                </div>

                {/* Quantity / bundle controls for selected sizes */}
                {Object.keys(map).length > 0 && (
                    <div className="space-y-3 pt-2">
                        {BOTTLE_SIZES.filter(s => map[s.id]).map(size => {
                            const entry = map[size.id];
                            const canBundle = type === 'new' && size.hasBundle;
                            const unitPrice = type === 'refill' ? size.refillPrice : size.newPrice;
                            const total    = lineTotal(entry, size, type);

                            return (
                                <div key={size.id} className="bg-[#F5F8FC] rounded-xl p-4 border border-[#D4E8F5]">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-semibold text-[#0D2A47] text-sm">
                                            {type === 'refill' ? 'Refill' : 'New'} {size.label}
                                        </span>
                                        <span className="text-sm font-bold text-[#1A78C2]">
                                            KES {total.toLocaleString()}
                                        </span>
                                    </div>

                                    {/* Bundle toggle  */}
                                    {canBundle && (
                                        <label className="flex items-center gap-2.5 mb-3 cursor-pointer">
                                            <div
                                                onClick={() => updateEntry(type, size.id, { isBundle: !entry.isBundle })}
                                                className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                                                    entry.isBundle ? 'bg-[#1A4A7A]' : 'bg-[#C4DDEF]'
                                                }`}
                                            >
                                                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                                                    entry.isBundle ? 'left-5' : 'left-1'
                                                }`} />
                                            </div>
                                            <span className="text-xs font-medium text-[#4A6A8A]">Buy as bundle</span>
                                        </label>
                                    )}

                                    {/* Bundle mode */}
                                    {canBundle && entry.isBundle ? (
                                        <div className="space-y-2">
                                            <p className="text-xs text-[#6A8AA8]">Pack size</p>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {BUNDLE_OPTIONS[size.id].map(pack => (
                                                    <button
                                                        key={pack}
                                                        type="button"
                                                        onClick={() => updateEntry(type, size.id, { bundleSize: pack })}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                                            entry.bundleSize === pack
                                                                ? 'bg-[#1A4A7A] border-[#1A4A7A] text-white'
                                                                : 'bg-white border-[#C4DDEF] text-[#4A6A8A] hover:border-[#1A4A7A]'
                                                        }`}
                                                    >
                                                        Pack of {pack}
                                                        <span className="ml-1 opacity-70">· KES {entry.bundleSize === pack ? (pack * unitPrice).toLocaleString() : (pack * unitPrice).toLocaleString()}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="text-xs text-[#6A8AA8]">Number of bundles</p>
                                            <div className="flex items-center gap-3">
                                                <QtyButton onClick={() => adjustBundleQty(type, size.id, -1)}>−</QtyButton>
                                                <span className="w-8 text-center font-bold text-[#0D2A47] text-sm">{entry.bundleQty}</span>
                                                <QtyButton onClick={() => adjustBundleQty(type, size.id, +1)}>+</QtyButton>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Normal qty mode */
                                        <div>
                                            <p className="text-xs text-[#6A8AA8] mb-2">Quantity</p>
                                            <div className="flex items-center gap-3">
                                                <QtyButton onClick={() => adjustQty(type, size.id, -1)}>−</QtyButton>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={entry.qty}
                                                    onChange={e => updateEntry(type, size.id, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
                                                    className="w-16 text-center border border-[#C4DDEF] rounded-lg py-1.5 text-sm font-bold text-[#0D2A47] focus:outline-none focus:ring-2 focus:ring-[#1A78C2] bg-white"
                                                />
                                                <QtyButton onClick={() => adjustQty(type, size.id, +1)}>+</QtyButton>
                                                <span className="text-xs text-[#8AA8C0]">× KES {unitPrice}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <Head title="Order water — Bhebha" />
                <div className="max-w-2xl mx-auto space-y-5 pb-32">

                    {/* Page header */}
                    <div className="mb-2">
                        <h1 className="text-2xl font-extrabold text-[#0D2A47]">Place your order</h1>
                        <p className="text-[#6A8AA8] text-sm mt-1">Choose your water type, sizes, and quantities below.</p>
                    </div>

                    {/* ──  Water type ── */}
                    <SectionCard>
                        <div className="flex items-center gap-3 mb-5">
                            <StepBadge n={1} active={true} />
                            <div>
                                <h2 className="font-bold text-[#0D2A47]">Water type</h2>
                                <p className="text-xs text-[#8AA8C0]">Select one or both</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {(['refill', 'new'] as WaterType[]).map(type => {
                                const selected = selectedTypes.has(type);
                                return (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => toggleType(type)}
                                        className={`relative rounded-2xl border-2 p-5 text-left transition-all ${
                                            selected
                                                ? 'border-[#1A4A7A] bg-[#EEF6FF]'
                                                : 'border-[#D4E8F5] bg-[#F9FBFD] hover:border-[#9ECBE8]'
                                        }`}
                                    >
                                        {selected && (
                                            <span className="absolute top-3 right-3 w-5 h-5 bg-[#1A4A7A] rounded-full flex items-center justify-center">
                                                <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                                                    <path d="M1.5 4.5l2 2L7.5 2" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            </span>
                                        )}
                                        {/* Bottle icon */}
                                        <div className="mb-3">
                                            <svg width="28" height="44" viewBox="0 0 28 44" fill="none">
                                                <rect x="9" y="0" width="10" height="6" rx="2" fill={selected ? '#1A4A7A' : '#B8D4EC'}/>
                                                <rect x="7" y="5" width="14" height="3" rx="1.5" fill={selected ? '#1A78C2' : '#C8DDEF'}/>
                                                <rect x="2" y="8" width="24" height="34" rx="6" fill={selected ? '#DDEEFF' : '#EEF5FA'}/>
                                                <rect x="2" y="8" width="24" height="12" rx="6" fill={selected ? '#C4DDEF' : '#D8EDF8'}/>
                                                {type === 'new' && (
                                                    <path d="M8 25h12M8 30h8" stroke={selected ? '#1A78C2' : '#A8C8E0'} strokeWidth="1.5" strokeLinecap="round"/>
                                                )}
                                            </svg>
                                        </div>
                                        <div className="font-bold text-[#0D2A47]">
                                            {type === 'refill' ? 'Refillable' : 'Brand new'}
                                        </div>
                                        <div className="text-xs text-[#6A8AA8] mt-0.5">
                                            {type === 'refill' ? 'Your bottles, refilled' : 'Sealed, fresh bottles'}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </SectionCard>

                    {/* ── Sizes & quantities ── */}
                    {selectedTypes.size > 0 && (
                        <SectionCard>
                            <div className="flex items-center gap-3 mb-5">
                                <StepBadge n={2} active={true} />
                                <div>
                                    <h2 className="font-bold text-[#0D2A47]">Sizes & quantities</h2>
                                    <p className="text-xs text-[#8AA8C0]">Select sizes and enter how many you need</p>
                                </div>
                            </div>

                            <div className="space-y-8">
                                {selectedTypes.has('refill') && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-2 h-2 rounded-full bg-[#1A78C2]" />
                                            <span className="text-sm font-semibold text-[#0D2A47]">Refillable bottles</span>
                                        </div>
                                        {renderSizeRow('refill')}
                                    </div>
                                )}

                                {selectedTypes.has('refill') && selectedTypes.has('new') && (
                                    <div className="border-t border-[#D4E8F5]" />
                                )}

                                {selectedTypes.has('new') && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-2 h-2 rounded-full bg-[#1A4A7A]" />
                                            <span className="text-sm font-semibold text-[#0D2A47]">Brand new bottles</span>
                                            <span className="text-xs bg-[#DDEEFF] text-[#1A78C2] px-2 py-0.5 rounded-full font-medium">Bundles available on 500ml & 1L</span>
                                        </div>
                                        {renderSizeRow('new')}
                                    </div>
                                )}
                            </div>
                        </SectionCard>
                    )}

                    {/* ──  Delivery type ── */}
                    {hasItems && (
                        <SectionCard>
                            <div className="flex items-center gap-3 mb-5">
                                <StepBadge n={3} active={true} />
                                <div>
                                    <h2 className="font-bold text-[#0D2A47]">Delivery type</h2>
                                    <p className="text-xs text-[#8AA8C0]">How fast do you need it?</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {([
                                    {
                                        id: 'standard' as const,
                                        label: 'Standard',
                                        desc: 'Batched delivery · same day or next',
                                        fee: `KES ${DELIVERY_FEE}`,
                                    },
                                    {
                                        id: 'instant' as const,
                                        label: 'Instant',
                                        desc: 'Your order alone · fastest possible',
                                        fee: `KES ${DELIVERY_FEE + INSTANT_FEE_ADD}`,
                                    },
                                ] as const).map(opt => {
                                    const active = deliveryType === opt.id;
                                    return (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setDeliveryType(opt.id)}
                                            className={`relative rounded-2xl border-2 p-4 text-left transition-all ${
                                                active
                                                    ? 'border-[#1A4A7A] bg-[#EEF6FF]'
                                                    : 'border-[#D4E8F5] bg-[#F9FBFD] hover:border-[#9ECBE8]'
                                            }`}
                                        >
                                            {active && (
                                                <span className="absolute top-3 right-3 w-4 h-4 bg-[#1A4A7A] rounded-full flex items-center justify-center">
                                                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                                        <path d="M1.5 4l1.8 1.8L6.5 2.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                </span>
                                            )}
                                            <div className="font-bold text-[#0D2A47] mb-0.5">{opt.label}</div>
                                            <div className="text-xs text-[#6A8AA8] leading-snug mb-2">{opt.desc}</div>
                                            <div className="text-xs font-semibold text-[#1A78C2]">{opt.fee} delivery</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </SectionCard>
                    )}

                    {/* ── Price summary ── */}
                    {hasItems && (
                        <SectionCard className="border-[#1A4A7A]/20">
                            <div className="flex items-center gap-3 mb-4">
                                <StepBadge n={4} active={true} />
                                <h2 className="font-bold text-[#0D2A47]">Order summary</h2>
                            </div>

                            <div className="space-y-2 mb-4">
                                {lineItems.map((item, i) => (
                                    <div key={i} className="flex justify-between text-sm">
                                        <span className={item.label.includes('fee') ? 'text-[#8AA8C0]' : 'text-[#4A6A8A]'}>
                                            {item.label}
                                        </span>
                                        <span className={item.label.includes('fee') ? 'text-[#8AA8C0]' : 'font-medium text-[#0D2A47]'}>
                                            KES {item.amount.toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-[#D4E8F5] pt-4 flex justify-between items-center">
                                <span className="font-bold text-[#0D2A47]">Total</span>
                                <span className="text-xl font-black text-[#1A4A7A]">
                                    KES {grandTotal.toLocaleString()}
                                </span>
                            </div>
                        </SectionCard>
                    )}

                    {/* Empty state */}
                    {selectedTypes.size === 0 && (
                        <div className="text-center py-12 text-[#8AA8C0]">
                            <svg className="mx-auto mb-3 opacity-40" width="48" height="48" viewBox="0 0 48 48" fill="none">
                                <path d="M24 4C24 4 10 17 10 28a14 14 0 0028 0C38 17 24 4 24 4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                                <path d="M18 30a6 6 0 0012 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            <p className="text-sm">Select a water type above to get started</p>
                        </div>
                    )}
                </div>

                {/* ── Sticky bottom CTA ── */}
                {hasItems && (
                    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur border-t border-[#D4E8F5] px-4 py-4">
                        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
                            <div>
                                <div className="text-xs text-[#8AA8C0]">Order total</div>
                                <div className="text-lg font-black text-[#0D2A47]">
                                    KES {grandTotal.toLocaleString()}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleContinue}
                                className="flex items-center gap-2 bg-[#1A4A7A] text-white font-semibold px-8 py-3.5 rounded-full hover:bg-[#0D2A47] transition-all shadow-lg shadow-[#1A4A7A]/20"
                            >
                                Continue to delivery
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
        </>
    );
}