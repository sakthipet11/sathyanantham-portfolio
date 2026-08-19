-- ============================================================================
-- 001_SEED_PORTFOLIO_DATA.SQL (Sathyanantham V Portfolio & Resume Database Seeds)
-- ============================================================================

-- Profile Seed
INSERT INTO profiles (id, name, title, headline, email, phone, location, linkedin_url, github_url, summary)
VALUES (
    '88888888-8888-8888-8888-888888888888',
    'Sathyanantham V',
    'Frontend Architect & Lead Software Engineer',
    'Frontend Architect | Lead Software Engineer | Micro Frontends & AI-Assisted Engineering (13+ Yrs)',
    'v.sathyanantham@gmail.com',
    '+91 8870956756',
    'Coimbatore, Tamil Nadu, India',
    'https://www.linkedin.com/in/sathyanantham-v-646b911b',
    'https://github.com/sakthipet11',
    'Frontend Architect and Lead Software Engineer with 13+ years designing and scaling enterprise UI platforms, Micro Frontend ecosystems, and AI-assisted engineering workflows across Retail, Digital Commerce, Banking, and Order Management.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    title = EXCLUDED.title,
    headline = EXCLUDED.headline,
    email = EXCLUDED.email,
    location = EXCLUDED.location,
    summary = EXCLUDED.summary;

-- Skills Seeds
TRUNCATE TABLE skills RESTART IDENTITY CASCADE;
INSERT INTO skills (name, category, proficiency, display_order) VALUES
-- Frontend Architecture
('React 19 & Next.js 15 (App Router)', 'frontend', 'expert', 1),
('TypeScript & Modern JavaScript ES6+', 'frontend', 'expert', 2),
('Micro Frontend Architectures (Module Federation)', 'frontend', 'expert', 3),
('Tailwind CSS v4 & Glassmorphic UI', 'frontend', 'expert', 4),
('Framer Motion & Three.js / WebGL', 'frontend', 'expert', 5),
('Redux Toolkit & Zustand State Store', 'frontend', 'expert', 6),
('Webpack, Vite & Turbopack', 'frontend', 'expert', 7),
('WCAG AA Accessibility & Performance Optimization', 'frontend', 'expert', 8),

-- AI & RAG Engineering
('OpenRouter API Provider Layer', 'ai', 'expert', 9),
('Retrieval-Augmented Generation (RAG)', 'ai', 'expert', 10),
('LangChain & LangGraph Workflows', 'ai', 'expert', 11),
('Function Tool Calling & Memory Systems', 'ai', 'expert', 12),
('System Prompt Engineering & Claude Skills', 'ai', 'expert', 13),
('Vector Ingestion & Embeddings', 'ai', 'expert', 14),
('Streaming SSE & WebSockets', 'ai', 'expert', 15),
('AI-Powered UI Automation', 'ai', 'expert', 16),

-- Backend & Cloud Microservices
('Python 3.12+ (FastAPI, AsyncIO, Uvicorn)', 'backend', 'advanced', 17),
('Node.js & Express.js REST APIs', 'backend', 'advanced', 18),
('Supabase PostgreSQL & Realtime', 'backend', 'advanced', 19),
('MongoDB & Redis Caching', 'backend', 'advanced', 20),
('GraphQL & Microservices Architecture', 'backend', 'advanced', 21),
('Docker & Containerization', 'cloud', 'advanced', 22),
('AWS & GCP Cloud Infrastructure', 'cloud', 'advanced', 23),
('CI/CD Pipelines (Jenkins, GitHub Actions)', 'cloud', 'advanced', 24),

-- Leadership & Domain
('Technical Architecture & System Design', 'leadership', 'expert', 25),
('Order Management Systems (OMS & SKU Ranking)', 'leadership', 'expert', 26),
('High-Scale Retail E-Commerce (Kohl’s, Adidas)', 'leadership', 'expert', 27),
('Life Sciences & Healthcare Platforms (Bayer)', 'leadership', 'expert', 28),
('Cross-Functional Mentorship (8+ Engineers)', 'leadership', 'expert', 29),
('Code Review & Governance Best Practices', 'leadership', 'expert', 30);

-- Projects Seeds
TRUNCATE TABLE projects RESTART IDENTITY CASCADE;
INSERT INTO projects (title, description, overview, problem, solution, challenges, results, tech_stack, live_url, github_url, image_url, is_featured, display_order) VALUES
(
    'Nextuple Enterprise Order Management System',
    'High-performance order fulfillment suite including SKU Ranking Service, picking/packing/staging apps, Inventory Promise Engine, and Hub Web Application.',
    'Micro Frontend Architecture with React 19, Node.js, TypeScript, and AI-driven automated UI rendering.',
    'Fragmented legacy monolith order management workflows causing high latency during peak fulfillment hours.',
    'Architected modular Micro Frontends using Webpack Module Federation across 15+ sub-applications with real-time SSE updates.',
    'Ensuring zero-downtime cross-module state sync and sub-100ms render speeds for high-velocity store associates.',
    'Reduced deployment cycles from weeks to minutes and automated UI generation with Claude Skills reducing effort from 20 days to 5 days.',
    ARRAY['React 19', 'Micro Frontends', 'Node.js', 'TypeScript', 'Jest', 'AI UI Automation', 'Module Federation'],
    'https://nextuple.com',
    'https://github.com/sakthipet11',
    '/images/projects/nextuple-oms.png',
    true,
    1
),
(
    'BAYER 30+ Global Digital Ecosystem',
    'Multi-localized responsive platforms across 30+ global markets including Bepanthenol, Elevit, Bayer HR Career, and Heavy Menstrual Bleeding.',
    'Acquia DX8, Drupal theming engine, React.js components, and multi-tenant localization routing.',
    'Managing inconsistent brand experiences and localized regulatory requirements across 30+ country teams.',
    'Created a unified, reusable React & Acquia DX8 component design system with dynamic multi-tenant localization.',
    'Strict regulatory compliance for pharmaceutical marketing and multi-lingual RTL/LTR layout handling.',
    'Zero P1 production outages across 30+ global product launches and 40% faster region rollout.',
    ARRAY['React.js', 'Drupal DX8', 'Acquia', 'SASS', 'JavaScript ES6+', 'Multi-localization'],
    'https://www.elevit.com.au',
    'https://github.com/sakthipet11',
    '/images/projects/bayer-ecosystem.png',
    true,
    2
),
(
    'Kohl’s Omnichannel Mobile & Tablet Engine',
    'Mobile and tablet e-commerce suite (m.kohls.com, mobile.kohls.com) managing Home, Product List, Cart, BOPUS (Buy Online Pick Up In Store), and Checkout.',
    'High-throughput JavaScript/Handlebars/FTL engine integrated with REST APIs, Visa Checkout, and Omniture analytics.',
    'High bounce rates on legacy mobile web during Black Friday peak traffic surges.',
    'Engineered streamlined touch-optimized checkout funnel with Visa Checkout integration and fast asynchronous REST pipelines.',
    'Handling millions of concurrent checkout sessions with zero transactional errors during peak holiday sales.',
    'Drove double-digit growth in mobile conversion rate and seamless BOPUS store pickup integration.',
    ARRAY['JavaScript', 'Handlebars', 'Visa Checkout', 'REST APIs', 'Node.js', 'Omniture'],
    'https://m.kohls.com',
    'https://github.com/sakthipet11',
    '/images/projects/kohls-mobile.png',
    true,
    3
),
(
    'Adidas & Reebok E-Commerce Platform',
    'Responsive online shopping experience (shop.adidas.co.in, shop4reebok.com) with product discovery, cart management, and payment gateway.',
    'Full-stack React, Redux, Node.js, Express, and MongoDB micro-services architecture.',
    'Slow catalog search speeds and friction during cart-to-checkout transitions on mobile browsers.',
    'Built full-stack single page application with dynamic Redux store, optimized catalog indexing, and responsive UI controls.',
    'Optimizing client-side bundle size and Webpack chunking for low-bandwidth mobile connections.',
    'Boosted page load speeds by 50% and improved shopping cart conversion across India markets.',
    ARRAY['React.js', 'Redux', 'Node.js', 'ExpressJS', 'MongoDB', 'Webpack'],
    'https://shop.adidas.co.in',
    'https://github.com/sakthipet11',
    '/images/projects/adidas-reebok.png',
    true,
    4
),
(
    'US Bank Login & Authentication Help Portal',
    'Secure, accessible responsive web application for bank account login assistance, identity verification, and security retrieval.',
    'React.js, Styleguidist, Transmit framework, and WCAG AA accessibility compliance.',
    'High customer support call volume for password resets and identity verification issues.',
    'Designed accessible self-service identity verification workflows complying with strict financial accessibility and security benchmarks.',
    'Meeting WCAG AA 2.1 accessibility standards and rigorous banking security audits.',
    'Reduced customer support call volume by 35% and achieved 100% WCAG accessibility compliance score.',
    ARRAY['React JS', 'Jest', 'Transmit', 'WCAG AA Accessibility', 'SASS'],
    'https://usbank.com',
    'https://github.com/sakthipet11',
    '/images/projects/usbank-portal.png',
    true,
    5
),
(
    'Kraft Foods Culinary Platform',
    'Interactive recipe discovery and food service platform (kraftrecipes.com) serving culinary content and ingredient search.',
    'Responsive frontend template engine (FTL/Handlebars) integrated with CMS and REST APIs.',
    'Serving millions of daily recipe search requests with complex dietary and ingredient filter constraints.',
    'Built fast client-side filter engine with optimized image delivery and automated Google AMP recipe pages.',
    'Maintaining high Google Lighthouse SEO performance scores for top search rank.',
    'Over 10 million monthly active users with sub-second recipe search filtering speeds.',
    ARRAY['JavaScript', 'Handlebars', 'FTL Templates', 'REST APIs', 'CSS3/SASS'],
    'http://kraftrecipes.com',
    'https://github.com/sakthipet11',
    '/images/projects/kraft-recipes.png',
    true,
    6
);

-- Experience Seeds
TRUNCATE TABLE experience RESTART IDENTITY CASCADE;
INSERT INTO experience (company, role, duration, start_date, end_date, highlights, technologies, display_order) VALUES
(
    'Nextuple Inc.',
    'Lead Software Engineer (Leading 8 Engineers)',
    'Aug 2022 – Present',
    '2022-08-01',
    NULL,
    ARRAY[
        'Leading an engineering team of 8 developers across frontend and backend, establishing engineering standards, code reviews, and solution design.',
        'Designed and delivered Micro Frontend Architecture using Module Federation across 15+ enterprise modules and Nextuple OMS platforms (SKU Ranking, Promise Engine, Picking, Packing, Staging, Hub).',
        'Pioneered Claude Skills Initiative, designing reusable Claude Skills that automated UI Schema Generation, Design Docs, Code Gen, and Unit Test Gen—reducing engineering effort from ~20 days to 5 days.',
        'Led integration of IBM AI-powered chatbot into Call Center & Order Management applications and contributed to IBM Sterling OMS customizations for Tapestry, DSG, and Ashley Furniture.'
    ],
    ARRAY['React 19', 'Next.js 15', 'TypeScript', 'Micro Frontends', 'Claude Skills', 'IBM AI', 'IBM Sterling OMS', 'Node.js', 'Python', 'Spring Boot'],
    1
),
(
    'Cognizant Technology Solutions',
    'Senior Associate',
    'Nov 2018 – Aug 2022',
    '2018-11-01',
    '2022-08-01',
    ARRAY[
        'Architected 30+ global multi-localized responsive digital platforms for BAYER (Bepanthenol, Elevit, Bayer HR Career, Heavy Menstrual Bleeding).',
        'Engineered US Bank Login Help authentication portal with React.js, Transmit, and high security compliance.',
        'Utilized Acquia DX8, Drupal theming, JavaScript ES6+, and SASS to standardize global content management.',
        'Managed offshore technical delivery, task estimation, code reviews, and P1 issue resolution.'
    ],
    ARRAY['React.js', 'Drupal DX8', 'JavaScript ES6+', 'Acquia', 'SASS', 'Jest', 'Styleguidist'],
    2
),
(
    'Skava Systems (An Infosys Company)',
    'Dev Lead',
    'July 2012 – Nov 2018',
    '2012-07-01',
    '2018-11-01',
    ARRAY[
        'Led development of Kohl’s Omnichannel Mobile & Tablet platforms (m.kohls.com) managing 8+ engineers across Home, Checkout, BOPUS, and Loyalty modules.',
        'Pioneered Visa Checkout integration in mobile/tablet e-commerce, driving high conversion rates.',
        'Architected sportswear e-commerce platforms for Adidas & Reebok (shop.adidas.co.in, shop4reebok.com) using React, Redux, Node.js, Express, and MongoDB.',
        'Built Kraft Foods responsive culinary platform (kraftrecipes.com) serving millions of monthly active users.'
    ],
    ARRAY['React.js', 'Redux', 'Node.js', 'Express', 'MongoDB', 'JavaScript', 'HTML5/CSS3', 'Visa Checkout'],
    3
);

-- Education Seeds
TRUNCATE TABLE education RESTART IDENTITY CASCADE;
INSERT INTO education (institution, degree, duration, score, location, display_order) VALUES
('Dr. Mahalingam College of Engineering and Technology, Pollachi', 'Master of Computer Applications (MCA)', '2009 - 2012', '8.28 CGPA / 82.8%', 'Pollachi, Tamil Nadu, India', 1),
('Nallamuthu Gounder Mahalingam College, Pollachi', 'Bachelor of Science in Computer Science (B.Sc CS)', '2006 - 2009', '78.51%', 'Pollachi, Tamil Nadu, India', 2);

-- Certificates Seeds
TRUNCATE TABLE certificates RESTART IDENTITY CASCADE;
INSERT INTO certificates (name, issuer, issue_date, verification_url, display_order) VALUES
('Introduction to Agent Skills (Claude Certificate)', 'Anthropic / Claude', '2024-01-01', 'https://anthropic.com', 1);
