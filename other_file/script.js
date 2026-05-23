// ============================================================
// 1. عناصر HTML
// ============================================================
const timeEl = document.querySelector(".navbar__clock");
const dateSite = document.querySelector(".navbar__date");
const prayerCardsTime = document.querySelectorAll(
  ".prayer-card .prayer-card__time",
);
const iqamaTimes = document.querySelectorAll(
  ".prayer-card .prayer-card__iqama span:nth-child(2)",
);
const prayerCards = document.querySelectorAll(".prayer-card");

// بانر الصلاة القادمة
const bannerName = document.querySelector(".next-prayer-banner__name");
const bannerAdhan = document.querySelector(".next-prayer-banner__adhan-time");
const bannerIqama = document.querySelector(".next-prayer-banner__iqama-time");
const bannerLabel = document.querySelector(".countdown-card__label");
const countdownTimer = document.querySelector(".countdown-card__timer");
const iqamaNextTime = document.querySelector(".iqamaNextTime");

// بطاقة الصلاة بعد القادمة
const nextAfterName = document.querySelector(".next-after-card__name");
const nextAfterTime = document.querySelector(".next-after-card__time");

let date;
let timeWithHourAndMinute;
let prayerSchedule = []; // يُملأ بعد جلب البيانات

const prayers = ["الفجر", "الشروق", "الظهر", "العصر", "المغرب", "العشاء"];

const months = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

// ============================================================
// 2. أدوات مساعدة
// ============================================================

/** تحوّل "HH:MM" → ثواني منذ منتصف الليل */
function timeToSeconds(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 3600 + m * 60;
}

/** الثواني الحالية منذ منتصف الليل */
function nowSeconds() {
  const n = new Date();
  return n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds();
}

/** حساب وقت الإقامة لكل صلاة */
function calcIqamaTime(prayerTime, index) {
  let [hour, min] = prayerTime.split(":").map(Number);

  if (index === 0) {
    min += 25;
  } // الفجر
  else if (index === 1) {
    return null;
  } // الشروق: لا إقامة
  else if (index === 2) {
    return "13:00";
  } // الظهر: إقامة ثابتة
  else if (index === 4) {
    min += 10;
  } // المغرب
  else {
    min += 15;
  } // العصر / العشاء

  if (min >= 60) {
    hour += 1;
    min -= 60;
  }
  return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** دقائق الانتظار حتى الإقامة */
function iqamaWaitMinutes(index, adhanTimeStr) {
  if (index === 0) return 25;
  if (index === 1) return null;
  if (index === 2)
    return (timeToSeconds("13:00") - timeToSeconds(adhanTimeStr)) / 60;
  if (index === 4) return 10;
  return 15;
}

// ============================================================
// 3. تحديث الساعة
// ============================================================
function updateClock() {
  date = new Date().toISOString().split("T")[0];
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  timeWithHourAndMinute = `${h}:${m}`;
  timeEl.textContent = `${h}:${m}:${s}`;
}

// ============================================================
// 4. جلب مواقيت الصلاة
// ============================================================
async function getPrayerTimes() {
  const response = await fetch("./other_file/prayer_times_dhulhijja_1447.json");
  const data = await response.json();
  const { hijri_year, hijri_month } = data.meta;
  let timeprayer;

  data.days.forEach((day) => {
    if (day.date === date) {
      const [year, month, dayOfMonth] = day.date.split("-");
      dateSite.innerHTML = `${day.day_ar}، ${dayOfMonth} ${months[+month - 1]} ${year} | ${day.hijri_day} ${hijri_month} ${hijri_year}`;
      timeprayer = day.prayers;
    }
  });

  return timeprayer;
}

// ============================================================
// 5. بناء جدول الصلوات الكامل (أذان + إقامة بالثواني)
// ============================================================
function buildSchedule(timeInArray) {
  return timeInArray.map((t, i) => {
    const iqamaStr = calcIqamaTime(t, i);
    return {
      index: i,
      name: prayers[i],
      adhanStr: t,
      iqamaStr: iqamaStr,
      adhanSec: timeToSeconds(t),
      iqamaSec: iqamaStr ? timeToSeconds(iqamaStr) : null,
      waitMin: iqamaWaitMinutes(i, t),
    };
  });
}

// ============================================================
// 6. تحديث البانر + العداد + الكلاس النشط — كل ثانية
// ============================================================
function tick() {
  updateClock();
  if (prayerSchedule.length === 0) return;

  const now = nowSeconds();

  // --- تحديد الصلاة الحالية (آخر أذان مرّ) ---
  let currentIdx = -1;
  for (let i = prayerSchedule.length - 1; i >= 0; i--) {
    if (now >= prayerSchedule[i].adhanSec) {
      currentIdx = i;
      break;
    }
  }

  // --- تحديد المرحلة وما يُعرض في البانر ---
  let phase; // 'before_adhan' | 'before_iqama'
  let bannerIdx; // فهرس الصلاة المعروضة في البانر
  let targetSec; // الهدف الزمني للعداد

  if (currentIdx === -1) {
    // قبل أذان الفجر تماماً
    phase = "before_adhan";
    bannerIdx = 0;
    targetSec = prayerSchedule[0].adhanSec;
  } else {
    const cur = prayerSchedule[currentIdx];
    const hasIqama = cur.iqamaSec !== null;
    const iqamaPassed = hasIqama && now >= cur.iqamaSec;

    if (hasIqama && !iqamaPassed) {
      // ✅ بين الأذان والإقامة → عدّ تنازلي للإقامة
      phase = "before_iqama";
      bannerIdx = currentIdx;
      targetSec = cur.iqamaSec;
    } else {
      // بعد الإقامة (أو الشروق بلا إقامة) → الصلاة القادمة
      const nextIdx = prayerSchedule.findIndex((p) => now < p.adhanSec);
      phase = "before_adhan";
      bannerIdx = nextIdx !== -1 ? nextIdx : 0;
      targetSec =
        nextIdx !== -1
          ? prayerSchedule[nextIdx].adhanSec
          : prayerSchedule[0].adhanSec + 86400; // الفجر الغد
    }
  }

  // --- تحديث كلاس النشط ---
  // ✅ active تتبع bannerIdx دائماً:
  //    - بين الأذان والإقامة → الصلاة الحالية
  //    - بعد الإقامة → تنتقل فوراً للصلاة القادمة
  prayerCards.forEach((card, i) => {
    card.classList.toggle("prayer-card--active", i === bannerIdx);
  });

  // --- تحديث البانر ---
  const bp = prayerSchedule[bannerIdx];
  bannerName.innerHTML = bp.name;
  bannerAdhan.innerHTML = bp.adhanStr;
  // ✅ وقت الإقامة بدون أي نص — الرقم وحده
  bannerIqama.innerHTML = bp.iqamaStr
    ? `إقامة صلاة : ${bp.iqamaStr}`
    : "لا إقامة";

  // --- تحديث بطاقة الصلاة بعد القادمة ---
  // الصلاة التي تلي البانر مباشرةً (مع الدوران للفجر عند العشاء)
  const afterIdx = (bannerIdx + 1) % prayerSchedule.length;
  const ap = prayerSchedule[afterIdx];
  nextAfterName.innerHTML = ap.name;
  nextAfterTime.innerHTML = ap.adhanStr;

  if (iqamaNextTime) {
    iqamaNextTime.innerHTML = bp.waitMin !== null ? bp.waitMin : "—";
  }

  // --- نص تسمية العداد ---
  bannerLabel.textContent =
    phase === "before_iqama" ? "الإقامة بعد" : "يبدأ بعد";

  // --- العد التنازلي ---
  let remaining = targetSec - now;
  if (remaining < 0) remaining += 86400;

  const rh = String(Math.floor(remaining / 3600)).padStart(2, "0");
  const rm = String(Math.floor((remaining % 3600) / 60)).padStart(2, "0");
  const rs = String(remaining % 60).padStart(2, "0");
  countdownTimer.textContent = `${rh}:${rm}:${rs}`;
}

// ============================================================
// 7. نقطة البداية
// ============================================================
updateClock();

getPrayerTimes().then((timeprayer) => {
  if (!timeprayer) {
    console.error("لم يتم العثور على مواقيت الصلاة لهذا اليوم.");
    return;
  }

  const timeInArray = Object.values(timeprayer);

  // ملء بطاقات الصلوات
  prayerCardsTime.forEach((cardTime, i) => {
    cardTime.textContent = timeInArray[i];
  });

  // ملء أوقات الإقامة في البطاقات
  iqamaTimes.forEach((el, i) => {
    const iqama = calcIqamaTime(timeInArray[i], i);
    el.innerHTML = iqama ?? "—";
  });

  // بناء الجدول الكامل
  prayerSchedule = buildSchedule(timeInArray);

  // ✅ دورة واحدة تتحكم في كل شيء
  tick();
  setInterval(tick, 1000);
});
