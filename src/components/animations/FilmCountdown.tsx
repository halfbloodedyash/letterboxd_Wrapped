'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface FilmCountdownProps {
    onComplete: () => void;
    duration?: number;
}

export function FilmCountdown({ onComplete, duration = 3000 }: FilmCountdownProps) {
    const [count, setCount] = useState(3);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        if (count > 0) {
            const timer = setTimeout(() => {
                setCount(count - 1);
            }, duration / 3);
            return () => clearTimeout(timer);
        } else {
            const timer = setTimeout(() => {
                setIsVisible(false);
                setTimeout(onComplete, 500);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [count, duration, onComplete]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black"
                >
                    {/* Film scratches overlay */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="film-scratches" />
                    </div>

                    {/* Vignette */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]" />

                    {/* Count number */}
                    <AnimatePresence mode="wait">
                        {count > 0 && (
                            <motion.div
                                key={count}
                                initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                exit={{ scale: 1.5, opacity: 0, filter: 'blur(10px)' }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 200,
                                    damping: 15
                                }}
                                className="relative"
                            >
                                {/* Glow effect */}
                                <div className="absolute inset-0 blur-3xl bg-amber-500/30 animate-pulse" />

                                {/* Number */}
                                <span className="relative text-[200px] md:text-[300px] font-bold text-amber-100 tracking-tighter"
                                    style={{
                                        fontFamily: 'serif',
                                        textShadow: '0 0 60px rgba(251, 191, 36, 0.5), 0 0 120px rgba(251, 191, 36, 0.3)',
                                    }}
                                >
                                    {count}
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Film frame corners */}
                    <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-amber-500/30" />
                    <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-amber-500/30" />
                    <div className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-amber-500/30" />
                    <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-amber-500/30" />

                    {/* Perforation holes */}
                    <div className="absolute left-4 top-0 bottom-0 flex flex-col justify-evenly">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="w-3 h-5 rounded-sm bg-amber-900/50" />
                        ))}
                    </div>
                    <div className="absolute right-4 top-0 bottom-0 flex flex-col justify-evenly">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="w-3 h-5 rounded-sm bg-amber-900/50" />
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
