import React from "react";
import { Link } from "react-router-dom";

interface CTABannerProps {
    title: string;
    subtitle?: string;
    buttonText: string;
    buttonLink: string;
    backgroundImage?: string;
}

const CTABanner: React.FC<CTABannerProps> = ({
    title,
    subtitle,
    buttonText,
    buttonLink,
    backgroundImage,
}) => {
    return (
        <section
            className="cta-banner"
            style={
                backgroundImage
                    ? { backgroundImage: `url('${backgroundImage}')` }
                    : undefined
            }
        >
            <div className="cta-banner__overlay" />
            <div className="cta-banner__content">
                <h2 className="cta-banner__title">{title}</h2>
                {subtitle && <p className="cta-banner__subtitle">{subtitle}</p>}
                <Link to={buttonLink} className="cta-banner__btn">
                    {buttonText}
                </Link>
            </div>
        </section>
    );
};

export default CTABanner;
