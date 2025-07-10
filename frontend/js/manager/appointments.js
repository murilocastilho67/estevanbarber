import { collection, getDocs, doc, setDoc, getDoc, query, where, runTransaction, addDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { showPopup, showSection, getFirestoreDb } from './utils.js';
import { loadBarbersForSelect } from './services.js';
import { registerRevenue } from './cashflow_enhanced.js';

async function createServiceRevenue(db, appointment) {
    const { totalPrice, id: appointmentId, services } = appointment;
    const cashFlowData = {
        id: `cf_${Date.now()}`,
        type: 'revenue',
        amount: totalPrice,
        description: `Serviço de ${services.map(s => s.name).join(', ')}`,
        source: 'service_sale',
        relatedEntityId: appointmentId,
        timestamp: new Date().toISOString(),
        category: 'services'
    };
    await addDoc(collection(db, 'cash_flow_transactions'), cashFlowData);
    console.log('Receita de serviço criada:', cashFlowData);
}

// Variável para controlar se os listeners já foram inicializados
let appointmentsListenersInitialized = false;

function initAppointments() {
    console.log("Inicializando eventos de agendamentos...");
    const db = getFirestoreDb();
    if (!db) {
        console.error("Firestore não inicializado em initAppointments");
        return;
    }
    
    const navAppointments = document.getElementById('nav-appointments');
    if (navAppointments && !appointmentsListenersInitialized) { // Adiciona o check aqui
        navAppointments.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('Clicou em Agendamentos');
            showSection("appointments-section");
            await loadBarbersForSelect(db); // Carrega os barbeiros para o filtro
            loadAppointments();
        });

        const barberFilter = document.getElementById('barberFilter');
        if (barberFilter) {
            barberFilter.addEventListener('change', (e) => {
                const date = document.getElementById('dateFilter').value;
                loadAppointments(e.target.value, date);
            });
        } else {
            console.error('Elemento barberFilter não encontrado');
        }

        const dateFilter = document.getElementById('dateFilter');
        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                const barberId = document.getElementById('barberFilter').value;
                loadAppointments(barberId, e.target.value);
            });
        } else {
            console.error('Elemento dateFilter não encontrado');
        }
        appointmentsListenersInitialized = true; // Marca como inicializado
    } else if (!navAppointments) {
        console.error('Elemento nav-appointments não encontrado');
    }
}

async function loadAppointments(barberId = 'all', date = '') {
    const db = getFirestoreDb();
    if (!db) {
        console.error("Firestore não inicializado em loadAppointments");
        return;
    }
    try {
        console.log("Iniciando loadAppointments com filtros:", { barberId, date });
        console.log("Tipo de barberId:", typeof barberId, "Tipo de date:", typeof date);

        const appointmentsList = document.getElementById('appointmentsList');
        if (!appointmentsList) {
            console.error('Elemento appointmentsList não encontrado.');
            return;
        }
        appointmentsList.innerHTML = ''; // Limpa a lista antes de preencher

        let appointmentsQuery = collection(db, 'appointments');

        let actualBarberId = barberId;
        if (typeof barberId === 'object' && barberId !== null && barberId.id) {
            actualBarberId = barberId.id;
        } else if (typeof barberId !== 'string') {
            actualBarberId = 'all';
        }

        if (actualBarberId !== 'all') {
            appointmentsQuery = query(appointmentsQuery, where('barberId', '==', actualBarberId));
        }
        if (date) {
            appointmentsQuery = query(appointmentsQuery, where("date", "==", date));
        }

        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        console.log('Total de agendamentos encontrados com filtros:', appointmentsSnapshot.size);

        if (appointmentsSnapshot.empty) {
            appointmentsList.innerHTML = '<p>Nenhum agendamento encontrado com os filtros aplicados.</p>';
            document.getElementById('totalAppointments').textContent = '0';
            document.getElementById('totalRevenue').textContent = '0.00';
            return;
        }

        const barbersSnapshot = await getDocs(collection(db, 'barbers'));
        const barberMap = {};
        barbersSnapshot.forEach((docSnapshot) => {
            barberMap[docSnapshot.id] = docSnapshot.data().name;
        });

        let appointments = [];
        for (const docSnapshot of appointmentsSnapshot.docs) {
            const appt = docSnapshot.data();
            appt.id = docSnapshot.id;
            appointments.push(appt);
        }

        appointments.sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}:00-03:00`);
            const dateB = new Date(`${b.date}T${b.time}:00-03:00`);
            return dateA - dateB;
        });

        let totalAppointments = 0;
        let totalRevenue = 0;

        for (const appt of appointments) {
            let userName = 'Desconhecido';
            let userPhone = '';
            try {
                const userRef = doc(db, 'users', appt.userId);
                const userDoc = await getDoc(userRef);
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    if (userData.firstName && userData.lastName) {
                        userName = `${userData.firstName} ${userData.lastName}`;
                    } else if (userData.name) {
                        userName = userData.name;
                    }
                    userPhone = userData.phoneNumber ? userData.phoneNumber.replace(/\D/g, '') : '';
                }
            } catch (error) {
                console.warn(`Erro ao buscar usuário ${appt.userId}, usando "Desconhecido":`, error);
            }

            const barberName = barberMap[appt.barberId] || 'Barbeiro Desconhecido';
            const services = Array.isArray(appt.services) ? appt.services.map(s => s.name).join(', ') : 'Nenhum serviço';
            
            const statusPt = appt.status === 'confirmed' ? 'Confirmado' :
                            appt.status === 'completed' ? 'Realizado' :
                            appt.status === 'no-show' ? 'Não Compareceu' :
                            appt.status === 'canceled' ? 'Cancelado' : appt.status;
            const dateParts = appt.date.split('-');
            const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

            let feedbackText = 'Nenhum feedback';
            try {
                const feedbackQuery = query(
                    collection(db, 'feedbacks'),
                    where('appointmentId', '==', appt.id)
                );
                const feedbackSnapshot = await getDocs(feedbackQuery);
                if (!feedbackSnapshot.empty) {
                    const feedback = feedbackSnapshot.docs[0].data();
                    feedbackText = `Nota: ${feedback.rating}/5${feedback.comment ? `, ${feedback.comment}` : ''}`;
                }
            } catch (error) {
                console.warn(`Erro ao buscar feedback para agendamento ${appt.id}:`, error);
            }

            let actions = `<button class="action-btn btn-cancel" onclick="window.cancelAppointment('${appt.id}')" title="Cancelar agendamento"><i class="fas fa-times"></i></button>`;
            if (appt.status === 'confirmed') {
                actions += `
                    <button class="action-btn btn-completed" onclick="window.markCompleted('${appt.id}')" title="Marcar como realizado"><i class="fas fa-check"></i></button>
                    <button class="action-btn btn-no-show" onclick="window.markNoShow('${appt.id}')" title="Marcar como não compareceu"><i class="fas fa-user-times"></i></button>
                `;
                if (userPhone) {
                    const reminderSent = appt.reminderSent || false;
                    actions += `
                        <button class="action-btn btn-reminder" data-id="${appt.id}" data-client-name="${userName}" data-barber-name="${barberName}" data-time="${appt.time}" data-phone="${userPhone}" data-date="${formattedDate}" ${reminderSent ? 'disabled' : ''} title="${reminderSent ? 'Lembrete já enviado' : 'Enviar lembrete via WhatsApp'}">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                    `;
                }
            }

            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="card-info">
                    <h4><i class="fas fa-user"></i> ${userName}</h4>
                    <p><strong>Barbeiro:</strong> ${barberName}</p>
                    <p><strong>Serviços:</strong> ${services}</p>
                    <p><strong>📅 ${formattedDate}</strong> • <strong>🕐 ${appt.time}</strong></p>
                    <p><strong>💵 R$ ${appt.totalPrice ? appt.totalPrice.toFixed(2) : '0.00'}</strong> • <strong>Status:</strong> ${statusPt}</p>
                    <p><strong>Feedback:</strong> ${feedbackText}</p>
                </div>
                <div class="card-actions">
                    ${actions}
                </div>
            `;
            appointmentsList.appendChild(card);

            totalAppointments++;
            if (appt.status === 'completed') totalRevenue += (appt.totalPrice || 0);
        }

        document.querySelectorAll('.btn-reminder').forEach(btn => {
            btn.addEventListener('click', async () => {
                const apptId = btn.dataset.id;
                const clientName = btn.dataset.clientName;
                const barberName = btn.dataset.barberName;
                const time = btn.dataset.time;
                const phone = btn.dataset.phone;
                const date = btn.dataset.date;

                try {
                    const message = encodeURIComponent(`Olá, ${clientName}! Seu agendamento com ${barberName} é em ${date} às ${time}. Confirme sua presença!`);
                    const whatsappLink = `https://api.whatsapp.com/send?phone=55${phone}&text=${message}`;

                    await setDoc(doc(db, 'appointments', apptId), { reminderSent: true }, { merge: true });

                    btn.innerHTML = '<i class="fab fa-whatsapp"></i>';
                    btn.title = 'Lembrete já enviado';
                    btn.disabled = true;

                    window.open(whatsappLink, '_blank');
                } catch (error) {
                    console.error('Erro ao enviar lembrete:', error);
                    showPopup('Erro ao enviar lembrete: ' + error.message);
                }
            });
        });

        document.getElementById('totalAppointments').textContent = totalAppointments;
        document.getElementById('totalRevenue').textContent = totalRevenue.toFixed(2);

        if (totalAppointments === 0) {
            appointmentsList.innerHTML = '<p>Nenhum agendamento corresponde aos filtros.</p>';
        }
    } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
        const appointmentsList = document.getElementById('appointmentsList');
        if (appointmentsList) {
            appointmentsList.innerHTML = '<p>Erro ao carregar agendamentos: ' + error.message + '</p>';
        }
        showPopup('Erro ao carregar agendamentos: ' + error.message);
    }
}

async function cancelAppointment(id) {
    const db = getFirestoreDb();
    if (!db) {
        console.error("Firestore não inicializado em cancelAppointment");
        return;
    }
    const confirmed = await showPopup('Tem certeza que deseja excluir este agendamento?', true);
    if (confirmed) {
        try {
            await setDoc(doc(db, 'appointments', id), { status: 'canceled' }, { merge: true });
            console.log('Agendamento cancelado:', id);
            
            const barberId = document.getElementById('barberFilter')?.value || 'all';
            const date = document.getElementById('dateFilter')?.value || '';
            await loadAppointments(barberId, date);
            
            showPopup('Agendamento cancelado com sucesso!');
        } catch (error) {
            console.error('Erro ao cancelar agendamento:', error);
            showPopup('Erro ao cancelar agendamento: ' + error.message);
        }
    }
}

async function markCompleted(id) {
    const db = getFirestoreDb();
    if (!db) {
        console.error("Firestore não inicializado em markCompleted");
        return;
    }
    const confirmed = await showPopup('Marcar agendamento como concluído?', true);
    if (confirmed) {
        try {
            await runTransaction(db, async (transaction) => {
                const apptRef = doc(db, 'appointments', id);
                const apptSnap = await transaction.get(apptRef);
                if (!apptSnap.exists()) throw new Error('Agendamento não encontrado');

                const appt = apptSnap.data();
                transaction.set(apptRef, { status: 'completed' }, { merge: true });

                if (appt.status !== 'completed') {
                    const services = Array.isArray(appt.services) ? appt.services : [];
                    const serviceNames = services.map(s => s.name).join(', ');
                    
                    await registerRevenue(
                        `Serviços realizados: ${serviceNames}`,
                        appt.totalPrice || 0,
                        'services',
                        'appointment_completed',
                        {
                            appointmentId: id,
                            services: services,
                            barberId: appt.barberId,
                            userId: appt.userId,
                            date: appt.date,
                            time: appt.time
                        }
                    );
                    console.log('💰 Receita de serviço registrada no fluxo de caixa');
                }
            });
            console.log('Agendamento marcado como concluído:', id);
            
            const barberId = document.getElementById('barberFilter')?.value || 'all';
            const date = document.getElementById('dateFilter')?.value || '';
            await loadAppointments(barberId, date);
            showPopup('Agendamento marcado como concluído!');
        } catch (error) {
            console.error('Erro ao marcar agendamento como concluído:', error);
            showPopup('Erro ao marcar agendamento como concluído: ' + error.message);
        }
    }
}

async function markNoShow(id) {
    const db = getFirestoreDb();
    if (!db) {
        console.error("Firestore não inicializado em markNoShow");
        return;
    }
    const confirmed = await showPopup('Marcar agendamento como não compareceu?', true);
    if (confirmed) {
        try {
            await setDoc(doc(db, 'appointments', id), { status: 'no-show' }, { merge: true });
            console.log('Agendamento marcado como não compareceu:', id);
            
            const barberId = document.getElementById('barberFilter')?.value || 'all';
            const date = document.getElementById('dateFilter')?.value || '';
            await loadAppointments(barberId, date);
            
            showPopup('Agendamento marcado como não compareceu!');
        } catch (error) {
            console.error('Erro ao marcar como não compareceu:', error);
            showPopup('Erro ao marcar como não compareceu: ' + error.message);
        }
    }
}

window.cancelAppointment = (id) => cancelAppointment(id);
window.markCompleted = (id) => markCompleted(id);
window.markNoShow = (id) => markNoShow(id);

export { initAppointments, loadAppointments };