import { collection, getDocs, doc, deleteDoc, setDoc, getDoc, query, where } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

console.log('manager_new.js carregado - Versão: 2025-06-05');
console.log('Função doc carregada:', typeof doc === 'function');
console.log('Função query carregada:', typeof query === 'function');
console.log('Função where carregada:', typeof where === 'function');

const auth = getAuth();
const db = window.db;

// Verifica autenticação
auth.onAuthStateChanged((user) => {
    if (!user) {
        console.error('Usuário não autenticado. Redirecionando para login...');
        window.location.href = 'index.html';
    } else {
        console.log('Usuário autenticado:', user.email);
    }
});

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

const dayOfWeekPt = {
    'Monday': 'Segunda',
    'Tuesday': 'Terça',
    'Wednesday': 'Quarta',
    'Thursday': 'Quinta',
    'Friday': 'Sexta',
    'Saturday': 'Sábado'
};

const dayOfWeekEn = {
    'Segunda': 'Monday',
    'Terça': 'Tuesday',
    'Quarta': 'Wednesday',
    'Quinta': 'Thursday',
    'Sexta': 'Friday',
    'Sábado': 'Saturday'
};

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
    const navLink = document.getElementById(`nav-${sectionId.split('-')[0]}`);
    if (navLink) {
        navLink.classList.add('active');
    } else {
        console.error('Link de navegação não encontrado:', `nav-${sectionId.split('-')[0]}`);
    }
}

async function loadBarbers() {
    try {
        if (!db) throw new Error('Firestore não inicializado');
        console.log('Carregando barbeiros...');
        const barberSelect = document.getElementById('barberFilter');
        const serviceBarberSelect = document.getElementById('serviceBarber');
        const scheduleBarberSelect = document.getElementById('scheduleBarber');
        const barbersSnapshot = await getDocs(collection(db, 'barbers'));
        if (barbersSnapshot.empty) {
            console.warn('Nenhum barbeiro encontrado');
            return;
        }
        barberSelect.innerHTML = '<option value="all">Todos</option>';
        serviceBarberSelect.innerHTML = '';
        scheduleBarberSelect.innerHTML = '';
        barbersSnapshot.forEach((docSnapshot) => {
            const barber = docSnapshot.data();
            const option = document.createElement('option');
            option.value = barber.id;
            option.textContent = barber.name;
            barberSelect.appendChild(option);
            serviceBarberSelect.appendChild(option.cloneNode(true));
            scheduleBarberSelect.appendChild(option.cloneNode(true));
        });
        loadBarbersList();
    } catch (error) {
        console.error('Erro ao carregar barbeiros:', error);
        showPopup('Erro ao carregar barbeiros: ' + error.message);
    }
}

async function loadBarbersList() {
    try {
        console.log('Carregando lista de barbeiros...');
        const barbersList = document.getElementById('barbersList');
        barbersList.innerHTML = '';
        const barbersSnapshot = await getDocs(collection(db, 'barbers'));
        if (barbersSnapshot.empty) {
            barbersList.innerHTML = '<p>Nenhum barbeiro cadastrado.</p>';
            return;
        }
        barbersSnapshot.forEach((docSnapshot) => {
            const barber = docSnapshot.data();
            const card = document.createElement('div');
            card.className = 'barber-card';
            card.innerHTML = `
                <div class="barber-info">
                    <h4>${barber.name}</h4>
                </div>
                <div class="barber-actions">
                    <button class="action-btn edit-barber" data-id="${docSnapshot.id}">Editar</button>
                    <button class="action-btn delete-barber" data-id="${docSnapshot.id}">Excluir</button>
                </div>
            `;
            barbersList.appendChild(card);
        });

        // Adiciona eventos aos botões de editar
        document.querySelectorAll('.edit-barber').forEach(btn => {
            btn.addEventListener('click', async () => {
                const barberId = btn.dataset.id;
                try {
                    const barberDoc = await getDoc(doc(db, 'barbers', barberId));
                    if (barberDoc.exists()) {
                        const barber = barberDoc.data();
                        document.getElementById('barberName').value = barber.name;
                        document.getElementById('barberId').value = barberId; // Campo oculto pra edição
                        document.getElementById('barberForm').querySelector('button[type="submit"]').textContent = 'Salvar Alterações';
                    }
                } catch (error) {
                    console.error('Erro ao carregar barbeiro para edição:', error);
                    showPopup('Erro ao carregar barbeiro para edição: ' + error.message);
                }
            });
        });

        // Adiciona eventos aos botões de excluir
        document.querySelectorAll('.delete-barber').forEach(btn => {
            btn.addEventListener('click', async () => {
                const confirmed = await showPopup('Excluir barbeiro?', true);
                if (confirmed) {
                    try {
                        await deleteDoc(doc(db, 'barbers', btn.dataset.id));
                        console.log('Barbeiro excluído:', btn.dataset.id);
                        loadBarbers();
                        showPopup('Barbeiro excluído com sucesso!');
                    } catch (error) {
                        console.error('Erro ao excluir barbeiro:', error);
                        showPopup('Erro ao excluir barbeiro: ' + error.message);
                    }
                }
            });
        });
    } catch (error) {
        console.error('Erro ao carregar lista de barbeiros:', error);
        showPopup('Erro ao carregar lista de barbeiros: ' + error.message);
    }
}

async function loadAppointments(barberId = 'all', date = '') {
    try {
        console.log('Iniciando loadAppointments...');
        if (!db) throw new Error('Firestore não inicializado');
        console.log('Firestore inicializado:', !!db);

        const appointmentsList = document.getElementById('appointmentsList').querySelector('tbody');
        console.log('Tabela encontrada:', !!appointmentsList);
        appointmentsList.innerHTML = '';

        console.log('Buscando agendamentos...');
        const appointmentsSnapshot = await getDocs(collection(db, 'appointments'));
        console.log('Total de agendamentos encontrados:', appointmentsSnapshot.size);

        if (appointmentsSnapshot.empty) {
            console.log('Nenhum agendamento encontrado');
            appointmentsList.innerHTML = '<tr><td colspan="9">Nenhum agendamento encontrado.</td></tr>';
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

        let totalAppointments = 0;
        let totalRevenue = 0;

        console.log('Iterando agendamentos...');
        for (const appt of appointments) {
            console.log('Processando agendamento ID:', appt.id);
            console.log('Dados do agendamento:', JSON.stringify(appt));

            const matchesBarber = barberId === 'all' || appt.barberId === barberId;
            const matchesDate = !date || appt.date === date;
            console.log('Matches - Barbeiro:', matchesBarber, 'Data:', matchesDate);

            if (matchesBarber && matchesDate) {
                console.log('Agendamento corresponde aos filtros');
                let userName = 'Desconhecido';
                try {
                    console.log('Buscando usuário com ID:', appt.userId);
                    const userRef = doc(db, 'users', appt.userId);
                    console.log('Referência do usuário criada:', userRef.path);
                    const userDoc = await getDoc(userRef);
                    console.log('Documento do usuário obtido:', userDoc.exists());
                    if (userDoc.exists()) {
                        userName = userDoc.data().name || 'Desconhecido';
                        console.log('Usuário encontrado:', userName);
                    } else {
                        console.warn(`Usuário ${appt.userId} não encontrado`);
                    }
                } catch (error) {
                    console.warn(`Erro ao buscar usuário ${appt.userId}, usando "Desconhecido":`, error);
                }

                const barberName = barberMap[appt.barberId] || appt.barberId;

                console.log('Montando linha da tabela...');
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

                let actions = `<button class="action-btn" onclick="window.cancelAppointment('${appt.id}')">Cancelar</button>`;
                if (appt.status === 'confirmed') {
                    actions += `
                        <button class="action-btn" onclick="window.markCompleted('${appt.id}')">Marcar Realizado</button>
                        <button class="action-btn" onclick="window.markNoShow('${appt.id}')">Marcar Não Compareceu</button>
                    `;
                }
                console.log('Ações definidas:', actions);

                console.log('Criando linha da tabela...');
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td data-label="Cliente">${userName}</td>
                    <td data-label="Barbeiro">${barberName}</td>
                    <td data-label="Serviços">${services}</td>
                    <td data-label="Data">${formattedDate}</td>
                    <td data-label="Horário">${appt.time}</td>
                    <td data-label="Valor">R$${appt.totalPrice.toFixed(2)}</td>
                    <td data-label="Status">${statusPt}</td>
                    <td data-label="Feedback">${feedbackText}</td>
                    <td data-label="Ações">${actions}</td>
                `;
                appointmentsList.appendChild(row);
                console.log('Linha adicionada à tabela:', appt.id);

                totalAppointments++;
                totalRevenue += appt.totalPrice;
            }
        }

        console.log('Atualizando totais...');
        document.getElementById('totalAppointments').textContent = totalAppointments;
        document.getElementById('totalRevenue').textContent = totalRevenue.toFixed(2);
        console.log('Totais atualizados:', totalAppointments, totalRevenue);

        if (totalAppointments === 0) {
            console.log('Nenhum agendamento corresponde aos filtros');
            appointmentsList.innerHTML = '<tr><td colspan="9">Nenhum agendamento corresponde aos filtros.</td></tr>';
        }
    } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
        const appointmentsList = document.getElementById('appointmentsList').querySelector('tbody');
        if (appointmentsList) {
            appointmentsList.innerHTML = '<tr><td colspan="9">Erro ao carregar agendamentos: ' + error.message + '</td></tr>';
        }
        showPopup('Erro ao carregar agendamentos: ' + error.message);
    }
}

async function loadServices() {
    try {
        console.log('Carregando serviços...');
        const servicesList = document.getElementById('servicesList');
        servicesList.innerHTML = '';
        const servicesSnapshot = await getDocs(collection(db, 'services'));
        if (servicesSnapshot.empty) {
            servicesList.innerHTML = '<p>Nenhum serviço cadastrado.</p>';
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

        servicesSnapshot.forEach((docSnapshot) => {
            const service = docSnapshot.data();
            const barberName = barberMap[service.barberId] || service.barberId;
            const card = document.createElement('div');
            card.className = 'service-card';
            card.innerHTML = `
                <div class="service-info">
                    <h4>${service.name}</h4>
                    <p>Barbeiro: ${barberName}</p>
                    <p>Preço: R$${service.price.toFixed(2)}</p>
                    <p>Duração: ${service.duration} min</p>
                </div>
                <div class="service-actions">
                    <button class="action-btn edit-service" data-id="${docSnapshot.id}">Editar</button>
                    <button class="action-btn delete-service" data-id="${docSnapshot.id}">Excluir</button>
                </div>
            `;
            servicesList.appendChild(card);
        });

        // Adiciona eventos aos botões de editar
        document.querySelectorAll('.edit-service').forEach(btn => {
            btn.addEventListener('click', async () => {
                const serviceId = btn.dataset.id;
                try {
                    const serviceDoc = await getDoc(doc(db, 'services', serviceId));
                    if (serviceDoc.exists()) {
                        const service = serviceDoc.data();
                        document.getElementById('serviceBarber').value = service.barberId;
                        document.getElementById('serviceName').value = service.name;
                        document.getElementById('servicePrice').value = service.price;
                        document.getElementById('serviceDuration').value = service.duration;
                        document.getElementById('serviceId').value = serviceId; // Campo oculto pra edição
                        document.getElementById('serviceForm').querySelector('button[type="submit"]').textContent = 'Salvar Alterações';
                    }
                } catch (error) {
                    console.error('Erro ao carregar serviço para edição:', error);
                    showPopup('Erro ao carregar serviço para edição: ' + error.message);
                }
            });
        });

        // Adiciona eventos aos botões de excluir
        document.querySelectorAll('.delete-service').forEach(btn => {
            btn.addEventListener('click', async () => {
                const confirmed = await showPopup('Excluir serviço?', true);
                if (confirmed) {
                    try {
                        await deleteDoc(doc(db, 'services', btn.dataset.id));
                        console.log('Serviço excluído:', btn.dataset.id);
                        loadServices();
                        showPopup('Serviço excluído com sucesso!');
                    } catch (error) {
                        console.error('Erro ao excluir serviço:', error);
                        showPopup('Erro ao excluir serviço: ' + error.message);
                    }
                }
            });
        });
    } catch (error) {
        console.error('Erro ao carregar serviços:', error);
        showPopup('Erro ao carregar serviços: ' + error.message);
    }
}

async function loadSchedules() {
    try {
        console.log('Carregando horários...');
        const schedulesList = document.getElementById('schedulesList').querySelector('tbody');
        schedulesList.innerHTML = '';
        const schedulesSnapshot = await getDocs(collection(db, 'schedules'));
        if (schedulesSnapshot.empty) {
            schedulesList.innerHTML = '<tr><td colspan="5">Nenhum horário cadastrado.</td></tr>';
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

        schedulesSnapshot.forEach((docSnapshot) => {
            const sched = docSnapshot.data();
            const dayPt = dayOfWeekPt[sched.dayOfWeek] || sched.dayOfWeek;
            const barberName = barberMap[sched.barberId] || sched.barberId;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="Dia">${dayPt} (Barbeiro ${barberName})</td>
                <td data-label="Início">${sched.startTime}</td>
                <td data-label="Fim">${sched.endTime}</td>
                <td data-label="Pausa">${sched.breakStart ? `${sched.breakStart}-${sched.breakEnd}` : 'Nenhuma'}</td>
                <td data-label="Ações">
                    <button class="action-btn" onclick="editSchedule('${docSnapshot.id}', '${sched.dayOfWeek}', '${sched.barberId}', '${sched.startTime}', '${sched.endTime}', '${sched.breakStart || ''}', '${sched.breakEnd || ''}')">Editar</button>
                    <button class="action-btn delete-schedule" data-id="${docSnapshot.id}">Excluir</button>
                </td>
            `;
            schedulesList.appendChild(row);
        });

        // Adiciona eventos aos botões de excluir
        document.querySelectorAll('.delete-schedule').forEach(btn => {
            btn.addEventListener('click', async () => {
                const confirmed = await showPopup('Excluir horário?', true);
                if (confirmed) {
                    try {
                        await deleteDoc(doc(db, 'schedules', btn.dataset.id));
                        console.log('Horário excluído:', btn.dataset.id);
                        loadSchedules();
                        showPopup('Horário excluído com sucesso!');
                    } catch (error) {
                        console.error('Erro ao excluir horário:', error);
                        showPopup('Erro ao excluir horário: ' + error.message);
                    }
                }
            });
        });
    } catch (error) {
        console.error('Erro ao carregar horários:', error);
        showPopup('Erro ao carregar horários: ' + error.message);
    }
}

async function setupSchedules() {
    const schedules = [
        { id: 'sched1_b1', barberId: 'barber1', dayOfWeek: 'Monday', startTime: '14:00', endTime: '21:00', breakStart: null, breakEnd: null },
        { id: 'sched2_b1', barberId: 'barber1', dayOfWeek: 'Tuesday', startTime: '09:00', endTime: '21:00', breakStart: '12:00', breakEnd: '14:00' },
        { id: 'sched3_b1', barberId: 'barber1', dayOfWeek: 'Wednesday', startTime: '09:00', endTime: '21:00', breakStart: '12:00', breakEnd: '14:00' },
        { id: 'sched4_b1', barberId: 'barber1', dayOfWeek: 'Thursday', startTime: '09:00', endTime: '21:00', breakStart: '12:00', breakEnd: '14:00' },
        { id: 'sched5_b1', barberId: 'barber1', dayOfWeek: 'Friday', startTime: '09:00', endTime: '21:00', breakStart: '12:00', breakEnd: '14:00' },
        { id: 'sched6_b1', barberId: 'barber1', dayOfWeek: 'Saturday', startTime: '08:00', endTime: '17:00', breakStart: null, breakEnd: null },
        { id: 'sched1_b2', barberId: 'barber2', dayOfWeek: 'Monday', startTime: '15:00', endTime: '20:00', breakStart: null, breakEnd: null },
        { id: 'sched2_b2', barberId: 'barber2', dayOfWeek: 'Tuesday', startTime: '10:00', endTime: '18:00', breakStart: '13:00', breakEnd: '14:00' },
        { id: 'sched3_b2', barberId: 'barber2', dayOfWeek: 'Wednesday', startTime: '10:00', endTime: '18:00', breakStart: '13:00', breakEnd: '14:00' },
        { id: 'sched4_b2', barberId: 'barber2', dayOfWeek: 'Thursday', startTime: '10:00', endTime: '18:00', breakStart: '13:00', breakEnd: '14:00' },
        { id: 'sched5_b2', barberId: 'barber2', dayOfWeek: 'Friday', startTime: '10:00', endTime: '18:00', breakStart: '13:00', breakEnd: '14:00' },
        { id: 'sched6_b2', barberId: 'barber2', dayOfWeek: 'Saturday', startTime: '09:00', endTime: '16:00', breakStart: null, breakEnd: null }
    ];

    try {
        for (const sched of schedules) {
            await setDoc(doc(db, 'schedules', sched.id), sched);
            console.log(`Horário ${sched.dayOfWeek} (Barbeiro ${sched.barberId}) adicionado`);
        }
        showPopup('Horários cadastrados com sucesso!');
        loadSchedules();
    } catch (error) {
        console.error('Erro ao cadastrar horários:', error);
        showPopup('Erro ao cadastrar horários: ' + error.message);
    }
}

document.getElementById('barberFilter').addEventListener('change', (e) => {
    const date = document.getElementById('dateFilter').value;
    loadAppointments(e.target.value, date);
});

document.getElementById('dateFilter').addEventListener('change', (e) => {
    const barberId = document.getElementById('barberFilter').value;
    loadAppointments(barberId, e.target.value);
});

document.getElementById('serviceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const serviceId = document.getElementById('serviceId').value;
    const barberId = document.getElementById('serviceBarber').value;
    const name = document.getElementById('serviceName').value;
    const price = parseFloat(document.getElementById('servicePrice').value);
    const duration = parseInt(document.getElementById('serviceDuration').value);
    const id = serviceId || `service${Date.now()}`; // Usa o ID existente ou cria um novo

    try {
        await setDoc(doc(db, 'services', id), { id, barberId, name, price, duration });
        console.log('Serviço salvo:', id);
        loadServices();
        document.getElementById('serviceForm').reset();
        document.getElementById('serviceId').value = '';
        document.getElementById('serviceForm').querySelector('button[type="submit"]').textContent = 'Adicionar/Editar Serviço';
        showPopup('Serviço salvo com sucesso!');
    } catch (error) {
        console.error('Erro ao salvar serviço:', error);
        showPopup('Erro ao salvar serviço: ' + error.message);
    }
});

document.getElementById('barberForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const barberId = document.getElementById('barberId').value;
    const name = document.getElementById('barberName').value;
    const id = barberId || `barber${Date.now()}`; // Usa o ID existente ou cria um novo

    try {
        await setDoc(doc(db, 'barbers', id), { id, name });
        console.log('Barbeiro salvo:', id);
        loadBarbers();
        document.getElementById('barberForm').reset();
        document.getElementById('barberId').value = '';
        document.getElementById('barberForm').querySelector('button[type="submit"]').textContent = 'Adicionar Barbeiro';
        showPopup('Barbeiro salvo com sucesso!');
    } catch (error) {
        console.error('Erro ao salvar barbeiro:', error);
        showPopup('Erro ao salvar barbeiro: ' + error.message);
    }
});

document.getElementById('scheduleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    let dayOfWeek = document.getElementById('dayOfWeek').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const breakStart = document.getElementById('breakStart').value || null;
    const breakEnd = document.getElementById('breakEnd').value || null;
    const id = document.getElementById('scheduleId').value || `sched${Date.now()}`;
    const barberId = document.getElementById('scheduleBarber').value;

    dayOfWeek = dayOfWeekEn[dayOfWeek] || dayOfWeek;

    try {
        await setDoc(doc(db, 'schedules', id), { id, dayOfWeek, startTime, endTime, breakStart, breakEnd, barberId });
        console.log('Horário salvo:', id);
        loadSchedules();
        document.getElementById('scheduleForm').reset();
        document.getElementById('scheduleId').value = '';
        showPopup('Horário salvo com sucesso!');
    } catch (error) {
        console.error('Erro ao salvar horário:', error);
        showPopup('Erro ao salvar horário: ' + error.message);
    }
});

document.getElementById('setupSchedules').addEventListener('click', async () => {
    const confirmed = await showPopup('Cadastrar horários padrão? Isso pode sobrescrever horários existentes.', true);
    if (confirmed) {
        setupSchedules();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, configurando eventos do menu...');
    const navBarbers = document.getElementById('nav-barbers');
    const navAppointments = document.getElementById('nav-appointments');
    const navServices = document.getElementById('nav-services');
    const navSchedules = document.getElementById('nav-schedules');
    const navLogout = document.getElementById('nav-logout');

    if (navBarbers) {
        navBarbers.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Clicou em Barbeiros');
            showSection('barbers-section');
            loadBarbers();
        });
    } else {
        console.error('Elemento nav-barbers não encontrado');
    }

    if (navAppointments) {
        navAppointments.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Clicou em Agendamentos');
            showSection('appointments-section');
            loadAppointments();
        });
    } else {
        console.error('Elemento nav-appointments não encontrado');
    }

    if (navServices) {
        navServices.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Clicou em Serviços');
            showSection('services-section');
            loadServices();
        });
    } else {
        console.error('Elemento nav-services não encontrado');
    }

    if (navSchedules) {
        navSchedules.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Clicou em Horários');
            showSection('schedules-section');
            loadSchedules();
        });
    } else {
        console.error('Elemento nav-schedules não encontrado');
    }

    if (navLogout) {
        navLogout.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('Clicou em Sair');
            try {
                await signOut(auth);
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Erro ao sair:', error);
                showPopup('Erro ao sair: ' + error.message);
            }
        });
    } else {
        console.error('Elemento nav-logout não encontrado');
    }
});

window.cancelAppointment = async (id) => {
    const confirmed = await showPopup('Cancelar agendamento?', true);
    if (confirmed) {
        try {
            await setDoc(doc(db, 'appointments', id), { status: 'canceled' }, { merge: true });
            console.log('Agendamento cancelado:', id);
            const barberId = document.getElementById('barberFilter').value;
            const date = document.getElementById('dateFilter').value;
            loadAppointments(barberId, date);
            showPopup('Agendamento cancelado com sucesso!');
        } catch (error) {
            console.error('Erro ao cancelar agendamento:', error);
            showPopup('Erro ao cancelar agendamento: ' + error.message);
        }
    }
};

window.markCompleted = async (id) => {
    const confirmed = await showPopup('Marcar agendamento como concluído?', true);
    if (confirmed) {
        try {
            await setDoc(doc(db, 'appointments', id), { status: 'completed' }, { merge: true });
            console.log('Agendamento marcado como concluído:', id);
            const barberId = document.getElementById('barberFilter').value;
            const date = document.getElementById('dateFilter').value;
            loadAppointments(barberId, date);
            showPopup('Agendamento marcado como concluído!');
        } catch (error) {
            console.error('Erro ao marcar como concluído:', error);
            showPopup('Erro ao marcar como concluído: ' + error.message);
        }
    }
};

window.markNoShow = async (id) => {
    const confirmed = await showPopup('Marcar agendamento como não compareceu?', true);
    if (confirmed) {
        try {
            await setDoc(doc(db, 'appointments', id), { status: 'no-show' }, { merge: true });
            console.log('Agendamento marcado como não compareceu:', id);
            const barberId = document.getElementById('barberFilter').value;
            const date = document.getElementById('dateFilter').value;
            loadAppointments(barberId, date);
            showPopup('Agendamento marcado como não compareceu!');
        } catch (error) {
            console.error('Erro ao marcar como não compareceu:', error);
            showPopup('Erro ao marcar como não compareceu: ' + error.message);
        }
    }
};

window.editSchedule = (id, dayOfWeek, barberId, startTime, endTime, breakStart, breakEnd) => {
    document.getElementById('scheduleId').value = id;
    const dayPt = Object.keys(dayOfWeekEn).find(key => dayOfWeekEn[key] === dayOfWeek) || dayOfWeek;
    document.getElementById('dayOfWeek').value = dayPt;
    document.getElementById('scheduleBarber').value = barberId;
    document.getElementById('startTime').value = startTime;
    document.getElementById('endTime').value = endTime;
    document.getElementById('breakStart').value = breakStart || '';
    document.getElementById('breakEnd').value = breakEnd || '';
};

loadBarbers();
showSection('barbers-section');