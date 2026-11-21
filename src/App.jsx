import { useState } from "react";
import { useSocialSettings } from "./contexts/SocialSettingsContext.jsx";

const services = [
  {
    number: "01",
    title: "Brand & identity",
    description:
      "A clear point of view, a distinct visual language, and the pieces to show up consistently.",
    tags: ["Strategy", "Visual identity", "Art direction"],
  },
  {
    number: "02",
    title: "Websites & digital",
    description:
      "Fast, considered digital experiences that make it easier for the right people to say yes.",
    tags: ["Web design", "Development", "E-commerce"],
  },
  {
    number: "03",
    title: "Growth & content",
    description:
      "Useful content and practical campaigns designed to build momentum, not just noise.",
    tags: ["Social", "Campaigns", "SEO"],
  },
];

const projects = [
  {
    name: "Forma Objects",
    type: "Brand & digital",
    category: "Brand",
    style: "forma",
    mark: "f.",
    note: "Objects for everyday rituals",
  },
  {
    name: "Northline Studio",
    type: "Website",
    category: "Web",
    style: "northline",
    mark: "N",
    note: "Spaces with a point of view",
  },
  {
    name: "Goodside Coffee",
    type: "Brand & campaign",
    category: "Growth",
    style: "goodside",
    mark: "goodside",
    note: "A brighter kind of daily",
  },
  {
    name: "Fieldwork Goods",
    type: "E-commerce",
    category: "Web",
    style: "fieldwork",
    mark: "FIELDWORK",
    note: "Made for the long way round",
  },
  {
    name: "Sunday Supply",
    type: "Identity",
    category: "Brand",
    style: "sunday",
    mark: "SUNDAY",
    note: "Take the day as it comes",
  },
  {
    name: "Relay Health",
    type: "Digital experience",
    category: "Web",
    style: "relay",
    mark: "relay",
    note: "Care that moves with you",
  },
];

const packages = [
  {
    name: "The essentials",
    detail: "For a focused start",
    price: "From $1,200",
    items: ["One clear project scope", "A dedicated creative partner", "2–3 week delivery"],
  },
  {
    name: "The full picture",
    detail: "For a brand ready to grow",
    price: "From $3,500",
    featured: true,
    items: ["Strategy through launch", "Brand and digital design", "Ongoing growth support"],
  },
  {
    name: "Ongoing studio",
    detail: "For the work that keeps moving",
    price: "Custom retainer",
    items: ["Flexible monthly support", "Priority project planning", "A team in your corner"],
  },
];

const filters = ["All work", "Brand", "Web", "Growth"];

function whatsappUrl(message, settings) {
  const number = settings.whatsapp_number.replace(/\D/g, "");
  const baseUrl = number ? `https://wa.me/${number}` : "https://wa.me/";
  return `${baseUrl}?text=${encodeURIComponent(message)}`;
}

function instagramProfileUrl(settings) {
  const configuredUrl = settings.instagram_url.trim();
  if (configuredUrl) {
    try {
      const url = new URL(configuredUrl);
      if (url.protocol === "https:" && ["instagram.com", "www.instagram.com"].includes(url.hostname.toLowerCase())) {
        return url.toString();
      }
    } catch {
      // Use the configured username or the Instagram homepage for invalid remote values.
    }
  }

  const username = settings.instagram_username.trim().replace(/^@+/, "");
  return username ? `https://www.instagram.com/${encodeURIComponent(username)}/` : "https://www.instagram.com/";
}

function instagramDmUrl(settings) {
  const username = settings.instagram_username.trim().replace(/^@+/, "");
  return username
    ? `https://ig.me/m/${encodeURIComponent(username)}`
    : instagramProfileUrl(settings);
}

function InstagramIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <rect height="14" rx="4" stroke="currentColor" strokeWidth="1.5" width="14" x="3" y="3" />
      <circle cx="10" cy="10" r="3.2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="14.7" cy="5.6" fill="currentColor" r="1" />
    </svg>
  );
}

function ArrowIcon({ diagonal = false }) {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 16 16"
    >
      {diagonal ? (
        <path d="M4 12 12 4M5 4h7v7" stroke="currentColor" strokeWidth="1.5" />
      ) : (
        <path d="M2.5 8h10m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
      )}
    </svg>
  );
}

function Logo() {
  return (
    <a aria-label="WORKZENN home" className="brand-mark" href="#home">
      WORKZENN<span>.</span>
    </a>
  );
}

function SectionHeading({ eyebrow, title, copy, id }) {
  return (
    <div className="section-heading" id={id}>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {copy && <p className="section-copy">{copy}</p>}
    </div>
  );
}

function ProjectCard({ project }) {
  return (
    <article className={`project-card project-${project.style}`}>
      <div
        aria-label={`${project.name} project preview`}
        className="project-art"
        role="img"
      >
        <span className="project-art-mark">{project.mark}</span>
        <span className="project-art-note">{project.note}</span>
        <span aria-hidden="true" className="project-orbit" />
        <span aria-hidden="true" className="project-shape" />
      </div>
      <div className="project-meta">
        <div>
          <h3>{project.name}</h3>
          <p>{project.type}</p>
        </div>
        <span className="project-arrow" aria-hidden="true">
          <ArrowIcon diagonal />
        </span>
      </div>
    </article>
  );
}

function App() {
  const { settings } = useSocialSettings();
  const [activeFilter, setActiveFilter] = useState("All work");
  const [menuOpen, setMenuOpen] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);

  const visibleProjects =
    activeFilter === "All work"
      ? projects
      : projects.filter((project) => project.category === activeFilter);

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleTrialSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const details = [
      "Hi WORKZENN, I'd like to claim a free trial consultation.",
      `Name: ${formData.get("name")}`,
      `Email: ${formData.get("email")}`,
      `Business: ${formData.get("business") || "Not provided"}`,
      `I'm interested in: ${formData.get("service")}`,
    ].join("\n");

    window.open(whatsappUrl(details, settings), "_blank", "noopener,noreferrer");
    setFormSubmitted(true);
    event.currentTarget.reset();
  }

  return (
    <>
      <header className="site-header">
        <nav aria-label="Main navigation" className="nav-shell">
          <Logo />
          <button
            aria-controls="primary-navigation"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className={`menu-toggle${menuOpen ? " is-open" : ""}`}
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            <span />
            <span />
          </button>
          <div
            className={`nav-content${menuOpen ? " nav-content-open" : ""}`}
            id="primary-navigation"
          >
            <div className="nav-links">
              <a href="#services" onClick={closeMenu}>Services</a>
              <a href="#work" onClick={closeMenu}>Work</a>
              <a href="#about" onClick={closeMenu}>About</a>
              <a href="#pricing" onClick={closeMenu}>Pricing</a>
            </div>
            <a
              aria-label="Visit WORKZENN on Instagram"
              className="instagram-icon-button"
              href={instagramProfileUrl(settings)}
              onClick={closeMenu}
              rel="noreferrer"
              target="_blank"
            >
              <InstagramIcon />
            </a>
            <a className="button button-small button-red nav-cta" href="#contact" onClick={closeMenu}>
              Let&apos;s talk <ArrowIcon diagonal />
            </a>
          </div>
        </nav>
      </header>

      <main>
        <section className="hero section-wrap" id="home">
          <div className="hero-copy">
            <p className="eyebrow"><span className="status-dot" /> Independent digital studio</p>
            <h1>
              Make your next
              <br />
              move <span className="text-red">matter.</span>
            </h1>
            <p className="hero-description">
              We turn good ideas into brands, websites, and digital experiences
              built to move your business forward.
            </p>
            <div className="hero-actions">
              <a className="button button-red" href="#contact">
                Start a project <ArrowIcon diagonal />
              </a>
              <a className="text-link" href="#work">
                See our work <ArrowIcon />
              </a>
              <a className="text-link instagram-follow" href={instagramProfileUrl(settings)} rel="noreferrer" target="_blank">
                Follow us <InstagramIcon />
              </a>
            </div>
            <div className="hero-footnote">
              <span className="avatar-stack" aria-hidden="true"><i>W</i><i>+</i><i>✳</i></span>
              <span>Small team. Big-picture thinking.</span>
            </div>
          </div>
          <div aria-label="Abstract red and black WORKZENN artwork" className="hero-art" role="img">
            <div className="hero-art-grid" />
            <div className="hero-art-ring ring-one" />
            <div className="hero-art-ring ring-two" />
            <div className="hero-art-core"><span>W</span></div>
            <div className="hero-art-caption"><span>Independent by design</span><span>01 — 04</span></div>
          </div>
          <div className="hero-index"><span>01</span><span className="index-line" /><span>04</span></div>
        </section>

        <section aria-label="Studio highlights" className="proof-bar">
          <div><strong>12+</strong><span>years creating</span></div>
          <div><strong>80</strong><span>brands moved forward</span></div>
          <div><strong>14</strong><span>countries reached</span></div>
          <div className="proof-note"><span className="status-dot" /> Good people, good work.</div>
        </section>

        <section className="section-wrap content-section" id="services">
          <SectionHeading
            eyebrow="What we do"
            title={<>Creative work.<br />Clear outcomes.</>}
            copy="One thoughtful team, from the first big question to the final details."
          />
          <div className="service-grid">
            {services.map((service) => (
              <a
                className="service-card"
                href={whatsappUrl(`Hi WORKZENN, I'd like to talk about ${service.title.toLowerCase()}.`, settings)}
                key={service.number}
                rel="noreferrer"
                target="_blank"
              >
                <div className="service-top"><span>{service.number}</span><ArrowIcon diagonal /></div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <div className="tag-list">
                  {service.tags.map((tag) => <span key={tag}>{tag}</span>)}
                </div>
              </a>
            ))}
          </div>
        </section>

        <section className="work-section content-section" id="work">
          <div className="section-wrap">
            <SectionHeading
              eyebrow="Selected work"
              title={<>Built with purpose.<br />Made to last.</>}
              copy="A few recent collaborations with people doing things differently."
            />
            <div aria-label="Filter projects" className="filter-list">
              {filters.map((filter) => (
                <button
                  aria-pressed={activeFilter === filter}
                  className={`filter-button${activeFilter === filter ? " filter-active" : ""}`}
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  type="button"
                >
                  {filter}
                </button>
              ))}
            </div>
            <div aria-live="polite" className="project-grid">
              {visibleProjects.map((project) => <ProjectCard key={project.name} project={project} />)}
            </div>
          </div>
        </section>

        <section className="about-section content-section" id="about">
          <div className="section-wrap about-layout">
            <div className="about-stamp" aria-hidden="true">
              <span>GOOD WORK</span><strong>↗</strong><span>GOOD PEOPLE</span>
            </div>
            <div className="about-copy">
              <p className="eyebrow">A little about us</p>
              <h2>Independent thinking.<br /><span className="text-red">In it together.</span></h2>
              <p>
                WORKZENN is a close-knit digital agency for ambitious people.
                We keep teams small, conversations honest, and the work focused
                on what actually makes a difference.
              </p>
              <a className="text-link" href="#contact">Get to know us <ArrowIcon /></a>
            </div>
          </div>
        </section>

        <section className="section-wrap content-section" id="pricing">
          <SectionHeading
            eyebrow="Straightforward pricing"
            title={<>Good work, without<br />the guesswork.</>}
            copy="Every project is different. These starting points give us a good place to begin."
          />
          <div className="pricing-grid">
            {packages.map((plan) => (
              <article className={`price-card${plan.featured ? " price-featured" : ""}`} key={plan.name}>
                {plan.featured && <span className="popular-label">A good place to start</span>}
                <p className="eyebrow">{plan.detail}</p>
                <h3>{plan.name}</h3>
                <p className="price">{plan.price}</p>
                <ul>
                  {plan.items.map((item) => <li key={item}><span aria-hidden="true">+</span>{item}</li>)}
                </ul>
                <a
                  className={`button${plan.featured ? " button-red" : " button-outline"}`}
                  href={whatsappUrl(`Hi WORKZENN, I'm interested in the "${plan.name}" package. Can we talk?`, settings)}
                  rel="noreferrer"
                  target="_blank"
                >
                  Enquire about this <ArrowIcon diagonal />
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="trial-section content-section" id="contact">
          <div className="section-wrap trial-layout">
            <div className="trial-copy">
              <p className="eyebrow"><span className="status-dot" /> No pressure. Just a good start.</p>
              <h2>Let&apos;s make<br />something <span className="text-red">click.</span></h2>
              <p>
                Tell us a little about what you&apos;re working on. We&apos;ll make
                time for a complimentary 30-minute consultation.
              </p>
              <div className="contact-note"><span>↗</span><span>Usually reply within one business day.</span></div>
              <div className="contact-social-links">
                <a className="button button-outline" href={instagramDmUrl(settings)} rel="noreferrer" target="_blank">
                  Message us on Instagram <InstagramIcon />
                </a>
                {settings.business_email && (
                  <a className="contact-email" href={`mailto:${settings.business_email}`}>
                    {settings.business_email}
                  </a>
                )}
              </div>
            </div>
            <form className="trial-form" onSubmit={handleTrialSubmit}>
              <div className="form-heading">
                <div><span className="eyebrow">Your first step</span><h3>Book a free consultation</h3></div>
                <span className="form-step">01 / 01</span>
              </div>
              <label>
                Your name <span>*</span>
                <input autoComplete="name" name="name" placeholder="How should we call you?" required />
              </label>
              <label>
                Email address <span>*</span>
                <input autoComplete="email" name="email" placeholder="you@company.com" required type="email" />
              </label>
              <label>
                Business or website
                <input autoComplete="organization" name="business" placeholder="Your brand or URL (optional)" />
              </label>
              <label>
                What are you looking for? <span>*</span>
                <select defaultValue="" name="service" required>
                  <option disabled value="">Choose an area</option>
                  <option>Brand and identity</option>
                  <option>Website and digital</option>
                  <option>Growth and content</option>
                  <option>Not sure yet</option>
                </select>
              </label>
              <button className="button button-red form-submit" type="submit">
                Send your enquiry <ArrowIcon diagonal />
              </button>
              <p aria-live="polite" className="form-feedback">
                {formSubmitted
                  ? "Your message is ready in WhatsApp. Send it there and we'll be in touch."
                  : "No spam, no hard sell. Just a human conversation."}
              </p>
            </form>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="section-wrap footer-main">
          <div><Logo /><p>Digital, made to move you forward.</p></div>
          <div className="footer-links">
            <a href="#services">Services</a>
            <a href="#work">Work</a>
            <a href="#about">About</a>
            <a href="#pricing">Pricing</a>
            <a href="#contact">Contact</a>
            <a href={instagramProfileUrl(settings)} rel="noreferrer" target="_blank">Instagram</a>
          </div>
          <a className="footer-contact" href={whatsappUrl("Hi WORKZENN, I'd like to start a conversation.", settings)} rel="noreferrer" target="_blank">
            Have a good one in mind? <span>Let&apos;s talk <ArrowIcon diagonal /></span>
          </a>
        </div>
        <div className="section-wrap footer-bottom">
          <span>© {new Date().getFullYear()} WORKZENN Studio</span>
          <span>Independent by design. Connected by good work.</span>
          <a href="#home">Back to top ↑</a>
        </div>
      </footer>
    </>
  );
}

export default App;
