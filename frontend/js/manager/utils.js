let _dbInstance = null;

export function setFirestoreDb(db) {
    _dbInstance = db;
}

export function getFirestoreDb() {
    return _dbInstance;
}

function showPopup(message, isConfirm = false, onConfirm = null) {
    return new Promise((resolve) => {
        console.log("Mostrando pop-up:", message, "Confirm:", isConfirm);
        const popup = document.getElementById("customPopup");
        const title = document.getElementById("popupTitle");
        const popupMessage = document.getElementById("popupMessage");
        const confirmBtn = document.getElementById("popupConfirm");
        const cancelBtn = document.getElementById("popupCancel");

        title.textContent = "Estevan Barber";
        popupMessage.textContent = message;
        cancelBtn.style.display = isConfirm ? "inline-block" : "none";

        const closePopup = () => {
            console.log("Fechando pop-up");
            popup.style.display = "none";
            confirmBtn.removeEventListener("click", handleConfirm);
            cancelBtn.removeEventListener("click", handleCancel);
        };

        const handleConfirm = () => {
            closePopup();
            if (onConfirm) onConfirm();
            resolve(true);
        };

        const handleCancel = () => {
            closePopup();
            resolve(false);
        };

        confirmBtn.addEventListener("click", handleConfirm);
        cancelBtn.addEventListener("click", handleCancel);

        popup.style.display = "flex";
    });
}

function showSection(sectionId) {
    console.log("Tentando mostrar seção:", sectionId); // Log pra rastrear
    const currentActive = document.querySelector(".section.active");
    if (currentActive && currentActive.id === sectionId) {
        console.log("Seção já ativa, ignorando:", sectionId);
        return; // Evita recarregar se já está ativa
    }
    console.log("Mostrando seção:", sectionId);
    document.querySelectorAll(".section").forEach(section => {
        section.classList.remove("active");
    });
    document.querySelectorAll(".sidebar a").forEach(link => {
        link.classList.remove("active");
    });
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add("active");
    } else {
        console.error("Seção não encontrada:", sectionId);
    }
    // Para subseções dentro de #stock-section, não precisamos de link de navegação específico
    if (sectionId === "stock-section") {
        const subsections = section.querySelectorAll(".subsection");
        subsections.forEach(subsection => subsection.classList.remove("active"));
        const defaultSubsection = section.querySelector("#stock-products-section"); // Padrão pra produtos
        if (defaultSubsection) defaultSubsection.classList.add("active");
    }
    const navLink = document.getElementById(sectionId === "appointmentForm" ? "newAppointmentLink" :
        sectionId === "appointments-section" ? "nav-appointments" :
        sectionId === "barbers-section" ? "nav-barbers" :
        sectionId === "services-section" ? "nav-services" :
        sectionId === "schedules-section" ? "nav-schedules" :
        sectionId === "stock-section" ? "nav-stock-group" : ""); // Usa o grupo pra stock-section
    if (navLink) {
        navLink.classList.add("active");
    } else {
        console.error("Link de navegação não encontrado:", sectionId);
    }
}

// Função pra traduzir dias da semana de português pra inglês
function dayOfWeekEn(dayPt) {
    const dayMap = {
        "Segunda": "Monday",
        "Terça": "Tuesday",
        "Quarta": "Wednesday",
        "Quinta": "Thursday",
        "Sexta": "Friday",
        "Sábado": "Saturday",
        "Domingo": "Sunday"
    };
    return dayMap[dayPt] || dayPt;
}

// Função pra traduzir dias da semana de inglês pra português
function dayOfWeekPt(dayEn) {
    const dayMap = {
        "Monday": "Segunda",
        "Tuesday": "Terça",
        "Wednesday": "Quarta",
        "Thursday": "Quinta",
        "Friday": "Sexta",
        "Saturday": "Sábado",
        "Sunday": "Domingo"
    };
    return dayMap[dayEn] || dayEn;
}

export { showPopup, showSection, dayOfWeekEn, dayOfWeekPt };
