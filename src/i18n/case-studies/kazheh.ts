import type { Locale } from "@/i18n";
import type { CaseStudy } from "./types";

// TODO: ALL of this is placeholder. It exists to prove out the layout and
// lengths, not to say anything true about the project. Replace every string
// (and add real `figure.src` paths under /public/images/works/kazheh/).
// The Farsi block is a short, unreviewed placeholder as well.

const en: CaseStudy = {
  lead: "Placeholder: one or two sentences saying what Kazheh is, who it was for, and what I did, written so someone skimming gets it in ten seconds.",
  facts: [
    { label: "Client", value: "Boutique hotel" },
    { label: "Role", value: "Placeholder role" },
    { label: "Duration", value: "Placeholder duration" },
    { label: "Languages", value: "English, Farsi" },
  ],
  hero: {
    alt: "Placeholder: the finished Kazheh site on a laptop and a phone",
    caption: "Placeholder: the finished site, desktop and mobile.",
    ratio: "16 / 9",
  },
  sections: [
    {
      id: "brief",
      kind: "brief",
      title: "The brief",
      body: [
        "Placeholder: describe who the client is and what they came to me with. What problem did they have before this site existed, and what did they believe they needed?",
        "Placeholder: describe what the work actually turned out to be once we talked it through. This is where the gap between the request and the real job goes, if there was one.",
      ],
      asksLabel: "What I was asked to do",
      asks: [
        "Placeholder: a public site in two languages",
        "Placeholder: online booking for rooms",
        "Placeholder: a way for staff to manage it themselves",
        "Placeholder: a launch date and a budget to respect",
      ],
      figure: {
        alt: "Placeholder: the client's original sketch or notes",
        caption: "Placeholder: the client's starting point.",
        ratio: "21 / 9",
      },
    },
    {
      id: "process",
      kind: "timeline",
      title: "How it went",
      intro:
        "Placeholder: a sentence on how the work was structured, and how much of it was planned versus discovered along the way.",
      phases: [
        {
          title: "Discovery and scoping",
          period: "Placeholder: week 1",
          body: "Placeholder: what I asked, what I learned, and what we agreed to leave out of the first version.",
        },
        {
          title: "Design",
          period: "Placeholder: weeks 2 to 3",
          body: "Placeholder: how the look and the page structure were decided, who signed off, and how many rounds it took.",
          figure: {
            alt: "Placeholder: early design sketches",
            caption: "Placeholder: early layouts for the room pages.",
            ratio: "16 / 9",
          },
        },
        {
          title: "Building the public site",
          period: "Placeholder: weeks 3 to 6",
          body: "Placeholder: the order I built things in and why. A longer entry like this one shows how a timeline row behaves when the text runs to several lines on a narrow screen.",
        },
        {
          title: "Admin panel and content",
          period: "Placeholder: weeks 6 to 8",
          body: "Placeholder: how the staff-facing side was built and tested with the people who would actually use it.",
        },
        {
          title: "Launch and handover",
          period: "Placeholder: week 9",
          body: "Placeholder: what going live involved, and what I handed over so the client could run it without me.",
          figure: {
            alt: "Placeholder: launch-day photo or analytics screenshot",
            caption: "Placeholder: the first week after launch.",
            ratio: "16 / 9",
          },
        },
      ],
    },
    {
      id: "decisions",
      kind: "decisions",
      title: "What I chose, and why",
      intro:
        "Placeholder: a sentence framing the main forks in the road, and the principle I used to pick between them.",
      items: [
        {
          title: "Framework",
          choice: "Next.js",
          why: "Placeholder: the reasons this fit the project better than the alternatives, in terms the client would care about as well as technical ones.",
          considered: ["Placeholder option A", "Placeholder option B"],
        },
        {
          title: "Two languages",
          choice: "Placeholder choice",
          why: "Placeholder: how translated content and right-to-left layout were handled, and what that cost.",
          considered: ["Placeholder option A"],
        },
        {
          title: "Where the data lives",
          choice: "Placeholder choice",
          why: "Placeholder: what was stored, who needed to edit it, and why this was the simplest thing that could work.",
          considered: ["Placeholder option A", "Placeholder option B", "Placeholder option C"],
        },
        {
          title: "Hosting",
          choice: "Placeholder choice",
          why: "Placeholder: the trade-off between cost, effort for the client afterwards, and speed for visitors.",
          considered: ["Placeholder option A"],
        },
      ],
    },
    {
      id: "challenges",
      kind: "challenges",
      title: "What got in the way",
      intro:
        "Placeholder: a sentence on which problems were the hardest, and which only looked hard.",
      items: [
        {
          title: "Placeholder challenge one",
          problem:
            "Placeholder: what went wrong or what was unclear, and why it mattered for the client or for visitors.",
          solution:
            "Placeholder: what I tried, what failed, and what finally worked. Naming the dead ends is more convincing than only the fix.",
          figure: {
            alt: "Placeholder: diagram or before-and-after of the problem",
            caption: "Placeholder: before and after.",
            ratio: "16 / 9",
          },
        },
        {
          title: "Placeholder challenge two",
          problem:
            "Placeholder: a second problem, shorter this time, to show a row without a figure.",
          solution:
            "Placeholder: how it was resolved and what it changed about the way I worked afterwards.",
        },
        {
          title: "Placeholder challenge three",
          problem:
            "Placeholder: a third problem, with a longer description so the two-column layout is tested against uneven text lengths on both sides.",
          solution:
            "Placeholder: a short resolution.",
        },
      ],
    },
    {
      id: "showcase",
      kind: "showcase",
      title: "Parts worth a closer look",
      intro:
        "Placeholder: a sentence introducing the pieces I'm proudest of, or the ones that show the most about how I build.",
      items: [
        {
          title: "Admin panel",
          kind: "System",
          body: "Placeholder: what the admin panel lets staff do, who it is for, and what made it different from filling in a generic dashboard template.",
          points: [
            "Placeholder: managing rooms and prices",
            "Placeholder: seeing and editing bookings",
            "Placeholder: editing both languages side by side",
            "Placeholder: roles and access",
          ],
          figure: {
            alt: "Placeholder: screenshot of the admin panel",
            caption: "Placeholder: the bookings view in the admin panel.",
            ratio: "16 / 10",
          },
        },
        {
          title: "Booking flow",
          kind: "Component",
          body: "Placeholder: how a visitor goes from choosing dates to a confirmed booking, and the details that keep it from feeling like a form.",
          points: [
            "Placeholder: availability checking",
            "Placeholder: handling of dates and time zones",
            "Placeholder: confirmation and follow-up",
          ],
          figure: {
            alt: "Placeholder: screenshot of the booking flow on a phone",
            caption: "Placeholder: the booking flow on mobile.",
            ratio: "16 / 10",
          },
        },
        {
          title: "Bilingual layer",
          kind: "System",
          body: "Placeholder: how one codebase serves left-to-right and right-to-left pages, and how copy, dates and numbers are kept consistent between them.",
          points: [
            "Placeholder: locale-aware routing",
            "Placeholder: mirrored layout without duplicated components",
          ],
          figure: {
            alt: "Placeholder: the same page in English and in Farsi, side by side",
            caption: "Placeholder: one page, two languages.",
            ratio: "16 / 10",
          },
        },
      ],
    },
    {
      id: "learnings",
      kind: "lessons",
      title: "What I learned",
      intro:
        "Placeholder: a sentence on what this project changed about how I work.",
      items: [
        {
          title: "Placeholder lesson one",
          body: "Placeholder: what I would do differently, and what I'd do the same.",
        },
        {
          title: "Placeholder lesson two",
          body: "Placeholder: something about working with a real client, rather than something technical.",
        },
        {
          title: "Placeholder lesson three",
          body: "Placeholder: something technical that I now consider settled.",
        },
        {
          title: "Placeholder lesson four",
          body: "Placeholder: a thing I still don't know how to do well, and plan to get better at.",
        },
      ],
      closing:
        "Placeholder: a closing paragraph that ties the project back to the kind of work I want to do next.",
      figure: {
        alt: "Placeholder: a team or client photo, if there is one",
        caption: "Placeholder: optional closing photo.",
        ratio: "21 / 9",
      },
    },
  ],
};

const fa: CaseStudy = {
  lead: "متن نمونه: یکی دو جمله درباره اینکه کاژه چیست، برای چه کسی ساخته شد و من چه کردم.",
  facts: [
    { label: "کارفرما", value: "هتل بوتیک" },
    { label: "نقش", value: "نقش نمونه" },
    { label: "مدت", value: "مدت نمونه" },
    { label: "زبان‌ها", value: "انگلیسی، فارسی" },
  ],
  hero: {
    alt: "متن نمونه: سایت نهایی روی لپ‌تاپ و موبایل",
    caption: "متن نمونه: سایت نهایی، دسکتاپ و موبایل.",
    ratio: "16 / 9",
  },
  sections: [
    {
      id: "brief",
      kind: "brief",
      title: "درخواست",
      body: [
        "متن نمونه: کارفرما کیست و با چه خواسته‌ای آمد. پیش از این سایت چه مشکلی داشت؟",
        "متن نمونه: کار واقعی بعد از گفتگو چه شد. فاصله درخواست و کار واقعی اینجا می‌آید.",
      ],
      asksLabel: "از من چه خواسته شد",
      asks: [
        "متن نمونه: یک سایت عمومی دوزبانه",
        "متن نمونه: رزرو آنلاین اتاق",
        "متن نمونه: پنل مدیریت برای کارکنان",
        "متن نمونه: تاریخ انتشار و بودجه مشخص",
      ],
      figure: {
        alt: "متن نمونه: طرح یا یادداشت اولیه کارفرما",
        caption: "متن نمونه: نقطه شروع کارفرما.",
        ratio: "21 / 9",
      },
    },
    {
      id: "process",
      kind: "timeline",
      title: "روند کار",
      intro: "متن نمونه: یک جمله درباره ساختار کار و میزان برنامه‌ریزی در برابر کشف حین کار.",
      phases: [
        {
          title: "شناخت و تعریف دامنه",
          period: "متن نمونه: هفته ۱",
          body: "متن نمونه: چه پرسیدم، چه فهمیدم و چه چیزی را از نسخه اول کنار گذاشتیم.",
        },
        {
          title: "طراحی",
          period: "متن نمونه: هفته ۲ تا ۳",
          body: "متن نمونه: ظاهر و ساختار صفحه‌ها چطور تعیین شد و چند دور طول کشید.",
          figure: {
            alt: "متن نمونه: طرح‌های اولیه",
            caption: "متن نمونه: طرح‌های اولیه صفحه اتاق‌ها.",
            ratio: "16 / 9",
          },
        },
        {
          title: "ساخت سایت عمومی",
          period: "متن نمونه: هفته ۳ تا ۶",
          body: "متن نمونه: ترتیبی که چیزها را ساختم و دلیلش. این مورد کمی طولانی‌تر است تا رفتار ردیف خط زمانی در صفحه‌های باریک دیده شود.",
        },
        {
          title: "پنل مدیریت و محتوا",
          period: "متن نمونه: هفته ۶ تا ۸",
          body: "متن نمونه: بخش مخصوص کارکنان چطور ساخته و با کاربران واقعی آزموده شد.",
        },
        {
          title: "انتشار و تحویل",
          period: "متن نمونه: هفته ۹",
          body: "متن نمونه: انتشار چه کارهایی داشت و چه چیزی تحویل دادم تا کارفرما بدون من ادامه دهد.",
          figure: {
            alt: "متن نمونه: عکس روز انتشار یا تصویر آمار",
            caption: "متن نمونه: هفته اول پس از انتشار.",
            ratio: "16 / 9",
          },
        },
      ],
    },
    {
      id: "decisions",
      kind: "decisions",
      title: "چه انتخاب کردم و چرا",
      intro: "متن نمونه: یک جمله درباره دوراهی‌های اصلی و معیاری که برای انتخاب داشتم.",
      items: [
        {
          title: "فریم‌ورک",
          choice: "Next.js",
          why: "متن نمونه: دلایل مناسب‌تر بودن این انتخاب، هم برای کارفرما و هم از نظر فنی.",
          considered: ["گزینه نمونه الف", "گزینه نمونه ب"],
        },
        {
          title: "دو زبانه بودن",
          choice: "انتخاب نمونه",
          why: "متن نمونه: چطور محتوای ترجمه‌شده و چیدمان راست‌به‌چپ مدیریت شد و هزینه‌اش چه بود.",
          considered: ["گزینه نمونه الف"],
        },
        {
          title: "محل نگهداری داده",
          choice: "انتخاب نمونه",
          why: "متن نمونه: چه چیزی ذخیره می‌شد، چه کسی ویرایشش می‌کرد و چرا ساده‌ترین راه همین بود.",
          considered: ["گزینه نمونه الف", "گزینه نمونه ب", "گزینه نمونه ج"],
        },
        {
          title: "میزبانی",
          choice: "انتخاب نمونه",
          why: "متن نمونه: مصالحه میان هزینه، زحمت بعدی کارفرما و سرعت برای بازدیدکننده.",
          considered: ["گزینه نمونه الف"],
        },
      ],
    },
    {
      id: "challenges",
      kind: "challenges",
      title: "چه چیزی سد راه شد",
      intro: "متن نمونه: کدام مشکل‌ها واقعاً سخت بودند و کدام فقط سخت به نظر می‌رسیدند.",
      items: [
        {
          title: "چالش نمونه یک",
          problem: "متن نمونه: چه چیزی خراب شد یا مبهم بود و چرا مهم بود.",
          solution: "متن نمونه: چه چیزهایی امتحان کردم، چه شکست خورد و چه چیزی بالاخره جواب داد.",
          figure: {
            alt: "متن نمونه: نمودار یا پیش و پس از مشکل",
            caption: "متن نمونه: پیش و پس.",
            ratio: "16 / 9",
          },
        },
        {
          title: "چالش نمونه دو",
          problem: "متن نمونه: مشکل دوم، کوتاه‌تر، برای نمایش ردیف بدون تصویر.",
          solution: "متن نمونه: چطور حل شد و چه چیزی را در روش کارم عوض کرد.",
        },
        {
          title: "چالش نمونه سه",
          problem: "متن نمونه: مشکل سوم با توضیح طولانی‌تر تا چیدمان دو ستونه با متن‌های نابرابر آزموده شود.",
          solution: "متن نمونه: راه‌حل کوتاه.",
        },
      ],
    },
    {
      id: "showcase",
      kind: "showcase",
      title: "بخش‌هایی که ارزش دیدن دارند",
      intro: "متن نمونه: یک جمله درباره بخش‌هایی که بیشتر از همه به آن‌ها افتخار می‌کنم.",
      items: [
        {
          title: "پنل مدیریت",
          kind: "سامانه",
          body: "متن نمونه: پنل مدیریت چه امکاناتی به کارکنان می‌دهد و چه تفاوتی با یک قالب آماده داشبورد دارد.",
          points: [
            "متن نمونه: مدیریت اتاق‌ها و قیمت‌ها",
            "متن نمونه: مشاهده و ویرایش رزروها",
            "متن نمونه: ویرایش دو زبان کنار هم",
            "متن نمونه: نقش‌ها و دسترسی",
          ],
          figure: {
            alt: "متن نمونه: تصویر پنل مدیریت",
            caption: "متن نمونه: نمای رزروها در پنل مدیریت.",
            ratio: "16 / 10",
          },
        },
        {
          title: "فرآیند رزرو",
          kind: "مؤلفه",
          body: "متن نمونه: بازدیدکننده چطور از انتخاب تاریخ به رزرو تأییدشده می‌رسد و چه جزئیاتی آن را از یک فرم ساده جدا می‌کند.",
          points: [
            "متن نمونه: بررسی موجودی",
            "متن نمونه: مدیریت تاریخ و منطقه زمانی",
            "متن نمونه: تأیید و پیگیری",
          ],
          figure: {
            alt: "متن نمونه: تصویر فرآیند رزرو روی موبایل",
            caption: "متن نمونه: فرآیند رزرو در موبایل.",
            ratio: "16 / 10",
          },
        },
        {
          title: "لایه دوزبانه",
          kind: "سامانه",
          body: "متن نمونه: یک کدبیس چطور هم صفحه‌های چپ‌به‌راست و هم راست‌به‌چپ را ارائه می‌دهد.",
          points: [
            "متن نمونه: مسیریابی بر اساس زبان",
            "متن نمونه: چیدمان آینه‌ای بدون کپی کردن مؤلفه‌ها",
          ],
          figure: {
            alt: "متن نمونه: یک صفحه به انگلیسی و فارسی کنار هم",
            caption: "متن نمونه: یک صفحه، دو زبان.",
            ratio: "16 / 10",
          },
        },
      ],
    },
    {
      id: "learnings",
      kind: "lessons",
      title: "چه یاد گرفتم",
      intro: "متن نمونه: یک جمله درباره اینکه این پروژه چه چیزی را در روش کار من عوض کرد.",
      items: [
        { title: "درس نمونه یک", body: "متن نمونه: چه چیزی را متفاوت انجام می‌دادم و چه چیزی را همان‌طور." },
        { title: "درس نمونه دو", body: "متن نمونه: چیزی درباره کار با کارفرمای واقعی، نه موضوع فنی." },
        { title: "درس نمونه سه", body: "متن نمونه: چیزی فنی که حالا برایم جاافتاده است." },
        { title: "درس نمونه چهار", body: "متن نمونه: چیزی که هنوز خوب بلد نیستم و می‌خواهم بهتر شوم." },
      ],
      closing: "متن نمونه: پاراگراف پایانی که پروژه را به نوع کاری که می‌خواهم بعداً انجام دهم وصل می‌کند.",
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
