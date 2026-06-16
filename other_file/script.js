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
let prayerSchedule = [];

// ترتيب الأسماء التي تظهر في الواجهة
const prayers = ["الفجر", "الشروق", "الظهر", "العصر", "المغرب", "العشاء"];

// ترتيب المفاتيح داخل ملف JSON
const prayerKeys = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];

// أسماء الأشهر حسب الاستعمال المحلي
const months = [
  "جانفي",
  "فيفري",
  "مارس",
  "أفريل",
  "ماي",
  "جوان",
  "جويلية",
  "أوت",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

// ============================================================
// 2. أدوات مساعدة
// ============================================================

function timeToSeconds(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 3600 + m * 60;
}

function nowSeconds() {
  const n = new Date();
  return n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds();
}

function calcIqamaTime(prayerTime, index) {
  let [hour, min] = prayerTime.split(":").map(Number);

  if (index === 0) {
    min += 25; // الفجر
  } else if (index === 1) {
    return null; // الشروق: لا إقامة
  } else if (index === 2) {
    return "13:00"; // الظهر: إقامة ثابتة
  } else if (index === 4) {
    min += 10; // المغرب
  } else {
    min += 15; // العصر / العشاء
  }

  if (min >= 60) {
    hour += 1;
    min -= 60;
  }

  return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function iqamaWaitMinutes(index, adhanTimeStr) {
  if (index === 0) return 25;
  if (index === 1) return null;

  if (index === 2) {
    return (timeToSeconds("13:00") - timeToSeconds(adhanTimeStr)) / 60;
  }

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

  if (timeEl) {
    timeEl.textContent = `${h}:${m}:${s}`;
  }
}

// ============================================================
// 4. جلب مواقيت الصلاة
// ============================================================
async function getPrayerTimes() {
  const response = await fetch("./other_file/prayer_times_muharram_1448.json");

  if (!response.ok) {
    throw new Error("فشل تحميل ملف مواقيت الصلاة");
  }

  const data = await response.json();

  const { hijri_year, hijri_month } = data.meta;

  const todayData = data.days.find((day) => day.date === date);

  if (!todayData) {
    return null;
  }

  const [year, month, dayOfMonth] = todayData.date.split("-");

  if (dateSite) {
    dateSite.innerHTML = `
      ${todayData.day_ar}، 
      ${dayOfMonth} ${months[+month - 1]} ${year} 
      | 
      ${todayData.hijri_day} ${hijri_month} ${hijri_year}
    `;
  }

  return todayData.prayers;
}

// ============================================================
// 5. بناء جدول الصلوات الكامل
// ============================================================
function buildSchedule(timeInArray) {
  return timeInArray.map((t, i) => {
    const iqamaStr = calcIqamaTime(t, i);

    return {
      index: i,
      name: prayers[i],
      adhanStr: t,
      iqamaStr,
      adhanSec: timeToSeconds(t),
      iqamaSec: iqamaStr ? timeToSeconds(iqamaStr) : null,
      waitMin: iqamaWaitMinutes(i, t),
    };
  });
}

// ============================================================
// 6. تحديث البانر + العداد + الكلاس النشط
// ============================================================
function tick() {
  updateClock();

  if (prayerSchedule.length === 0) return;

  const now = nowSeconds();

  let currentIdx = -1;

  for (let i = prayerSchedule.length - 1; i >= 0; i--) {
    if (now >= prayerSchedule[i].adhanSec) {
      currentIdx = i;
      break;
    }
  }

  let phase;
  let bannerIdx;
  let targetSec;

  if (currentIdx === -1) {
    phase = "before_adhan";
    bannerIdx = 0;
    targetSec = prayerSchedule[0].adhanSec;
  } else {
    const cur = prayerSchedule[currentIdx];

    const hasIqama = cur.iqamaSec !== null;
    const iqamaPassed = hasIqama && now >= cur.iqamaSec;

    if (hasIqama && !iqamaPassed) {
      phase = "before_iqama";
      bannerIdx = currentIdx;
      targetSec = cur.iqamaSec;
    } else {
      const nextIdx = prayerSchedule.findIndex((p) => now < p.adhanSec);

      phase = "before_adhan";
      bannerIdx = nextIdx !== -1 ? nextIdx : 0;

      targetSec =
        nextIdx !== -1
          ? prayerSchedule[nextIdx].adhanSec
          : prayerSchedule[0].adhanSec + 86400;
    }
  }

  prayerCards.forEach((card, i) => {
    card.classList.toggle("prayer-card--active", i === bannerIdx);
  });

  const bp = prayerSchedule[bannerIdx];

  if (bannerName) bannerName.innerHTML = bp.name;
  if (bannerAdhan) bannerAdhan.innerHTML = bp.adhanStr;

  if (bannerIqama) {
    bannerIqama.innerHTML = bp.iqamaStr
      ? `إقامة صلاة : ${bp.iqamaStr}`
      : "لا إقامة";
  }

  const afterIdx = (bannerIdx + 1) % prayerSchedule.length;
  const ap = prayerSchedule[afterIdx];

  if (nextAfterName) nextAfterName.innerHTML = ap.name;
  if (nextAfterTime) nextAfterTime.innerHTML = ap.adhanStr;

  if (iqamaNextTime) {
    iqamaNextTime.innerHTML = bp.waitMin !== null ? bp.waitMin : "—";
  }

  if (bannerLabel) {
    bannerLabel.textContent =
      phase === "before_iqama" ? "الإقامة بعد" : "يبدأ بعد";
  }

  let remaining = targetSec - now;

  if (remaining < 0) {
    remaining += 86400;
  }

  const rh = String(Math.floor(remaining / 3600)).padStart(2, "0");
  const rm = String(Math.floor((remaining % 3600) / 60)).padStart(2, "0");
  const rs = String(remaining % 60).padStart(2, "0");

  if (countdownTimer) {
    countdownTimer.textContent = `${rh}:${rm}:${rs}`;
  }
}

// ============================================================
// 7. نقطة البداية
// ============================================================
updateClock();

getPrayerTimes()
  .then((timeprayer) => {
    if (!timeprayer) {
      console.error(
        "لم يتم العثور على مواقيت الصلاة لهذا اليوم داخل ملف JSON.",
      );
      return;
    }

    // مهم: لا نستعمل Object.values حتى لا نعتمد على ترتيب المفاتيح
    const timeInArray = prayerKeys.map((key) => timeprayer[key]);

    prayerCardsTime.forEach((cardTime, i) => {
      cardTime.textContent = timeInArray[i];
    });

    iqamaTimes.forEach((el, i) => {
      const iqama = calcIqamaTime(timeInArray[i], i);
      el.innerHTML = iqama ?? "—";
    });

    prayerSchedule = buildSchedule(timeInArray);

    tick();
    setInterval(tick, 1000);
  })
  .catch((error) => {
    console.error(error);
  });
