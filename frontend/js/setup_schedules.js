import { collection, doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const db = window.db;

async function setupSchedules() {
    const schedules = [
        { id: 'sched1', dayOfWeek: 'Monday', startTime: '14:00', endTime: '21:00', breakStart: null, breakEnd: null },
        { id: 'sched2', dayOfWeek: 'Tuesday', startTime: '09:00', endTime: '21:00', breakStart: '12:00', breakEnd: '14:00' },
        { id: 'sched3', dayOfWeek: 'Wednesday', startTime: '09:00', endTime: '21:00', breakStart: '12:00', breakEnd: '14:00' },
        { id: 'sched4', dayOfWeek: 'Thursday', startTime: '09:00', endTime: '21:00', breakStart: '12:00', breakEnd: '14:00' },
        { id: 'sched5', dayOfWeek: 'Friday', startTime: '09:00', endTime: '21:00', breakStart: '12:00', breakEnd: '14:00' },
        { id: 'sched6', dayOfWeek: 'Saturday', startTime: '08:00', endTime: '17:00', breakStart: null, breakEnd: null }
    ];

    try {
        for (const sched of schedules) {
            await setDoc(doc(db, 'schedules', sched.id), sched);
            console.log(`Horário ${sched.dayOfWeek} adicionado`);
        }
        alert('Horários cadastrados com sucesso!');
    } catch (error) {
        console.error('Erro ao cadastrar horários:', error);
        alert('Erro ao cadastrar horários: ' + error.message);
    }
}

setupSchedules();