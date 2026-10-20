import type { Messages } from "./en";

export default {
  nav: {
    home: "خانه",
    works: "نمونه کارها",
    blog: "وبلاگ",
    about: "درباره من",
    contact: "تماس با من",
    toggleTheme: "تغییر تم",
    toggleLanguage: "تغییر زبان",
    toggleMenu: "باز و بسته کردن منو",
  },
  home: {
    meta: {
      title: "Voxes - خانه",
      description: "صفحه‌ی اصلی Voxes، معروف به طاها حقیقی.",
    },
    eyebrow: "طاها حقیقی — رشت، ایران",
    title: "دقت را جدی می‌گیرم",
    lead: "توسعه‌دهنده‌ای خودآموخته که هم رابط کاربری می‌سازد و هم سیستم زیرین آن را.",
    cta1: "دیدن نمونه‌کارها",
    cta2: "تماس بگیرید",
  },
  about: {
    meta: {
      title: "Voxes - درباره من",
      description: "رزومه‌ی Voxes، معروف به طاها حقیقی.",
    },
    // TODO: placeholder CV content — needs a real translation pass.
    eyebrow: "رزومه",
    title1: "دوست دارم ",
    title2: "عمیق برم.",
    intro:
      "برای کلاینت‌ها یعنی کار درست انجام بشه، نه فقط سریع. برای خودم یعنی دنبال مسائلی برم که هنوز کامل حل نشدن.",
    contactTitle: "تماس",
    profile: {
      name: "طاها حقیقی",
      role: "توسعه‌دهنده فول‌استک و سیستم",
      location: "شهر، کشور",
      availability: "آماده همکاری در پروژه‌های جدید",
      downloadCv: "دانلود رزومه",
    },
    contact: [
      { label: "ایمیل", value: "hello@example.com", href: "mailto:hello@example.com" },
      { label: "وب‌سایت", value: "voxes.example", href: "https://example.com" },
      { label: "گیت‌هاب", value: "github.com/username", href: "https://github.com" },
      { label: "لینکدین", value: "linkedin.com/in/username", href: "https://linkedin.com" },
    ],
    labels: {
      summary: "خلاصه",
      experience: "کارهای فریلنسری",
      education: "تحصیلات",
      skills: "مهارت‌ها",
      languages: "زبان‌ها",
      projects: "پروژه‌های منتخب",
      interests: "خارج از کار",
    },
    summary:
      "این یک متن نمونه است. توسعه‌دهنده‌ای با چند سال تجربه در ساخت اپلیکیشن‌های وب و ابزارهای سطح پایین. لورم ایپسوم متن ساختگی با تولید سادگی نامفهوم از صنعت چاپ.",
    experience: [
      {
        role: "مهندس نرم‌افزار ارشد",
        company: "نام شرکت",
        location: "شهر، کشور",
        period: "۱۴۰۲ — اکنون",
        bullets: [
          "لورم ایپسوم متن ساختگی با تولید سادگی نامفهوم از صنعت چاپ و با استفاده از طراحان گرافیک است.",
          "چاپگرها و متون بلکه روزنامه و مجله در ستون و سطرآنچنان که لازم است.",
          "کتابهای زیادی در شصت و سه درصد گذشته حال و آینده شناخت فراوان جامعه.",
        ],
        tags: ["Next.js", "TypeScript", "PostgreSQL"],
      },
      {
        role: "توسعه‌دهنده فول‌استک",
        company: "شرکت دیگر",
        location: "دورکاری",
        period: "۱۴۰۰ — ۱۴۰۲",
        bullets: [
          "در این صورت می‌توان امید داشت که تمام و دشواری موجود در ارائه راهکارها.",
          "و شرایط سخت تایپ به پایان رسد وزمان مورد نیاز شامل حروفچینی دستاوردهای اصلی.",
        ],
        tags: ["React", "Node.js", "Docker"],
      },
      {
        role: "توسعه‌دهنده فریلنسر",
        company: "کار آزاد",
        location: "دورکاری",
        period: "۱۳۹۸ — ۱۴۰۰",
        bullets: [
          "تکنولوژی مورد نیاز و کاربردهای متنوع با هدف بهبود ابزارهای کاربردی می‌باشد.",
          "کتابهای زیادی در شصت و سه درصد گذشته، حال و آینده شناخت فراوان جامعه.",
        ],
        tags: ["HTML/CSS", "JavaScript", "WordPress"],
      },
    ],
    education: [
      {
        degree: "دیپلم ریاضی فیزیک",
        school: "نام دبیرستان",
        period: "۱۳۹۰ — ۱۳۹۴",
        note: "",
      },
    ],
    skills: [
      { group: "زبان‌ها", items: ["TypeScript", "Rust", "C#", "Python"] },
      { group: "فرانت‌اند", items: ["Next.js", "Astro", "Solid", "Tailwind"] },
      { group: "بک‌اند و ابزار", items: ["Node.js", "PostgreSQL", "Docker", "Git"] },
    ],
    languages: [
      { name: "فارسی", level: "زبان مادری", score: 5 },
      { name: "انگلیسی", level: "مسلط", score: 4 },
      { name: "آلمانی", level: "مبتدی", score: 1 },
    ],
    cards: [
      {
        label: "در حال ساخت",
        status: "در حال ساخت",
        title: "یک موتور شبیه‌سازی سیالات، از پایه",
        description: "شبیه‌سازی هیدرودینامیک ذرات هموار (SPH) با Rust، از پایه نوشته شده.",
      },
      {
        label: "منتشر شده",
        status: "زنده",
        title: "کاژه — هتلی بوتیک، آنلاین",
        description: "وب‌سایت رزرو دوزبانه با Next.js برای یک هتل بوتیک.",
        href: "/works",
        linkText: "مشاهده در نمونه کارها",
      },
    ],
    personal:
      "بیرون از کار کلاینت‌ها، معمولاً درگیر یه چیز خاص دیگه‌ام — نگهداری از خزنده‌ها، فلزیاب، یا مادسازی بازی‌های قدیمی.",
    ctaText: "اگر هرکدوم از این‌ها به کارتون میاد —",
    cta1: "نمونه کارها",
    cta2: "تماس با من",
  },
  works: {
    meta: {
      title: "Voxes - نمونه کارها",
      description: "نمونه کارهای منتخب Voxes، معروف به طاها حقیقی.",
    },
    // TODO: placeholder content — needs a real translation pass.
    eyebrow: "نمونه کارها",
    title1: "چیزهایی که ",
    title2: "ساخته‌ام.",
    intro:
      "متن نمونه: سایت‌های مشتری‌ها، آزمایش‌های متن‌باز و پروژه‌های شخصی عمیق، با هر چیزی که می‌شود نشان داد.",
    filterLabel: "فیلتر بر اساس منبع",
    filters: { all: "همه", open: "متن‌باز", closed: "متن‌بسته" },
    kind: { open: "متن‌باز", closed: "متن‌بسته" },
    status: { live: "منتشر شده", wip: "در حال کار", archived: "بایگانی" },
    links: { source: "کد منبع", site: "مشاهده وب‌سایت" },
    detail: {
      back: "همه نمونه کارها",
      comingSoon: "متن نمونه: صفحه اختصاصی این پروژه هنوز ساخته نشده.",
      imagePlaceholder: "تصویر اینجا قرار می‌گیرد",
      toc: "در این صفحه",
      problem: "مشکل",
      solution: "چطور حلش کردم",
      considered: "گزینه‌های دیگر",
      listSeparator: "، ",
      chose: "انتخاب‌شده",
      metaTitle: "Voxes - {title}",
    },
    items: [
      {
        slug: "kazheh",
        title: "کاژه",
        description:
          "متن نمونه: یک سایت رزرو دوزبانه برای یک هتل کوچک، ساخته‌شده برای یک مشتری واقعی از اولین طرح تا انتشار.",
      },
      {
        slug: "vofluid",
        title: "vofluid",
        description:
          "متن نمونه: شبیه‌ساز سیال مبتنی بر ذره که از صفر نوشته شده، با یک جمله دوم طولانی‌تر برای بررسی رفتار ردیف در صفحه‌های باریک وقتی متن از دو خط بیشتر می‌شود.",
      },
      {
        slug: "voxes",
        title: "ووکسز",
        description:
          "متن نمونه: همین سایت، با کد و بدون سازنده یا قالب آماده.",
      },
      {
        slug: "placeholder-four",
        title: "نمونه چهار",
        description: "متن نمونه: یک پروژه قدیمی‌تر متن‌بسته که برای ثبت در سابقه اینجاست.",
      },
      {
        slug: "placeholder-five",
        title: "نمونه پنج",
        description: "متن نمونه: یک ابزار کوچک متن‌باز با توضیح کوتاه.",
      },
    ],
  },
  blog: {
    meta: {
      title: "Voxes - وبلاگ",
      description: "نوشته‌های Voxes، معروف به طاها حقیقی.",
    },
    // TODO: placeholder content — needs a real translation pass.
    eyebrow: "وبلاگ",
    title1: "یادداشت‌هایی درباره‌ی ",
    title2: "طرز کار چیزها.",
    intro:
      "متن نمونه: نوشته‌های کوتاه فنی درباره‌ی الگوریتم‌ها، فریم‌ورک‌ها، مقایسه‌ی آن‌ها و هر چیز دیگری که دلم خواست بنویسم. هر کدام پنج تا پانزده دقیقه.",
    filterLabel: "فیلتر بر اساس موضوع",
    filters: { all: "همه" },
    topics: {
      algorithm: "الگوریتم",
      framework: "فریم‌ورک",
      comparison: "مقایسه",
      notes: "یادداشت",
    },
    readTime: "{n} دقیقه مطالعه",
    items: [
      {
        slug: "sph-from-scratch",
        title: "هیدرودینامیک ذره‌ای هموار، بدون حرف‌های کلی",
        description:
          "متن نمونه: چطور تعدادی ذره به آب تبدیل می‌شود و کدام انتخاب هسته تعیین می‌کند شبیه‌سازی منفجر شود یا نه.",
      },
      {
        slug: "astro-vs-next",
        title: "آسترو یا نکست برای یک سایت محتوایی؟",
        description:
          "متن نمونه: هرکدام چه چیزی به مرورگر می‌فرستند، کجا سد راه می‌شوند و من چطور انتخاب می‌کنم.",
      },
      {
        slug: "a-star-heuristics",
        title: "کیفیت A* به کیفیت تابع ابتکاری‌اش بستگی دارد",
        description:
          "متن نمونه: قابل‌قبول، سازگار، و اینکه چرا یک حدس کمی غلط گاهی مزیت است.",
      },
      {
        slug: "css-has-selector",
        title: "کارهایی که :has() بی‌سروصدا ممکن کرد",
        description:
          "متن نمونه: فیلترهای بدون اسکریپت، چیدمان‌های آگاه از فرم و چند برد کوچک دیگر.",
      },
      {
        slug: "wasm-or-not",
        title: "Rust به WASM: کی می‌ارزد و کی نه",
        description:
          "متن نمونه: پیش از بازنویسی هر چیزی، هزینه‌ی عبور از مرز را اندازه بگیرید.",
      },
      {
        slug: "why-i-write-here",
        title: "چرا اصلاً وبلاگ دارم",
        description:
          "متن نمونه: یادداشتی کوتاه درباره‌ی نوشتن برای فهمیدن.",
      },
    ],
  },
  contact: {
    meta: {
      title: "Voxes - تماس",
      description: "با Voxes، معروف به طاها حقیقی، در ارتباط باشید.",
    },
    // TODO: placeholder content — needs a real translation pass.
    eyebrow: "تماس",
    title1: "بیایید ",
    title2: "حرف بزنیم.",
    intro:
      "بهترین راه ارتباط با من به کارتان بستگی دارد. هر کانالی که برایتان راحت‌تر است را انتخاب کنید.",
    newTab: "(در تب جدید باز می‌شود)",
    items: [
      {
        id: "linkedin",
        description: "سابقه حرفه‌ای من و بهترین جا برای مکاتبات رسمی.",
      },
      {
        id: "github",
        description: "کدهای پروژه‌های متن‌باز من، از جمله شبیه‌ساز سیال با Rust.",
      },
      {
        id: "telegram",
        description: "خط مستقیم برای سؤال‌های سریع و صحبت درباره پروژه.",
      },
      {
        id: "instagram",
        description: "نگاهی به زندگی من، دور از کیبورد.",
      },
      {
        id: "x",
        description: "فکرهای کوتاه و خبرهای چیزهایی که می‌سازم.",
      },
      {
        id: "discord",
        description: "سلام بدهید، یا درباره کد و بازی گپ بزنید.",
      },
    ],
  },
  footer: {
    copyright: "تمام حقوق محفوظ است",
  },
  notFound: {
    description: "این صفحه پیدا نشد.",
    title: "Voxes - صفحه پیدا نشد",
    eyebrow: "خطای ۴۰۴",
    title1: "این صفحه ",
    title2: "پرواز کرد.",
    intro:
      "صفحه‌ای که دنبالش بودی وجود ندارد یا جابه‌جا شده است. تا اینجایی، به این پرنده کمک کن از چند دروازه رد شود.",
    home: "بازگشت به خانه",
    works: "دیدن نمونه‌کارها",
  },
  flappy: {
    label: "مینی‌گیم پرنده",
    gates: "دروازه‌ها",
    ready: {
      title: "آماده‌ای؟",
      hint: "برای بال زدن، Space را بزن یا صفحه را لمس کن و از همهٔ دروازه‌ها رد شو.",
    },
    paused: {
      title: "متوقف شد",
      hint: "برای ادامه، Space را بزن یا صفحه را لمس کن.",
    },
    lost: {
      title: "برخورد کردی!",
      body: "از {total} دروازه، {passed} تا را رد کردی.",
      action: "دوباره تلاش کن",
    },
    won: {
      title: "رسیدی!",
      body: "از هر {total} دروازه رد شدی.",
      action: "دوباره بازی کن",
    },
  },
} satisfies Messages;