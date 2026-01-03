"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useAnimation } from "framer-motion";

interface ParticlesProps {
    className?: string;
    quantity?: number;
    staticity?: number;
    ease?: number;
    size?: number;
    refresh?: boolean;
    color?: string;
    vx?: number;
    vy?: number;
}

interface Circle {
    x: number;
    y: number;
    translateX: number;
    translateY: number;
    size: number;
    alpha: number;
    targetAlpha: number;
    dx: number;
    dy: number;
    magnetism: number;
}

export function Particles({
    className = "",
    quantity = 100,
    staticity = 50,
    ease = 50,
    size = 0.4,
    refresh = false,
    color = "#ffffff",
    vx = 0,
    vy = 0,
}: ParticlesProps) {
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const canvasRef = useMemo(() => ({ current: null as HTMLCanvasElement | null }), []);
    const contextRef = useMemo(() => ({ current: null as CanvasRenderingContext2D | null }), []);
    const circlesRef = useMemo(() => ({ current: [] as Circle[] }), []);
    const mouseRef = useMemo(() => ({ current: { x: 0, y: 0 } }), []);
    const dprRef = useMemo(() => ({ current: 1 }), []);

    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16),
            }
            : { r: 255, g: 255, b: 255 };
    };

    const rgb = useMemo(() => hexToRgb(color), [color]);

    const circleParams = (): Circle => {
        const x = Math.floor(Math.random() * canvasSize.width);
        const y = Math.floor(Math.random() * canvasSize.height);
        const translateX = 0;
        const translateY = 0;
        const pSize = Math.floor(Math.random() * 2) + size;
        const alpha = 0;
        const targetAlpha = parseFloat((Math.random() * 0.6 + 0.1).toFixed(1));
        const dx = (Math.random() - 0.5) * 0.1;
        const dy = (Math.random() - 0.5) * 0.1;
        const magnetism = 0.1 + Math.random() * 4;
        return {
            x,
            y,
            translateX,
            translateY,
            size: pSize,
            alpha,
            targetAlpha,
            dx,
            dy,
            magnetism,
        };
    };

    const drawCircle = (circle: Circle, update = false) => {
        const ctx = contextRef.current;
        if (!ctx) return;

        const { x, y, translateX, translateY, size: circleSize, alpha } = circle;
        ctx.translate(translateX, translateY);
        ctx.beginPath();
        ctx.arc(x, y, circleSize, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
        ctx.fill();
        ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);

        if (!update) {
            circlesRef.current.push(circle);
        }
    };

    const clearContext = () => {
        const ctx = contextRef.current;
        if (ctx) {
            ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
        }
    };

    const drawParticles = () => {
        clearContext();
        const particleCount = quantity;
        for (let i = 0; i < particleCount; i++) {
            const circle = circleParams();
            drawCircle(circle);
        }
    };

    const remapValue = (
        value: number,
        start1: number,
        end1: number,
        start2: number,
        end2: number
    ): number => {
        const remapped = ((value - start1) * (end2 - start2)) / (end1 - start1) + start2;
        return remapped > 0 ? remapped : 0;
    };

    const animate = () => {
        clearContext();
        circlesRef.current.forEach((circle, i) => {
            // Handle edge cases
            const edge = [
                circle.x + circle.translateX - circle.size,
                canvasSize.width - circle.x - circle.translateX - circle.size,
                circle.y + circle.translateY - circle.size,
                canvasSize.height - circle.y - circle.translateY - circle.size,
            ];
            const closestEdge = edge.reduce((a, b) => Math.min(a, b));
            const remapClosestEdge = parseFloat(remapValue(closestEdge, 0, 20, 0, 1).toFixed(2));

            if (remapClosestEdge > 1) {
                circle.alpha += 0.02;
                if (circle.alpha > circle.targetAlpha) {
                    circle.alpha = circle.targetAlpha;
                }
            } else {
                circle.alpha = circle.targetAlpha * remapClosestEdge;
            }

            circle.x += circle.dx + vx;
            circle.y += circle.dy + vy;
            circle.translateX +=
                (mouseRef.current.x / (staticity / circle.magnetism) - circle.translateX) / ease;
            circle.translateY +=
                (mouseRef.current.y / (staticity / circle.magnetism) - circle.translateY) / ease;

            // If circle is out of bounds, reset to new position
            if (
                circle.x < -circle.size ||
                circle.x > canvasSize.width + circle.size ||
                circle.y < -circle.size ||
                circle.y > canvasSize.height + circle.size
            ) {
                circlesRef.current.splice(i, 1);
                const newCircle = circleParams();
                drawCircle(newCircle);
            } else {
                drawCircle(
                    {
                        ...circle,
                        x: circle.x,
                        y: circle.y,
                        translateX: circle.translateX,
                        translateY: circle.translateY,
                        alpha: circle.alpha,
                    },
                    true
                );
            }
        });
        window.requestAnimationFrame(animate);
    };

    useEffect(() => {
        if (canvasRef.current) {
            contextRef.current = canvasRef.current.getContext("2d");
        }

        const initCanvas = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            dprRef.current = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            setCanvasSize({ width: rect.width, height: rect.height });
        };

        initCanvas();
        window.addEventListener("resize", initCanvas);

        return () => {
            window.removeEventListener("resize", initCanvas);
        };
    }, []);

    useEffect(() => {
        if (canvasSize.width > 0 && canvasSize.height > 0) {
            const canvas = canvasRef.current;
            if (!canvas) return;

            canvas.width = canvasSize.width * dprRef.current;
            canvas.height = canvasSize.height * dprRef.current;
            canvas.style.width = `${canvasSize.width}px`;
            canvas.style.height = `${canvasSize.height}px`;
            contextRef.current?.scale(dprRef.current, dprRef.current);

            circlesRef.current = [];
            drawParticles();
            animate();
        }
    }, [canvasSize, refresh]);

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const { w, h } = { w: rect.width, h: rect.height };
            const x = event.clientX - rect.left - w / 2;
            const y = event.clientY - rect.top - h / 2;
            const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
            if (inside) {
                mouseRef.current.x = x;
                mouseRef.current.y = y;
            }
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
        };
    }, []);

    return (
        <canvas
            ref={(el) => { canvasRef.current = el; }}
            className={`w-full h-full ${className}`}
        />
    );
}

export default Particles;
