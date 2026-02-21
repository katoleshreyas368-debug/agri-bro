import React from "react";
import { GlobeAltIcon, ChatBubbleLeftIcon, BriefcaseIcon } from "@heroicons/react/24/outline";

interface TeamMemberCardProps {
    image: string;
    name: string;
    role: string;
}

const TeamMemberCard: React.FC<TeamMemberCardProps> = ({ image, name, role }) => {
    return (
        <div className="team-card">
            <div className="team-card__img-wrap">
                <img src={image} alt={name} className="team-card__img" />
                <div className="team-card__overlay">
                    <div className="team-card__socials">
                        <a href="#" aria-label="Website"><GlobeAltIcon className="team-card__social-icon" /></a>
                        <a href="#" aria-label="Chat"><ChatBubbleLeftIcon className="team-card__social-icon" /></a>
                        <a href="#" aria-label="LinkedIn"><BriefcaseIcon className="team-card__social-icon" /></a>
                    </div>
                </div>
            </div>
            <div className="team-card__info">
                <h4 className="team-card__name">{name}</h4>
                <p className="team-card__role">{role}</p>
            </div>
        </div>
    );
};

export default TeamMemberCard;
