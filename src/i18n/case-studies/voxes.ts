import type { Locale } from "@/i18n";
import type { CaseStudy } from "./types";

const en: CaseStudy = {
  lead: "My own personal website that you are visiting. Made with Astro for two languages, two themes and a lot more.",
  facts: [
    { label: "Client", value: "Myself" },
    { label: "Role", value: "Full-stack developer" },
    { label: "Duration", value: "32 days" },
    { label: "Languages", value: "English, Persian" },
  ],
  hero: {
    alt: "Two screenshots of the homepage in both themes and languages and both desktop and mobile.",
    caption: "The homepage with a snapshot of the animation.",
    ratio: "16 / 9",
    src: "/images/voxes/thumbnail.avif",
  },
  sections: [
    {
      id: "brief",
      kind: "brief",
      title: "The brief",
      body: [
        "I always wanted to build a website for myself, to earn more experience and have somewhere online to showcase my skills, and to be the only one setting the project's requirements, so that I have a large degree of freedom to put interesting but maybe unusual stuff there.",
        "This is not the first time I tried to build something like this though. I experimented with this project for a short time with a F# stack and later for a longer time with Next.js, around 9 months ago. But eventually decided to port it to Astro."
      ],
      asksLabel: "What I planned to do",
      asks: [
        "A website for two languages but with some pages available only on one",
        "Implement a lot distinct features and components",
        "Somewhere to write about topics and my works",
        "Somewhere to showcase my CV and contact info",
        "Support both Light and Dark mode themes"
      ],
    },
    {
      id: "process",
      kind: "timeline",
      title: "Development History",
      intro:
        "Voxes was not a project with a client, so I had a lot of freedom to experiment and try new things. I also didn't develop it within a single timespan, instead I've been chipping away at it on the side for quite a while. after I got my hands free for it fulltime, I worked for around 25 more days on it to release it.",
      phases: [
        {
          title: "Tinkering and design iteration",
          period: "Early Feburary, 2026",
          body: "During february I was interested with F# so I was tinkering with its web stack, for my own website.",
          figure: {
            alt: "A homepage made with the F# stack.",
            caption: "The homepage with the F# stack.",
            src: "/images/voxes/fsharp.avif",
            ratio: "2732 / 1535",
          },
        },
        {
          title: "Solidifying the Design",
          period: "Late February, 2026",
          body: "As I began to learn Next.js, after reading the offical documents and learning about the framework, I further worked on my own website as a practice project, resulting in a consolidated design.",
          figure: {
            alt: "Screenshot of the first version of the homepage made in Next.js.",
            caption: "First version of the homepage made in Next.js.",
            src: "/images/voxes/nextjs.avif",
            ratio: "2732 / 1535",
          },
        },
        {
          title: "Porting to Astro and Finalizing the design",
          period: "Week 1, August, 2026",
          body: "When I had free time on my hand, I decided to port the project to Astro, draft a plan, and stick to it to build it to production.",
        },
        {
          title: "Building other pages",
          period: "Weeks 2 to 3",
          body: "As the homepage was done and layout finalized, I quickly designed the other pages",
        },
        {
          title: "Blogs, Works and unique Components",
          period: "Weeks 3 to 4",
          body: "I set up the MDX blogs pages, and the layout of the work pages, and began developing their pages, alongside finishing up the homepage and 404 page components.",
        },
        {
          title: "Writing and launch",
          period: "Last week",
          body: "The last days were spent polishing up the code and design as well as the writings around the pages, and deploying to github pages.",
        },
      ],
    },
    {
      id: "decisions",
      kind: "decisions",
      title: "Why Astro?",
      intro: "Initially I tried this project in whatever I was learning at the moment, but then as the requirements solidifed I decided it Next.js wasn't worth it for a fully static website, while Astro was designed for it, and the Astro Islands architecture was well suited for the kind of components I wanted in my website.",
      items: [
      ],
    },
    {
      id: "showcase",
      kind: "showcase",
      title: "Interesting components",
      intro:
        "Here are the various components I made for this website that I find amusing, showcased in details.",
      items: [
        {
          title: "Mobile Navbar",
          kind: "Interactive",
          body: "As I was designing my logo, I thought that it would probably be very cool if it become the mobile navigation menu. So Implemented it, everything is just SVG paths and JavaScript, and the logo itself physically moves and scales to become the background for menu link listing.",
          points: [
            "Simple SVG, controlled with JavaScript",
            "The Logo has a welcome and hover message",
            "Supports both themes",
          ],
          figure: {
            alt: "A screenshot of the logo scaled to become the background of the mobile navigation menu",
            caption: "Mobile navigation menu open.",
            ratio: "1320 / 2868",
            src: "/images/voxes/mobile-menu.avif",
            size: "300px",
          },
        },
        {
          title: "Homepage animation",
          kind: "Visual",
          body: "I made a realtime animation for the homepage, It purely works through SVG paths and JavaScript code. ",
          points: [
            "Runs in realtime",
            "Supports both themes",
          ],
          figure: {
            alt: "A screenshot of a frame of the homepage animation in dark mode.",
            caption: "The homepage fabrication animation.",
            src: "/images/voxes/animation.avif",
            ratio: "3 / 4",
            size: "500px",
          },
        },
        {
          title: "Flappy bird minigame",
          kind: "Interactive",
          body: "A short minigame made for the 404 page, using the Bird svg from the homepage animation (Bevy's Bird BTW).",
          points: [
            "Interactive lightweight component",
            "Controls for both touch and keyboard devices",
            "Supports both themes",
          ],
          figure: {
            alt: "A screenshot of the Flappy Bird minigame in my website",
            caption: "The Flappy Bird minigame",
            ratio: "1164 / 768",
            src:"/images/voxes/flappy.avif"
          },
        },
      ],
    },
    {
      id: "learnings",
      kind: "lessons",
      title: "What I learned",
      intro:
        "Developing my own website was very enjoyable, and as my first Astro project, I learnt a lot.",
      items: [
        {
          title: "Static website with the Astro framework",
          body: "It is safe to say that I earned a lot of experience in using Astro, so now I'm quite comfortable working with Astro.",
        },
        {
          title: "Multiple design themes",
          body: "I experimented a lot with different color palettes during development and the plumbings of a dual theme website, so I believe I learnt a lot in this topic.",
        },
        {
          title: "MDX and content pages",
          body: "Since I had to develop content pages for my blogs and works pages, I'm now knowledgeable with implementing pages like this elsewhere.",
        },
        {
          title: "SVG visuals, illustration and interaction",
          body: "I worked with SVGs a lot for this project, from my logo to various components and visuals, so I'm pretty confident that if a project has a place for them, I will be able to make visuals for them.",
        },
      ],
      closing:
        "Finally publishing my own website felt great, and I'm happy with how it turned, I will be looking forward to writing about my works and topics here, and making usage of what I learnt.",
    },
  ],
};

const fa: CaseStudy = {
  lead: "ووکسز سایت شخصی خودمه، همین سایتی که الان توش هستین دوزبانه‌ست، دو تم داره و کلی چیز دیگه.",
  facts: [
    { label: "کارفرما", value: "خودم" },
    { label: "نقش", value: "توسعه‌دهنده فول‌استک" },
    { label: "مدت", value: "۳۲ روز" },
    { label: "زبان‌ها", value: "فارسی، انگلیسی" },
  ],
  hero: {
    alt: "تصویری از صفحه اصلی سایت، در هر دو تم و هر دو زبان، هم روی دسکتاپ و هم روی موبایل.",
    caption: "صفحه اصلی.",
    ratio: "16 / 9",
    src: "/images/voxes/thumbnail.avif",
  },
  sections: [
    {
      id: "brief",
      kind: "brief",
      title: "ایده و هدف",
      body: [
        "چند وقتی بود برای خودم یه وب‌سایت می‌خواستم درست کنم. هم برای کسب تجربه، هم برای اینکه جایی تو اینترنت داشته باشم که کار‌هام رو نشون بدم. و چون کارفرمایی درکار نبود، محدودیت خاصی هم نبود و می‌تونستم چیزهای جالب براش درست کنم.",
        "این اولین باری نبود که سعی کردم برای خودم وبسایتی بزنم. با چند فریم‌ورک مختلف قبلا این پروژه رو امتحان کرده بودم. اول یکم با یک استکی برای زبون F#، و از حدود ۹ ماه پیش  با Next.js. ولی آخرش تصمیم گرفتم با Astro درستش کنم.",      ],
      asksLabel: "چی می‌خواستم بسازم",
      asks: [
        "یک وب‌سایت دوزبانه، که بعضی صفحه‌هاش فقط در یکی از دو زبان باشن",
        "دیزاین جالب و قطعات خاص",
        "جایی برای نوشتن درباره موضوع‌های مختلف و کارهام",
        "جایی برای نشون دادن رزومه و راه‌های ارتباطی",
        "پشتیبانی از تم روشن و تیره",
      ],
    },
    {
      id: "process",
      kind: "timeline",
      title: "روند ساخت",
      intro:
        "وبسایت ووکسز توی یک بازه‌ی مشخص درست نشد. اول، وقتی وقت خالی داشتم کم‌کم در کنار بقیه کارام روش کار می‌کردم. وقتی تونستم تمام‌وقت بهش برسم، حدود ۲۵ روز دیگه طول کشید تا منتشرش کنم.",
      phases: [
        {
          title: "اولین طرح‌ها",
          period: "اواسط بهمن ۱۴۰۴",
          body: "تو این زمان به F# علاقه‌مند شده بودم، برای همین استک های توسعه وبسایت در این زبان رو با سایت خودم امتحان کردم.",
          figure: {
            alt: "صفحه اصلی ساخته‌شده با F#.",
            caption: "صفحه اصلی با F#.",
            src: "/images/voxes/fsharp.avif",
            ratio: "2732 / 1535",
          },
        },
        {
          title: "جا افتادن دیزاین",
          period: "اوایل اسفند ۱۴۰۴",
          body: "وقتی شروع کردم به یادگرفتن Next.js، بعد از خوندن مستندات رسمیش، سایت خودم رو به‌عنوان پروژه تمرینی ادامه دادم و نتیجه‌ش یک دیزاین جا افتاده‌تر شد.",
          figure: {
            alt: "اولین نسخه صفحه اصلی که با Next.js ساخته شد.",
            caption: "اولین نسخه صفحه اصلی با Next.js.",
            src: "/images/voxes/nextjs.avif",
            ratio: "2732 / 1535",
          },
        },
        {
          title: "انتقال به Astro و نهایی کردن دیزاین",
          period: "هفته اول، مرداد ۱۴۰۵",
          body: "وقتی وقت آزاد پیدا کردم، تصمیم گرفتم پروژه رو به Astro منتقل کنم، یه پلن درست کنم براش و بهش پایبند بمونم تا سایت آماده انتشار بشه.",
        },
        {
          title: "ساخت بقیه صفحه‌ها",
          period: "هفته دوم تا سوم",
          body: "صفحه اصلی تموم شده بود و چیدمان کلی سایت هم نهایی شده بود، پس بقیه صفحه‌ها رو سریع طراحی کردم.",
        },
        {
          title: "وبلاگ، نمونه‌کارها و بخش‌های خاص",
          period: "هفته سوم تا چهارم",
          body: "سیستم وبلاگ و قالب صفحه‌های نمونه‌کارها رو راه انداختم و شروع کردم به ساختن خود صفحه‌ها. در کنارش، انیمیشن صفحه اصلی و صفحه ۴۰۴ هم تکمیل شدن.",
        },
        {
          title: "نوشتن و انتشار",
          period: "هفته آخر",
          body: "روزهای آخر صرف مرتب کردن کد و طراحی، نوشتن متن‌های صفحه‌ها و در نهایت انتشار سایت روی Github Pages شد.",
        },
      ],
    },
    {
      id: "decisions",
      kind: "decisions",
      title: "چرا Astro؟",
      intro:
        "اولش پروژه رو با هر چیزی که اون موقع داشتم یاد می‌گرفتم توسعه می‌دادم. ولی وقتی نیازهاش مشخص‌تر شد، دیدم برای سایتی که صفحه‌هاش از قبل آماده می‌شن  (یعنی Static هست)، Next.js زیادیه. Astro اما دقیقاً برای همین جور سایت‌ها ساخته شده. معماری جزیره‎‌ایش (Islands Architecture) هم، با برنامه هایی که داشتم جور بود: فقط همون قسمت ها اجرا میشن و بقیه سایت سبک می‌مونه.",
      items: [],
    },
    {
      id: "showcase",
      kind: "showcase",
      title: "قسمت‌های جالب سایت",
      intro:
        "بیاید چندجای جالب سایت رو با جزئیات بیشتر بهتون نشون بدم .",
      items: [
        {
          title: "منوی موبایل",
          kind: "رابطه کاربری",
          body: "وقتی داشتم لوگوم رو طراحی می‌کردم، به ذهنم خطور کرد که اگه خود لوگو بشه منوی صفحات برای گوشی خیلی جالب می‌شه. پس همین کار رو کردم. لوگو واقعاً جابه‌جا می‌شه و بزرگ می‌شه تا پس‌زمینه‌ی لینک‌های منو بشه. همه‌ش فقط یه تصویر SVG و کد جاوااسکریپته.",
          points: [
            "لوگو یه تصویر ساده‌ست که با کد حرکت می‌کنه",
            "موقع باز شدن سایت و موقع بردن موس روی لوگو، یه پیام کوتاه نشون می‌ده",
            "از هر دو تم پشتیبانی می‌کنه",
          ],
          figure: {
            alt: "تصویری از لوگو که بزرگ شده و پس‌زمینه منوی موبایل شده.",
            caption: "منوی  باز موبایل.",
            ratio: "1320 / 2868",
            src: "/images/voxes/mobile-menu.avif",
            size: "300px",
          },
        },
        {
          title: "انیمیشن صفحه اصلی",
          kind: "دیزاین",
          body: "برای صفحه اصلی یه انیمیشن درست مردم که تو خود مرورگر زنده با کد اجرا بشه. همه‌ش فقط با SVG و جاوااسکریپت ساخته شده.",
          points: [
            "زنده و در لحظه اجرا می‌شه",
            "از هر دو تم پشتیبانی می‌کنه",
          ],
          figure: {
            alt: "تصویری از یک فریم انیمیشن صفحه اصلی در تم تیره.",
            caption: "انیمیشن صفحه اصلی.",
            src: "/images/voxes/animation.avif",
            ratio: "3 / 4",
            size: "500px",
          },
        },
        {
          title: "مینی‌گیم Flappy Bird",
          kind: "رابطه کاربری",
          body: "یه بازی کوتاه برای صفحه ۴۰۴، با همون پرنده‌ی انیمیشن صفحه اصلی. راستی، این پرنده لوگوی Bevy هست، موتور بازی‌سازی‌ای که باهاش کار می‌کنم.",
          points: [
            "قطعه‌ای تعاملی و سبک",
            "کنترل هم با لمس (موبایل) و هم با کیبورد",
            "از هر دو تم پشتیبانی می‌کنه",
          ],
          figure: {
            alt: "تصویری از مینی‌گیم Flappy Bird تو سایتم.",
            caption: "مینی‌گیم Flappy Bird.",
            ratio: "1164 / 768",
            src: "/images/voxes/flappy.avif",
          },
        },
      ],
    },
    {
      id: "learnings",
      kind: "lessons",
      title: "تجربه‌هایی که کسب کردم",
      intro:
        "ساختن سایت خودم خیلی لذت‌بخش بود و به‌عنوان اولین پروژه‌م با Astro، چیزهای زیادی یاد گرفتم.",
      items: [
        {
          title: "ساخت سایت static با Astro",
          body: " می‌تونم بگم تجربه خوبی تو کار با Astro به دست آوردم و الان باهاش راحتم تا سایت های استتیک و جالب دیگری باهاش درست کنم.",
        },
        {
          title: "طراحی سایت با چند تم",
          body: "تو طول کار کلی پالت های رنگی مختلف امتحان کردم و با زیرساخت یه سایت چند تمی هم آشنا شدم، پس فکر می‌کنم تو این زمینه چیزهای زیادی یاد گرفتم.",
        },
        {
          title: "MDX و صفحه‌های محتوایی",
          body: "MDX فرمتیه که توش می‌شه متن معمولی نوشت و وسطش قطعه‌های دیگه هم گذاشت. چون باید برای وبلاگ و نمونه‌کارها صفحه‌های محتوایی می‌ساختم، الان می‌تونم تو پروژه‌های دیگه هم همچین صفحه‌هایی بسازم.",
        },
        {
          title: "طراحی و استفاده از  SVG ها",
          body: "تو این پروژه با SVG زیاد کار کردم، از لوگو گرفته تا بخش‌های مختلف و انیمیشن‌. پس اگه پروژه‌ای جا برای این جور کارها داشته باشه، میتونم ازشون استفاده کنم.",
        },
      ],
      closing:
        "در مجموع، بالاخره منتشر کردن سایت خودم جالب بود و از نتیجه‌ش راضی‌ام. خوشحالم که حالا جایی دارم که درباره‌ی کارها و موضوع‌های مختلف بنویسم و از چیزهایی که یاد گرفتم استفاده کنم.",
    },
  ],
};

const study: Record<Locale, CaseStudy> = { en, fa };
export default study;