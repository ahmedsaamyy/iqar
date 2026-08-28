// وظائف البوصلة المحسنة
function initializeCompass() {
    // مفيش حاجة تتعمل هنا دلوقتي غير تحديث الشكل بالقيم الحالية
    // (الدائرة والإبر بقت عناصر CSS ثابتة في الصفحة مش canvas بيتعاد رسمه)
    drawCompass()
}

function drawCompass() {
    drawDeviceArrow()

    if (qiblaDirection !== 0) {
        drawQiblaArrow()
    }
}

function drawDeviceArrow() {
    const needle = document.getElementById("compass-needle-device")
    if (!needle) return
    needle.style.transform = `rotate(${deviceHeading}deg)`
}

function drawQiblaArrow() {
    const needle = document.getElementById("compass-needle-qibla")
    if (!needle) return
    needle.style.display = "block"
    needle.style.transform = `rotate(${qiblaDirection}deg)`
}

function calculateQiblaDirection(lat, lng) {
    // إحداثيات الكعبة المشرفة بدقة عالية
    const kaabaLat = 21.422487
    const kaabaLng = 39.826206

    // تحويل الدرجات إلى راديان
    const lat1 = (lat * Math.PI) / 180
    const lat2 = (kaabaLat * Math.PI) / 180
    const dLng = ((kaabaLng - lng) * Math.PI) / 180

    // حساب الاتجاه باستخدام معادلة الكرة الأرضية
    const y = Math.sin(dLng) * Math.cos(lat2)
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)

    let bearing = (Math.atan2(y, x) * 180) / Math.PI
    bearing = (bearing + 360) % 360

    return bearing
}

function updateCompassDisplay() {
    const deviceDirectionElement = document.getElementById("device-direction")
    const qiblaDirectionElement = document.getElementById("qibla-direction")

    if (deviceDirectionElement) {
        const directionName = getDirectionName(deviceHeading)
        deviceDirectionElement.textContent = `الاتجاه الحالي: ${directionName} ${Math.round(deviceHeading)}°`
    }

    if (qiblaDirectionElement && qiblaDirection !== 0) {
        const qiblaDirectionName = getDirectionName(qiblaDirection)
        qiblaDirectionElement.textContent = `القبلة: ${Math.round(qiblaDirection)}° - ${qiblaDirectionName}`

        // حساب الفرق بين اتجاه الجهاز واتجاه القبلة
        const difference = Math.abs(deviceHeading - qiblaDirection)
        const minDifference = Math.min(difference, 360 - difference)

        if (minDifference < 5) {
            qiblaDirectionElement.style.color = "#4CAF50"
            qiblaDirectionElement.textContent += " ✓ اتجاه صحيح"

            if (userData.settings.vibrationEnabled && "vibrate" in navigator) {
                navigator.vibrate(100)
            }
        } else {
            qiblaDirectionElement.style.color = "#FFC107"
        }
    }

    drawCompass()
}

function getDirectionName(angle) {
    const directions = [
        "الشمال",
        "الشمال الشرقي",
        "الشرق",
        "الجنوب الشرقي",
        "الجنوب",
        "الجنوب الغربي",
        "الغرب",
        "الشمال الغربي",
    ]
    const index = Math.round(angle / 45) % 8
    return directions[index]
}

function requestLocationPermission() {
    // ١) لازم نطلب إذن حساسات الحركة (البوصلة) أول حاجة وبشكل مباشر
    // جوه ضغطة المستخدم على الزرار، لأن iOS بيرفض الطلب لو جه متأخر
    // جوه استدعاء غير متزامن (زي بعد نتيجة تحديد الموقع)
    if (
        typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
        DeviceOrientationEvent.requestPermission()
            .then((response) => {
                if (response === "granted") {
                    startCompass()
                } else {
                    alert("محتاجين إذن استخدام حساسات الحركة عشان البوصلة تشتغل. من فضلك فعّله من إعدادات المتصفح.")
                }
            })
            .catch(() => {
                alert("تعذّر طلب إذن حساسات الحركة. من فضلك فعّله يدويًا من إعدادات المتصفح.")
            })
    } else {
        // مش محتاج إذن صريح (أندرويد ومعظم المتصفحات غير iOS)
        startCompass()
    }

    // ٢) تحديد الموقع (منفصل عن إذن البوصلة)
    fetchLocationAndUpdateQibla()
}

function fetchLocationAndUpdateQibla() {
    if (!navigator.geolocation) {
        alert("المتصفح لا يدعم تحديد الموقع")
        return
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            userLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
            }

            qiblaDirection = calculateQiblaDirection(userLocation.latitude, userLocation.longitude)

            initializeCompass()

            const coordinatesElement = document.getElementById("coordinates")
            if (coordinatesElement) {
                coordinatesElement.textContent = `الإحداثيات: ${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}`
            }

            updateCompassDisplay()
        },
        (error) => {
            if (error.code === error.PERMISSION_DENIED) {
                alert("محتاجين إذن الوصول للموقع عشان نحسب اتجاه القبلة. من فضلك فعّله من إعدادات المتصفح ثم اضغط الزرار تاني.")
            } else {
                alert("خدمة الموقع في جهازك مطفية أو مش قادرين نحدد موقعك. من فضلك شغّل خدمة الموقع (GPS) من إعدادات الجهاز ثم اضغط الزرار تاني.")
            }
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
        },
    )
}

function startCompass() {
    function handleOrientation(event) {
        let heading = null

        if (event.webkitCompassHeading !== undefined && event.webkitCompassHeading !== null) {
            // iOS: القيمة دي جاهزة وصحيحة زي ما هي
            heading = event.webkitCompassHeading
        } else if (event.alpha !== null) {
            // أندرويد: alpha لوحدها مش هي اتجاه البوصلة، محتاجة تصحيح
            heading = event.absolute ? (360 - event.alpha) % 360 : (360 - event.alpha) % 360
        }

        if (heading !== null) {
            deviceHeading = heading
            updateCompassDisplay()
        }
    }

    if ("ondeviceorientationabsolute" in window) {
        window.addEventListener("deviceorientationabsolute", handleOrientation)
    } else if (window.DeviceOrientationEvent) {
        window.addEventListener("deviceorientation", handleOrientation)
    } else {
        alert("جهازك لا يدعم البوصلة")
    }
}