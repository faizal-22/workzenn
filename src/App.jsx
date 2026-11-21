import { useEffect, useState } from "react";
import { useSocialSettings } from "./contexts/SocialSettingsContext.jsx";
import { supabase } from "./lib/supabase.js";

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
const INSTAGRAM_PROFILE_URL = "https://www.instagram.com/_workzennn_/";
const originalProjectStyles = {
  "Forma Objects": "forma",
  "Northline Studio": "northline",
  "Goodside Coffee": "goodside",
  "Fieldwork Goods": "fieldwork",
  "Sunday Supply": "sunday",
  "Relay Health": "relay",
};

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

function Logo({ official = false }) {
  if (official) {
    return (
      <a aria-label="Home" className="brand-logo" href="/">
        <img alt="WORKZENN Official Logo" src="/assets/workzenn-official-logo.jpeg" />
      </a>
    );
  }

  return (
    <a aria-label="WORKZENN home" className="brand-mark" href="/">
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
        {project.asset_url ? (
          project.asset_type === "video"
            ? <video aria-label={`${project.name} project video`} controls muted playsInline src={project.asset_url} />
            : <img alt={`${project.name} project`} src={project.asset_url} />
        ) : (
          <>
            <span className="project-art-mark">{project.mark}</span>
            <span className="project-art-note">{project.note}</span>
            <span aria-hidden="true" className="project-orbit" />
            <span aria-hidden="true" className="project-shape" />
          </>
        )}
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
  const [visibleServices, setVisibleServices] = useState(services);
  const [visibleProjects, setVisibleProjects] = useState(projects);
  const [visiblePackages, setVisiblePackages] = useState(packages);
  const [activeFilter, setActiveFilter] = useState("All work");
  const [menuOpen, setMenuOpen] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState("");

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    async function loadPublishedContent() {
      const [portfolioResult, servicesResult, pricingResult] = await Promise.all([
        supabase.from("portfolio_samples").select("id,name,type,category,description,asset_url,asset_type").eq("published", true).order("sort_order", { ascending: true }),
        supabase.from("services").select("id,title,description,tags").eq("published", true).order("sort_order", { ascending: true }),
        supabase.from("pricing_plans").select("id,name,detail,price,items,featured").eq("published", true).order("sort_order", { ascending: true }),
      ]);
      if (!active) return;
      if (portfolioResult.error) console.error("Could not load published portfolio:", portfolioResult.error);
      else {
        setVisibleProjects(portfolioResult.data.map((project) => ({
          ...project,
          style: originalProjectStyles[project.name] || "managed",
          mark: project.name.slice(0, 1),
          note: project.description,
        })));
      }
      if (servicesResult.error) console.error("Could not load published services:", servicesResult.error);
      else if (servicesResult.data.length) setVisibleServices(servicesResult.data);
      if (pricingResult.error) console.error("Could not load published pricing:", pricingResult.error);
      else if (pricingResult.data.length) setVisiblePackages(pricingResult.data);
    }
    loadPublishedContent();
    return () => { active = false; };
  }, []);

  function closeMenu() {
    setMenuOpen(false);
  }

  async function handleTrialSubmit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    const request = {
      request_type: "trial",
      name: String(formData.get("name")).trim(),
      email: String(formData.get("email")).trim(),
      business: String(formData.get("business") || "").trim(),
      service: String(formData.get("service")),
      budget: String(formData.get("budget")),
      description: String(formData.get("description")).trim(),
    };

    window.open(INSTAGRAM_PROFILE_URL, "_blank", "noopener,noreferrer");
    setFormSubmitted(false);
    setFormSubmitting(true);
    setFormMessage("");

    if (!supabase) {
      setFormSubmitted(true);
      setFormMessage("We opened Instagram, but this enquiry could not be saved because the form service is unavailable. Please try again later.");
      setFormSubmitting(false);
      return;
    }

    let enquiryId;
    try {
      const { data, error: saveError } = await supabase.rpc("submit_customer_enquiry", {
        p_request_type: request.request_type,
        p_name: request.name,
        p_email: request.email,
        p_business: request.business,
        p_service: request.service,
        p_budget: request.budget,
        p_description: request.description,
      });
      if (saveError) throw saveError;
      enquiryId = data;
    } catch (error) {
      console.error("Could not save customer enquiry:", error);
      setFormSubmitted(true);
      setFormMessage("We opened Instagram, but your enquiry could not be saved. Please try again or message us on Instagram.");
      setFormSubmitting(false);
      return;
    }

    formElement.reset();
    setFormSubmitted(true);
    try {
      const { data: notification, error: notificationError } = await supabase.functions.invoke(
        "send-enquiry-notification",
        { body: { enquiryId } },
      );
      if (notificationError || notification?.status !== "sent") {
        console.error("Enquiry saved, but email notification was not delivered:", notificationError || notification);
        setFormMessage("Your enquiry was saved and WORKZENN will follow up. Email notification is pending; you can also message us on Instagram.");
      } else {
        setFormMessage("Your enquiry was saved and sent to WORKZENN. Instagram opened in a new tab if you'd also like to say hello.");
      }
    } catch (error) {
      console.error("Enquiry saved, but email notification request failed:", error);
      setFormMessage("Your enquiry was saved and WORKZENN will follow up. Email notification is pending; you can also message us on Instagram.");
    } finally {
      setFormSubmitting(false);
    }
  }

  return (
    <>
      <header className="site-header">
        <nav aria-label="Main navigation" className="nav-shell">
          <Logo official />
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
              href={INSTAGRAM_PROFILE_URL}
              onClick={closeMenu}
              rel="noreferrer"
              target="_blank"
            >
              <InstagramIcon />
            </a>
            <a className="button button-small button-red nav-cta" href={INSTAGRAM_PROFILE_URL} onClick={closeMenu} rel="noreferrer" target="_blank">
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
              <a className="button button-red" href={INSTAGRAM_PROFILE_URL} rel="noreferrer" target="_blank">
                Start a project <ArrowIcon diagonal />
              </a>
              <a className="text-link" href="#work">
                See our work <ArrowIcon />
              </a>
              <a className="text-link instagram-follow" href={INSTAGRAM_PROFILE_URL} rel="noreferrer" target="_blank">
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
            {visibleServices.map((service) => (
              <a
                className="service-card"
                href={INSTAGRAM_PROFILE_URL}
                key={service.id || service.number}
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
              {(activeFilter === "All work"
                ? visibleProjects
                : visibleProjects.filter((project) => project.category === activeFilter)
              ).map((project) => <ProjectCard key={project.id || project.name} project={project} />)}
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
              <a className="text-link" href={INSTAGRAM_PROFILE_URL} rel="noreferrer" target="_blank">Get to know us <ArrowIcon diagonal /></a>
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
            {visiblePackages.map((plan) => (
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
                  href={INSTAGRAM_PROFILE_URL}
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
                <a className="button button-outline" href={INSTAGRAM_PROFILE_URL} rel="noreferrer" target="_blank">
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
              <label>
                Project budget <span>*</span>
                <select defaultValue="" name="budget" required>
                  <option disabled value="">Choose a budget range</option>
                  <option>Under $1,200</option>
                  <option>$1,200–$3,500</option>
                  <option>$3,500–$7,500</option>
                  <option>$7,500+</option>
                  <option>Not sure yet</option>
                </select>
              </label>
              <label>
                Project description <span>*</span>
                <textarea autoComplete="off" maxLength={5000} minLength={10} name="description" placeholder="Tell us what you are looking to create or improve..." required rows="4" />
              </label>
              <button className="button button-red form-submit" disabled={formSubmitting} type="submit">
                {formSubmitting ? "Saving enquiry..." : "Send enquiry & open Instagram"} <ArrowIcon diagonal />
              </button>
              <p aria-live="polite" className={`form-feedback${formSubmitted && formMessage.includes("could not") ? " form-feedback-error" : ""}`}>
                {formSubmitted
                  ? formMessage
                  : "Your enquiry is saved securely. Instagram opens in a new tab when you submit."}
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
            <a href={INSTAGRAM_PROFILE_URL} rel="noreferrer" target="_blank">Contact</a>
            <a href={INSTAGRAM_PROFILE_URL} rel="noreferrer" target="_blank">Instagram</a>
          </div>
          <a className="footer-contact" href={INSTAGRAM_PROFILE_URL} rel="noreferrer" target="_blank">
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
