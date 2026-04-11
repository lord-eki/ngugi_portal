import { useState, useEffect, useRef, useCallback } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';

// ─── Types ────────────────────────────────────────────────────────
interface LatLng { lat: number; lng: number }

interface DeliveryForm {
    locationMode:    'pin' | 'manual' | 'someone-else';
    pinLocation:     LatLng | null;
    pinAddress:      string;
    manualAddress:   string;
    recipientName:   string;
    recipientPhone:  string;
    scheduleType:    'asap' | 'later' | 'next-day';
    scheduledTime:   string;
    notes:           string;
}

// ─── Helpers ─────────────────────────────────────────────────────
const NAIROBI_CENTER: LatLng = { lat: -1.2921, lng: 36.8219 };

const SCHEDULE_OPTIONS = [
    { id: 'asap',      label: 'As soon as possible', sub: 'Within 2–4 hours' },
    { id: 'later',     label: 'Later today',          sub: 'Pick a time slot'  },
    { id: 'next-day',  label: 'Next day',             sub: 'Schedule tomorrow' },
] as const;

const TIME_SLOTS = [
    '08:00 – 10:00', '10:00 – 12:00', '12:00 – 14:00',
    '14:00 – 16:00', '16:00 – 18:00', '18:00 – 20:00',
];

// ─── Sub-components ───────────────────────────────────────────────
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

function InputField({
    label, value, onChange, placeholder, type = 'text', hint, required = false,
}: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; type?: string; hint?: string; required?: boolean;
}) {
    return (
        <div>
            <label className="block text-sm font-semibold text-[#2A4A6A] mb-1.5">
                {label}{required && <span className="text-red-400 ml-0.5">*</span>}
            </label>
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-3 bg-white border border-[#C4DDEF] rounded-xl text-[#0D2A47] placeholder:text-[#A8C0D4] focus:outline-none focus:ring-2 focus:ring-[#1A78C2] focus:border-transparent transition-all text-sm"
            />
            {hint && <p className="text-xs text-[#8AA8C0] mt-1">{hint}</p>}
        </div>
    );
}

// ─── Google Maps component ────────────────────────────────────────
function MapPicker({
    value, onChange, onAddressChange,
}: {
    value: LatLng | null;
    onChange: (loc: LatLng) => void;
    onAddressChange: (addr: string) => void;
}) {
    const mapRef      = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<google.maps.Map | null>(null);
    const markerRef   = useRef<google.maps.Marker | null>(null);
    const geocoder    = useRef<google.maps.Geocoder | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [error,  setError]  = useState(false);
    const [locating, setLocating] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const searchRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

    const reverseGeocode = useCallback((latlng: LatLng) => {
        if (!geocoder.current) return;
        geocoder.current.geocode({ location: latlng }, (results, status) => {
            if (status === 'OK' && results?.[0]) {
                onAddressChange(results[0].formatted_address);
                setSearchInput(results[0].formatted_address);
            }
        });
    }, [onAddressChange]);

    const placeMarker = useCallback((latlng: LatLng) => {
        if (!mapInstance.current) return;
        if (!markerRef.current) {
            markerRef.current = new google.maps.Marker({
                map: mapInstance.current,
                draggable: true,
                animation: google.maps.Animation.DROP,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: '#1A4A7A',
                    fillOpacity: 1,
                    strokeColor: '#fff',
                    strokeWeight: 3,
                },
            });
            markerRef.current.addListener('dragend', () => {
                const pos = markerRef.current!.getPosition()!;
                const loc = { lat: pos.lat(), lng: pos.lng() };
                onChange(loc);
                reverseGeocode(loc);
            });
        }
        markerRef.current.setPosition(latlng);
        mapInstance.current.panTo(latlng);
        onChange(latlng);
        reverseGeocode(latlng);
    }, [onChange, reverseGeocode]);

    useEffect(() => {
        // Load Google Maps SDK
        const GMAP_KEY = (window as any).__BHEBHA_GMAP_KEY__ || '';
        if ((window as any).google?.maps) { initMap(); return; }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GMAP_KEY}&libraries=places&callback=__bhebhaMapInit`;
        script.async = true;
        script.defer = true;
        (window as any).__bhebhaMapInit = () => { initMap(); };
        script.onerror = () => setError(true);
        document.head.appendChild(script);

        return () => { delete (window as any).__bhebhaMapInit; };
    }, []);

    const initMap = () => {
        if (!mapRef.current) return;
        geocoder.current = new google.maps.Geocoder();

        const map = new google.maps.Map(mapRef.current, {
            center: value || NAIROBI_CENTER,
            zoom: 14,
            disableDefaultUI: true,
            zoomControl: true,
            styles: [
                { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#DDEEFF' }] },
                { featureType: 'road',  elementType: 'geometry', stylers: [{ color: '#F5F3EE' }] },
                { featureType: 'poi',   stylers: [{ visibility: 'off' }] },
                { featureType: 'transit', stylers: [{ visibility: 'off' }] },
            ],
        });
        mapInstance.current = map;

        // Click to pin
        map.addListener('click', (e: google.maps.MapMouseEvent) => {
            if (e.latLng) placeMarker({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        });

        // Search autocomplete
        if (searchRef.current) {
            const ac = new google.maps.places.Autocomplete(searchRef.current, {
                componentRestrictions: { country: 'KE' },
                fields: ['geometry', 'formatted_address'],
            });
            autocompleteRef.current = ac;
            ac.addListener('place_changed', () => {
                const place = ac.getPlace();
                if (place.geometry?.location) {
                    const loc = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
                    placeMarker(loc);
                    map.setZoom(16);
                }
            });
        }

        if (value) placeMarker(value);
        setLoaded(true);
    };

    const useMyLocation = () => {
        if (!navigator.geolocation) return;
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            pos => {
                const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                placeMarker(loc);
                mapInstance.current?.setZoom(17);
                setLocating(false);
            },
            () => setLocating(false),
            { timeout: 8000 }
        );
    };

    return (
        <div className="space-y-3">
            {/* Search bar */}
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8AA8C0]">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                </div>
                <input
                    ref={searchRef}
                    type="text"
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    placeholder="Search for a location in Nairobi…"
                    className="w-full pl-9 pr-4 py-3 bg-white border border-[#C4DDEF] rounded-xl text-[#0D2A47] placeholder:text-[#A8C0D4] focus:outline-none focus:ring-2 focus:ring-[#1A78C2] text-sm"
                />
            </div>

            {/* Map container */}
            <div className="relative rounded-xl overflow-hidden border border-[#C4DDEF]" style={{ height: 280 }}>
                {error ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F5F8FC] text-[#8AA8C0]">
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="mb-2 opacity-40">
                            <circle cx="14" cy="13" r="6" stroke="currentColor" strokeWidth="2"/>
                            <path d="M14 5C9.03 5 5 9.03 5 14c0 7 9 17 9 17s9-10 9-17c0-4.97-4.03-9-9-9z" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        <p className="text-sm">Map unavailable — enter address manually below</p>
                    </div>
                ) : (
                    <div ref={mapRef} className="w-full h-full" />
                )}

                {/* Use my location button */}
                <button
                    type="button"
                    onClick={useMyLocation}
                    disabled={locating}
                    className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white border border-[#C4DDEF] text-[#1A4A7A] text-xs font-semibold px-3 py-2 rounded-lg shadow-sm hover:bg-[#EEF6FF] transition-all disabled:opacity-60"
                >
                    {locating ? (
                        <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                        </svg>
                    ) : (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M7 1v2M7 11v2M1 7h2M11 7h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                    )}
                    {locating ? 'Locating…' : 'Use my location'}
                </button>
            </div>

            {/* Pinned address display */}
            {value && (
                <div className="flex items-start gap-2 bg-[#EEF6FF] border border-[#C4DDEF] rounded-xl px-4 py-3">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 flex-shrink-0 text-[#1A78C2]">
                        <circle cx="8" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M8 1C5.24 1 3 3.24 3 6c0 4 5 9 5 9s5-5 5-9c0-2.76-2.24-5-5-5z" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                    <div>
                        <p className="text-xs font-semibold text-[#1A4A7A]">Delivery pin set</p>
                        {searchInput && <p className="text-xs text-[#4A6A8A] mt-0.5">{searchInput}</p>}
                        <p className="text-xs text-[#8AA8C0] mt-0.5">{value.lat.toFixed(6)}, {value.lng.toFixed(6)}</p>
                    </div>
                </div>
            )}

            {!value && (
                <p className="text-xs text-[#8AA8C0] text-center">
                    Tap the map or search to pin your delivery location
                </p>
            )}
        </div>
    );
}

// ─── Main page 
export default function StepDelivery({ data , setData, onNext,onBack}) {
    const { grandTotal, deliveryType: orderDeliveryType } = usePage().props as any;

    const [form, setForm] = useState<DeliveryForm>({
        locationMode:   'pin',
        pinLocation:    null,
        pinAddress:     '',
        manualAddress:  '',
        recipientName:  '',
        recipientPhone: '',
        scheduleType:   'asap',
        scheduledTime:  '',
        notes:          '',
    });

    const patch = (updates: Partial<DeliveryForm>) =>
        setForm(prev => ({ ...prev, ...updates }));

    const isValid = (() => {
        if (form.locationMode === 'pin')          return !!form.pinLocation;
        if (form.locationMode === 'manual')       return form.manualAddress.trim().length > 5;
        if (form.locationMode === 'someone-else') return form.manualAddress.trim().length > 5 && form.recipientName.trim().length > 0 && form.recipientPhone.trim().length >= 9;
        return false;
    })();

    const needsTimeSlot = form.scheduleType === 'later' || form.scheduleType === 'next-day';
    const canProceed = isValid && (!needsTimeSlot || form.scheduledTime !== '');

    const handleContinue = () => {
        onNext(form);
    };

    const locationTabs = [
        { id: 'pin',          label: 'Pin on map',    icon: <path d="M8 2C5.24 2 3 4.24 3 7c0 4 5 9 5 9s5-5 5-9c0-2.76-2.24-5-5-5zm0 6.5A1.5 1.5 0 118 5a1.5 1.5 0 010 3.5z" fill="currentColor"/> },
        { id: 'manual',       label: 'Type address',  icon: <><rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" fill="none"/><path d="M5 7h6M5 9.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></> },
        { id: 'someone-else', label: 'For someone',   icon: <><circle cx="8" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.4" fill="none"/><path d="M3 13c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none"/></> },
    ] as const;

    return (
        <>
                <div className="max-w-2xl mx-auto space-y-5 pb-32">

                    {/* Header */}
                    <div className="mb-2">
                        <h1 className="text-2xl font-extrabold text-[#0D2A47]">Delivery details</h1>
                        <p className="text-[#6A8AA8] text-sm mt-1">Tell us where and when to bring your water.</p>
                    </div>

                    {/* ── STEP 1: Location ── */}
                    <SectionCard>
                        <div className="flex items-center gap-3 mb-5">
                            <StepBadge n={1} active={true} />
                            <div>
                                <h2 className="font-bold text-[#0D2A47]">Delivery location</h2>
                                <p className="text-xs text-[#8AA8C0]">Where should we bring it?</p>
                            </div>
                        </div>

                        {/* Location mode tabs */}
                        <div className="flex gap-2 mb-5 bg-[#F5F8FC] p-1 rounded-xl">
                            {locationTabs.map(tab => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => patch({ locationMode: tab.id })}
                                    className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                                        form.locationMode === tab.id
                                            ? 'bg-white text-[#1A4A7A] shadow-sm border border-[#D4E8F5]'
                                            : 'text-[#6A8AA8] hover:text-[#1A4A7A]'
                                    }`}
                                >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                                        className={form.locationMode === tab.id ? 'text-[#1A78C2]' : 'text-[#8AA8C0]'}>
                                        {tab.icon}
                                    </svg>
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Pin on map */}
                        {form.locationMode === 'pin' && (
                            <MapPicker
                                value={form.pinLocation}
                                onChange={loc => patch({ pinLocation: loc })}
                                onAddressChange={addr => patch({ pinAddress: addr })}
                            />
                        )}

                        {/* Type address */}
                        {form.locationMode === 'manual' && (
                            <div className="space-y-4">
                                <InputField
                                    label="Street / building address"
                                    value={form.manualAddress}
                                    onChange={v => patch({ manualAddress: v })}
                                    placeholder="e.g. 14 Westlands Road, Nairobi"
                                    required
                                />
                                <InputField
                                    label="Landmark / directions (optional)"
                                    value={form.notes}
                                    onChange={v => patch({ notes: v })}
                                    placeholder="e.g. Next to Shell petrol station, blue gate"
                                />
                            </div>
                        )}

                        {/* Someone else */}
                        {form.locationMode === 'someone-else' && (
                            <div className="space-y-4">
                                <div className="bg-[#DDEEFF] border border-[#B8D4EC] rounded-xl px-4 py-3 text-xs text-[#1A4A7A] font-medium">
                                    We'll contact this person for delivery confirmation and send them an SMS update.
                                </div>
                                <InputField
                                    label="Recipient's full name"
                                    value={form.recipientName}
                                    onChange={v => patch({ recipientName: v })}
                                    placeholder="e.g. Jane Wanjiru"
                                    required
                                />
                                <div>
                                    <label className="block text-sm font-semibold text-[#2A4A6A] mb-1.5">
                                        Recipient's phone <span className="text-red-400">*</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="flex items-center px-3 bg-[#F5F8FC] border border-[#C4DDEF] rounded-xl text-sm text-[#4A6A8A] font-medium flex-shrink-0 text-xs">
                                            🇰🇪 +254
                                        </div>
                                        <input
                                            type="tel"
                                            value={form.recipientPhone}
                                            onChange={e => patch({ recipientPhone: e.target.value })}
                                            placeholder="7XX XXX XXX"
                                            className="flex-1 px-4 py-3 bg-white border border-[#C4DDEF] rounded-xl text-[#0D2A47] placeholder:text-[#A8C0D4] focus:outline-none focus:ring-2 focus:ring-[#1A78C2] focus:border-transparent transition-all text-sm"
                                        />
                                    </div>
                                </div>
                                <InputField
                                    label="Their delivery address"
                                    value={form.manualAddress}
                                    onChange={v => patch({ manualAddress: v })}
                                    placeholder="e.g. Kileleshwa, Nairobi"
                                    required
                                />
                            </div>
                        )}
                    </SectionCard>

                    {/* ── STEP 2: Schedule ── */}
                    <SectionCard>
                        <div className="flex items-center gap-3 mb-5">
                            <StepBadge n={2} active={true} />
                            <div>
                                <h2 className="font-bold text-[#0D2A47]">When do you need it?</h2>
                                <p className="text-xs text-[#8AA8C0]">Choose your preferred delivery time</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {SCHEDULE_OPTIONS.map(opt => {
                                const active = form.scheduleType === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => patch({ scheduleType: opt.id, scheduledTime: '' })}
                                        className={`w-full flex items-center justify-between rounded-xl border-2 px-4 py-3.5 text-left transition-all ${
                                            active
                                                ? 'border-[#1A4A7A] bg-[#EEF6FF]'
                                                : 'border-[#D4E8F5] bg-[#F9FBFD] hover:border-[#9ECBE8]'
                                        }`}
                                    >
                                        <div>
                                            <div className={`text-sm font-semibold ${active ? 'text-[#1A4A7A]' : 'text-[#0D2A47]'}`}>
                                                {opt.label}
                                            </div>
                                            <div className="text-xs text-[#6A8AA8] mt-0.5">{opt.sub}</div>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                            active ? 'border-[#1A4A7A] bg-[#1A4A7A]' : 'border-[#C4DDEF] bg-white'
                                        }`}>
                                            {active && (
                                                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                                    <path d="M1.5 4l1.8 1.8L6.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Time slot picker */}
                        {needsTimeSlot && (
                            <div className="mt-4">
                                <p className="text-xs font-semibold text-[#2A4A6A] mb-2">
                                    {form.scheduleType === 'next-day' ? 'Tomorrow\'s time slot' : 'Today\'s time slot'}
                                </p>
                                <div className="grid grid-cols-3 gap-2">
                                    {TIME_SLOTS.map(slot => {
                                        const active = form.scheduledTime === slot;
                                        return (
                                            <button
                                                key={slot}
                                                type="button"
                                                onClick={() => patch({ scheduledTime: slot })}
                                                className={`py-2 px-2 rounded-lg border text-xs font-medium transition-all text-center ${
                                                    active
                                                        ? 'border-[#1A4A7A] bg-[#1A4A7A] text-white'
                                                        : 'border-[#D4E8F5] bg-white text-[#4A6A8A] hover:border-[#9ECBE8]'
                                                }`}
                                            >
                                                {slot}
                                            </button>
                                        );
                                    })}
                                </div>
                                {needsTimeSlot && !form.scheduledTime && (
                                    <p className="text-xs text-[#E07A30] mt-2">Please select a time slot to continue.</p>
                                )}
                            </div>
                        )}
                    </SectionCard>

                    {/* ── STEP 3: Delivery notes ── */}
                    <SectionCard>
                        <div className="flex items-center gap-3 mb-5">
                            <StepBadge n={3} active={true} />
                            <div>
                                <h2 className="font-bold text-[#0D2A47]">Delivery notes</h2>
                                <p className="text-xs text-[#8AA8C0]">Optional — help our rider find you</p>
                            </div>
                        </div>
                        <textarea
                            value={form.notes}
                            onChange={e => patch({ notes: e.target.value })}
                            placeholder="e.g. Call on arrival, leave at gate, apartment 4B…"
                            rows={3}
                            className="w-full px-4 py-3 bg-white border border-[#C4DDEF] rounded-xl text-[#0D2A47] placeholder:text-[#A8C0D4] focus:outline-none focus:ring-2 focus:ring-[#1A78C2] focus:border-transparent transition-all text-sm resize-none"
                        />
                    </SectionCard>

                    {/* ── Delivery summary card ── */}
                    {canProceed && (
                        <div className="bg-[#EEF6FF] border border-[#C4DDEF] rounded-2xl p-5">
                            <h3 className="text-sm font-bold text-[#1A4A7A] mb-3">Delivery summary</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-[#6A8AA8]">Location</span>
                                    <span className="text-[#0D2A47] font-medium text-right max-w-[60%] truncate">
                                        {form.locationMode === 'pin'
                                            ? form.pinAddress || 'Pinned on map'
                                            : form.manualAddress}
                                    </span>
                                </div>
                                {form.locationMode === 'someone-else' && (
                                    <div className="flex justify-between">
                                        <span className="text-[#6A8AA8]">Recipient</span>
                                        <span className="text-[#0D2A47] font-medium">{form.recipientName}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-[#6A8AA8]">Schedule</span>
                                    <span className="text-[#0D2A47] font-medium">
                                        {form.scheduleType === 'asap' ? 'As soon as possible' : form.scheduledTime}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Sticky bottom CTA ── */}
                <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur border-t border-[#D4E8F5] px-4 py-4">
                    <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
                        <div>
                            <div className="text-xs text-[#8AA8C0]">Order total</div>
                            <div className="text-lg font-black text-[#0D2A47]">
                                KES {(grandTotal || 0).toLocaleString()}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleContinue}
                            disabled={!canProceed}
                            className="flex items-center gap-2 bg-[#1A4A7A] text-white font-semibold px-8 py-3.5 rounded-full hover:bg-[#0D2A47] transition-all shadow-lg shadow-[#1A4A7A]/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                        >
                            Continue to payment
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                    </div>
                </div>
        </>
    );
}