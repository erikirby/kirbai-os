"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface MuseClefairyProps {
    emotion?: 'idle' | 'thinking' | 'happy';
    message?: string;
}

const MuseClefairy: React.FC<MuseClefairyProps> = ({ emotion = 'idle', message }) => {
    const [isFloating, setIsFloating] = useState(false);

    useEffect(() => {
        setIsFloating(true);
    }, []);

    const getEmotionSrc = () => {
        switch (emotion) {
            case 'thinking': return '/_next/image?url=%2FUsers%2Ferikhenry2%2F.gemini%2Fantigravity%2Fbrain%2Ff1770236-66ba-494a-bd9e-14d1d80ea30d%2Fmuse_clefairy_thinking_1773358031735.png&w=1080&q=75';
            case 'happy': return '/_next/image?url=%2FUsers%2Ferikhenry2%2F.gemini%2Fantigravity%2Fbrain%2Ff1770236-66ba-494a-bd9e-14d1d80ea30d%2Fmuse_clefairy_happy_1773358046936.png&w=1080&q=75';
            default: return '/_next/image?url=%2FUsers%2Ferikhenry2%2F.gemini%2Fantigravity%2Fbrain%2Ff1770236-66ba-494a-bd9e-14d1d80ea30d%2Fmuse_clefairy_avatar_1773357901448.png&w=1080&q=75';
        }
    };

    return (
        <div className={`relative flex flex-col items-center transition-all duration-1000 ${isFloating ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            {/* Clefairy Avatar with Glassmorphism Isolation */}
            <div className="relative w-48 h-48 md:w-64 md:h-64 animate-float">
                <div className="absolute inset-0 bg-accent/20 blur-[60px] rounded-full animate-pulse-slow" />
                <img 
                    src={getEmotionSrc()} 
                    alt="Muse Clefairy"
                    className="w-full h-full object-contain relative z-10 mix-blend-screen drop-shadow-[0_0_20px_rgba(255,51,102,0.4)]"
                    style={{ WebkitMaskImage: 'radial-gradient(circle, black 60%, transparent 95%)' }}
                />
            </div>

            {/* Speech Bubble */}
            {message && (
                <div className="absolute top-0 -mt-16 bg-white/10 backdrop-blur-xl border border-white/20 px-6 py-3 rounded-[24px] rounded-bl-sm animate-in zoom-in slide-in-from-bottom-4 duration-300">
                    <p className="text-[11px] font-black uppercase tracking-widest text-white">{message}</p>
                </div>
            )}

            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-15px) rotate(1deg); }
                }
                .animate-float {
                    animation: float 4s ease-in-out infinite;
                }
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.2; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(1.1); }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 6s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default MuseClefairy;
