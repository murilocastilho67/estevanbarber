import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { firebaseConfig } from './config.js';

console.log('confirmation.js carregado - Versão: 2025-06-28');

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Flags pra evitar múltiplas chamadas
let isLoadingConfirmation = false;
let isAppointmentConfirmed = false;

function showPopup(message) {
    const popup = document.getElementById('confirmationPopup');
    const popupMessage = document.getElementById('popupMessage');
    if (popup && popupMessage) {
        popupMessage.textContent = message;
        popup.style.display = 'flex';
    } else {
        console.error('Elementos do pop-up não encontrados');
    }
}

function hidePopup() {
    const popup = document.getElementById('confirmationPopup');
    if (popup) {
        popup.style.display = 'none';
    }
}

// Função para formatar data de YYYY-MM-DD para DD/MM/YYYY
function formatDate(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

async function loadConfirmation(user) {
    try {
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

        // Busca o nome do barbeiro
        const barberDoc = await getDoc(doc(db, 'barbers', barberId));
        const barberName = barberDoc.exists() ? barberDoc.data().name : 'Desconhecido';

        // Calcula totais
        const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
        const totalTime = selectedServices.reduce((sum, s) => sum + s.duration, 0);

        // Preenche os campos
        document.getElementById('barber').textContent = barberName;
        const servicesList = document.getElementById('servicesList');
        servicesList.innerHTML = '';
        selectedServices.forEach(service => {
            const li = document.createElement('li');
            li.textContent = `${service.name} - R$${service.price.toFixed(2)} (${service.duration} min)`;
            servicesList.appendChild(li);
        });
        document.getElementById('date').textContent = formatDate(date);
        document.getElementById('time').textContent = time;
        document.getElementById('totalPrice').textContent = totalPrice.toFixed(2);
        document.getElementById('totalTime').textContent = totalTime;

        // Armazena os dados do agendamento com createdAtTemp e serverTimestamp
        sessionStorage.setItem('appointmentData', JSON.stringify({
            userId: user.uid,
            barberId,
            services: selectedServices,
            date,
            time,
            totalPrice,
            totalTime,
            status: 'confirmed',
            createdAtTemp: Date.now(), // Valor temporário do cliente
            createdAt: serverTimestamp() // Valor final do servidor
        }));
    } catch (error) {
        console.error('Erro ao carregar confirmação:', error);
        showPopup('Erro ao carregar confirmação: ' + error.message);
        setTimeout(() => {
            hidePopup();
            window.location.href = 'services.html';
        }, 3000);
    }
}

// Tratamento de autenticação
onAuthStateChanged(auth, (user) => {
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

document.getElementById('confirmButton').addEventListener('click', async () => {
    try {
        if (isAppointmentConfirmed) {
            showPopup('Já foi realizado o agendamento.');
            return;
        }

        const appointmentData = JSON.parse(sessionStorage.getItem('appointmentData'));
        if (!appointmentData) throw new Error('Dados de agendamento não encontrados');

        const confirmButton = document.getElementById('confirmButton');
        confirmButton.disabled = true;

        const id = `appt${Date.now()}`;
        console.log('Saving appointment with ID:', id, 'Data:', appointmentData);
        const docRef = await setDoc(doc(db, 'appointments', id), { id, ...appointmentData });

        isAppointmentConfirmed = true;
        showPopup('Agendamento confirmado! Você será redirecionado para seus agendamentos.');
        sessionStorage.removeItem('selectedBarberId');
        sessionStorage.removeItem('selectedServices');
        sessionStorage.removeItem('selectedDate');
        sessionStorage.removeItem('selectedTime');
        sessionStorage.removeItem('appointmentData');

        setTimeout(() => {
            hidePopup();
            window.location.href = 'services.html?section=appointments';
        }, 2000); // Redireciona após 2 segundos
    } catch (error) {
        console.error('Erro ao confirmar agendamento:', error);
        showPopup('Erro ao confirmar agendamento: ' + error.message);
        document.getElementById('confirmButton').disabled = false;
    }
});

document.getElementById('cancelButton').addEventListener('click', () => {
    window.location.href = 'services.html';
});

document.getElementById('closePopup')?.addEventListener('click', () => {
    hidePopup();
    window.location.href = 'services.html?section=appointments';
});