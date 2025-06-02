import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

console.log('feedback.js carregado - Versão: 2025-06-02');

const auth = getAuth();
const db = window.db;

function showPopup(message) {
    console.log('Mostrando pop-up:', message);
    const popup = document.getElementById('feedbackPopup');
    const popupMessage = document.getElementById('popupMessage');
    popupMessage.textContent = message;
    popup.style.display = 'flex';
}

function hidePopup() {
    console.log('Escondendo pop-up');
    const popup = document.getElementById('feedbackPopup');
    popup.style.display = 'none';
}

async function loadAppointmentInfo() {
    try {
        console.log('Iniciando loadAppointmentInfo...');
        const user = await new Promise((resolve, reject) => {
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                unsubscribe();
                if (user) {
                    console.log('Usuário autenticado:', user.email);
                    resolve(user);
                } else {
                    reject(new Error('Usuário não autenticado'));
                }
            }, reject);
        });

        const appointmentId = sessionStorage.getItem('appointmentId');
        console.log('Appointment ID:', appointmentId);
        if (!appointmentId) {
            showPopup('Nenhum agendamento selecionado.');
            setTimeout(() => {
                hidePopup();
                window.location.href = 'services.html';
            }, 3000);
            return;
        }

        console.log('Buscando agendamento:', appointmentId);
        const apptDoc = await getDoc(doc(db, 'appointments', appointmentId));
        console.log('Agendamento encontrado:', apptDoc.exists());
        if (!apptDoc.exists() || apptDoc.data().userId !== user.uid || apptDoc.data().status !== 'completed') {
            console.log('Agendamento inválido ou não concluído:', apptDoc.exists(), apptDoc.data()?.userId, apptDoc.data()?.status);
            showPopup('Agendamento inválido ou não concluído.');
            setTimeout(() => {
                hidePopup();
                window.location.href = 'services.html';
            }, 3000);
            return;
        }

        const appt = apptDoc.data();
        console.log('Dados do agendamento:', JSON.stringify(appt));
        console.log('Buscando barbeiro:', appt.barberId);
        const barberDoc = await getDoc(doc(db, 'barbers', appt.barberId));
        const barberName = barberDoc.exists() ? barberDoc.data().name : 'Desconhecido';
        console.log('Barbeiro encontrado:', barberName);
        const services = appt.services ? appt.services.map(s => s.name).join(', ') : 'Nenhum serviço';
        const dateParts = appt.date.split('-');
        const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

        console.log('Atualizando interface com dados do agendamento...');
        document.getElementById('barberName').textContent = barberName;
        document.getElementById('services').textContent = services;
        document.getElementById('date').textContent = formattedDate;
        document.getElementById('time').textContent = appt.time;
    } catch (error) {
        console.error('Erro ao carregar informações do agendamento:', error);
        showPopup('Erro ao carregar informações: ' + error.message);
        setTimeout(() => {
            hidePopup();
            window.location.href = 'services.html';
        }, 3000);
    }
}

document.getElementById('feedbackForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        console.log('Iniciando envio de feedback...');
        const appointmentId = sessionStorage.getItem('appointmentId');
        const rating = parseInt(document.getElementById('rating').value);
        const comment = document.getElementById('comment').value;
        const id = `feedback${Date.now()}`;
        console.log('Dados do feedback:', { id, appointmentId, userId: auth.currentUser.uid, rating, comment });

        console.log('Salvando feedback no Firestore...');
        await setDoc(doc(db, 'feedbacks', id), {
            id,
            appointmentId,
            userId: auth.currentUser.uid,
            rating,
            comment,
            timestamp: new Date().toISOString()
        });
        console.log('Feedback salvo com sucesso:', id);

        showPopup('Feedback enviado com sucesso!');
        setTimeout(() => {
            hidePopup();
            sessionStorage.removeItem('appointmentId');
            window.location.href = 'services.html';
        }, 2000);
    } catch (error) {
        console.error('Erro ao enviar feedback:', error);
        showPopup('Erro ao enviar feedback: ' + error.message);
    }
});

document.getElementById('backToServices').addEventListener('click', () => {
    console.log('Clicou em voltar para serviços');
    sessionStorage.removeItem('appointmentId');
    window.location.href = 'services.html';
});

document.getElementById('closePopup')?.addEventListener('click', () => {
    console.log('Clicou em fechar pop-up');
    hidePopup();
    sessionStorage.removeItem('appointmentId');
    window.location.href = 'services.html';
});

loadAppointmentInfo();