import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SectionHeading from "../components/landing/SectionHeading";
import ServiceCard from "../components/landing/ServiceCard";
import TeamMemberCard from "../components/landing/TeamMemberCard";
import ProjectCard from "../components/landing/ProjectCard";
import StepCard from "../components/landing/StepCard";
import StatCounter from "../components/landing/StatCounter";
import CTABanner from "../components/landing/CTABanner";
import LandingFooter from "../components/landing/LandingFooter";
import "./Landing.css";

// ─── IMAGE DATA ───────────────────────────────────────────
const heroImages = [
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=1920&q=80",
];

const services = [
  { icon: "🌱", title: "Crop Consultation", description: "Expert advice on crop selection, soil health, and seasonal planting strategies for maximum yield." },
  { icon: "🚜", title: "Agri Machinery", description: "Access modern farming equipment and machinery rentals to streamline your agricultural operations." },
  { icon: "📊", title: "Market Analysis", description: "Real-time market data and price forecasting to help you sell your produce at the best rates." },
  { icon: "🌾", title: "Organic Solutions", description: "Sustainable farming practices and organic certification guidance for eco-friendly agriculture." },
];

const aboutImages = [
  "https://images.unsplash.com/photo-1597916829826-02e5bb4a54e0?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=600&q=80",
];

const projects = [
  { image: "https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?auto=format&fit=crop&w=700&q=80", label: "Organic Farm Setup", category: "Agriculture" },
  { image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=700&q=80", label: "Smart Irrigation System", category: "Technology" },
  { image: "https://images.unsplash.com/photo-1605000797499-95a51c5269ae?auto=format&fit=crop&w=700&q=80", label: "Greenhouse Project", category: "Innovation" },
];

const steps = [
  { number: "01", title: "Soil Testing", description: "Analyze soil composition and nutrient levels to determine the best approach for your farmland." },
  { number: "02", title: "Planning & Strategy", description: "Develop a comprehensive farming plan based on data-driven insights and local climate conditions." },
  { number: "03", title: "Cultivation", description: "Implement advanced cultivation techniques with continuous monitoring and expert support." },
  { number: "04", title: "Harvest & Market", description: "Optimize harvest timing and connect directly with buyers through our marketplace platform." },
];

const teamMembers = [
  { image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80", name: "Rajesh Kumar", role: "Agriculture Expert" },
  { image: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=500&q=80", name: "Priya Sharma", role: "Soil Scientist" },
  { image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=500&q=80", name: "Amit Patel", role: "Farm Manager" },
  { image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=500&q=80", name: "Sneha Reddy", role: "Market Analyst" },
];

const blogs = [
  {
    image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=700&q=80",
    date: "February 15, 2026",
    title: "5 Organic Farming Techniques That Double Your Yield",
    excerpt: "Discover proven organic methods that help farmers increase productivity while maintaining soil health.",
  },
  {
    image: "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=700&q=80",
    date: "February 10, 2026",
    title: "Smart Irrigation: Saving Water, Growing More",
    excerpt: "How IoT-enabled irrigation systems are revolutionizing water management in modern agriculture.",
  },
  {
    image: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=700&q=80",
    date: "February 5, 2026",
    title: "From Farm to Table: The Future of Direct Marketing",
    excerpt: "Connecting farmers directly with consumers is changing the agriculture supply chain forever.",
  },
];

// ─── COMPONENT ────────────────────────────────────────────
const Landing: React.FC = () => {
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setHeroIdx((p) => (p + 1) % heroImages.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="landing-page">
      {/* ──────── HERO ──────── */}
      <section className="hero">
        {heroImages.map((img, i) => (
          <div
            key={i}
            className="hero__bg"
            style={{
              backgroundImage: `url('${img}')`,
              opacity: heroIdx === i ? 1 : 0,
            }}
          />
        ))}
        <div className="hero__overlay" />

        {/* Header */}
        <header className="landing-header">
          <Link to="/" className="landing-header__logo">
            <span className="landing-header__logo-icon">🌿</span>
            AgriBro
          </Link>
          <nav className="landing-header__nav">
            <Link to="/" className="landing-header__link">Home</Link>
            <Link to="/marketplace" className="landing-header__link">Marketplace</Link>
            <Link to="/advisor" className="landing-header__link">AI Advisor</Link>
            <Link to="/logistics" className="landing-header__link">Logistics</Link>
            <Link to="/community" className="landing-header__link">Community</Link>
            <Link to="/login" className="landing-header__cta">Get Started</Link>
          </nav>
        </header>

        <div className="hero__content">
          <p className="hero__subtitle">Welcome to AgriBro</p>
          <h1 className="hero__title">
            Modern <span>Organic</span> Farming and Gardening
          </h1>

          <div className="hero__badges">
            <div className="hero__badge">
              <span className="hero__badge-icon">🌍</span>
              100% Organic Produce & Fertilizers
            </div>
            <div className="hero__badge">
              <span className="hero__badge-icon">🏆</span>
              Quality First, Always
            </div>
          </div>

          <div className="hero__btns">
            <Link to="/marketplace" className="btn btn--primary">
              Explore Marketplace →
            </Link>
            <Link to="/advisor" className="btn btn--outline">
              AI Advisor
            </Link>
          </div>
        </div>


      </section>

      {/* ──────── SERVICES ──────── */}
      <section className="services">
        <div className="lp-container">
          <SectionHeading
            topLabel="Our Services"
            title="We Offer Eco & Agriculture Services"
            subtitle="Comprehensive farming solutions powered by technology and expertise."
          />
          <div className="services__grid">
            {services.map((s, i) => (
              <ServiceCard key={i} icon={s.icon} title={s.title} description={s.description} />
            ))}
          </div>
        </div>
      </section>

      {/* ──────── ABOUT ──────── */}
      <section className="about">
        <div className="lp-container">
          <div className="about__wrapper">
            <div className="about__images">
              <img
                src={aboutImages[0]}
                alt="Farming"
                className="about__img about__img--tall"
              />
              <img src={aboutImages[1]} alt="Crops" className="about__img" />
              <img src={aboutImages[2]} alt="Field" className="about__img" />
            </div>
            <div className="about__text">
              <SectionHeading
                topLabel="About Us"
                title="We're Best Agriculture & Organic Farms"
                center={false}
              />
              <p className="about__desc">
                AgriBro is India's smart agriculture platform connecting farmers
                with technology, markets, and expert guidance. We help you grow
                better, sell smarter, and build a sustainable future.
              </p>
              <ul className="about__list">
                <li>AI-powered crop recommendations</li>
                <li>Direct marketplace for farmers and buyers</li>
                <li>Real-time weather and soil health insights</li>
                <li>End-to-end logistics and supply chain</li>
              </ul>
              <Link to="/advisor" className="btn btn--primary">
                Discover More →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ──────── PROJECTS ──────── */}
      <section className="projects">
        <div className="lp-container">
          <SectionHeading
            topLabel="Portfolio"
            title="Recently Completed Projects"
            subtitle="Showcasing our impactful agriculture initiatives across India."
          />
          <div className="projects__grid">
            {projects.map((p, i) => (
              <ProjectCard key={i} image={p.image} label={p.label} category={p.category} />
            ))}
          </div>
        </div>
      </section>

      {/* ──────── HOW WE WORK ──────── */}
      <section className="how-we-work">
        <div className="lp-container">
          <SectionHeading
            topLabel="Process"
            title="How We Do Agricultural Work"
            subtitle="A systematic approach from soil to market."
          />
          <div className="steps__grid">
            {steps.map((s, i) => (
              <StepCard key={i} number={s.number} title={s.title} description={s.description} />
            ))}
          </div>
        </div>
      </section>



      {/* ──────── STATS ──────── */}
      <section className="stats">
        <div className="lp-container">
          <div className="stats__grid">
            <StatCounter end={500} suffix="+" label="Happy Farmers" icon="👨‍🌾" />
            <StatCounter end={120} suffix="+" label="Projects Done" icon="📋" />
            <StatCounter end={50} suffix="+" label="Expert Advisors" icon="🎓" />
            <StatCounter end={10000} suffix="+" label="Acres Covered" icon="🌾" />
          </div>
        </div>
      </section>

      {/* ──────── CTA ──────── */}
      <CTABanner
        title="How Can We Help You?"
        subtitle="Whether you're a small-scale farmer or managing large agricultural operations, AgriBro provides the tools, insights, and market access you need to thrive."
        buttonText="Get Started Today"
        buttonLink="/login"
        backgroundImage="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1920&q=80"
      />

      {/* ──────── BLOG ──────── */}
      <section className="blog">
        <div className="lp-container">
          <SectionHeading
            topLabel="Latest News"
            title="Our Blogs & Articles"
            subtitle="Stay updated with the latest trends in agriculture and technology."
          />
          <div className="blog__grid">
            {blogs.map((b, i) => (
              <div className="blog-card" key={i}>
                <img src={b.image} alt={b.title} className="blog-card__img" />
                <div className="blog-card__body">
                  <p className="blog-card__date">{b.date}</p>
                  <h3 className="blog-card__title">{b.title}</h3>
                  <p className="blog-card__excerpt">{b.excerpt}</p>
                  <a href="#" className="blog-card__link">
                    Read More →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────── FOOTER ──────── */}
      <LandingFooter />
    </div>
  );
};

export default Landing;
