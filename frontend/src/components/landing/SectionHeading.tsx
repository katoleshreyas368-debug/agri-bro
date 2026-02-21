import React from "react";
import { SparklesIcon } from "@heroicons/react/24/outline";

interface SectionHeadingProps {
    topLabel?: string;
    title: string;
    subtitle?: string;
    light?: boolean;
    center?: boolean;
}

const SectionHeading: React.FC<SectionHeadingProps> = ({
    topLabel,
    title,
    subtitle,
    light = false,
    center = true,
}) => {
    return (
        <div className={`section-heading ${center ? "center" : ""}`}>
            {topLabel && (
                <span className="section-heading__label">
                    <SparklesIcon className="section-heading__leaf-icon" /> {topLabel}
                </span>
            )}
            <h2
                className={`section-heading__title ${light ? "section-heading__title--light" : ""}`}
            >
                {title}
            </h2>
            {subtitle && (
                <p
                    className={`section-heading__subtitle ${light ? "section-heading__subtitle--light" : ""}`}
                >
                    {subtitle}
                </p>
            )}
        </div>
    );
};

export default SectionHeading;
