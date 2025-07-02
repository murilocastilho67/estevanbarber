import { collection, getDocs, query, where, orderBy, limit, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

console.log('services.js carregado - Versão: 2025-06-05');

const auth = getAuth();
const db = window.db;

// Função para pop-up personalizado
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

// Função para mostrar/esconder seções
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
    const navLink = document.getElementById(sectionId === 'appointmentForm' ? 'newAppointmentLink' : 'viewAppointmentsLink');
    if (navLink) {
        navLink.classList.add('active');
    } else {
        console.error('Link de navegação não encontrado:', sectionId);
    }
}

// Função de logout
async function handleLogout() {
    console.log('Clicou em Sair');
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Erro ao sair:', error);
        showPopup('Erro ao sair: ' + error.message);
    }
}

// Flag pra evitar múltiplas chamadas ao loadBarbers
let isLoadingBarbers = false;

// Tratamento de autenticação
auth.onAuthStateChanged((user) => {
    if (isLoadingBarbers) {
        console.log('loadBarbers já em andamento, ignorando chamada duplicada.');
        return;
    }
    if (!user) {
        console.error('Usuário não autenticado. Redirecionando para login...');
        window.location.href = 'index.html';
        return;
    }
    console.log('Usuário autenticado:', user.email);
    isLoadingBarbers = true;
    loadBarbers().catch(error => {
        console.error('Erro no onAuthStateChanged:', error);
        const servicesList = document.getElementById('servicesList');
        if (servicesList) {
            servicesList.innerHTML = '<p>Erro ao verificar autenticação: ' + error.message + '</p>';
        }
    }).finally(() => {
        isLoadingBarbers = false;
    });

    // Verifica o parâmetro 'section' após autenticação
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section');
    if (section === 'appointments' && user) {
        console.log('Parâmetro section=appointments detectado, exibindo agendamentos');
        showSection('appointmentsSection');
        loadAppointments();
    } else {
        // Exibe a seção "Novo Agendamento" por padrão
        showSection('appointmentForm');
    }
});

async function loadBarbers() {
    try {
        if (!db) throw new Error('Firestore não inicializado');
        console.log('Carregando barbeiros...');
        const barberSelect = document.getElementById('barber');
        barberSelect.innerHTML = '<option value="">Selecione um profissional</option>'; // Opção padrão
        const barbersSnapshot = await getDocs(collection(db, 'barbers'));
        if (barbersSnapshot.empty) {
            document.getElementById('servicesList').innerHTML = '<p>Nenhum barbeiro encontrado. Configure os barbeiros no Firestore.</p>';
            return;
        }
        barbersSnapshot.forEach((docSnapshot) => {
            const barber = docSnapshot.data();
            const option = document.createElement('option');
            option.value = barber.id;
            option.textContent = barber.name;
            barberSelect.appendChild(option);
        });
        // Não seleciona o primeiro automaticamente
    } catch (error) {
        console.error('Erro ao carregar barbeiros:', error);
        document.getElementById('servicesList').innerHTML = '<p>Erro ao carregar barbeiros: ' + error.message + '</p>';
    }
}

async function loadServices(barberId) {
    try {
        if (!db) throw new Error('Firestore não inicializado');
        console.log('Carregando serviços para barbeiro:', barberId);
        const servicesList = document.getElementById('servicesList');
        servicesList.innerHTML = '';
        const servicesSnapshot = await getDocs(collection(db, 'services'));
        if (servicesSnapshot.empty) {
            servicesList.innerHTML = '<p>Nenhum serviço encontrado.</p>';
            return;
        }
        let totalPrice = 0;
        let totalTime = 0;

        servicesSnapshot.forEach((docSnapshot) => {
            const service = docSnapshot.data();
            if (service.barberId === barberId) {
                const div = document.createElement('div');
                div.className = 'service-item';
                div.innerHTML = `
                    <input type="checkbox" id="${service.id}" value="${service.id}" data-price="${service.price}" data-duration="${service.duration}">
                    <label for="${service.id}">${service.name} - R$${service.price.toFixed(2)} (${service.duration} min)</label>
                `;
                servicesList.appendChild(div);

                div.querySelector('input').addEventListener('change', async () => {
                    const price = parseFloat(service.price);
                    const duration = parseInt(service.duration);
                    if (div.querySelector('input').checked) {
                        totalPrice += price;
                        totalTime += duration;
                    } else {
                        totalPrice -= price;
                        totalTime -= duration;
                    }
                    document.getElementById('totalPrice').textContent = totalPrice.toFixed(2);
                    document.getElementById('totalTime').textContent = totalTime;
                    document.getElementById('chooseSchedule').value = totalPrice === 0 ? 'Escolher um serviço' : 'Escolher Horário';
                    document.getElementById('chooseSchedule').disabled = totalPrice === 0;
                    const selectedServices = Array.from(document.querySelectorAll('#servicesList input:checked')).map(input => ({
                        id: input.value,
                        name: input.nextElementSibling.textContent.split(' - ')[0],
                        price: parseFloat(input.dataset.price),
                        duration: parseInt(input.dataset.duration)
                    }));
                    sessionStorage.setItem('selectedServices', JSON.stringify(selectedServices));

                    // Recalcula os horários disponíveis se a data já estiver selecionada
                    const dateInput = document.getElementById('date');
                    const selectedDate = dateInput.value;
                    if (selectedDate) {
                        console.log('Serviços alterados, recalculando horários para data:', selectedDate);
                        await loadAvailableTimes(barberId, selectedDate);
                    }
                });
            }
        });
    } catch (error) {
        console.error('Erro ao carregar serviços:', error);
        document.getElementById('servicesList').innerHTML = '<p>Erro ao carregar serviços: ' + error.message + '</p>';
    }
}

function generateTimeSlots(startTime, endTime, breakStart, breakEnd, bookedSlots, interval = 15, totalDuration) {
    console.log('Gerando horários disponíveis...');
    const slots = [];
    let current = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);
    const breakStartDate = breakStart ? new Date(`1970-01-01T${breakStart}:00`) : null;
    const breakEndDate = breakEnd ? new Date(`1970-01-01T${breakEnd}:00`) : null;

    while (current < end) {
        const timeStr = current.toTimeString().slice(0, 5);
        const slotStart = new Date(current);
        current.setMinutes(current.getMinutes() + interval);
        const slotEnd = new Date(slotStart.getTime() + totalDuration * 60000);

        if (slotEnd > end) {
            console.log(`Horário ${timeStr} descartado: ultrapassa o horário de fechamento (${endTime}).`);
            continue;
        }

        if (breakStartDate && breakEndDate) {
            if ((slotStart >= breakStartDate && slotStart < breakEndDate) || 
                (slotEnd > breakStartDate && slotEnd <= breakEndDate) || 
                (slotStart <= breakStartDate && slotEnd >= breakEndDate)) {
                console.log(`Horário ${timeStr} descartado: conflita com o horário de pausa (${breakStart} - ${breakEnd}).`);
                continue;
            }
        }

        let isBooked = false;
        for (const booked of bookedSlots) {
            const bookedStart = new Date(`1970-01-01T${booked.time}:00`);
            const bookedEnd = new Date(bookedStart.getTime() + booked.duration * 60000);
            if ((slotStart < bookedEnd && slotEnd > bookedStart)) {
                isBooked = true;
                console.log(`Horário ${timeStr} descartado: conflita com agendamento existente (${booked.time}).`);
                break;
            }
        }

        if (!isBooked) {
            slots.push(timeStr);
        }
    }
    console.log('Horários gerados:', slots);
    return slots;
}

async function loadAvailableTimes(barberId, date) {
    try {
        if (!db) throw new Error('Firestore não inicializado');
        console.log('Carregando horários disponíveis para barbeiro:', barberId, 'data:', date);
        const timeSlots = document.getElementById('timeSlots');
        timeSlots.innerHTML = '';

        console.log('Verificando agendamentos pendentes para usuário:', auth.currentUser?.uid);
        const pendingQuery = query(
            collection(db, 'appointments'),
            where('userId', '==', auth.currentUser?.uid),
            where('status', '==', 'confirmed')
        );
        const pendingSnapshot = await getDocs(pendingQuery);
        if (!pendingSnapshot.empty) {
            console.log('Agendamento pendente encontrado');
            timeSlots.innerHTML = '<p>Você tem um agendamento pendente. Desmarque ou conclua antes de agendar outro.</p>';
            return;
        }

        const selectedDate = new Date(date + 'T00:00:00-03:00');
        console.log('selectedDate (com fuso horário):', selectedDate.toISOString());
        const daysOfWeek = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
        const dayOfWeek = daysOfWeek[selectedDate.getDay()];
        console.log('Dia da semana calculado:', dayOfWeek);

        console.log('Buscando horários do barbeiro para barberId:', barberId, 'e dayOfWeek:', dayOfWeek);
        const schedulesQuery = query(
            collection(db, 'schedules'),
            where('barberId', '==', barberId),
            where('dayOfWeek', '==', dayOfWeek)
        );
        const schedulesSnapshot = await getDocs(schedulesQuery);
        let schedule = null;
        if (!schedulesSnapshot.empty) {
            schedulesSnapshot.forEach((docSnapshot) => {
                schedule = docSnapshot.data();
                console.log('Horário encontrado no Firestore:', schedule);
            });
        } else {
            console.log('Nenhum horário encontrado no Firestore para', barberId, dayOfWeek);
        }

        if (!schedule) {
            console.log('Nenhum horário disponível para', barberId, dayOfWeek);
            timeSlots.innerHTML = '<p>Nenhum horário disponível para este dia.</p>';
            return;
        }

        console.log('Buscando agendamentos confirmados para barberId:', barberId, 'e date:', date);
        const appointmentsQuery = query(
            collection(db, 'appointments'),
            where('barberId', '==', barberId),
            where('date', '==', date),
            where('status', '==', 'confirmed')
        );
        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        const bookedSlots = [];
        appointmentsSnapshot.forEach((docSnapshot) => {
            const appt = docSnapshot.data();
            bookedSlots.push({
                time: appt.time,
                duration: appt.totalTime
            });
        });
        console.log('Horários ocupados:', bookedSlots);

        const selectedServices = JSON.parse(sessionStorage.getItem('selectedServices') || '[]');
        const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0);
        console.log('Serviços selecionados:', selectedServices);
        console.log('Duração total dos serviços selecionados:', totalDuration);
        if (totalDuration === 0) {
            console.log('Nenhum serviço selecionado ou duração total zero.');
            timeSlots.innerHTML = '<p>Selecione pelo menos um serviço.</p>';
            return;
        }

        console.log('Chamando generateTimeSlots com:', {
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            breakStart: schedule.breakStart,
            breakEnd: schedule.breakEnd,
            bookedSlots: bookedSlots,
            totalDuration: totalDuration
        });
        const availableTimes = generateTimeSlots(
            schedule.startTime,
            schedule.endTime,
            schedule.breakStart,
            schedule.breakEnd,
            bookedSlots,
            15,
            totalDuration
        );
        console.log('Horários disponíveis gerados:', availableTimes);

        if (availableTimes.length === 0) {
            console.log('Nenhum horário disponível após filtros ou geração.');
            timeSlots.innerHTML = '<p>Nenhum horário disponível.</p>';
            return;
        }

        availableTimes.forEach((time) => {
            const button = document.createElement('button');
            button.textContent = time;
            button.className = 'time-slot';
            button.dataset.time = time;
            button.onclick = () => {
                document.querySelectorAll('.time-slot').forEach(btn => btn.classList.remove('selected'));
                button.classList.add('selected');
                sessionStorage.setItem('selectedTime', time);
                sessionStorage.setItem('selectedDate', date);
                sessionStorage.setItem('selectedBarberId', barberId);
            };
            timeSlots.appendChild(button);
        });
    } catch (error) {
        console.error('Erro ao carregar horários:', error);
        const timeSlots = document.getElementById('timeSlots');
        if (timeSlots) {
            if (error.message.includes('Missing or insufficient permissions')) {
                timeSlots.innerHTML = '<p>Você não tem permissão para visualizar os horários. Contate o administrador.</p>';
            } else {
                timeSlots.innerHTML = '<p>Erro ao carregar horários: ' + error.message + '</p>';
            }
        }
    }
}

async function loadAppointments() {
    try {
        if (!db || !auth.currentUser) throw new Error('Firestore ou usuário não inicializado');
        console.log('Iniciando loadAppointments para usuário:', auth.currentUser.uid);
        console.log('Firestore inicializado:', !!db);
        console.log('Usuário autenticado:', !!auth.currentUser);

        const appointmentsTable = document.getElementById('appointmentsTable');
        console.log('Container de agendamentos encontrado:', !!appointmentsTable);
        appointmentsTable.innerHTML = '';

        console.log('Construindo query de agendamentos...');
        const appointmentsQuery = query(
            collection(db, 'appointments'),
            where('userId', '==', auth.currentUser.uid),
            where('status', 'in', ['confirmed', 'completed', 'no-show', 'canceled']),
            orderBy('createdAt', 'desc'),
            limit(4)
        );
        console.log('Query criada:', appointmentsQuery);

        console.log('Executando query...');
        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        console.log('Total de agendamentos retornados:', appointmentsSnapshot.size);

        if (appointmentsSnapshot.empty) {
            console.log('Nenhum agendamento encontrado');
            appointmentsTable.innerHTML = '<p>Nenhum agendamento encontrado.</p>';
            return;
        }

        const appointments = await Promise.all(appointmentsSnapshot.docs.map(async (docSnapshot) => {
            const data = docSnapshot.data();
            if (data.createdAt && data.createdAt._methodName === 'serverTimestamp') {
                console.log(`Releitura para ${docSnapshot.id} por serverTimestamp pendente`);
                const refreshedDoc = await getDoc(docSnapshot.ref);
                return { id: docSnapshot.id, ...refreshedDoc.data(), createdAtTemp: data.createdAtTemp || Date.now() };
            }
            return { id: docSnapshot.id, ...data, createdAtTemp: data.createdAtTemp || (data.createdAt && data.createdAt._seconds ? new Date(data.createdAt._seconds * 1000) : Date.now()) };
        }));

        // Ordenação local como fallback usando createdAtTemp
        appointments.sort((a, b) => {
            const dateA = a.createdAt && a.createdAt._seconds ? new Date(a.createdAt._seconds * 1000) : new Date(a.createdAtTemp || 0);
            const dateB = b.createdAt && b.createdAt._seconds ? new Date(b.createdAt._seconds * 1000) : new Date(b.createdAtTemp || 0);
            console.log(`Sorting: ${a.id} (${dateA}) vs ${b.id} (${dateB})`);
            return dateB - dateA;
        });

        console.log('Appointments after resolution:', appointments.map(a => `${a.id} - ${a.createdAt && a.createdAt._seconds ? new Date(a.createdAt._seconds * 1000) : (a.createdAtTemp ? new Date(a.createdAtTemp) : 'no createdAt')}`));

        console.log('Iterando agendamentos (limitado a 4)...');
        for (const docData of appointments) {
            console.log('Processando agendamento ID:', docData.id);
            console.log('Dados do agendamento:', JSON.stringify(docData));

            let barberName = 'Desconhecido';
            try {
                console.log('Buscando barbeiro com ID:', docData.barberId);
                const barberRef = doc(db, 'barbers', docData.barberId);
                console.log('Referência do barbeiro criada:', barberRef.path);
                const barberDoc = await getDoc(barberRef);
                console.log('Documento do barbeiro obtido:', barberDoc.exists());
                if (barberDoc.exists()) {
                    barberName = barberDoc.data().name;
                    console.log('Barbeiro encontrado:', barberName);
                } else {
                    console.warn(`Barbeiro ${docData.barberId} não encontrado`);
                }
            } catch (error) {
                console.error(`Erro ao buscar barbeiro ${docData.barberId}:`, error);
            }

            console.log('Montando card de agendamento...');
            const services = docData.services ? docData.services.map(s => s.name).join(', ') : 'Nenhum serviço';
            const dateParts = docData.date.split('-');
            const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
            const statusPt = docData.status === 'confirmed' ? 'Confirmado' :
                            docData.status === 'completed' ? 'Realizado' :
                            docData.status === 'no-show' ? 'Não Compareceu' :
                            docData.status === 'canceled' ? 'Cancelado' : docData.status;

            let action = '';
            let actionMessage = '';
            if (docData.status === 'confirmed') {
                console.log('Agendamento confirmado, verificando cancelamento...');
                const apptDateTime = new Date(`${docData.date}T${docData.time}:00-03:00`);
                const now = new Date();
                const twoHoursBefore = new Date(apptDateTime.getTime() - 2 * 60 * 60 * 1000); // 2 horas antes
                console.log('Data do agendamento:', apptDateTime, 'Agora:', now, '2 horas antes:', twoHoursBefore);
                if (now < twoHoursBefore) {
                    action = `<button class="action-btn btn-cancel" data-id="${docData.id}" title="Cancelar agendamento"><i class="fas fa-times"></i></button>`;
                    actionMessage = '';
                } else {
                    action = '';
                    actionMessage = 'Prazo de cancelamento expirado. Contate a barbearia.';
                }
            } else if (docData.status === 'completed') {
                console.log('Agendamento realizado, verificando feedback...');
                let hasFeedback = false;
                let feedbackText = '';
                try {
                    const feedbackQuery = query(
                        collection(db, 'feedbacks'),
                        where('appointmentId', '==', docData.id),
                        where('userId', '==', auth.currentUser.uid)
                    );
                    console.log('Query de feedback criada:', feedbackQuery);
                    const feedbackSnapshot = await getDocs(feedbackQuery);
                    console.log('Feedbacks encontrados:', feedbackSnapshot.size);
                    if (!feedbackSnapshot.empty) {
                        hasFeedback = true;
                        feedbackText = feedbackSnapshot.docs[0].data().comment || 'Sem comentário';
                        if (feedbackSnapshot.size > 1) {
                            console.warn('Múltiplos feedbacks encontrados para appointmentId:', docData.id);
                        }
                    }
                } catch (error) {
                    console.warn('Erro ao verificar feedback:', error);
                    hasFeedback = false;
                }
                if (hasFeedback) {
                    action = '';
                    actionMessage = `Feedback: ${feedbackText}`;
                } else {
                    action = `<button class="action-btn btn-feedback" data-id="${docData.id}" title="Avaliar serviço"><i class="fas fa-star"></i></button>`;
                    actionMessage = '';
                }
            } else {
                action = '';
                actionMessage = '';
            }
            console.log('Ação definida:', action, 'Mensagem de ação:', actionMessage);

            console.log('Criando card de agendamento...');
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="card-info">
                    <h4><i class="fas fa-calendar-check"></i> ${services}</h4>
                    <p><strong>Barbeiro:</strong> ${barberName}</p>
                    <p><strong>📅 ${formattedDate}</strong> • <strong>🕐 ${docData.time}</strong></p>
                    <p><strong>💵 R$ ${docData.totalPrice.toFixed(2)}</strong> • <strong>Status:</strong> ${statusPt}</p>
                    ${actionMessage ? `<p><em>${actionMessage}</em></p>` : ''}
                </div>
                <div class="card-actions" style="display: ${action ? 'flex' : 'none'}">
                    ${action}
                </div>
            `;
            appointmentsTable.appendChild(card);
            console.log('Card adicionado à seção:', docData.id);
        }

        console.log('Configurando eventos dos botões...');
        document.querySelectorAll('.btn-cancel').forEach(btn => {
            btn.addEventListener('click', async () => {
                const confirmed = await showPopup('Deseja cancelar este agendamento?', true);
                if (confirmed) {
                    try {
                        console.log('Cancelando agendamento ID:', btn.dataset.id);
                        await setDoc(doc(db, 'appointments', btn.dataset.id), { status: 'canceled' }, { merge: true });
                        console.log('Agendamento cancelado');
                        loadAppointments(); // Recarrega a lista
                    } catch (error) {
                        console.error('Erro ao cancelar agendamento:', error);
                        showPopup('Erro ao cancelar agendamento: ' + error.message);
                    }
                }
            });
        });

        document.querySelectorAll('.btn-feedback').forEach(btn => {
            btn.addEventListener('click', () => {
                console.log('Abrindo feedback para agendamento ID:', btn.dataset.id);
                sessionStorage.setItem('appointmentId', btn.dataset.id);
                window.location.href = 'feedback.html';
            });
        });
        console.log('Eventos dos botões configurados');
    } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
        const appointmentsTable = document.getElementById('appointmentsTable');
        if (appointmentsTable) {
            appointmentsTable.innerHTML = '<p>Erro ao carregar agendamentos: ' + error.message + '</p>';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, configurando eventos...');

    // Configura o menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const menuClose = document.getElementById('menuClose');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const mainContent = document.getElementById('mainContent');
    const logoutBtn = document.getElementById('logoutBtn');

    if (menuToggle && menuClose && sidebar && sidebarOverlay && mainContent && logoutBtn) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.add('open');
            sidebarOverlay.classList.add('active');
            menuToggle.style.display = 'none';
            logoutBtn.style.display = 'none';
        });

        menuClose.addEventListener('click', () => {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
            menuToggle.style.display = 'block';
            logoutBtn.style.display = 'block';
        });

        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
            menuToggle.style.display = 'block';
            logoutBtn.style.display = 'block';
        });

        sidebar.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                sidebar.classList.remove('open');
                sidebarOverlay.classList.remove('active');
                menuToggle.style.display = 'block';
                logoutBtn.style.display = 'block';
            });
        });
    } else {
        console.error('Elementos do menu não encontrados');
    }

    // Configura os eventos de logout
    const navLogout = document.getElementById('nav-logout');
    if (navLogout) {
        navLogout.addEventListener('click', async (e) => {
            e.preventDefault();
            await handleLogout();
        });
    } else {
        console.error('Elemento nav-logout não encontrado');
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await handleLogout();
        });
    } else {
        console.error('Elemento logoutBtn não encontrado');
    }

    const barberSelect = document.getElementById('barber');
    if (barberSelect) {
        barberSelect.addEventListener('change', (e) => {
            console.log('Barbeiro selecionado:', e.target.value);
            loadServices(e.target.value);
            document.getElementById('calendar').style.display = 'none';
            document.getElementById('timeSlots').innerHTML = '';
        });
    } else {
        console.error('Elemento barber não encontrado');
    }

    const chooseScheduleBtn = document.getElementById('chooseSchedule');
    if (chooseScheduleBtn) {
        chooseScheduleBtn.addEventListener('click', async () => {
            console.log('Clicou em escolher horário');
            const barberSelect = document.getElementById('barber');
            if (!barberSelect.value) {
                await showPopup('Por favor, selecione um profissional antes de continuar.');
                return;
            }
            document.getElementById('calendar').style.display = 'block';
        });
    } else {
        console.error('Elemento chooseSchedule não encontrado');
    }

    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.addEventListener('change', (e) => {
            const barberId = document.getElementById('barber').value;
            const date = e.target.value;
            console.log('Data selecionada:', date, 'Barbeiro:', barberId);
            if (barberId && date) {
                loadAvailableTimes(barberId, date);
            }
        });
    } else {
        console.error('Elemento date não encontrado');
    }

    const nextBtn = document.getElementById('next');
    if (nextBtn) {
        nextBtn.addEventListener('click', async () => {
            const selectedTime = sessionStorage.getItem('selectedTime');
            const barberSelect = document.getElementById('barber');
            console.log('Clicou em próximo, horário selecionado:', selectedTime);
            if (!barberSelect.value) {
                await showPopup('Por favor, selecione um profissional antes de avançar.');
                return;
            }
            if (!selectedTime) {
                await showPopup('Selecione um horário antes de avançar.');
                return;
            }
            window.location.href = 'confirmation.html';
        });
    } else {
        console.error('Elemento next não encontrado');
    }

    const newAppointmentLink = document.getElementById('newAppointmentLink');
    if (newAppointmentLink) {
        newAppointmentLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Clicou em novo agendamento via barra lateral');
            showSection('appointmentForm');
        });
    } else {
        console.error('Elemento newAppointmentLink não encontrado');
    }

    const viewAppointmentsLink = document.getElementById('viewAppointmentsLink');
    if (viewAppointmentsLink) {
        viewAppointmentsLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Clicou em visualizar agendamentos via barra lateral');
            showSection('appointmentsSection');
            loadAppointments();
        });
    } else {
        console.error('Elemento viewAppointmentsLink não encontrado');
    }
});