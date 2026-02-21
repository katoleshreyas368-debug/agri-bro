import React from "react";

interface StepCardProps {
    number: string;
    title: string;
    description: string;
}

const StepCard: React.FC<StepCardProps> = ({ number, title, description }) => {
    return (
        <div className="step-card">
            <span className="step-card__number">{number}</span>
            <h4 className="step-card__title">{title}</h4>
            <p className="step-card__desc">{description}</p>
        </div>
    );
};

export default StepCard;
