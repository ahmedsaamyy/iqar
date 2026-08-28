
// وظائف خطط ختم القرآن
function initializeQuranPlans() {
    // تحديث واجهة خطط ختم القرآن
    updateQuranPlansProgress()
}

function updateQuranPlansProgress() {
    Object.keys(quranPlans).forEach((planId) => {
        const progressBar = document.getElementById(`${planId}-plan-progress`)
        if (progressBar) {
            const plan = userData.quranPlans[planId]
            const percentage = plan.total > 0 ? Math.round((plan.completed / plan.total) * 100) : 0
            progressBar.style.width = `${percentage}%`
        }
    })
}

function showQuranPlan(planId) {
    showSection(`quran-plan-${planId}`)
    updateQuranPlanDetails(planId)
}

function updateQuranPlanDetails(planId) {
    const plan = userData.quranPlans[planId]

    // تحديث عدد الأيام المكتملة والمتبقية
    const completedElement = document.getElementById(`${planId}-plan-completed`)
    const remainingElement = document.getElementById(`${planId}-plan-remaining`)
    const todayElement = document.getElementById(`${planId}-plan-today`)
    const buttonElement = document.getElementById(`${planId}-plan-button`)
    const notificationElement = document.getElementById(`${planId}-plan-notification`)

    if (completedElement) completedElement.textContent = plan.completed
    if (remainingElement) remainingElement.textContent = plan.total - plan.completed

    if (buttonElement) {
        if (plan.dailyCompleted) {
            buttonElement.textContent = "تمت قراءة اليوم ✓"
            buttonElement.classList.add("completed")
        } else {
            buttonElement.textContent = "تمّت قراءة اليوم"
            buttonElement.classList.remove("completed")
        }
    }

    if (todayElement) {
        if (planId === "custom" && plan.type) {
            if (plan.type === "days") {
                const pagesPerDay = Math.ceil(604 / plan.value) // 604 صفحة في المصحف
                todayElement.textContent = `اقرأ ${pagesPerDay} صفحة اليوم`
            } else if (plan.type === "pages") {
                todayElement.textContent = `اقرأ ${plan.value} صفحة اليوم`
            }
        } else if (quranPlans[planId]) {
            const nextPart = plan.completed + 1
            if (nextPart <= plan.total) {
                todayElement.textContent = `اقرأ ${quranPlans[planId].dailyAmount} اليوم`
            } else {
                todayElement.textContent = "أكملت الختمة! يمكنك البدء من جديد"
            }
        }
    }

    if (notificationElement) {
        if (plan.completed === 0) {
            notificationElement.textContent = "ابدأ رحلتك مع القرآن الكريم"
        } else if (plan.completed === plan.total) {
            notificationElement.textContent = "مبارك! لقد أكملت ختمة القرآن الكريم"
        } else {
            const percentage = Math.round((plan.completed / plan.total) * 100)
            notificationElement.textContent = `أنجزت ${percentage}% من خطة الختم`
        }
    }

    // إذا كانت الخطة المخصصة، نظهر أو نخفي أقسام معينة
    if (planId === "custom") {
        const progressSection = document.getElementById("custom-plan-progress-section")
        const statsSection = document.getElementById("custom-plan-stats")

        if (progressSection && statsSection) {
            if (plan.total > 0) {
                progressSection.style.display = "block"
                statsSection.style.display = "grid"
            } else {
                progressSection.style.display = "none"
                statsSection.style.display = "none"
            }
        }
    }
}

function markQuranDayComplete(planId) {
    const plan = userData.quranPlans[planId]

    if (!plan.dailyCompleted && plan.completed < plan.total) {
        plan.dailyCompleted = true
        plan.completed++

        // إذا أكمل الختمة
        if (plan.completed === plan.total) {
            userData.totalStats.quranKhatm++
            showCelebration("🎉 مبارك! لقد أكملت ختمة القرآن الكريم")
        }

        playFeedbackFast()
        updateQuranPlanDetails(planId)
        updateQuranPlansProgress()
        updateStats()
        saveUserData()
    }
}

function createCustomQuranPlan() {
    const typeSelect = document.getElementById("custom-plan-type")
    const valueInput = document.getElementById("custom-plan-value")

    if (!typeSelect || !valueInput) return

    const type = typeSelect.value
    const value = Number.parseInt(valueInput.value)

    if (isNaN(value) || value <= 0) {
        alert("الرجاء إدخال قيمة صحيحة")
        return
    }

    // إعادة تعيين الخطة المخصصة
    userData.quranPlans.custom = {
        completed: 0,
        total: type === "days" ? value : Math.ceil(604 / value), // 604 صفحة في المصحف
        dailyCompleted: false,
        type: type,
        value: value,
    }

    updateQuranPlanDetails("custom")
    updateQuranPlansProgress()
    saveUserData()

    alert("تم إنشاء الخطة المخصصة بنجاح")
}
