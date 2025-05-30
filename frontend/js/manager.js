import { collection, getDocs, doc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

const auth = getAuth();
const db = window.db;

async function loadBarbers() {
    try {
        const barberSelect = document.getElementById('barberFilter');
        const serviceBarberSelect = document.getElementById('serviceBarber');
        const barbersSnapshot = await getDocs(collection(db, 'barbers'));
        barberSelect.innerHTML = '<option value="all">Todos</option>';
        serviceBarberSelect.innerHTML = '';
        barbersSnapshot.forEach((doc) => {
            const barber = doc.data();
            const option = document.createElement('option');
            option.value = barber.id;
            option.textContent = barber.name;
            barberSelect.appendChild(option);
            serviceBarberSelect.appendChild(option.cloneNode(true));
        });
        loadBarbersList();
    } catch (error) {
        console.error('Erro ao carregar barbeiros:', error);
    }
}

async function loadBarbersList() {
    try {
        const barbersList = document.getElementById('barbersList');
        barbersList.innerHTML = '';
        const barbersSnapshot = await getDocs(collection(db, 'barbers'));
        barbersSnapshot.forEach((doc) => {
            const barber = doc.data();
            const div = document.createElement('div');
            div.textContent = barber.name;
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Excluir';
            deleteBtn.className = 'action-btn';
            deleteBtn.onclick = async () => {
                if (confirm('Excluir barbeiro?')) {
                    await deleteDoc(doc(db, 'barbers', doc.id));
                    loadBarbers();
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
        const appointmentsList = document.getElementById('appointmentsList').querySelector('tbody');
        appointmentsList.innerHTML = '';
        const appointmentsSnapshot = await getDocs(collection(db, 'appointments'));
        let totalAppointments = 0;
        let totalRevenue = 0;

        for (const doc of appointmentsSnapshot.docs) {
            const appt = doc.data();
            if ((barberId === 'all' || appt.barberId === barberId) && (!date || appt.date === date)) {
                const userDoc = await getDoc(doc(db, 'users', appt.userId));
                const userName = userDoc.exists() ? userDoc.data().name : 'Desconhecido';
                const services = appt.services.map(s => s.name).join(', ');
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${userName}</td>
                    <td>${services}</td>
                    <td>${appt.date}</td>
                    <td>${appt.time}</td>
                    <td>R$${appt.totalPrice.toFixed(2)}</td>
                    <td>${appt.status}</td>
                    <td>
                        <button class="action-btn" onclick="cancelAppointment('${doc.id}')">Cancelar</button>
                    </td>
                `;
                appointmentsList.appendChild(row);
                totalAppointments++;
                totalRevenue += appt.totalPrice;
            }
        }

        document.getElementById('totalAppointments').textContent = totalAppointments;
        document.getElementById('totalRevenue').textContent = totalRevenue.toFixed(2);
    } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
    }
}

async function loadServices() {
    try {
        const servicesList = document.getElementById('servicesList');
        servicesList.innerHTML = '';
        const servicesSnapshot = await getDocs(collection(db, 'services'));
        servicesSnapshot.forEach((doc) => {
            const service = doc.data();
            const div = document.createElement('div');
            div.textContent = `${service.name} (Barbeiro ${service.barberId}) - R$${service.price.toFixed(2)} (${service.duration} min)`;
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Excluir';
            deleteBtn.className = 'action-btn';
            deleteBtn.onclick = async () => {
                if (confirm('Excluir serviço?')) {
                    await deleteDoc(doc(db, 'services', doc.id));
                    loadServices();
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
        const schedulesList = document.getElementById('schedulesList').querySelector('tbody');
        schedulesList.innerHTML = '';
        const schedulesSnapshot = await getDocs(collection(db, 'schedules'));
        schedulesSnapshot.forEach((doc) => {
            const sched = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${sched.dayOfWeek}</td>
                <td>${sched.startTime}</td>
                <td>${sched.endTime}</td>
                <td>${sched.breakStart ? `${sched.breakStart}-${sched.breakEnd}` : 'Nenhuma'}</td>
            `;
            schedulesList.appendChild(row);
        });
    } catch (error) {
        console.error('Erro ao carregar horários:', error);
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
    const dayOfWeek = document.getElementById('dayOfWeek').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const breakStart = document.getElementById('breakStart').value || null;
    const breakEnd = document.getElementById('breakEnd').value || null;
    const id = `sched${Date.now()}`;

    try {
        await setDoc(doc(db, 'schedules', id), { id, dayOfWeek, startTime, endTime, breakStart, breakEnd });
        loadSchedules();
        document.getElementById('scheduleForm').reset();
    } catch (error) {
        console.error('Erro ao adicionar horário:', error);
    }
});

document.getElementById('logout').addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Erro ao sair:', error);
    }
});

window.cancelAppointment = async (id) => {
    if (confirm('Cancelar agendamento?')) {
        try {
            await deleteDoc(doc(db, 'appointments', id));
            const barberId = document.getElementById('barberFilter').value;
            const date = document.getElementById('dateFilter').value;
            loadAppointments(barberId, date);
        } catch (error) {
            console.error('Erro ao cancelar agendamento:', error);
        }
    }
};

loadBarbers();
loadAppointments();
loadServices();
loadSchedules();