import { doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

console.log('confirmation.js carregado - Versão: 2025-06-02');

const auth = getAuth();
const db = window.db;

// Flags pra evitar múltiplas chamadas
let isLoadingConfirmation = false;
let isAppointmentConfirmed = false;

function showPopup(message) {
    const popup = document.getElementById('confirmationPopup');
    const popupMessage = document.getElementById('popupMessage');
    popupMessage.textContent = message;
    popup.style.display = 'flex';
}

function hidePopup() {
    const popup = document.getElementById('confirmationPopup');
    popup.style.display = 'none';
}

// Função para formatar data de YYYY-MM-DD para DD/MM/YYYY
function formatDate(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

// Tratamento de autenticação
auth.onAuthStateChanged((user) => {
    if (isLoadingConfirmation) {
        console.log('loadConfirmation já em andamento, ignorando chamada duplicada.');
        return;
    }
    if (!user) {
        console.error('Usuário não autenticado. Redirecionando para login...');
        window.location.href = 'index.html';
        return;
    }
    console.log('Usuário autenticado:', user.email);
    isLoadingConfirmation = true;
    loadConfirmation(user).catch(error => {
        console.error('Erro no onAuthStateChanged:', error);
        showPopup('Erro ao carregar confirmação: ' + error.message);
        setTimeout(() => {
            hidePopup();
            window.location.href = 'index.html';
        }, 3000);
    }).finally(() => {
        isLoadingConfirmation = false;
    });
});

async function loadConfirmation(user) {
    try {
        // Busca o nome do cliente no Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const clientName = userDoc.exists() && userDoc.data().name ? userDoc.data().name : user.email;

        const barberId = sessionStorage.getItem('selectedBarberId');
        const selectedServices = JSON.parse(sessionStorage.getItem('selectedServices') || '[]');
        const date = sessionStorage.getItem('selectedDate');
        const time = sessionStorage.getItem('selectedTime');

        if (!barberId || !selectedServices.length || !date || !time) {
            showPopup('Dados de agendamento incompletos. Volte e selecione novamente.');
            setTimeout(() => {
                hidePopup();
                window.location.href = 'services.html';
            }, 3000);
            return;
        }

        const barberDoc = await getDoc(doc(db, 'barbers', barberId));
        const barberName = barberDoc.exists() ? barberDoc.data().name : 'Desconhecido';

        const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
        const totalTime = selectedServices.reduce((sum, s) => sum + s.duration, 0);
        const servicesNames = selectedServices.map(s => s.name).join(', ');

        document.getElementById('clientName').textContent = clientName;
        document.getElementById('barberName').textContent = barberName;
        document.getElementById('services').textContent = servicesNames;
        document.getElementById('date').textContent = formatDate(date);
        document.getElementById('time').textContent = time;
        document.getElementById('total').textContent = totalPrice.toFixed(2);

        sessionStorage.setItem('appointmentData', JSON.stringify({
            userId: user.uid,
            barberId,
            services: selectedServices,
            date,
            time,
            totalPrice,
            totalTime,
            status: 'confirmed'
        }));
    } catch (error) {
        console.error('Erro ao carregar confirmação:', error);
        showPopup('Erro ao carregar confirmação: ' + error.message);
        setTimeout(() => {
            hidePopup();
            window.location.href = 'index.html';
        }, 3000);
        throw error; // Repropaga o erro pra ser capturado no onAuthStateChanged
    }
}

document.getElementById('confirm').addEventListener('click', async () => {
    try {
        if (isAppointmentConfirmed) {
            showPopup('Já foi realizado o agendamento.');
            return;
        }

        const appointmentData = JSON.parse(sessionStorage.getItem('appointmentData'));
        if (!appointmentData) throw new Error('Dados de agendamento não encontrados');

        const confirmButton = document.getElementById('confirm');
        confirmButton.disabled = true; // Desabilita o botão pra evitar múltiplos cliques

        const id = `appt${Date.now()}`;
        await setDoc(doc(db, 'appointments', id), { id, ...appointmentData });

        isAppointmentConfirmed = true;
        showPopup('Agendamento confirmado! Você será notificado quando o serviço for concluído para avaliar.');
        sessionStorage.removeItem('selectedBarberId');
        sessionStorage.removeItem('selectedServices');
        sessionStorage.removeItem('selectedDate');
        sessionStorage.removeItem('selectedTime');
        sessionStorage.removeItem('appointmentData');
    } catch (error) {
        console.error('Erro ao confirmar agendamento:', error);
        showPopup('Erro ao confirmar agendamento: ' + error.message);
        document.getElementById('confirm').disabled = false; // Reativa o botão em caso de erro
    }
});

document.getElementById('review').addEventListener('click', () => {
    window.location.href = 'services.html';
});

document.getElementById('closePopup')?.addEventListener('click', () => {
    hidePopup();
    window.location.href = 'services.html';
});