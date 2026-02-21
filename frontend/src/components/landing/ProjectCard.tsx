import React from "react";

interface ProjectCardProps {
    image: string;
    label: string;
    category?: string;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ image, label, category }) => {
    return (
        <div className="project-card">
            <img src={image} alt={label} className="project-card__img" />
            <div className="project-card__overlay">
                {category && <span className="project-card__category">{category}</span>}
                <h4 className="project-card__label">{label}</h4>
            </div>
        </div>
    );
};

export default ProjectCard;
