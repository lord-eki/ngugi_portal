import { Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import Wizard from '@/components/OrderWizard/Wizard';

export default function Welcome() {
    const [scrolled, setScrolled] = useState(false);
    const [open, setOpen] = useState(false);

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
                                <path d="M8 1C8 1 3 6.5 3 10a5 5 0 0010 0C13 6.5 8 1 8 1z" fill="white" />
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
                        <Link href="/login" className="text-sm font-medium text-[#3A5A7C] hover:text-[#1A4A7A] transition-colors">
                            Sign in
                        </Link>
                        <Link
                            href="/register"
                            className="text-sm font-semibold bg-[#1A4A7A] text-white px-4 py-2 rounded-full hover:bg-[#0D2A47] transition-colors"
                        >
                            Get started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* HERO */}
            <section className="relative min-h-screen flex items-center overflow-hidden">
                {/* Background blobs */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-[-80px] right-[-120px] w-[600px] h-[600px] rounded-full bg-[#DDEEFF] opacity-60 blur-3xl" />
                    <div className="absolute bottom-[-60px] left-[-80px] w-[400px] h-[400px] rounded-full bg-[#C8E0F5] opacity-40 blur-3xl" />
                    <div className="absolute top-[40%] left-[35%] w-[300px] h-[300px] rounded-full bg-[#EBF5FB] opacity-50 blur-2xl" />
                </div>

                <div className="relative max-w-6xl mx-auto px-6 pt-28 pb-16 grid md:grid-cols-2 gap-16 items-center">
                    {/* Left: copy */}
                    <div>
                        <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#1A78C2] bg-[#DDEEFF] px-3 py-1 rounded-full mb-6">
                            Water delivery · Machakos
                        </span>
                        <h1 className="text-5xl md:text-6xl font-extrabold leading-[1.1] text-[#0D2A47] mb-6">
                            Thirst Meets<br />
                            <span className="text-[#1A78C2]">Speed.</span>
                        </h1>
                        <p className="text-lg text-[#4A6A8A] leading-relaxed mb-10 max-w-md">
                            Refillable or brand new bottles — delivered to your door in hours. Choose your size, set your schedule, pay your way.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <button onClick={() => setOpen(true)} className="inline-flex  bg-[#1A78C2] items-center gap-2 border border-[#B8D4EC] text-[#fff] font-semibold text-base px-7 py-3.5 rounded-full hover:bg-[#B8D4EC] transition-all"
>
                                Order Now
                            </button>

                            {open && <Wizard onClose={() => setOpen(false)} />}
                            <a
                                href="#how-it-works"
                                className="inline-flex items-center gap-2 border border-[#B8D4EC] text-[#1A4A7A] font-semibold text-base px-7 py-3.5 rounded-full hover:bg-white transition-all"
                            >
                                See how it works
                            </a>
                        </div>

                        {/* Trust badges */}
                        <div className="flex items-center gap-6 mt-10 pt-10 border-t border-[#D4E8F5]">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-[#0D2A47]">2h</div>
                                <div className="text-xs text-[#6A8AA8] mt-0.5">Avg. delivery</div>
                            </div>
                            <div className="w-px h-10 bg-[#D4E8F5]" />
                            <div className="text-center">
                                <div className="text-2xl font-bold text-[#0D2A47]">6 sizes</div>
                                <div className="text-xs text-[#6A8AA8] mt-0.5">500ml → 20L</div>
                            </div>
                            <div className="w-px h-10 bg-[#D4E8F5]" />
                            <div className="text-center">
                                <div className="text-2xl font-bold text-[#0D2A47]">M-Pesa</div>
                                <div className="text-xs text-[#6A8AA8] mt-0.5">& card accepted</div>
                            </div>
                        </div>
                    </div>

                    {/* Right: visual card stack */}
                    <div className="relative flex justify-center">
                        <div className="relative w-72">
                            {/* Back card */}
                            <div className="absolute top-4 left-4 w-full h-full bg-[#C8E0F5] rounded-3xl rotate-3" />
                            {/* Main card */}
                            <div className="relative bg-white rounded-3xl p-6 shadow-2xl shadow-[#1A4A7A]/10">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-xs font-semibold text-[#1A78C2] bg-[#DDEEFF] px-2 py-0.5 rounded-full">Instant delivery</span>
                                    <span className="text-xs text-[#6A8AA8]">Now available</span>
                                </div>
                                {/* Bottle visual */}
                                <div className="flex justify-center py-6">
                                    <svg width="80" height="140" viewBox="0 0 80 140" fill="none">
                                        <rect x="28" y="0" width="24" height="14" rx="4" fill="#B8D4EC" />
                                        <rect x="24" y="12" width="32" height="6" rx="3" fill="#9EC8E8" />
                                        <rect x="10" y="18" width="60" height="100" rx="12" fill="#DDEEFF" />
                                        <rect x="10" y="18" width="60" height="30" rx="12" fill="#C8E0F5" />
                                        <rect x="18" y="30" width="10" height="60" rx="5" fill="white" opacity="0.5" />
                                        <ellipse cx="40" cy="118" rx="30" ry="8" fill="#C8E0F5" opacity="0.5" />
                                    </svg>
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-[#0D2A47] text-lg">20L Refillable</p>
                                    <p className="text-[#6A8AA8] text-sm">KES 200 · 2 hr delivery</p>
                                </div>
                                <div className="mt-4 flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-[#DDEEFF] rounded-full overflow-hidden">
                                        <div className="h-full w-3/4 bg-[#1A78C2] rounded-full" />
                                    </div>
                                    <span className="text-xs text-[#6A8AA8]">3 left</span>
                                </div>
                                {/* Live order indicator */}
                                <div className="mt-4 flex items-center gap-2 text-xs text-[#3A7A3A] bg-[#E8F5E8] px-3 py-2 rounded-xl">
                                    <span className="w-1.5 h-1.5 bg-[#3A7A3A] rounded-full animate-pulse" />
                                    Order #247 out for delivery
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scroll indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-[#8AA8C0] animate-bounce">
                    <span className="text-xs tracking-widest uppercase">Scroll</span>
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                        <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
                            {
                                step: '01',
                                title: 'Choose your water',
                                desc: 'Pick refillable or brand new bottles. Select your sizes and quantities — no limits.',
                                icon: (
                                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                                        <path d="M14 3C14 3 7 10 7 16a7 7 0 0014 0C21 10 14 3 14 3z" stroke="#1A78C2" strokeWidth="2" strokeLinejoin="round" />
                                        <path d="M10 17a4 4 0 008 0" stroke="#1A78C2" strokeWidth="1.5" strokeLinecap="round" />
                                    </svg>
                                ),
                            },
                            {
                                step: '02',
                                title: 'Set your location',
                                desc: 'Pin your delivery spot on the map — or order for someone else anywhere in the city.',
                                icon: (
                                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                                        <circle cx="14" cy="12" r="4" stroke="#1A78C2" strokeWidth="2" />
                                        <path d="M14 4C9.58 4 6 7.58 6 12c0 6 8 16 8 16s8-10 8-16c0-4.42-3.58-8-8-8z" stroke="#1A78C2" strokeWidth="2" strokeLinejoin="round" />
                                    </svg>
                                ),
                            },
                            {
                                step: '03',
                                title: 'Pay & relax',
                                desc: 'M-Pesa STK push, till number, or card. Instant SMS confirmation the moment it goes through.',
                                icon: (
                                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                                        <rect x="4" y="8" width="20" height="14" rx="3" stroke="#1A78C2" strokeWidth="2" />
                                        <path d="M4 13h20" stroke="#1A78C2" strokeWidth="2" />
                                        <circle cx="9" cy="18" r="1.5" fill="#1A78C2" />
                                    </svg>
                                ),
                            },
                        ].map((item) => (
                            <div key={item.step} className="relative bg-[#F5F8FC] rounded-2xl p-7 hover:shadow-md transition-shadow">
                                <span className="absolute top-6 right-6 text-4xl font-black text-[#DDEEFF] select-none">{item.step}</span>
                                <div className="w-12 h-12 bg-[#DDEEFF] rounded-xl flex items-center justify-center mb-4">
                                    {item.icon}
                                </div>
                                <h3 className="font-bold text-[#0D2A47] text-lg mb-2">{item.title}</h3>
                                <p className="text-[#5A7A9A] text-sm leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* BOTTLE SIZES SECTION */}
            <section id="pricing" className="py-24 bg-[#F5F3EE]">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <span className="text-xs font-semibold tracking-widest uppercase text-[#1A78C2]">Flexible sizing</span>
                        <h2 className="text-4xl font-extrabold text-[#0D2A47] mt-3">Every size, your price</h2>
                        <p className="text-[#5A7A9A] mt-3 max-w-md mx-auto">From a quick 500ml to a full 20L for the whole family. Refill or brand new — you decide.</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                            { size: '500ml', refill: 'KES 15', new: 'KES 30' },
                            { size: '1L', refill: 'KES 25', new: 'KES 50' },
                            { size: '5L', refill: 'KES 80', new: 'KES 150' },
                            { size: '10L', refill: 'KES 120', new: 'KES 250' },
                            { size: '15L', refill: 'KES 160', new: 'KES 350' },
                            { size: '20L', refill: 'KES 200', new: 'KES 450', popular: true },
                        ].map((item) => (
                            <div key={item.size} className={`bg-white rounded-2xl p-5 relative ${item.popular ? 'ring-2 ring-[#1A78C2]' : ''}`}>
                                {item.popular && (
                                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs font-semibold text-white bg-[#1A78C2] px-3 py-0.5 rounded-full whitespace-nowrap">
                                        Most popular
                                    </span>
                                )}
                                <div className="text-2xl font-black text-[#0D2A47] mb-3">{item.size}</div>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[#6A8AA8]">Refill</span>
                                        <span className="font-semibold text-[#1A4A7A]">{item.refill}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[#6A8AA8]">Brand new</span>
                                        <span className="font-semibold text-[#1A4A7A]">{item.new}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="text-center mt-8">
                        <Link
                            href="/order"
                            className="inline-flex items-center gap-2 bg-[#1A4A7A] text-white font-semibold px-8 py-3.5 rounded-full hover:bg-[#0D2A47] transition-all shadow-lg shadow-[#1A4A7A]/20"
                        >
                            Start your order
                        </Link>
                    </div>
                </div>
            </section>

            {/* SUBSCRIPTIONS */}
            <section id="subscriptions" className="py-24 bg-[#0D2A47]">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <span className="text-xs font-semibold tracking-widest uppercase text-[#7AB8E0]">Never run out</span>
                            <h2 className="text-4xl font-extrabold text-white mt-3 mb-5">Subscribe & save</h2>
                            <p className="text-[#8AB8D8] leading-relaxed mb-8">
                                Set a daily, weekly, biweekly, or monthly schedule. We auto-bill via M-Pesa or card and notify you before every charge.
                            </p>
                            <ul className="space-y-3">
                                {['Automated M-Pesa billing', 'SMS before every delivery', 'Pause or cancel anytime', 'Priority scheduling'].map(f => (
                                    <li key={f} className="flex items-center gap-3 text-[#A8C8E8]">
                                        <span className="w-5 h-5 bg-[#1A78C2] rounded-full flex items-center justify-center flex-shrink-0">
                                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                                <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </span>
                                        <span className="text-sm">{f}</span>
                                    </li>
                                ))}
                            </ul>
                            <Link
                                href="/register"
                                className="inline-flex items-center gap-2 mt-8 bg-white text-[#0D2A47] font-semibold px-7 py-3 rounded-full hover:bg-[#F5F3EE] transition-all"
                            >
                                Set up a subscription
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: 'Daily', save: '5% off', color: 'bg-[#1A3A5C]' },
                                { label: 'Weekly', save: '8% off', color: 'bg-[#1A4A7A]' },
                                { label: 'Biweekly', save: '10% off', color: 'bg-[#1A5A9A]' },
                                { label: 'Monthly', save: '15% off', color: 'bg-[#1A78C2]' },
                            ].map(s => (
                                <div key={s.label} className={`${s.color} rounded-2xl p-5`}>
                                    <div className="text-white font-bold text-lg mb-1">{s.label}</div>
                                    <div className="text-[#7AB8E0] text-sm">{s.save}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA FOOTER */}
            <section className="py-20 bg-white text-center">
                <div className="max-w-xl mx-auto px-6">
                    <h2 className="text-3xl font-extrabold text-[#0D2A47] mb-4">Ready for your first delivery?</h2>
                    <p className="text-[#5A7A9A] mb-8">Join thousands of Nairobi households who've switched to Bhebha.</p>
                    <Link
                        href="/order"
                        className="inline-flex items-center gap-2 bg-[#1A4A7A] text-white font-semibold text-lg px-10 py-4 rounded-full hover:bg-[#0D2A47] transition-all shadow-xl shadow-[#1A4A7A]/20"
                    >
                        Order Now — it's fast
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </Link>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="bg-[#F5F3EE] border-t border-[#D4E8F5] py-10">
                <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#1A4A7A] flex items-center justify-center">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                <path d="M8 1C8 1 3 6.5 3 10a5 5 0 0010 0C13 6.5 8 1 8 1z" fill="white" />
                            </svg>
                        </div>
                        <span className="font-bold text-[#0D2A47]">bhebha</span>
                    </div>
                    <p className="text-sm text-[#6A8AA8]">© {new Date().getFullYear()} Bhebha. Nairobi, Kenya.</p>
                    <div className="flex gap-6 text-sm text-[#6A8AA8]">
                        <a href="#" className="hover:text-[#1A4A7A]">Privacy</a>
                        <a href="#" className="hover:text-[#1A4A7A]">Terms</a>
                        <a href="#" className="hover:text-[#1A4A7A]">Contact</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}