import { collection, getDocs, doc, deleteDoc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { showPopup, showSection } from './utils.js';

async function loadBarbers(db) {
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
        await loadBarbersList(db);
    } catch (error) {
        console.error('Erro ao carregar barbeiros:', error);
        showPopup('Erro ao carregar barbeiros: ' + error.message);
    }
}

async function loadBarbersList(db) {
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
                        loadBarbers(db);
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

function initBarbers(db) {
    console.log('Inicializando eventos de barbeiros...');
    const navBarbers = document.getElementById('nav-barbers');
    if (navBarbers) {
        navBarbers.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Clicou em Barbeiros');
            showSection('barbers-section');
            loadBarbers(db);
        });
    } else {
        console.error('Elemento nav-barbers não encontrado');
    }

    const barberForm = document.getElementById('barberForm');
    if (barberForm) {
        barberForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const barberId = document.getElementById('barberId').value;
            const name = document.getElementById('barberName').value;
            const id = barberId || `barber${Date.now()}`; // Usa o ID existente ou cria um novo

            try {
                await setDoc(doc(db, 'barbers', id), { id, name });
                console.log('Barbeiro salvo:', id);
                loadBarbers(db);
                document.getElementById('barberForm').reset();
                document.getElementById('barberId').value = '';
                document.getElementById('barberForm').querySelector('button[type="submit"]').textContent = 'Adicionar Barbeiro';
                showPopup('Barbeiro salvo com sucesso!');
            } catch (error) {
                console.error('Erro ao salvar barbeiro:', error);
                showPopup('Erro ao salvar barbeiro: ' + error.message);
            }
        });
    } else {
        console.error('Elemento barberForm não encontrado');
    }
}

export { initBarbers, loadBarbers };