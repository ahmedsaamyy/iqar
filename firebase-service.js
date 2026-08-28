// ==========================================================
// firebase-service.js
// كل التعامل مع Firebase في مكان واحد:
// 1) sendVisitData()  -> تسجيل الزيارات وبيانات الأدمن (users / visits)
// 2) اسم المستخدم ورسالة الترحيب (namePrompt / welcomeMessage)
// ملاحظة: نفس البيانات، نفس الحقول، نفس الـ collections بالظبط
// زي ما كانت في الكود الأصلي، بس دلوقتي في اتصال واحد فقط بفايربيز
// بدل اتنين (كان بيسبب خطأ duplicate-app في السكريبت التاني).
// ==========================================================

console.log("🔥 Firebase script loaded");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyArzeIp8l9SyedrXck1VfGgoXxWm6sRtNQ",
    authDomain: "iqsreeb.firebaseapp.com",
    projectId: "iqsreeb",
    storageBucket: "iqsreeb.firebasestorage.app",
    messagingSenderId: "857287419802",
    appId: "1:857287419802:web:370efb40e2e4ef987e3c23",
    measurementId: "G-ZHNRKLQJPK"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function getDeviceId() {
    let id = localStorage.getItem("deviceId");
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem("deviceId", id);
    }
    return id;
}

// ---------------------------------------------------------
// 1) تسجيل الزيارات وبيانات الأدمن
// ---------------------------------------------------------

// دالة للحصول على أعلى رقم ID ثابت موجود
async function getNextFixedId() {
    try {
        const usersSnap = await getDocs(collection(db, "users"));
        let highestId = 50; // نبدأ من 50 كما طلبت

        usersSnap.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.fixedId && data.fixedId > highestId) {
                highestId = data.fixedId;
            }
        });

        return highestId + 1;
    } catch (error) {
        console.error("Error getting next ID:", error);
        return 51; // قيمة افتراضية
    }
}

async function sendVisitData() {
    const timeNow = new Date().toISOString();
    const deviceId = getDeviceId();
    const userRef = doc(db, "users", deviceId);
    const localName = localStorage.getItem("userName") || "مجهول";

    async function sendData(lat, lng) {
        const docSnap = await getDoc(userRef);
        const oldData = docSnap.exists() ? docSnap.data() : {};
        const currentName = oldData.name;
        let finalName = localName;

        // ✅ الاسم في Firestore هو الأساس
        if (currentName && currentName !== "مجهول") {
            finalName = currentName;
            localStorage.setItem("userName", currentName);
        }

        // ✅ لو الاسم في Firestore مفقود أو مجهول، واسم المستخدم في localStorage حقيقي → نحفظه
        if ((!currentName || currentName === "مجهول") && localName !== "مجهول") {
            finalName = localName;
        }

        const updates = {
            lastVisit: timeNow,
            lat: lat ?? oldData.lat ?? null,
            lng: lng ?? oldData.lng ?? null,
            visitCount: (oldData.visitCount || 0) + 1,
            name: finalName
        };

        if (!docSnap.exists()) {
            // مستخدم جديد - نعطيه ID ثابت
            updates.deviceId = deviceId;
            updates.fixedId = await getNextFixedId();
            updates.firstVisit = timeNow;
            await setDoc(userRef, updates);
            console.log(`✅ New user created with fixed ID: ${updates.fixedId}`);
        } else {
            // مستخدم قديم - إذا لم يكن له ID ثابت، نعطيه واحد
            if (!oldData.fixedId) {
                updates.fixedId = await getNextFixedId();
                console.log(`✅ Assigned fixed ID to existing user: ${updates.fixedId}`);
            }
            await updateDoc(userRef, updates);
        }

        await addDoc(collection(db, "visits"), {
            deviceId,
            lat: updates.lat,
            lng: updates.lng,
            time: timeNow,
        });

        console.log("✅ Visit logged using deviceId:", deviceId);
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                sendData(pos.coords.latitude, pos.coords.longitude);
            },
            (err) => {
                console.warn("Location error:", err.message);
                sendData(null, null);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else {
        sendData(null, null);
    }
}

sendVisitData();

// ---------------------------------------------------------
// 2) اسم المستخدم + رسالة الترحيب
// ---------------------------------------------------------

let welcomed = false;

window.addEventListener("DOMContentLoaded", async () => {
    document.getElementById("saveBtn").addEventListener("click", saveUserName);
    document.getElementById("skipBtn").addEventListener("click", skipUserName);

    const deviceId = getDeviceId();
    const userRef = doc(db, "users", deviceId);

    try {
        const docSnap = await getDoc(userRef);
        const userData = docSnap.exists() ? docSnap.data() : null;
        const name = userData?.name;

        if (name && name.toLowerCase() !== "مجهول") {
            localStorage.setItem("userName", name); // ✅ نحفظ الاسم من فايرستور
            showWelcomeMessage(name);
        } else {
            const localName = localStorage.getItem("userName");
            if (localName && localName.toLowerCase() !== "مجهول") {
                showWelcomeMessage(localName); // ✅ fallback عند عدم وجود اسم في الفاير
            } else {
                document.getElementById("namePrompt").style.display = "flex";
            }
        }
    } catch (e) {
        console.warn("⚠️ فشل في الاتصال بـ Firebase:", e);
        const localName = localStorage.getItem("userName");
        if (localName && localName.toLowerCase() !== "مجهول") {
            showWelcomeMessage(localName); // ✅ fallback عند فصل النت
        } else {
            document.getElementById("namePrompt").style.display = "flex";
        }
    }
});

function saveUserName() {
    const input = document.getElementById("userNameInput").value.trim();
    if (/^[\u0600-\u06FFa-zA-Z ]{2,}$/.test(input) && input.toLowerCase() !== "مجهول") {
        const name = input;
        const deviceId = getDeviceId();
        const userRef = doc(db, "users", deviceId);

        setDoc(userRef, {
            name,
            deviceId,
            lastVisit: new Date().toISOString(),
        }, { merge: true })
            .then(() => {
                localStorage.setItem("userName", name);
                document.getElementById("namePrompt").style.display = "none";
                showWelcomeMessage(name);
                console.log("✅ تم حفظ الاسم الجديد في Firestore:", name);
            })
            .catch(e => {
                console.error("❌ خطأ أثناء حفظ الاسم:", e);
            });
    } else {
        alert("من فضلك اكتب اسمًا حقيقيًا ❤️");
    }
}

function skipUserName() {
    localStorage.setItem("userName", "مجهول");
    document.getElementById("namePrompt").style.display = "none";
}

function showWelcomeMessage(name) {
    if (welcomed) return;
    welcomed = true;

    const msg = document.getElementById("welcomeMessage");
    const sound = document.getElementById("welcomeSound");
    if (!msg || !sound) return;

    msg.textContent = `🎉 أهلًا يا ${name}!`;
    msg.style.display = "block";
    sound.play();
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });

    setTimeout(() => msg.classList.add("show"), 50);
    setTimeout(() => {
        msg.classList.remove("show");
        setTimeout(() => msg.style.display = "none", 500);
    }, 3500);
}
