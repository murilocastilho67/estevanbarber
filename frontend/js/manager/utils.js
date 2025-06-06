function showPopup(message, isConfirm = false, onConfirm = null) {
    return new Promise((resolve) => {
        console.log('Mostrando pop-up:', message, 'Confirm:', isConfirm);
        const popup = document.getElementById('customPopup');
        const title = document.getElementById('popupTitle');
        const popupMessage = document.getElementById('popupMessage');
        const confirmBtn = document.getElementById('popupConfirm');
        const cancelBtn = document.getElementById('popupCancel');

        title.textContent = 'Estevan Barber';
        popupMessage.textContent = message;
        cancelBtn.style.display = isConfirm ? 'inline-block' : 'none';

        const closePopup = () => {
            console.log('Fechando pop-up');
            popup.style.display = 'none';
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
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

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);

        popup.style.display = 'flex';
    });
}

function showSection(sectionId) {
    console.log('Mostrando seção:', sectionId);
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.querySelectorAll('.sidebar a').forEach(link => {
        link.classList.remove('active');
    });
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
    } else {
        console.error('Seção não encontrada:', sectionId);
    }
    const navLink = document.getElementById(sectionId === 'appointmentForm' ? 'newAppointmentLink' : 
        sectionId === 'appointments-section' ? 'nav-appointments' :
        sectionId === 'barbers-section' ? 'nav-barbers' :
        sectionId === 'services-section' ? 'nav-services' :
        sectionId === 'schedules-section' ? 'nav-schedules' :
        sectionId === 'stock-section' ? 'nav-stock' :
        sectionId === 'cashflow-section' ? 'nav-cashflow' :
        sectionId === 'dashboard-section' ? 'nav-dashboard' : '');
    if (navLink) {
        navLink.classList.add('active');
    } else {
        console.error('Link de navegação não encontrado:', sectionId);
    }
}

// Função pra traduzir dias da semana de português pra inglês
function dayOfWeekEn(dayPt) {
    const dayMap = {
        'Segunda': 'Monday',
        'Terça': 'Tuesday',
        'Quarta': 'Wednesday',
        'Quinta': 'Thursday',
        'Sexta': 'Friday',
        'Sábado': 'Saturday',
        'Domingo': 'Sunday'
    };
    return dayMap[dayPt] || dayPt;
}

// Função pra traduzir dias da semana de inglês pra português
function dayOfWeekPt(dayEn) {
    const dayMap = {
        'Monday': 'Segunda',
        'Tuesday': 'Terça',
        'Wednesday': 'Quarta',
        'Thursday': 'Quinta',
        'Friday': 'Sexta',
        'Saturday': 'Sábado',
        'Sunday': 'Domingo'
    };
    return dayMap[dayEn] || dayEn;
}

export { showPopup, showSection, dayOfWeekEn, dayOfWeekPt };