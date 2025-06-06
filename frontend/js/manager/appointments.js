import { collection, getDocs, doc, setDoc, getDoc, query, where } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { showPopup, showSection } from './utils.js';

async function loadAppointments(db, barberId = 'all', date = '') {
    try {
        console.log('Iniciando loadAppointments...');
        if (!db) throw new Error('Firestore não inicializado');
        console.log('Firestore inicializado:', !!db);

        const appointmentsList = document.getElementById('appointmentsList');
        console.log('Container de agendamentos encontrado:', !!appointmentsList);
        appointmentsList.innerHTML = '';

        console.log('Buscando agendamentos...');
        const appointmentsSnapshot = await getDocs(collection(db, 'appointments'));
        console.log('Total de agendamentos encontrados:', appointmentsSnapshot.size);

        if (appointmentsSnapshot.empty) {
            console.log('Nenhum agendamento encontrado');
            appointmentsList.innerHTML = '<p>Nenhum agendamento encontrado.</p>';
            return;
        }

        // Carrega todos os barbeiros pra mapear IDs pra nomes
        const barbersSnapshot = await getDocs(collection(db, 'barbers'));
        const barberMap = {};
        barbersSnapshot.forEach((docSnapshot) => {
            const barber = docSnapshot.data();
            barberMap[barber.id] = barber.name;
        });
        console.log('Mapa de barbeiros:', barberMap);

        let appointments = [];
        for (const docSnapshot of appointmentsSnapshot.docs) {
            const appt = docSnapshot.data();
            appt.id = docSnapshot.id;
            appointments.push(appt);
        }

        // Ordena os agendamentos por data e horário
        appointments.sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}:00-03:00`);
            const dateB = new Date(`${b.date}T${b.time}:00-03:00`);
            return dateA - dateB;
        });

        // Obtém a data de hoje no formato YYYY-MM-DD
        const today = new Date();
        const todayString = today.toISOString().split('T')[0]; // Ex.: "2025-06-05"
        console.log('Data de hoje:', todayString);

        let totalAppointments = 0;
        let totalRevenue = 0;

        console.log('Iterando agendamentos...');
        for (const appt of appointments) {
            console.log('Processando agendamento ID:', appt.id);
            console.log('Dados do agendamento:', JSON.stringify(appt));

            const matchesBarber = barberId === 'all' || appt.barberId === barberId;
            const matchesDate = !date || appt.date === date;
            // Filtra agendamentos a partir da data de hoje
            const isFutureOrToday = appt.date >= todayString;
            console.log('Matches - Barbeiro:', matchesBarber, 'Data:', matchesDate, 'Futuro ou Hoje:', isFutureOrToday);

            if (matchesBarber && matchesDate && isFutureOrToday) {
                console.log('Agendamento corresponde aos filtros');
                let userName = 'Desconhecido';
                let userPhone = '';
                try {
                    console.log('Buscando usuário com ID:', appt.userId);
                    const userRef = doc(db, 'users', appt.userId);
                    console.log('Referência do usuário criada:', userRef.path);
                    const userDoc = await getDoc(userRef);
                    console.log('Documento do usuário obtido:', userDoc.exists());
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        console.log('Dados do usuário:', JSON.stringify(userData));
                        if (userData.firstName && userData.lastName) {
                            userName = `${userData.firstName} ${userData.lastName}`;
                            console.log('Usando firstName/lastName:', userName);
                        } else if (userData.name) {
                            userName = userData.name;
                            console.log('Usando name:', userName);
                        } else {
                            console.warn('Nenhum campo de nome encontrado no usuário:', appt.userId);
                        }
                        userPhone = userData.phoneNumber ? userData.phoneNumber.replace(/\D/g, '') : '';
                        console.log('Telefone do usuário:', userPhone);
                    } else {
                        console.warn(`Usuário ${appt.userId} não encontrado`);
                    }
                    console.log('Usuário encontrado:', userName);
                } catch (error) {
                    console.warn(`Erro ao buscar usuário ${appt.userId}, usando "Desconhecido":`, error);
                }

                const barberName = barberMap[appt.barberId] || appt.barberId;

                console.log('Montando card de agendamento...');
                const services = appt.services ? appt.services.map(s => s.name).join(', ') : 'Nenhum serviço';
                const statusPt = appt.status === 'confirmed' ? 'Confirmado' :
                                appt.status === 'completed' ? 'Realizado' :
                                appt.status === 'no-show' ? 'Não Compareceu' :
                                appt.status === 'canceled' ? 'Cancelado' : appt.status;
                const dateParts = appt.date.split('-');
                const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

                // Busca feedback
                let feedbackText = 'Nenhum feedback';
                try {
                    console.log('Buscando feedback para agendamento:', appt.id);
                    const feedbackQuery = query(
                        collection(db, 'feedbacks'),
                        where('appointmentId', '==', appt.id)
                    );
                    const feedbackSnapshot = await getDocs(feedbackQuery);
                    console.log('Feedbacks encontrados:', feedbackSnapshot.size);
                    if (!feedbackSnapshot.empty) {
                        const feedback = feedbackSnapshot.docs[0].data();
                        feedbackText = `Nota: ${feedback.rating}/5${feedback.comment ? `, ${feedback.comment}` : ''}`;
                    }
                } catch (error) {
                    console.warn(`Erro ao buscar feedback para agendamento ${appt.id}:`, error);
                }
                console.log('Feedback definido:', feedbackText);

                let actions = `<button class="action-btn cancel" onclick="window.cancelAppointment('${appt.id}')">Cancelar</button>`;
                if (appt.status === 'confirmed') {
                    actions += `
                        <button class="action-btn completed" onclick="window.markCompleted('${appt.id}')">Marcar Realizado</button>
                        <button class="action-btn no-show" onclick="window.markNoShow('${appt.id}')">Marcar Não Compareceu</button>
                    `;
                    // Adiciona o botão "Enviar Lembrete" se o telefone do cliente estiver disponível
                    if (userPhone) {
                        const reminderSent = appt.reminderSent || false;
                        actions += `
                            <button class="action-btn send-reminder" data-id="${appt.id}" data-client-name="${userName}" data-barber-name="${barberName}" data-time="${appt.time}" data-phone="${userPhone}" data-date="${formattedDate}" ${reminderSent ? 'disabled' : ''}>
                                ${reminderSent ? 'Lembrete Enviado' : 'Enviar Lembrete'}
                            </button>
                        `;
                    }
                }
                console.log('Ações definidas:', actions);

                console.log('Criando card de agendamento...');
                const card = document.createElement('div');
                card.className = 'appointment-card';
                card.innerHTML = `
                    <p><strong>Cliente:</strong> ${userName}</p>
                    <p><strong>Barbeiro:</strong> ${barberName}</p>
                    <p><strong>Serviços:</strong> ${services}</p>
                    <p><strong>Data:</strong> ${formattedDate}</p>
                    <p><strong>Horário:</strong> ${appt.time}</p>
                    <p><strong>Valor:</strong> R$${appt.totalPrice.toFixed(2)}</p>
                    <p><strong>Status:</strong> ${statusPt}</p>
                    <p><strong>Feedback:</strong> ${feedbackText}</p>
                    <div class="appointment-actions">
                        ${actions}
                    </div>
                `;
                appointmentsList.appendChild(card);
                console.log('Card adicionado:', appt.id);

                totalAppointments++;
                totalRevenue += appt.totalPrice;
            }
        }

        console.log('Configurando eventos dos botões de lembrete...');
        document.querySelectorAll('.send-reminder').forEach(btn => {
            btn.addEventListener('click', async () => {
                const apptId = btn.dataset.id;
                const clientName = btn.dataset.clientName;
                const barberName = btn.dataset.barberName;
                const time = btn.dataset.time;
                const phone = btn.dataset.phone;
                const date = btn.dataset.date;

                try {
                    // Gera o link do WhatsApp
                    const message = encodeURIComponent(`Olá, ${clientName}! Seu agendamento com ${barberName} é em ${date} às ${time}. Confirme sua presença!`);
                    const whatsappLink = `https://api.whatsapp.com/send?phone=55${phone}&text=${message}`;
                    console.log('Link do WhatsApp gerado:', whatsappLink);

                    // Marca o lembrete como enviado no Firestore
                    await setDoc(doc(db, 'appointments', apptId), { reminderSent: true }, { merge: true });
                    console.log('Lembrete marcado como enviado para o agendamento:', apptId);

                    // Atualiza o botão
                    btn.textContent = 'Lembrete Enviado';
                    btn.disabled = true;

                    // Abre o link do WhatsApp
                    window.open(whatsappLink, '_blank');
                } catch (error) {
                    console.error('Erro ao enviar lembrete:', error);
                    showPopup('Erro ao enviar lembrete: ' + error.message);
                }
            });
        });

        console.log('Atualizando totais...');
        document.getElementById('totalAppointments').textContent = totalAppointments;
        document.getElementById('totalRevenue').textContent = totalRevenue.toFixed(2);
        console.log('Totais atualizados:', totalAppointments, totalRevenue);

        if (totalAppointments === 0) {
            console.log('Nenhum agendamento corresponde aos filtros');
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

function initAppointments(db) {
    console.log('Inicializando eventos de agendamentos...');
    const navAppointments = document.getElementById('nav-appointments');
    if (navAppointments) {
        navAppointments.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Clicou em Agendamentos');
            showSection('appointments-section');
            loadAppointments(db);
        });
    } else {
        console.error('Elemento nav-appointments não encontrado');
    }

    const barberFilter = document.getElementById('barberFilter');
    if (barberFilter) {
        barberFilter.addEventListener('change', (e) => {
            const date = document.getElementById('dateFilter').value;
            loadAppointments(db, e.target.value, date);
        });
    } else {
        console.error('Elemento barberFilter não encontrado');
    }

    const dateFilter = document.getElementById('dateFilter');
    if (dateFilter) {
        dateFilter.addEventListener('change', (e) => {
            const barberId = document.getElementById('barberFilter').value;
            loadAppointments(db, barberId, e.target.value);
        });
    } else {
        console.error('Elemento dateFilter não encontrado');
    }
}

async function cancelAppointment(db, id) {
    const confirmed = await showPopup('Cancelar agendamento?', true);
    if (confirmed) {
        try {
            await setDoc(doc(db, 'appointments', id), { status: 'canceled' }, { merge: true });
            console.log('Agendamento cancelado:', id);
            const barberId = document.getElementById('barberFilter').value;
            const date = document.getElementById('dateFilter').value;
            loadAppointments(db, barberId, date);
            showPopup('Agendamento cancelado com sucesso!');
        } catch (error) {
            console.error('Erro ao cancelar agendamento:', error);
            showPopup('Erro ao cancelar agendamento: ' + error.message);
        }
    }
}

async function markCompleted(db, id) {
    const confirmed = await showPopup('Marcar agendamento como concluído?', true);
    if (confirmed) {
        try {
            await setDoc(doc(db, 'appointments', id), { status: 'completed' }, { merge: true });
            console.log('Agendamento marcado como concluído:', id);
            const barberId = document.getElementById('barberFilter').value;
            const date = document.getElementById('dateFilter').value;
            loadAppointments(db, barberId, date);
            showPopup('Agendamento marcado como concluído!');
        } catch (error) {
            console.error('Erro ao marcar como concluído:', error);
            showPopup('Erro ao marcar como concluído: ' + error.message);
        }
    }
}

async function markNoShow(db, id) {
    const confirmed = await showPopup('Marcar agendamento como não compareceu?', true);
    if (confirmed) {
        try {
            await setDoc(doc(db, 'appointments', id), { status: 'no-show' }, { merge: true });
            console.log('Agendamento marcado como não compareceu:', id);
            const barberId = document.getElementById('barberFilter').value;
            const date = document.getElementById('dateFilter').value;
            loadAppointments(db, barberId, date);
            showPopup('Agendamento marcado como não compareceu!');
        } catch (error) {
            console.error('Erro ao marcar como não compareceu:', error);
            showPopup('Erro ao marcar como não compareceu: ' + error.message);
        }
    }
}

window.cancelAppointment = (id) => cancelAppointment(window.db, id);
window.markCompleted = (id) => markCompleted(window.db, id);
window.markNoShow = (id) => markNoShow(window.db, id);

export { initAppointments, loadAppointments };