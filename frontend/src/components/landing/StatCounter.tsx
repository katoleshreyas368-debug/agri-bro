import React, { useEffect, useRef, useState } from "react";

interface StatCounterProps {
    end: number;
    suffix?: string;
    label: string;
    icon?: React.ReactNode;
}

const StatCounter: React.FC<StatCounterProps> = ({ end, suffix = "", label, icon }) => {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLDivElement>(null);
    const started = useRef(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !started.current) {
                    started.current = true;
                    let current = 0;
                    const step = Math.ceil(end / 60);
                    const timer = setInterval(() => {
                        current += step;
                        if (current >= end) {
                            current = end;
                            clearInterval(timer);
                        }
                        setCount(current);
                    }, 25);
                }
            },
            { threshold: 0.3 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [end]);

    return (
        <div className="stat-counter" ref={ref}>
            {icon && <span className="stat-counter__icon">{icon}</span>}
            <span className="stat-counter__number">
                {count}
                {suffix}
            </span>
            <span className="stat-counter__label">{label}</span>
        </div>
    );
};

export default StatCounter;
