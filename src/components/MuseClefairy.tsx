"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface MuseClefairyProps {
    emotion?: 'idle' | 'thinking' | 'happy' | 'starry-eyed' | 'worried' | 'surprised' | 'excited' | 'singing' | 'annoyed' | 'proud' | 'cheerful';
    message?: string;
}

const MuseClefairy: React.FC<MuseClefairyProps> = ({ emotion = 'idle', message }) => {
    const [isFloating, setIsFloating] = useState(false);
    const [displayedMessage, setDisplayedMessage] = useState("");
    const [idleEmotion, setIdleEmotion] = useState<string | null>(null);
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

    // Random idle expressions
    useEffect(() => {
        if (emotion !== 'idle') {
            setIdleEmotion(null);
            return;
        }

        const idleOptions = ['idle', 'happy', 'excited', 'singing', 'starry-eyed', 'cheerful', 'proud'];
        const timer = setInterval(() => {
            const random = idleOptions[Math.floor(Math.random() * idleOptions.length)];
            setIdleEmotion(random);
        }, 10000 + Math.random() * 5000);

        return () => clearInterval(timer);
    }, [emotion]);

    const getEmotionSrc = () => {
        const currentEmotion = idleEmotion || emotion;
        switch (currentEmotion) {
            case 'thinking': return '/assets/muse/thinking.png';
            case 'happy': return '/assets/muse/happy.png';
            case 'worried': return '/assets/muse/worried.png';
            case 'starry-eyed': return '/assets/muse/starry-eyed.png';
            case 'excited': return '/assets/muse/excited.png';
            case 'singing': return '/assets/muse/singing.png';
            case 'surprised': return '/assets/muse/surprised.png';
            case 'annoyed': return '/assets/muse/annoyed.png';
            case 'proud': return '/assets/muse/proud.png';
            case 'cheerful': return '/assets/muse/cheerful.png';
            default: return '/assets/muse/idle.png';
        }
    };

    return (
        <div 
            className={`relative transition-all duration-1000 ${isFloating ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
            onClick={playCry}
        >
            {/* The Floating Clefairy Card */}
            <div className="relative w-48 h-48 md:w-56 md:h-56 animate-float flex items-center justify-center cursor-pointer active:scale-95 transition-transform">
                
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

                {/* Speech Bubble - Artistic Float Style (Option 2) */}
                {displayedMessage && (
                    <div className="absolute -top-12 -left-20 w-48 md:w-56 bg-white/95 backdrop-blur-3xl p-4 rounded-[32px] shadow-[0_30px_70px_rgba(255,51,102,0.15)] border-2 border-accent/10 animate-in zoom-in slide-in-from-bottom-4 duration-300 z-[100]">
                        <p className="text-[11px] font-black text-accent uppercase tracking-widest leading-relaxed text-center italic drop-shadow-sm">
                            {displayedMessage}
                        </p>
                        
                        {/* Organic SVG Bubble Tail - Matches Curvature */}
                        <div className="absolute -bottom-5 right-10 w-10 h-8 text-white/95 drop-shadow-[0_10px_20px_rgba(255,51,102,0.1)]">
                            <svg viewBox="0 0 40 40" fill="currentColor" className="w-full h-full transform scale-x-[-1]">
                                <path d="M0,0 Q10,0 20,20 Q30,40 40,40 Q25,35 15,15 Q5,0 0,0" />
                            </svg>
                        </div>
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
