import React from "react";
import { Link } from "react-router-dom";
import {
    GlobeAltIcon,
    ChatBubbleLeftIcon,
    CameraIcon,
    BriefcaseIcon,
    ArrowRightIcon,
} from "@heroicons/react/24/outline";

const LandingFooter: React.FC = () => {
    return (
        <footer className="landing-footer">
            <div className="landing-footer__top">
                <div className="landing-footer__col">
                    <div className="landing-footer__brand">
                        <span className="landing-footer__logo">AgriBro</span>
                        <p className="landing-footer__tagline">
                            Empowering farmers with smart technology, market access, and
                            sustainable agriculture solutions for a better tomorrow.
                        </p>
                    </div>
                    <div className="landing-footer__socials">
                        <a href="#" aria-label="Website"><GlobeAltIcon className="landing-footer__social-icon" /></a>
                        <a href="#" aria-label="Chat"><ChatBubbleLeftIcon className="landing-footer__social-icon" /></a>
                        <a href="#" aria-label="Photos"><CameraIcon className="landing-footer__social-icon" /></a>
                        <a href="#" aria-label="LinkedIn"><BriefcaseIcon className="landing-footer__social-icon" /></a>
                    </div>
                </div>

                <div className="landing-footer__col">
                    <h4 className="landing-footer__heading">Explore</h4>
                    <ul className="landing-footer__links">
                        <li><Link to="/">Home</Link></li>
                        <li><Link to="/marketplace">Marketplace</Link></li>
                        <li><Link to="/advisor">AI Advisor</Link></li>
                        <li><Link to="/logistics">Logistics</Link></li>
                        <li><Link to="/community">Community</Link></li>
                    </ul>
                </div>

                <div className="landing-footer__col">
                    <h4 className="landing-footer__heading">Quick Links</h4>
                    <ul className="landing-footer__links">
                        <li><Link to="/inputs">Farm Inputs</Link></li>
                        <li><Link to="/dashboard">Dashboard</Link></li>
                        <li><a href="#">Privacy Policy</a></li>
                        <li><a href="#">Terms of Service</a></li>
                    </ul>
                </div>

                <div className="landing-footer__col">
                    <h4 className="landing-footer__heading">Newsletter</h4>
                    <p className="landing-footer__newsletter-text">
                        Subscribe to get the latest farming tips and updates.
                    </p>
                    <form className="landing-footer__form" onSubmit={(e) => e.preventDefault()}>
                        <input
                            type="email"
                            placeholder="Your email address"
                            className="landing-footer__input"
                        />
                        <button type="submit" className="landing-footer__submit">
                            <ArrowRightIcon className="landing-footer__submit-icon" />
                        </button>
                    </form>
                </div>
            </div>

            <div className="landing-footer__bottom">
                <p>&copy; 2026 AgriBro. All rights reserved.</p>
            </div>
        </footer>
    );
};

export default LandingFooter;
