import { collection, getDocs, query, where, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
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
});

async function loadBarbers() {
    try {
        if (!db) throw new Error('Firestore não inicializado');
        console.log('Carregando barbeiros...');
        const barberSelect = document.getElementById('barber');
        const barbersSnapshot = await getDocs(collection(db, 'barbers'));
        barberSelect.innerHTML = '';
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
        console.log('Barbeiros carregados, selecionando o primeiro:', barbersSnapshot.docs[0].data().id);
        await loadServices(barbersSnapshot.docs[0].data().id);
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
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeek = daysOfWeek[selectedDate.getDay()];
        console.log('Dia selecionado:', date, dayOfWeek, 'Barbeiro:', barberId);

        console.log('Buscando horários do barbeiro...');
        const schedulesQuery = query(
            collection(db, 'schedules'),
            where('barberId', '==', barberId),
            where('dayOfWeek', '==', dayOfWeek)
        );
        const schedulesSnapshot = await getDocs(schedulesQuery);
        let schedule = null;
        schedulesSnapshot.forEach((docSnapshot) => {
            schedule = docSnapshot.data();
        });
        console.log('Horário encontrado:', schedule);

        if (!schedule) {
            console.log('Nenhum horário disponível para', barberId, dayOfWeek);
            timeSlots.innerHTML = '<p>Nenhum horário disponível para este dia.</p>';
            return;
        }

        console.log('Buscando agendamentos confirmados...');
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
        if (totalDuration === 0) {
            console.log('Nenhum serviço selecionado');
            timeSlots.innerHTML = '<p>Selecione pelo menos um serviço.</p>';
            return;
        }

        console.log('Gerando horários disponíveis...');
        const availableTimes = generateTimeSlots(
            schedule.startTime,
            schedule.endTime,
            schedule.breakStart,
            schedule.breakEnd,
            bookedSlots,
            15,
            totalDuration
        );
        console.log('Horários disponíveis:', availableTimes);

        if (availableTimes.length === 0) {
            console.log('Nenhum horário disponível após filtros');
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
            where('status', 'in', ['confirmed', 'completed', 'no-show'])
        );
        console.log('Query criada:', appointmentsQuery);

        console.log('Executando query...');
        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        console.log('Total de agendamentos encontrados:', appointmentsSnapshot.size);

        if (appointmentsSnapshot.empty) {
            console.log('Nenhum agendamento encontrado');
            appointmentsTable.innerHTML = '<p>Nenhum agendamento encontrado.</p>';
            return;
        }

        console.log('Iterando agendamentos...');
        for (const docSnapshot of appointmentsSnapshot.docs) {
            console.log('Processando agendamento ID:', docSnapshot.id);
            const appt = docSnapshot.data();
            console.log('Dados do agendamento:', JSON.stringify(appt));

            let barberName = 'Desconhecido';
            try {
                console.log('Buscando barbeiro com ID:', appt.barberId);
                const barberRef = doc(db, 'barbers', appt.barberId);
                console.log('Referência do barbeiro criada:', barberRef.path);
                const barberDoc = await getDoc(barberRef);
                console.log('Documento do barbeiro obtido:', barberDoc.exists());
                if (barberDoc.exists()) {
                    barberName = barberDoc.data().name;
                    console.log('Barbeiro encontrado:', barberName);
                } else {
                    console.warn(`Barbeiro ${appt.barberId} não encontrado`);
                }
            } catch (error) {
                console.error(`Erro ao buscar barbeiro ${appt.barberId}:`, error);
            }

            console.log('Montando card de agendamento...');
            const services = appt.services ? appt.services.map(s => s.name).join(', ') : 'Nenhum serviço';
            const dateParts = appt.date.split('-');
            const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
            const statusPt = appt.status === 'confirmed' ? 'Confirmado' :
                            appt.status === 'completed' ? 'Realizado' :
                            appt.status === 'no-show' ? 'Não Compareceu' : appt.status;

            let action = '';
            let actionMessage = '';
            if (appt.status === 'confirmed') {
                console.log('Agendamento confirmado, verificando cancelamento...');
                const apptDateTime = new Date(`${appt.date}T${appt.time}:00-03:00`);
                const now = new Date();
                const oneHourBefore = new Date(apptDateTime.getTime() - 60 * 60 * 1000);
                console.log('Data do agendamento:', apptDateTime, 'Agora:', now, 'Uma hora antes:', oneHourBefore);
                if (now < oneHourBefore) {
                    action = `<button class="action-btn cancel-btn" data-id="${docSnapshot.id}">Cancelar</button>`;
                    actionMessage = '';
                } else {
                    action = '';
                    actionMessage = 'Não é possível cancelar. Contate a barbearia.';
                }
            } else if (appt.status === 'completed') {
                console.log('Agendamento realizado, verificando feedback...');
                let hasFeedback = false;
                try {
                    const feedbackQuery = query(
                        collection(db, 'feedbacks'),
                        where('appointmentId', '==', docSnapshot.id)
                    );
                    console.log('Query de feedback criada:', feedbackQuery);
                    const feedbackSnapshot = await getDocs(feedbackQuery);
                    console.log('Feedbacks encontrados:', feedbackSnapshot.size);
                    hasFeedback = !feedbackSnapshot.empty;
                } catch (error) {
                    console.warn('Erro ao verificar feedback, assumindo nenhum feedback:', error);
                    hasFeedback = false;
                }
                if (!hasFeedback) {
                    action = `<button class="action-btn feedback-btn" data-id="${docSnapshot.id}">Avaliar</button>`;
                    actionMessage = '';
                } else {
                    action = '';
                    actionMessage = 'Feedback já enviado.';
                }
            } else {
                action = '';
                actionMessage = '';
            }
            console.log('Ação definida:', action, 'Mensagem de ação:', actionMessage);

            console.log('Criando card de agendamento...');
            const card = document.createElement('div');
            card.className = 'appointment-card';
            card.innerHTML = `
                <p><strong>Barbeiro:</strong> ${barberName}</p>
                <p><strong>Serviços:</strong> ${services}</p>
                <p><strong>Data:</strong> ${formattedDate}</p>
                <p><strong>Horário:</strong> ${appt.time}</p>
                <p><strong>Valor:</strong> R$${appt.totalPrice.toFixed(2)}</p>
                <p><strong>Status:</strong> ${statusPt}${actionMessage ? ` - ${actionMessage}` : ''}</p>
                <div class="appointment-actions" style="display: ${action ? 'flex' : 'none'}">
                    ${action}
                </div>
            `;
            appointmentsTable.appendChild(card);
            console.log('Card adicionado à seção:', docSnapshot.id);
        }

        console.log('Configurando eventos dos botões...');
        document.querySelectorAll('.cancel-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const confirmed = await showPopup('Deseja cancelar este agendamento?', true);
                if (confirmed) {
                    try {
                        console.log('Cancelando agendamento ID:', btn.dataset.id);
                        await setDoc(doc(db, 'appointments', btn.dataset.id), { status: 'canceled' }, { merge: true });
                        console.log('Agendamento cancelado');
                        loadAppointments();
                    } catch (error) {
                        console.error('Erro ao cancelar agendamento:', error);
                        showPopup('Erro ao cancelar agendamento: ' + error.message);
                    }
                }
            });
        });

        document.querySelectorAll('.feedback-btn').forEach(btn => {
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
            menuToggle.style.display = 'none'; // Esconde o botão de hamburger
            logoutBtn.style.display = 'none'; // Esconde o botão de logout
        });

        menuClose.addEventListener('click', () => {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
            menuToggle.style.display = 'block'; // Mostra o botão de hamburger
            logoutBtn.style.display = 'block'; // Mostra o botão de logout
        });

        // Fecha o menu ao clicar no overlay
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
            menuToggle.style.display = 'block'; // Mostra o botão de hamburger
            logoutBtn.style.display = 'block'; // Mostra o botão de logout
        });

        // Fecha o menu ao clicar em um link da sidebar
        sidebar.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                sidebar.classList.remove('open');
                sidebarOverlay.classList.remove('active');
                menuToggle.style.display = 'block'; // Mostra o botão de hamburger
                logoutBtn.style.display = 'block'; // Mostra o botão de logout
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
        chooseScheduleBtn.addEventListener('click', () => {
            console.log('Clicou em escolher horário');
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
            console.log('Clicou em próximo, horário selecionado:', selectedTime);
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
            loadAppointments(); // Carrega os agendamentos ao exibir a seção
        });
    } else {
        console.error('Elemento viewAppointmentsLink não encontrado');
    }

    // Exibe a seção "Novo Agendamento" automaticamente ao carregar a página
    showSection('appointmentForm');
});