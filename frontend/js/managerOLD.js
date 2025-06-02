import { collection, getDocs, doc, deleteDoc, setDoc, getDoc, query, where } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

console.log('Função doc carregada:', typeof doc === 'function');
console.log('Função query carregada:', typeof query === 'function');

const auth = getAuth();
const db = window.db;

// Adiciona tratamento de erro de autenticação
auth.onAuthStateChanged((user) => {
    if (!user) {
        console.error('Usuário não autenticado. Redirecionando para login...');
        window.location.href = 'index.html';
    }
});

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
            const div = document.createElement('div');
            div.textContent = barber.name;
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Excluir';
            deleteBtn.className = 'action-btn';
            deleteBtn.onclick = async () => {
                if (confirm('Excluir barbeiro?')) {
                    try {
                        await deleteDoc(doc(db, 'barbers', docSnapshot.id));
                        loadBarbers();
                    } catch (error) {
                        console.error('Erro ao excluir barbeiro:', error);
                    }
                }
            };
            div.appendChild(deleteBtn);
            barbersList.appendChild(div);
        });
    } catch (error) {
        console.error('Erro ao carregar lista de barbeiros:', error);
    }
}

async function loadAppointments(barberId = 'all', date = '') {
    try {
        if (!db) throw new Error('Firestore não inicializado');
        console.log('Carregando agendamentos...');
        const appointmentsList = document.getElementById('appointmentsList').querySelector('tbody');
        appointmentsList.innerHTML = '';
        const appointmentsSnapshot = await getDocs(collection(db, 'appointments'));
        let totalAppointments = 0;
        let totalRevenue = 0;

        console.log('Total de agendamentos encontrados:', appointmentsSnapshot.size);

        if (appointmentsSnapshot.empty) {
            appointmentsList.innerHTML = '<tr><td colspan="8">Nenhum agendamento encontrado.</td></tr>';
            return;
        }

        for (const docSnapshot of appointmentsSnapshot.docs) {
            const appt = docSnapshot.data();
            console.log('Agendamento:', appt);

            const matchesBarber = barberId === 'all' || appt.barberId === barberId;
            const matchesDate = !date || appt.date === date;

            if (matchesBarber && matchesDate) {
                let userName = 'Desconhecido';
                try {
                    console.log('Verificando função doc:', typeof doc === 'function');
                    console.log('Buscando usuário com ID:', appt.userId);
                    const userRef = doc(db, 'users', appt.userId);
                    const userDoc = await getDoc(userRef);
                    if (userDoc.exists()) {
                        userName = userDoc.data().name;
                        console.log('Usuário encontrado:', userName);
                    } else {
                        console.warn(`Usuário ${appt.userId} não encontrado`);
                    }
                } catch (error) {
                    console.error(`Erro ao buscar usuário ${appt.userId}:`, error);
                }

                const services = appt.services.map(s => s.name).join(', ');
                const statusPt = appt.status === 'confirmed' ? 'Confirmado' :
                                appt.status === 'completed' ? 'Concluído' :
                                appt.status === 'no-show' ? 'Não Compareceu' :
                                appt.status === 'canceled' ? 'Cancelado' : appt.status;
                const dateParts = appt.date.split('-');
                const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

                // Feedbacks não são buscados, pois a coleção não existe
                const feedbackText = 'Nenhum feedback';

                let actions = `<button class="action-btn" onclick="window.cancelAppointment('${docSnapshot.id}')">Cancelar</button>`;
                if (appt.status === 'confirmed') {
                    actions += `
                        <button class="action-btn" onclick="window.markCompleted('${docSnapshot.id}')">Marcar Concluído</button>
                        <button class="action-btn" onclick="window.markNoShow('${docSnapshot.id}')">Marcar Não Compareceu</button>
                    `;
                }

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${userName}</td>
                    <td>${services}</td>
                    <td>${formattedDate}</td>
                    <td>${appt.time}</td>
                    <td>R$${appt.totalPrice.toFixed(2)}</td>
                    <td>${statusPt}</td>
                    <td>${feedbackText}</td>
                    <td>${actions}</td>
                `;
                appointmentsList.appendChild(row);
                totalAppointments++;
                totalRevenue += appt.totalPrice;
            }
        }

        document.getElementById('totalAppointments').textContent = totalAppointments;
        document.getElementById('totalRevenue').textContent = totalRevenue.toFixed(2);

        if (totalAppointments === 0) {
            appointmentsList.innerHTML = '<tr><td colspan="8">Nenhum agendamento corresponde aos filtros.</td></tr>';
        }
    } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
        const appointmentsList = document.getElementById('appointmentsList').querySelector('tbody');
        appointmentsList.innerHTML = '<tr><td colspan="8">Erro ao carregar agendamentos: ' + error.message + '</td></tr>';
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
        servicesSnapshot.forEach((docSnapshot) => {
            const service = docSnapshot.data();
            const div = document.createElement('div');
            div.textContent = `${service.name} (Barbeiro ${service.barberId}) - R$${service.price.toFixed(2)} (${service.duration} min)`;
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Excluir';
            deleteBtn.className = 'action-btn';
            deleteBtn.onclick = async () => {
                if (confirm('Excluir serviço?')) {
                    try {
                        await deleteDoc(doc(db, 'services', docSnapshot.id));
                        loadServices();
                    } catch (error) {
                        console.error('Erro ao excluir serviço:', error);
                    }
                }
            };
            div.appendChild(deleteBtn);
            servicesList.appendChild(div);
        });
    } catch (error) {
        console.error('Erro ao carregar serviços:', error);
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
        schedulesSnapshot.forEach((docSnapshot) => {
            const sched = docSnapshot.data();
            const dayPt = dayOfWeekPt[sched.dayOfWeek] || sched.dayOfWeek;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${dayPt} (Barbeiro ${sched.barberId})</td>
                <td>${sched.startTime}</td>
                <td>${sched.endTime}</td>
                <td>${sched.breakStart ? `${sched.breakStart}-${sched.breakEnd}` : 'Nenhuma'}</td>
                <td>
                    <button class="action-btn" onclick="editSchedule('${docSnapshot.id}', '${sched.dayOfWeek}', '${sched.barberId}', '${sched.startTime}', '${sched.endTime}', '${sched.breakStart || ''}', '${sched.breakEnd || ''}')">Editar</button>
                </td>
            `;
            schedulesList.appendChild(row);
        });
    } catch (error) {
        console.error('Erro ao carregar horários:', error);
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
        alert('Horários cadastrados com sucesso!');
        loadSchedules();
    } catch (error) {
        console.error('Erro ao cadastrar horários:', error);
        alert('Erro ao cadastrar horários: ' + error.message);
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
    const barberId = document.getElementById('serviceBarber').value;
    const name = document.getElementById('serviceName').value;
    const price = parseFloat(document.getElementById('servicePrice').value);
    const duration = parseInt(document.getElementById('serviceDuration').value);
    const id = `service${Date.now()}`;

    try {
        await setDoc(doc(db, 'services', id), { id, barberId, name, price, duration });
        loadServices();
        document.getElementById('serviceForm').reset();
    } catch (error) {
        console.error('Erro ao adicionar serviço:', error);
    }
});

document.getElementById('barberForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('barberName').value;
    const id = `barber${Date.now()}`;

    try {
        await setDoc(doc(db, 'barbers', id), { id, name });
        loadBarbers();
        document.getElementById('barberForm').reset();
    } catch (error) {
        console.error('Erro ao adicionar barbeiro:', error);
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
        loadSchedules();
        document.getElementById('scheduleForm').reset();
        document.getElementById('scheduleId').value = '';
        alert('Horário salvo com sucesso!');
    } catch (error) {
        console.error('Erro ao salvar horário:', error);
        alert('Erro ao salvar horário: ' + error.message);
    }
});

document.getElementById('setupSchedules').addEventListener('click', () => {
    if (confirm('Cadastrar horários padrão? Isso pode sobrescrever horários existentes.')) {
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
            }
        });
    } else {
        console.error('Elemento nav-logout não encontrado');
    }
});

window.cancelAppointment = async (id) => {
    if (confirm('Cancelar agendamento?')) {
        try {
            await setDoc(doc(db, 'appointments', id), { status: 'canceled' }, { merge: true });
            const barberId = document.getElementById('barberFilter').value;
            const date = document.getElementById('dateFilter').value;
            loadAppointments(barberId, date);
        } catch (error) {
            console.error('Erro ao cancelar agendamento:', error);
        }
    }
};

window.markCompleted = async (id) => {
    if (confirm('Marcar agendamento como concluído?')) {
        try {
            await setDoc(doc(db, 'appointments', id), { status: 'completed' }, { merge: true });
            const barberId = document.getElementById('barberFilter').value;
            const date = document.getElementById('dateFilter').value;
            loadAppointments(barberId, date);
        } catch (error) {
            console.error('Erro ao marcar como concluído:', error);
        }
    }
};

window.markNoShow = async (id) => {
    if (confirm('Marcar agendamento como não compareceu?')) {
        try {
            await setDoc(doc(db, 'appointments', id), { status: 'no-show' }, { merge: true });
            const barberId = document.getElementById('barberFilter').value;
            const date = document.getElementById('dateFilter').value;
            loadAppointments(barberId, date);
        } catch (error) {
            console.error('Erro ao marcar como não compareceu:', error);
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