import { collection, getDocs, doc, deleteDoc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { showPopup, showSection, dayOfWeekPt, dayOfWeekEn } from './utils.js';

let displayedScheduleIds = new Set(); // Para rastrear IDs já exibidos

async function loadSchedules(db) {
    try {
        console.log('Carregando horários...');
        const schedulesList = document.getElementById('schedulesList');
        schedulesList.innerHTML = '';
        displayedScheduleIds.clear(); // Limpa o Set antes de recarregar
        const schedulesSnapshot = await getDocs(collection(db, 'schedules'));
        if (schedulesSnapshot.empty) {
            schedulesList.innerHTML = '<p>Nenhum horário cadastrado.</p>';
            return;
        }

        for (const docSnapshot of schedulesSnapshot.docs) {
            const sched = docSnapshot.data();
            if (!displayedScheduleIds.has(docSnapshot.id)) { // Validação pra evitar duplicação
                displayedScheduleIds.add(docSnapshot.id); // Marca o ID como exibido
                const dayPt = dayOfWeekPt[sched.dayOfWeek] || sched.dayOfWeek;
                const barberDoc = await getDoc(doc(db, 'barbers', sched.barberId));
                const barberName = barberDoc.exists() ? barberDoc.data().name : sched.barberId;
                const card = document.createElement('div');
                card.className = 'schedule-card';
                card.innerHTML = `
                    <div class="schedule-header">
                        <i class="fas fa-calendar-day"></i> ${dayPt} — <strong>${barberName}</strong>
                    </div>
                    <div class="schedule-time">
                        <i class="fas fa-clock"></i> ${sched.startTime} - ${sched.endTime}
                    </div>
                    <div class="schedule-break">
                        <i class="fas fa-pause-circle"></i> Pausa: ${sched.breakStart ? `${sched.breakStart} - ${sched.breakEnd}` : '—'}
                    </div>
                    <div class="card-actions">
                        <button class="edit-btn" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="delete-btn" title="Excluir"><i class="fas fa-trash-alt"></i></button>
                    </div>
                `;
                schedulesList.appendChild(card);
            }
        }

        // Adiciona eventos aos botões de excluir
        document.querySelectorAll('.delete-schedule').forEach(btn => {
            btn.addEventListener('click', async () => {
                const confirmed = await showPopup('Excluir horário?', true);
                if (confirmed) {
                    try {
                        await deleteDoc(doc(db, 'schedules', btn.dataset.id));
                        console.log('Horário excluído:', btn.dataset.id);
                        loadSchedules(db);
                        showPopup('Horário excluído com sucesso!');
                    } catch (error) {
                        console.error('Erro ao excluir horário:', error);
                        showPopup('Erro ao excluir horário: ' + error.message);
                    }
                }
            });
        });

        // Adiciona eventos aos botões de editar (precisa ser ajustado pra nova estrutura)
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const card = btn.closest('.schedule-card');
                const dayOfWeek = card.querySelector('.schedule-header').textContent.split(' — ')[0].replace('<i class="fas fa-calendar-day"></i> ', '');
                const barberId = Object.keys(dayOfWeekEn).find(key => dayOfWeekEn[key] === dayOfWeek) || dayOfWeek;
                const startTime = card.querySelector('.schedule-time').textContent.split(' - ')[0].replace('<i class="fas fa-clock"></i> ', '');
                const endTime = card.querySelector('.schedule-time').textContent.split(' - ')[1];
                const breakStart = card.querySelector('.schedule-break').textContent.includes('-') ? card.querySelector('.schedule-break').textContent.split(' - ')[1].split(' ')[0] : '';
                const breakEnd = card.querySelector('.schedule-break').textContent.includes('-') ? card.querySelector('.schedule-break').textContent.split(' - ')[2] : '';
                window.editSchedule(card.dataset.id, dayOfWeek, barberId, startTime, endTime, breakStart, breakEnd);
            });
        });
    } catch (error) {
        console.error('Erro ao carregar horários:', error);
        showPopup('Erro ao carregar horários: ' + error.message);
    }
}

async function setupSchedules(db) {
    const schedules = [
        { id: 'sched1_b1', barberId: 'barber1751245788149', dayOfWeek: 'Monday', startTime: '14:00', endTime: '21:00', breakStart: null, breakEnd: null },
        { id: 'sched2_b1', barberId: 'barber1751245788149', dayOfWeek: 'Tuesday', startTime: '09:00', endTime: '21:00', breakStart: '12:00', breakEnd: '14:00' },
        { id: 'sched3_b1', barberId: 'barber1751245788149', dayOfWeek: 'Wednesday', startTime: '09:00', endTime: '21:00', breakStart: '12:00', breakEnd: '14:00' },
        { id: 'sched4_b1', barberId: 'barber1751245788149', dayOfWeek: 'Thursday', startTime: '09:00', endTime: '21:00', breakStart: '12:00', breakEnd: '14:00' },
        { id: 'sched5_b1', barberId: 'barber1751245788149', dayOfWeek: 'Friday', startTime: '09:00', endTime: '21:00', breakStart: '12:00', breakEnd: '14:00' },
        { id: 'sched6_b1', barberId: 'barber1751245788149', dayOfWeek: 'Saturday', startTime: '08:00', endTime: '17:00', breakStart: null, breakEnd: null },
        { id: 'sched1_b2', barberId: 'barber1751245793912', dayOfWeek: 'Monday', startTime: '15:00', endTime: '20:00', breakStart: null, breakEnd: null },
        { id: 'sched2_b2', barberId: 'barber1751245793912', dayOfWeek: 'Tuesday', startTime: '10:00', endTime: '18:00', breakStart: '13:00', breakEnd: '14:00' },
        { id: 'sched3_b2', barberId: 'barber1751245793912', dayOfWeek: 'Wednesday', startTime: '10:00', endTime: '18:00', breakStart: '13:00', breakEnd: '14:00' },
        { id: 'sched4_b2', barberId: 'barber1751245793912', dayOfWeek: 'Thursday', startTime: '10:00', endTime: '18:00', breakStart: '13:00', breakEnd: '14:00' },
        { id: 'sched5_b2', barberId: 'barber1751245793912', dayOfWeek: 'Friday', startTime: '10:00', endTime: '18:00', breakStart: '13:00', breakEnd: '14:00' },
        { id: 'sched6_b2', barberId: 'barber1751245793912', dayOfWeek: 'Saturday', startTime: '09:00', endTime: '16:00', breakStart: null, breakEnd: null }
    ];

    try {
        for (const sched of schedules) {
            await setDoc(doc(db, 'schedules', sched.id), sched);
            console.log(`Horário ${sched.dayOfWeek} (Barbeiro ${sched.barberId}) adicionado`);
        }
        showPopup('Horários cadastrados com sucesso!');
        loadSchedules(db);
    } catch (error) {
        console.error('Erro ao cadastrar horários:', error);
        showPopup('Erro ao cadastrar horários: ' + error.message);
    }
}

function initSchedules(db) {
    console.log('Inicializando eventos de horários...');
    const navSchedules = document.getElementById('nav-schedules');
    if (navSchedules) {
        navSchedules.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Clicou em Horários');
            showSection('schedules-section');
            loadSchedules(db);
        });
    } else {
        console.error('Elemento nav-schedules não encontrado');
    }

    const setupSchedulesBtn = document.getElementById('setupSchedules');
    if (setupSchedulesBtn) {
        setupSchedulesBtn.addEventListener('click', async () => {
            const confirmed = await showPopup('Cadastrar horários padrão? Isso pode sobrescrever horários existentes.', true);
            if (confirmed) {
                setupSchedules(db);
            }
        });
    } else {
        console.error('Elemento setupSchedules não encontrado');
    }

    const scheduleForm = document.getElementById('scheduleForm');
    if (scheduleForm) {
        scheduleForm.addEventListener('submit', async (e) => {
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
                loadSchedules(db);
                document.getElementById('scheduleForm').reset();
                document.getElementById('scheduleId').value = '';
                showPopup('Horário salvo com sucesso!');
            } catch (error) {
                console.error('Erro ao salvar horário:', error);
                showPopup('Erro ao salvar horário: ' + error.message);
            }
        });
    } else {
        console.error('Elemento scheduleForm não encontrado');
    }
}

function editSchedule(id, dayOfWeek, barberId, startTime, endTime, breakStart, breakEnd) {
    document.getElementById('scheduleId').value = id;
    const dayPt = Object.keys(dayOfWeekEn).find(key => dayOfWeekEn[key] === dayOfWeek) || dayOfWeek;
    document.getElementById('dayOfWeek').value = dayPt;
    document.getElementById('scheduleBarber').value = barberId;
    document.getElementById('startTime').value = startTime;
    document.getElementById('endTime').value = endTime;
    document.getElementById('breakStart').value = breakStart || '';
    document.getElementById('breakEnd').value = breakEnd || '';
}

window.editSchedule = editSchedule;

export { initSchedules, loadSchedules };