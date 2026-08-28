// ========== إعدادات الأذان ==========
function triggerAdhanNotification(prayerName) {
    const adhanAudio = document.getElementById("adhan-sound");

    adhanAudio.currentTime = 0;
    adhanAudio.play();

    if (Notification.permission === "granted") {
        new Notification(`🕌 حان الآن وقت صلاة ${getPrayerDisplayName(prayerName)}`, {
            body: "أقم صلاتك 🙏",
            icon: "icon-192.jpg"
        });
    }

    if (navigator.vibrate) {
        navigator.vibrate([300, 200, 300]);
    }
}

function getPrayerDisplayName(prayerKey) {
    const names = {
        fajr: "الفجر",
        dhuhr: "الظهر",
        asr: "العصر",
        maghrib: "المغرب",
        isha: "العشاء"
    };
    return names[prayerKey] || prayerKey;
}
function playAzanIfEnabled(prayerName) {
    const isEnabled = localStorage.getItem("azanEnabled") === "true";
    if (!isEnabled) return;

    if (document.visibilityState === "visible") {
        triggerAdhanNotification(prayerName); // صوت + إشعار
    } else {
        if (Notification.permission === "granted") {
            new Notification(`🕌 حان الآن وقت صلاة ${getPrayerDisplayName(prayerName)}`, {
                body: "أقم صلاتك 🙏",
                icon: "icon-192.jpg"
            });
        }
        if (navigator.vibrate) {
            navigator.vibrate([300, 200, 300]);
        }
    }
}

function scheduleAzan(prayerName, timeStr) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const now = new Date();
    const azanTime = new Date();
    azanTime.setHours(hours, minutes, 0, 0);

    const delay = azanTime.getTime() - now.getTime();
    if (delay > 0) {
        setTimeout(() => {
            const nowExact = new Date();
            const nowTime = nowExact.getHours().toString().padStart(2, '0') + ":" +
                nowExact.getMinutes().toString().padStart(2, '0');
            const targetTime = hours.toString().padStart(2, '0') + ":" + minutes.toString().padStart(2, '0');

            if (nowTime === targetTime) {
                playAzanIfEnabled(prayerName);
            }
        }, delay);
    }
}

function scheduleAllAzans(prayerTimes) {
    const prayers = {
        fajr: "Fajr",
        dhuhr: "Dhuhr",
        asr: "Asr",
        maghrib: "Maghrib",
        isha: "Isha"
    };

    Object.entries(prayers).forEach(([key, name]) => {
        const time = prayerTimes[name];
        if (time) scheduleAzan(key, time);
    });
}

function toggleAzanSetting() {
    const toggle = document.getElementById("azan-toggle");
    const isEnabled = localStorage.getItem("azanEnabled") === "true";

    if (isEnabled) {
        localStorage.setItem("azanEnabled", "false");
        toggle.classList.remove("active");
        console.log("❌ تم إيقاف الأذان");
    } else {
        Notification.requestPermission().then((permission) => {
            if (permission === "granted") {
                const audio = document.getElementById("adhan-sound");
                if (audio) {
                    audio.muted = true;
                    audio.play().then(() => {
                        audio.pause();
                        audio.currentTime = 0;
                        audio.muted = false;
                    }).catch(() => { });
                }

                if (userData.prayerTimes) {
                    scheduleAllAzans(userData.prayerTimes);
                }

                localStorage.setItem("azanEnabled", "true");
                toggle.classList.add("active");
                console.log("✅ تم تفعيل الأذان");
            } else {
                alert("لن تتمكن من استقبال الأذان بدون السماح بالإشعارات.");
            }
        });
    }
}

function initAzanToggle() {
    const toggle = document.getElementById("azan-toggle");
    const isEnabled = localStorage.getItem("azanEnabled") === "true";
    if (isEnabled) {
        toggle.classList.add("active");
    } else {
        toggle.classList.remove("active");
    }
}

window.addEventListener("DOMContentLoaded", initAzanToggle);
window.addEventListener("DOMContentLoaded", () => {
    initAzanToggle();

    if (localStorage.getItem("azanEnabled") === "true" && userData.prayerTimes) {
        scheduleAllAzans(userData.prayerTimes);
    }
});
