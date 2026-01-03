'use client';

import { useEffect, useRef } from 'react';

interface FilmGrainProps {
    opacity?: number;
    speed?: number;
    enabled?: boolean;
}

export function FilmGrain({ opacity = 0.04, speed = 50, enabled = true }: FilmGrainProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!enabled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        resize();
        window.addEventListener('resize', resize);

        const drawGrain = () => {
            const imageData = ctx.createImageData(canvas.width, canvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const value = Math.random() * 255;
                data[i] = value;     // R
                data[i + 1] = value; // G
                data[i + 2] = value; // B
                data[i + 3] = 255;   // A
            }

            ctx.putImageData(imageData, 0, 0);
        };

        let lastTime = 0;
        const animate = (time: number) => {
            if (time - lastTime > speed) {
                drawGrain();
                lastTime = time;
            }
            animationId = requestAnimationFrame(animate);
        };

        animationId = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationId);
        };
    }, [enabled, speed]);

    if (!enabled) return null;

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-[100]"
            style={{
                opacity,
                mixBlendMode: 'overlay',
            }}
        />
    );
}

// Simpler CSS-based film grain (for performance)
export function FilmGrainCSS({ opacity = 0.03, enabled = true }: { opacity?: number; enabled?: boolean }) {
    if (!enabled) return null;

    return (
        <div
            className="fixed inset-0 pointer-events-none z-[100]"
            style={{
                opacity,
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            }}
        >
            {/* Animated scratches */}
            <div className="film-scratches absolute inset-0" />
        </div>
    );
}
