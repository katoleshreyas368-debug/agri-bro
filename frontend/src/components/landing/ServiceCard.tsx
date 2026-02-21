import React from "react";

interface ServiceCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ icon, title, description }) => {
    return (
        <div className="service-card">
            <div className="service-card__icon">{icon}</div>
            <h3 className="service-card__title">{title}</h3>
            <p className="service-card__desc">{description}</p>
            <div className="service-card__arrow">→</div>
        </div>
    );
};

export default ServiceCard;
