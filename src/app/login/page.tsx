'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');

        const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        if (res.ok) {
            router.push('/');
            router.refresh();
        } else {
            setError('Wrong password.');
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-[#080808]">
            <div className="w-full max-w-sm px-8 py-10 rounded-2xl border border-white/5 bg-white/[0.03] shadow-2xl flex flex-col items-center gap-8">
                {/* Logo */}
                <div className="flex flex-col items-center gap-3">
                    <div className="text-4xl">👾</div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#ff3366] text-center">Kirbai OS</p>
                        <p className="text-[11px] text-white/30 tracking-widest text-center uppercase mt-1">Access Required</p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Password"
                        autoFocus
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder:text-white/20 outline-none focus:border-[#ff3366]/50 focus:ring-1 focus:ring-[#ff3366]/20 transition-all"
                    />
                    {error && (
                        <p className="text-[#ff3366] text-xs text-center">{error}</p>
                    )}
                    <button
                        type="submit"
                        disabled={loading || !password}
                        className="w-full bg-[#ff3366] hover:bg-[#ff3366]/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm py-3 rounded-lg transition-all tracking-widest uppercase"
                    >
                        {loading ? '...' : 'Enter'}
                    </button>
                </form>
            </div>
        </main>
    );
}
