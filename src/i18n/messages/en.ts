export interface Messages {
  nav: {
    home: string;
    works: string;
    blog: string;
    about: string;
    contact: string;
    toggleTheme: string;
    toggleLanguage: string;
    toggleMenu: string;
  };
  home: {
    meta: { title: string; description: string };
    eyebrow: string;
    title: string;
    lead: string;
    cta1: string;
    cta2: string;
  };
  about: {
    meta: { title: string; description: string };
    eyebrow: string;
    title1: string;
    title2: string;
    intro: string;
    contactTitle: string;
    profile: {
      name: string;
      role: string;
      location: string;
      availability: string;
      downloadCv: string;
    };
    contact: {
      email: string;
      website: string;
      github: string;
      linkedin: string;
    };
    labels: {
      summary: string;
      experience: string;
      education: string;
      skills: string;
      languages: string;
      projects: string;
      interests: string;
    };
    summary: string;
    experience: {
      role: string;
      company: string;
      location: string;
      period: string;
      bullets: string[];
      tags: string[];
    }[];
    education: {
      degree: string;
      school: string;
      period: string;
      note: string;
    }[];
    skills: { group: string; items: string[] }[];
    languages: { name: string; level: string; score: number }[];
    cards: {
      label: string;
      status?: string;
      title: string;
      description: string;
      href?: string;
      linkText?: string;
    }[];
    personal: string;
    ctaText: string;
    cta1: string;
    cta2: string;
  };
  works: {
    meta: { title: string; description: string };
    eyebrow: string;
    title1: string;
    title2: string;
    intro: string;
    filterLabel: string;
    filters: { all: string; open: string; closed: string };
    kind: { open: string; closed: string };
    status: { live: string; wip: string; archived: string };
    links: { source: string; site: string };
    detail: {
      back: string;
      comingSoon: string;
      imagePlaceholder: string;
      toc: string;
      problem: string;
      solution: string;
      considered: string;
      /** Joins the names listed after `considered`. */
      listSeparator: string;
      chose: string;
      /** Page title of a work; "{title}" is replaced with the work's title. */
      metaTitle: string;
    };
    items: { slug: string; title: string; description: string }[];
  };
  blog: {
    meta: { title: string; description: string };
    eyebrow: string;
    title1: string;
    title2: string;
    intro: string;
    filterLabel: string;
    filters: { all: string };
    topics: {
      algorithm: string;
      framework: string;
      comparison: string;
      notes: string;
    };
    /** "{n}" is replaced with the number of minutes. */
    readTime: string;
    items: { slug: string; title: string; description: string }[];
  };
  contact: {
    meta: { title: string; description: string };
    eyebrow: string;
    title1: string;
    title2: string;
    intro: string;
    newTab: string;
    /** One line per social, joined to `lib/socials.ts` by `id`. */
    items: { id: string; description: string }[];
  };
  footer: {
    copyright: string;
  };
  notFound: {
    description: string;
    title: string;
    eyebrow: string;
    title1: string;
    title2: string;
    intro: string;
    home: string;
    works: string;
  };
  /** Strings of the FlappyBird mini-game. `{passed}` and `{total}` are filled in by the game. */
  flappy: {
    label: string;
    gates: string;
    ready: { title: string; hint: string };
    paused: { title: string; hint: string };
    lost: { title: string; body: string; action: string };
    won: { title: string; body: string; action: string };
  };
}

export default {
  nav: {
    home: "Home",
    works: "Works",
    blog: "Blog",
    about: "About",
    contact: "Contact",
    toggleTheme: "Toggle theme",
    toggleLanguage: "Toggle language",
    toggleMenu: "Toggle menu",
  },
  home: {
    meta: {
      title: 'Taha "Voxes" Haghighi - Homepage',
      description: "Homepage of Taha Haghighi, also known as Voxes. I'm an Iranian software developer.",
    },
    eyebrow: 'Taha "Voxes" Haghighi',
    title: "Building a Living World",
    lead: "I'm a self-taught developer who enjoys building anything interactive.",
    cta1: "See my work",
    cta2: "Get in touch",
  },
  about: {
    meta: {
      title: 'Taha "Voxes" Haghighi - About me',
      description: 'Learn about Taha Haghighi, AKA "Voxes", a software developer from Rasht, Iran.',
    },
    eyebrow: "About Me",
    title1: "I enjoy building things that can be ",
    title2: "experienced.",
    intro: "I love seeing my work come to fruition, appreciating the precision behind it, and watching people experience what I've made.",
    contactTitle: "Contact",
    profile: {
      name: "Taha Haghighi",
      role: "Full-stack & systems developer",
      location: "Rasht, Iran",
      availability: "Open to new projects",
      downloadCv: "Download CV",
    },
    contact: {
      email: "Email",
      website: "Website" ,
      github: "GitHub",
      linkedin: "LinkedIn",
    },
    labels: {
      summary: "Summary",
      experience: "Selected works",
      education: "Education",
      skills: "Skills",
      languages: "Languages",
      projects: "Selected projects",
      interests: "Beyond work",
    },
    summary:
      "I'm a self-taught full-stack developer who also writes low-level programs in Rust. On the frontend, I like to build creative, distinctive visuals. On the backend, I have experience with Node.js and, to a lesser extent, .NET. I'm currently building a particle-based fluid simulation library in Rust.",
    experience: [
      {
        role: "Vofluid Fluid Simulation Library",
        company: "",
        location: "",
        period: "2025 – Present",
        bullets: [
          "An open-source, particle-based, cross-platform fluid simulation library.",
          "Currently implements the viscoelastic fluid solver from Clavet et al. (2005), with more solvers planned.",
          "Runs single-threaded, multi-threaded, or on the GPU through compute shaders.",
        ],
        tags: ["Rust", "Multithreaded", "Compute Shader"],
      },
      {
        role: "My Personal Website",
        company: "",
        location: "",
        period: "2026",
        bullets: [
          "A fully static website I made for myself.",
          "Built with Astro and Solid.js.",
        ],
        tags: ["Astro", "Solid.js", "TypeScript"],
      },
      {
        role: "Kazheh House Website",
        company: "Kazheh House Boutique Hotel",
        location: "Rasht",
        period: "2026",
        bullets: [
          "A bilingual website for the Kazheh House boutique hotel, built with Next.js and written from scratch for the hotel's needs.",
          "A custom reservation system that replaced the Excel spreadsheets and made booking easier for staff and guests.",
          "An admin panel for managing reservations, staff accounts, and the website's media."
        ],
        tags: ["Next.js", "React", "TypeScript", "PostgreSQL"],
      },
    ],
    education: [
      {
        degree: "Diploma in Humanities",
        school: "Shahid Rajayi High School",
        period: "2022 – 2026",
        note: "I began learning to code around 2020. In 2023, I decided to pursue it as a career and have been learning from online sources ever since.",
      },
    ],
    skills: [
      { group: "Programming languages", items: ["JavaScript", "TypeScript", "C#", "Rust"] },
      { group: "Frontend", items: ["Next.js", "Astro", "Solid", "React"] },
      { group: "Backend & tools", items: ["Node.js", "PostgreSQL", "Git"] },
    ],
    languages: [
      { name: "Persian", level: "Native", score: 5 },
      { name: "English", level: "Fluent", score: 4 },
      { name: "Russian", level: "Beginner", score: 1 },
    ],
    cards: [
      {
        label: "In progress",
        status: "Work in progress",
        title: "A fluid engine, built from scratch",
        description:
          "",
      },
      {
        label: "Shipped",
        status: "Live",
        title: "Kazheh — a boutique hotel, online",
        description:
          "",
        href: "/works",
        linkText: "See it on Works",
      },
    ],
    personal:
      "Outside work, I'm prototyping a video game with the Bevy game engine. When I'm not coding, I'm usually enjoying story heavy video games, practicing the violin, learning Russian, or reading classic literature, often from Russian authors.",
    ctaText: "Check out what I've worked on, or contact me to build something together.",
    cta1: "See my work",
    cta2: "Get in touch",
  },
  works: {
    meta: {
      title: 'Taha "Voxes" Haghighi - My Works',
      description: "Selected works by Voxes, also known as Taha Haghighi. Find out what I've worked on.",
    },
    eyebrow: "My Works",
    title1: "Things I've ",
    title2: "built.",
    intro:
      "Here are my most prominent works. They range from personal practical projects, to client sites and open source libraries.",
    filterLabel: "Filter by source",
    filters: { all: "All", open: "Open source", closed: "Closed source" },
    kind: { open: "Open source", closed: "Closed source" },
    status: { live: "Live", wip: "In progress", archived: "Archived" },
    links: { source: "Source code", site: "Visit website" },
    detail: {
      back: "All works",
      comingSoon: "Placeholder: this project's own page is not built yet.",
      imagePlaceholder: "Photo goes here",
      toc: "On this page",
      problem: "The problem",
      solution: "How I solved it",
      considered: "Also considered",
      listSeparator: ", ",
      chose: "Chosen",
      metaTitle: "Voxes - {title}",
    },
    items: [
      {
        slug: "kazheh",
        title: "Kazheh",
        description:
          "Placeholder description: a bilingual booking site for a small hotel, built for a real client from first sketch to launch.",
      },
      {
        slug: "vofluid",
        title: "vofluid",
        description:
          "Placeholder description: a particle-based fluid simulation written from scratch, with a longer second sentence here to check how the row behaves when the text runs past two lines on narrow screens.",
      },
      {
        slug: "voxes",
        title: "Voxes",
        description:
          "Placeholder description: this very site, built code-first with no builder and no template.",
      },
      {
        slug: "placeholder-four",
        title: "Placeholder Four",
        description:
          "Placeholder description: an older closed-source project kept here for the record.",
      },
      {
        slug: "placeholder-five",
        title: "Placeholder Five",
        description:
          "Placeholder description: a small open-source tool with a short blurb.",
      },
    ],
  },
  blog: {
    meta: {
      title: 'Taha "Voxes" Haghighi - Blog',
      description: "Taha Haghighi, also known as Voxes writes on various topics such as technical problems, frameworks and alghoritms, as well as personal workflow.",
    },
    // TODO: placeholder copy — replace with real posts.
    eyebrow: "Blog",
    title1: "Notes on ",
    title2: "how things work.",
    intro:
      "Short technical reads on topics such as frameworks, particular technical problems, my personal workflow and whatever else I felt would be worth writing about.",
    filterLabel: "Filter by topic",
    filters: { all: "All" },
    topics: {
      algorithm: "Algorithm",
      framework: "Framework",
      comparison: "Comparison",
      notes: "Notes",
    },
    readTime: "{n} min read",
    items: [
      {
        slug: "sph-from-scratch",
        title: "Smoothed-particle hydrodynamics, without the hand-waving",
        description:
          "Placeholder description: how a pile of particles becomes water, and the one kernel choice that decides whether your simulation explodes.",
      },
      {
        slug: "astro-vs-next",
        title: "Astro or Next.js for a content site?",
        description:
          "Placeholder description: what each ships to the browser, where each one gets in your way, and how I'd pick.",
      },
      {
        slug: "a-star-heuristics",
        title: "A* is only as good as its heuristic",
        description:
          "Placeholder description: admissible, consistent, and why a slightly wrong guess can be a feature.",
      },
      {
        slug: "css-has-selector",
        title: "Things :has() quietly made possible",
        description:
          "Placeholder description: scriptless filters, form-aware layouts and other small wins.",
      },
      {
        slug: "wasm-or-not",
        title: "Rust to WASM: when it pays off, when it doesn't",
        description:
          "Placeholder description: measuring the boundary-crossing cost before rewriting anything.",
      },
      {
        slug: "why-i-write-here",
        title: "Why I keep a blog at all",
        description:
          "Placeholder description: a short note on writing things down to understand them.",
      },
    ],
  },
  contact: {
    meta: {
      title: 'Taha "Voxes" Haghighi - Blog',
      description: "Get in touch with Taha Haghighi, also known as Voxes. Links to his various channels of communication.",
    },
    eyebrow: "Contact",
    title1: "Ways to reach ",
    title2: "me.",
    intro:
      "The best way to contact me depends on what you need.",
    newTab: "(opens in a new tab)",
    items: [
      {
        id: "linkedin",
        description:
          "My professional background.",
      },
      {
        id: "github",
        description:
          "Code for my open-source work.",
      },
      {
        id: "telegram",
        description: "Quickly and conveniently message me.",
      },
      {
        id: "instagram",
        description: "Personal updates on life.",
      },
      {
        id: "x",
        description: "Short thoughts and updates on what I'm building.",
      },
      {
        id: "discord",
        description: "We can chat about code and games.",
      },
    ],
  },
  footer: {
    copyright: "All rights reserved",
  },
  notFound: {
    description: "This page could not be found.",
    title: 'Taha "Voxes" Haghighi - Page not found',
    eyebrow: "Error 404",
    title1: "This page ",
    title2: "flew away.",
    intro:
      "The page you were looking for does not exist, or it has moved. While you are here, why not help this bird get to its home?",
    home: "Back to home",
    works: "See my work",
  },
  flappy: {
    label: "Flappy bird mini-game",
    gates: "Gates",
    ready: {
      title: "Ready?",
      hint: "Press Space or tap to flap, and fly through every gate.",
    },
    paused: {
      title: "Paused",
      hint: "Press Space or tap to continue.",
    },
    lost: {
      title: "Crashed:(",
      body: "You cleared {passed} of {total} gates.",
      action: "Try again",
    },
    won: {
      title: "You made it!",
      body: "All {total} gates cleared.",
      action: "Play again",
    },
  },
} satisfies Messages;