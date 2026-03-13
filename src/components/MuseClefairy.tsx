"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface MuseClefairyProps {
    emotion?: 'idle' | 'thinking' | 'happy' | 'starry-eyed' | 'worried' | 'surprised';
    message?: string;
}

const MuseClefairy: React.FC<MuseClefairyProps> = ({ emotion = 'idle', message }) => {
    const [isFloating, setIsFloating] = useState(false);
    const [displayedMessage, setDisplayedMessage] = useState("");
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        setIsFloating(true);
        // Preload audio
        audioRef.current = new Audio('/assets/muse/clefairy_cry.mp3');
        audioRef.current.volume = 0.3;
    }, []);

    const playCry = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => console.log("Audio play blocked", e));
        }
    };

    // Typewriter effect for messages
    useEffect(() => {
        if (!message) {
            setDisplayedMessage("");
            return;
        }
        
        // Play cry for new messages
        playCry();

        let i = 0;
        setDisplayedMessage("");
        const timer = setInterval(() => {
            setDisplayedMessage(message.slice(0, i + 1));
            i++;
            if (i >= message.length) clearInterval(timer);
        }, 30);
        return () => clearInterval(timer);
    }, [message]);

    const getEmotionSrc = () => {
        switch (emotion) {
            case 'thinking': return '/assets/muse/thinking.png';
            case 'happy': return '/assets/muse/happy.png';
            case 'worried': return '/assets/muse/worried.png';
            case 'starry-eyed': return '/assets/muse/starry-eyed.png';
            default: return '/assets/muse/idle.png';
        }
    };

    return (
        <div className={`relative transition-all duration-1000 ${isFloating ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            {/* The Floating Clefairy Card */}
            <div className="relative w-48 h-48 md:w-56 md:h-56 animate-float flex items-center justify-center">
                
                {/* Outer Glass Ring */}
                <div className="absolute inset-0 rounded-full border-2 border-white/20 bg-gradient-to-br from-white/10 to-accent/5 backdrop-blur-xl shadow-2xl overflow-hidden">
                     {/* Internal Shimmer */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer" />
                </div>

                {/* Avatar Cropped Tight */}
                <div className={`relative w-[85%] h-[85%] rounded-full overflow-hidden flex items-center justify-center bg-white/5 border ${typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'pokopia' ? 'border-white border-8 shadow-2xl' : 'border-white/40'}`}>
                    <img 
                        src={getEmotionSrc()} 
                        alt="Muse Clefairy"
                        className="w-full h-full object-contain scale-[1.4] origin-center relative z-10 transition-all duration-500 hover:scale-[1.5]"
                    />
                </div>

                {/* Speech Bubble - Pastel Style (Contrast Optimized) */}
                {displayedMessage && (
                    <div className="absolute -top-10 -left-40 w-64 md:w-80 bg-white/95 backdrop-blur-3xl p-6 rounded-[40px] rounded-br-sm shadow-[0_30px_70px_rgba(255,51,102,0.2)] border-2 border-accent/20 animate-in zoom-in slide-in-from-bottom-4 duration-300 z-[100]">
                        <p className="text-[12px] font-black text-accent uppercase tracking-widest leading-relaxed text-center italic drop-shadow-sm">
                            {displayedMessage}
                        </p>
                        {/* Bubble Tail */}
                        <div className="absolute bottom-[-2px] right-[-12px] w-8 h-8 bg-white/95 border-r-2 border-b-2 border-accent/20 rotate-45 transform skew-x-12" style={{ clipPath: 'polygon(100% 100%, 0% 100%, 100% 0%)' }} />
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(-1deg); }
                    50% { transform: translateY(-15px) rotate(2deg); }
                }
                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }
                @keyframes shimmer {
                    0% { transform: translateX(-150%) skewX(-20deg); }
                    100% { transform: translateX(150%) skewX(-20deg); }
                }
                .animate-shimmer {
                    animation: shimmer 4s infinite linear;
                }
            `}</style>
        </div>
    );
};

export default MuseClefairy;
