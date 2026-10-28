import type { Locale } from "@/i18n";
import type { CaseStudy } from "./types";

// TODO: ALL of this is placeholder. It exists to prove out the layout and
// lengths, not to say anything true about the project. Replace every string
// (and add real `figure.src` paths under /public/images/works/kazheh/).
// The Farsi block is a short, unreviewed placeholder as well.

const en: CaseStudy = {
  lead: "Kazheh House is a boutique hotel in Rasht. I designed and built their website, including an online reservation system.",
  facts: [
    { label: "Client", value: "Boutique hotel" },
    { label: "Role", value: "Full-stack developer" },
    { label: "Duration", value: "65 days" },
    { label: "Languages", value: "English, Persian" },
  ],
  hero: {
    alt: "A screenshot of the intro section of the homepage.",
    caption: "The intro section of the homepage.",
    ratio: "16 / 9",
    src: "/images/kazheh/thumbnail.png",
  },
  sections: [
    {
      id: "brief",
      kind: "brief",
      title: "The brief",
      body: [
        "Given the uncertain situation in the country, the client needed a way to stay visible online and keep their content available without depending on any foreign services. They also asked for online booking that would largely replace their system of spreadsheets, phone calls and WhatsApp.",
        "I chose to build the whole thing from scratch with Next.js, both to gain experience and to make sure everything was unique and tailored to Kazheh's needs.",
      ],
      asksLabel: "What I was asked to do",
      asks: [
        "A public site in two languages",
        "Hosting and services that depend only on Iranian infrastructure",
        "A way for staff to manage the site themselves",
        "Fast load times both inside and outside Iran",
      ],
      figure: {
        alt: "How bookings worked before the website: everything manual",
        caption: "The client's starting point. All the names and numbers of guests are generics in this page.",
        src: "/images/kazheh/kazheh-before-en.svg",
        ratio: "1948 / 1182",
      },
    },
    {
      id: "process",
      kind: "timeline",
      title: "How it went",
      intro:
        "The project was initially planned to take around 45 days. Paperwork, photography, videography and a few unexpected twists during development stretched it to 65.",
      phases: [
        {
          title: "Planning and first drafts",
          period: "Week 1",
          body: "The first days went into drafting a rough plan, experimenting with the design and color palette, and building the first iteration of the navbar, homepage and footer.",
          figure: {
            alt: ["First version of the homepage.", "First version of the footer"],
            caption: "First version of the homepage.",
            src: ["/images/kazheh/early-hero.png", "/images/kazheh/early-footer.png"],
            ratio: "3 / 2",
          },
        },
        {
          title: "Design and the rooms page",
          period: "Weeks 2 to 3",
          body: "By this point the homepage was finished and the design approved, so I moved on to the rooms page. We decided to use the hotel's floor plan as an interactive element.",
          figure: {
            alt: ["First version of the rooms page.", "First version of the individual room pages"],
            caption: "First version of the homepage.",
            src: ["/images/kazheh/early-rooms.png", "/images/kazheh/early-room.png"],
            ratio: "3 / 2",
          },
        },
        {
          title: "Building the guest side",
          period: "Weeks 3 to 4",
          body: "Next came the calendar, which took longer than expected because it had to support both the Iranian solar and Gregorian calendars. I wasn't happy with the rooms page either, so I redid it, and the final version grew out of that second iteration. Each room's own page was also built during this stretch.",
        },
        {
          title: "Backend foundations",
          period: "Weeks 4 to 6",
          body: "I set up the PostgreSQL database and split the backend into API endpoints and server actions. The guest side got further polish, and work on the admin panel began.",
        },
        {
          title: "Admin panel and content",
          period: "Weeks 6 to 8",
          body: "Most of this stretch went into the admin panel's UI, with the API evolving alongside it. The staff needed a calendar that was always up to date and easy to use, plus pages for pricing, statistics, discounts, record keeping and more.",
        },
        {
          title: "Launch and handover",
          period: "Week 8 to launch",
          body: "The final weeks went into testing, cleaning up the code, polishing the design, setting up the content, teaching the staff and testing again.",
        },
      ],
    },
    {
      id: "decisions",
      kind: "decisions",
      title: "What I chose, and why",
      intro:
        "I made many decisions along the way. Here are a few of them.",
      items: [
        {
          title: "Framework",
          choice: "Next.js",
          why: "Next.js let me develop every layer of the stack quickly in one framework and offers modern features such as server actions. It also has a large developer community, so the client isn't dependent on any one developer.",
          considered: ["ASP.NET Core"],
        },
        {
          title: "Database",
          choice: "PostgreSQL",
          why: "PostgreSQL was the right fit. A date-range exclusion constraint makes overlapping bookings for the same room impossible at the database level, with advisory locks serializing bookings per room on top of it, and our host supports it.",
          considered: ["SQLite"],
        },
        {
          title: "Hosting",
          choice: "Liara",
          why: "The site needed to be fast both inside and outside Iran. Among the options, Liara offered the best balance of affordability, ease of use and useful features.",
          considered: ["Vercel", "Hostiran"],
        },
      ],
    },
    {
      id: "challenges",
      kind: "challenges",
      title: "What got in the way",
      intro:
        "Many problems came up during development. Here a few who got me thinking up ideas.",
      items: [
        {
          title: "Reservation state machine",
          problem:
            "A boutique hotel differs from larger hotels in scale and workflow, so a standard booking flow didn't fit. I had to design a state machine for reservations from scratch.",
          solution:
            "The diagram below shows how the state machine works.",
            figure: {
              alt: "Reservation state machine diagram",
              caption: "A visual representation of the reservation state machine.",
              src: "/public/images/kazheh/state-machine-en.png",
              ratio: "392 / 571",
            }
        },
        {
          title: "Dynamic data with server-side rendering",
          problem:
            "Once the calendars were hooked up to availability queries, Next.js began flagging their pages as dynamic, which slowed loading considerably.",
          solution:
            "Public pages are statically generated for speed, then invalidated on demand whenever a reservation or price changes. Each change also sends a PostgreSQL NOTIFY, which a single listener fans out to browsers over server-sent events, so availability and pricing update live without a page reload.",
        },
        {
          title: "Moving the staff off Excel",
          problem:
            "The staff ran their reservations in Excel. I needed to port that workflow to the site so it would feel familiar, while being easier to use and better suited to the new system.",
          solution:
            "I built a spreadsheet-inspired component in the admin panel: infinitely scrollable, with colors representing reservation states.",
        },
        {
          title: "Dynamic media",
          problem:
            "A month after launch, the client asked to update the images. I needed a way for media changes to happen without a developer or a redeploy.",
          solution:
            "I used the disk storage that comes free with Liara's plans instead of object storage, to keep maintenance costs down. Staff upload or replace content through the admin panel, and database tables keep track of which file belongs to which slot.",
        },
      ],
    },
    {
      id: "showcase",
      kind: "showcase",
      title: "Parts worth a closer look",
      intro:
        "Here are a few pieces I'm proudest of.",
      items: [
        {
          title: "Admin panel",
          kind: "System",
          body: "The admin panel is the hidden backbone of the site. Besides managing bookings and media, it lets staff adjust pricing, manage discounts, view charts of how the hotel is performing, and more.",
          points: [
            "Manages room prices and discounts",
            "Blocks dates from booking at the staff's discretion",
            "Manages the site's images and videos",
            "Manages staff accounts and roles",
            "Charts the hotel's performance",
          ],
          figure: {
            alt: "Bookings table in the admin panel table",
            caption: "The bookings view in the admin panel.",
            ratio: "3 / 2",
            src: "/images/kazheh/bookings-view.png"
          },
        },
        {
          title: "Admin calendar",
          kind: "System",
          body: "A closer look on the component in the admin panel that replaced Excel for the staff.",
          points: [
            "An infinitely scrollable Iranian calendar",
            "Color-coded reservation states and built-in tools for managing bookings",
            "Includes many quality of life tools"
          ],
          figure: {
            alt: "Placeholder: screenshot of the admin calendar",
            caption: "Placeholder: the admin calendar.",
            ratio: "16 / 10",
          },
        },
        {
          title: "Rasht map",
          kind: "Component",
          body: "A visual component on the homepage that shows the hotel's location.",
          points: [
            "A canvas rendering of Rasht's actual map",
            "Thousands of heavily optimized paths, rendered smoothly while rotating",
            "Points of interest for tourists, each with a description",
          ],
          figure: {
            alt: "The Rasht Map component",
            caption: "The Rasht Map component",
            ratio: "2854 / 1411",
            src:"/images/kazheh/rasht-map.png"
          },
        },
      ],
    },
    {
      id: "learnings",
      kind: "lessons",
      title: "What I learned",
      intro:
        "This was my first freelance project. I learned a lot, and I was glad to put what I'd studied into practice.",
      items: [
        {
          title: "Planning the project",
          body: "Looking back, I would plan each piece in more detail. The gallery page, for example, was an unplanned late addition, and better upfront scoping would have let me give a more accurate roadmap.",
        },
        {
          title: "Fitting software to a client's business",
          body: "I learned to study how a particular business operates and to find the best way to bring it into the digital world.",
        },
        {
          title: "Solidifying my understanding of SSR vs CSR",
          body: "After running into the dynamic data problem, I researched and experimented with several approaches. I now feel confident in how server-side and client-side rendering work.",
        },
        {
          title: "Commercial work with databases",
          body: "This was my first serious work with databases, so I had to learn more about SQL and PostgreSQL. I feel knowledgeable now, but I'm looking forward to learning more.",
        },
      ],
      closing:
        "Overall, Kazheh means a lot to me as my first client project and one of the works I'm proudest of. The development process was interesting, I'm happy with how everything turned out, and I learned a lot that I'll keep building on.",
      figure: {
        alt: "Placeholder: a team or client photo, if there is one",
        caption: "Placeholder: optional closing photo.",
        ratio: "21 / 9",
      },
    },
  ],
};

const fa: CaseStudy = {
  lead: "کاژه هتل بوتیکی در رشت هست. من وب‌سایتش رو، به‌همراه سیستم رزرو آنلاین، از طراحی تا اجرا ساختم.",
  facts: [
    { label: "کارفرما", value: "هتل بوتیک" },
    { label: "نقش", value: "توسعه‌دهنده فول‌استک" },
    { label: "مدت", value: "۶۵ روز" },
    { label: "زبان‌ها", value: "انگلیسی، فارسی" },
  ],
  hero: {
    alt: "تصویری از اولین بخش صفحه اصلی سایت",
    caption: "اولین بخش صفحه اصلی.",
    ratio: "16 / 9",
    src: "/images/kazheh/thumbnail.png",
  },
  sections: [
    {
      id: "brief",
      kind: "brief",
      title: "سفارش",
      body: [
        "با توجه به شرایط نامطمئن کشور، کارفرما می‌خواست بدون وابستگی به سرویس‌های خارجی هم در اینترنت دیده‌شه، و سایتش همیشه در دسترس باشه. رزرو آنلاین هم می‌خواستند تا بیشترِ کارهایی که تا اون زمان با اکسل، تماس تلفنی و واتساپ انجام می‌شد، به صورت مدرن توسط سایت انجام بشه.",
        "تصمیم گرفتم همه‌چیز رو از صفر با Next.js بسازم؛ هم برای کسب تجربه، و هم برای اینکه هر بخش منحصربه‌فرد و دقیقاً مناسب با نیاز کاژه باشه.",
      ],
      asksLabel: "از من چه خواسته شد",
      asks: [
        "یک وب‌سایت عمومی دوزبانه",
        "هاست فقط به زیرساخت داخل کشور وابسته باشه",
        "راهی برای اینکه کارمند‌ها خودشون سایت رو مدیریت کنن",
        "باز شدن سریع سایت، هم داخل و هم خارج از ایران",
      ],
      figure: {
        alt: "شیوه‌کار هتل قبل سایت: همه‌چی دستی",
        caption: "نقطه شروع کارفرما. تمام نام‌ها و شماره‌های مهمانان توی این صفحه جایگزین هستن.",
        ratio: "1948 / 1182",
        src: "/images/kazheh/kazheh-before-fa.svg"
      },
    },
    {
      id: "process",
      kind: "timeline",
      title: "روند کار",
      intro: "پروژه در ابتدا حدود ۴۵ روز قرار بود طول بکشه. کارهای اداری، عکاسی، فیلمبرداری و چند اتفاق دیگر در حین ساخت، باعث شد ۶۵ روز زمان ببره.",
      phases: [
        {
          title: "برنامه‌ریزی و اولین طرح‌ها",
          period: "هفته اول",
          body: "روزهای اول صرف برنامه‌ریزی، امتحان طرح‌ها و رنگ‌ها، و درست کردن اولین نسخه منو، صفحه اصلی و بخش پایانی صفحه شد.",
          figure: {
            alt: ["اولین نسخه صفحه اصل.", "اولین نسخه قسمت پایانی سایت کاژه"],
            caption: "اولین نسخه صفحه اصلی.",
            src: ["/images/kazheh/early-hero.png", "/images/kazheh/early-footer.png"],
            ratio: "3 / 2",
          },
        },
        {
          title: "صفحه اتاق‌ها",
          period: "هفته دوم تا سوم",
          body: "تو این زمان صفحه اصلی آماده شد و طراحیش توسط کارفرما تأیید شد. بعد من سراغ صفحه اتاق‌ها رفتم. تصمیم گرفتیم از فلورپلن هتل در این صفحه استفاده کنیم.",
          figure: {
            alt: ["اولین نسخه صفحه اتاق‌ها سایت کاژه.", "اولین نسخه صفحات هر اتاق."],
            caption: "اولین نسخه صفحه اتاق‌‌ها و صفحه هر اتاق.",
            src: ["/images/kazheh/early-rooms.png", "/images/kazheh/early-room.png"],
            ratio: "3 / 2",
          },
        },
        {
          title: "صفحات هر اتاق",
          period: "هفته سوم تا چهارم",
          body: "بعد نوبت تقویم رسید که بیشتر از انتظار طول کشید، چون باید هم تقویم شمسی و هم میلادی رو پشتیبانی می‌کرد. از صفحه اتاق‌ها هم راضی نبودم و دوباره ساختمش؛ نسخه نهایی از همون دور دوم در اومد. صفحه اختصاصی هر اتاق هم در همین بازه زمانی درست شد.",
        },
        {
          title: "زیرساخت پشت صحنه",
          period: "هفته چهارم تا ششم",
          body: "دیتابیس PostgreSQL رو راه‌اندازی کردم و بَک‌‌اند یعنی جایی که رزروها و قیمت‌ها ذخیره و پردازش می‌شند، رو توسعه دادم. رو صفحات سمت مهمان‌ها تغییراتی انجام شد و کار روی پنل مدیریت شروع شد.",
        },
        {
          title: "پنل مدیریت و جای‌گزاری محتوا‌ها",
          period: "هفته ششم تا هشتم",
          body: "بیشتر این روزها صرف ظاهر و امکانات پنل مدیریت و بَک‌‌اند شد. کارمندای هتل به تقویمی نیاز داشتن که همیشه به‌روز باشه و کار باهاش راحت و طبیعی باشه. علاوه بر این‌ها برای پنل مدیریت صفحه‌هایی برای قیمت‌ها، آمار، تخفیف‌ها، سوابق رزروها و چیزهای دیگر توسعه داده‌ شد.",
        },
        {
          title: "انتشار و تحویل",
          period: "از هفته هشتم تا انتشار",
          body: "هفته‌های آخر صرف تست، تمیز کردن کد، نهایی کردن طراحی، آماده‌کردن محتوا و تست دوباره شد. همه‌چیز به‌جز پرداخت آنلاین اجرا شد؛ برای پرداخت انلاین منتظر مدارک کارفرما هستیم.",
        },
      ],
    },
    {
      id: "decisions",
      kind: "decisions",
      title: "چه انتخاباتی کردم و چرا",
      intro: "در طول کار تصمیمات زیادی باید می‌گرفتم. دلایل چندتاش رو اینجا نوشتم.",
      items: [
        {
          title: "فریم‌ورک",
          choice: "Next.js",
          why: "Next.js اجازه می‌داد همه بخش‌های سایت رو سریع و در یک چارچوب واحد بسازم و از امکانات مدرنش مثل Server Actions استفاده کنم. برنامه‌نویس های زیادی هم باهاش آشنا هستن، پس لازم نبود کارفرما به یک نفر خاص وابسته بمونه برای سایت.",
          considered: ["ASP.NET Core"],
        },
        {
          title: "دِیتابِیس",
          choice: "PostgreSQL",
          why: "PostgreSQL انتخاب مناسبی بود.این امکان رو می‌داد تا جلوی رزرو یک اتاق در یک تاریخ توسط چند نفر رو حتی در سطح دیتابیس هم بگیره،  هنگام ثبت هر رزرو اون اتاق قفل می‌شه تا دو درخواست هم‌زمان با هم تداخل نکنن. هاست ما هم از اون پشتیبانی می‌کرد.",
          considered: ["SQLite"],
        },
        {
          title: "هاست",
          choice: "لیارا",
          why: "سایت باید هم داخل و هم خارج از ایران سریع باز می‌شد. در بین گزینه‌ها، لیارا بهترین ترکیب رو از نظر قیمت، استفاده راحت و امکانات به‌درد‌بخور ارائه می‌کرد.",
          considered: ["Vercel", "هاست ایران"],
        },
      ],
    },
    {
      id: "challenges",
      kind: "challenges",
      title: "مشکلات و مسائل در طول کار",
      intro: "در طول کار مسائل و مشکلات زیادی پیش اومد. مهم‌ترین‌ها رو ادامه میخونید.",
      items: [
        {
          title: "سیستم وضعیت رزرو",
          problem: "یک هتل بوتیک از نظر اندازه و روش کار با هتل‌های بزرگ فرق هایی داره، پس سیستم رزروِ آماده ممکنه خیلی مناسبش نباشه. باید مراحل و وضعیت‌های یک رزرو رو از صفر طراحی می‌کردم.",
          solution: "عکس زیر نشون می‌ده این سیستم چطور کار می‌کنه.",
          figure: {
            alt: "نمودار سیستم وضعیت رزرو",
            caption: "نمایش تصویری از سیستم وضعیت رزرو.",
            src: "/images/kazheh/state-machine.png",
            ratio: "784 / 1101",
            width: 100,
            height: 100,
          }
        },
        {
          title: "داده‌های متغیر، سرعت کمتر بارگزاری صفحات",
          problem: "وقتی تقویم‌ها رو به رزرو اتاق‌ها وصل کردم، Next.js صفحه‌ها رو «داینامیک» حساب کرد و سرعت بارگزاری صفحات به‌صورت محسوسی کند شد.",
          solution: "صفحه‌های عمومی از پیش توسط سرور ساخته می‌شند تا سرعتشون به اندازه یک صفحه ثابت بمونه، و هر بار که رزرو یا قیمتی عوض شود یا اضافه شود، این صفحات دوباره ساخته می‌شند. همچنین هر تغییر به صفحه‌های باز هم خبر داده می‌شه، پس موجودی اتاق‌ها و قیمت‌ها همون لحظه و حتی بدون نیاز به بارگذاری دوباره صفحه به‌روزرسانی می‌شند.",
        },
        {
          title: "جابه‌جایی کارمند‌ها از اکسل به سایت",
          problem: "کارمند‌ها رزروها رو با اکسل مدیریت می‌کردن. باید روش کارشون رو به سایت منتقل می‌کردم، طوری که آشنا براشون باشه اما ساده‌تر و مناسب سیستم جدید.",
          solution: "در پنل مدیریت بخشی شبیه جدول های اکسل ساختم که بی‌نهایت اسکرول می‌شه و وضعیت هر رزرو رو با رنگی نشون می‌ده.",
        },
        {
          title: "تغییر دوباره عکس‌ها و ویدیوها",
          problem: "یک ماه بعد از انتشار، کارفرما خواست عکس‌ها رو عوض کنه. به راهی نیاز داشتم که تغییر عکس‌ها و ویدیو‌ها بدون متخصص و بدون دیپلوی دوباره سایت انجام بشه.",
          solution: "به‌جای یک سرویس ذخیره‌سازی ابری جدا، از دیسکی که با پلن‌های لیارا همراه‌ هست استفاده کردم تا در هزینه نگهداری سایت صرفه‌جویی شه. کارمند‌ها تصاویر و ویدیو‌ها رو از پنل مدیریت بارگذاری و جایگزین می‌کنن، و دِیتابِیس دخیره میکنه که کدوم فایل برای کدوم جا هست.",
        },
        {
          title: "انتشار بدون درگاه پرداخت",
          problem: "پرداخت آنلاین به درگاه پرداخت اینترنتی نیاز داره و گرفتن اون نیاز به اینماد داره. چون کافرما کارش رو تازه تاسیس کرده بود، هنوز مدارک لازم صادر تشده و انتظار می‌ره این کار حدود تابستان ۱۴۰۶ انجام بشه.",
          solution: "پرداخت وقتی درگاه اماده شد به روند رزرو اضافه میشه. فعلا مهمون‌ها سایت رو مشاهده میکنن، موجودی اتاق ها رو از سایت میبینن‌، با پذیرش تماس می‌گیرن و رزرو میکنن. پذیرش، رزرو رو در پنل مدیریت ثبت می‌کنه و تقویم اتاق‌ها همون لحظه به‌روز می‌شه.",
        },
      ],
    },
    {
      id: "showcase",
      kind: "showcase",
      title: "قسمت‌های که ارزش دیدن دارن",
      intro: "توضیحاتی راجب به قسمت هایی از سایت که وقت زیادی گرفتن.",
      items: [
        {
          title: "پنل مدیریت",
          kind: "سیستم",
          body: "پنل مدیریت ستون پنهان سایت هست. علاوه بر مدیریت رزروها و تصویر‌ها، کارمند‌ها با اون قیمت‌ها رو تنظیم می‌کنن، تخفیف‌ها رو مدیریت می‌کنن و می‌تونن آمار و نمودار عملکرد هتل رو هم ببینن.",
          points: [
            "مدیریت قیمت اتاق‌ها و تخفیف‌ها",
            "مسدود کردن تاریخ‌ها به رزرو، به صلاحدید کارمند‌ها",
            "مدیریت تصاویر و ویدیوهای سایت",
            "اطلاع‌رسانی رزروها به مدیر از ربات بله",
            "مدیریت اکانت‌ های کارمند‌ها و دستگاه های مجاز به دسترسی به پنل ادمین",
            "نمایش نمودار و آمار هتل"
          ],
          figure: {
            alt: "جدول رزرو‌‌ها در پنل مدیریت",
            caption: "جدول رزرو‌ها در پنل مدیریت.",
            ratio: "3 / 2",
            src: "/images/kazheh/bookings-view.png"
          },
        },
        {
          title: "تقویم مدیریت",
          kind: "سیستم",
          body: "نگاهی نزدیک تر به اون قسمتی از پنل مدیریت که جایگزین اکسل شد.",
          points: [
            "تقویم خورشیدی با اسکرول بی‌نهایت",
            "رنگ‌بندی وضعیت رزروها",
            "مدیریت جمعی رزرو‌ها"
          ],
          figure: {
            alt: "متن نمونه: تصویر تقویم مدیریت",
            caption: "متن نمونه: تقویم مدیریت.",
            ratio: "16 / 10",
          },
        },
        {
          title: "نقشه رشت",
          kind: "دیزاین",
          body: "نقشه نشون دادن مکان هتل",
          points: [
            "نقشه خیابان‌های رشت، بر اساس OpenStreetMap",
            "هزاران مسیر بهینه‌سازی شده که روان می‌چرخن",
            "همراه با نقاط دیدنی برای گردشگرها، هر کدوم همراه با توضیحات",
          ],
          figure: {
            alt: "تصویری از بخش موقعیت",
            caption: "نقشه رشت در بخش موقعیت.",
            ratio: "2854 / 1411",
            src:"/images/kazheh/rasht-map.png"
          },
        },
      ],
    },
    {
      id: "learnings",
      kind: "lessons",
      title: "تجرباتی که کسب کردم",
      intro: "این اولین کار فریلنس من بود. چیزهای زیادی یاد گرفتم..",
      items: [
        {
          title: "برنامه‌ریزی پروژه",
          body: "در پروژه های بعدی با جزئیات بیشتری برنامه‌ریزی می‌کنم. مثلاً صفحه گالری برنامه‌ریزی‌نشده بود. تعریف دقیق‌تر کار از همون ابتدا به من اجازه می‌داد زمان‌بندی دقیق‌تری ارائه کنم.",
        },
        {
          title: "نرم‌افزار، برای یک کسب‌وکار",
          body: "بررسی کردم یک کسب‌وکار چطور کار می‌کنه تا بتونم به بهترین روش ممکن در دنیای دیجیتال پیاده‌اش کنم.",
        },
        {
          title: "فرق رندر صفحه روی سرور (SSR) و روی دستگاه کاربر (CSR)",
          body: "بعد از حل  مشکل داده‌های داینامیک، چند روش رو بررسی و آزمایش کردم و حالا راجب این موضوع اطلاعات و تجربه خوبی دارم.",
        },
        {
          title: "کار حرفه‌ای با دِیتابِیس",
          body: "این اولین تحربه جدی من با دیتابیس بود، باعث شد SQL و PostgreSQL رو بیشتر یاد بگیرم. حالا آشنایی خوبی با اینها دارم، اما هنوز مشتاق یادگرفتن بیشترم.",
        },
      ],
      closing: "در مجموع، کاژه به‌عنوان اولین پروژه‌ام برای یک کارفرما و یکی از کارهایی مورد علاقه‌ام، برای من ارزش زیادی داره. فرایند توسعه جالب بود، از نتیجه‌اش راضی‌ام، و چیزهای زیادی یاد گرفتم که در کار‌های آینده‌ام ازشون استفاده میکنم.",
      figure: {
        alt: "متن نمونه: عکس تیم یا کارفرما، اگر وجود داشت",
        caption: "متن نمونه: عکس پایانی اختیاری.",
        ratio: "21 / 9",
      },
    },
  ],
};

const study: Record<Locale, CaseStudy> = { en, fa };
export default study;
