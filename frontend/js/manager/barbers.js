import { collection, getDocs, query, where, doc, setDoc, deleteDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { showPopup } from './utils.js';

export async function initBarbers(db) {
    console.log('Inicializando gerenciamento de barbeiros');
    window.db = db;
    await loadBarbers(db);
}

export async function loadBarbers(db) {
    try {
        if (!db) throw new Error('Firestore não inicializado');
        console.log('Carregando barbeiros...');
        const barbersList = document.getElementById('barbersList');
        barbersList.innerHTML = '';
        const barbersSnapshot = await getDocs(collection(db, 'barbers'));
        if (barbersSnapshot.empty) {
            barbersList.innerHTML = '<div class="col"><p class="text-center">Nenhum barbeiro encontrado.</p></div>';
            return;
        }
        barbersSnapshot.forEach((docSnapshot) => {
            const barber = docSnapshot.data();
            const card = document.createElement('div');
            card.className = 'col';
            card.innerHTML = `
                <div class="card barber-card">
                    <div class="card-body text-center">
                        <div class="barber-photo">${barber.name.charAt(0)}</div>
                        <h5 class="card-title barber-name">${barber.name}</h5>
                        <div class="barber-actions">
                            <button class="btn btn-outline-secondary btn-sm edit-btn" title="Editar" data-id="${barber.id}"><i class="fas fa-pen"></i></button>
                            <button class="btn btn-outline-danger btn-sm delete-btn" title="Excluir" data-id="${barber.id}"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                </div>
            `;
            barbersList.appendChild(card);
        });

        // Adicionar eventos aos botões
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                console.log('Editar barbeiro ID:', btn.dataset.id);
                const name = btn.closest('.card').querySelector('.barber-name').textContent;
                document.getElementById('barberId').value = btn.dataset.id;
                document.getElementById('barberName').value = name;
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                console.log('Excluir barbeiro ID:', btn.dataset.id);
                const confirmed = await showPopup('Tem certeza que deseja excluir este barbeiro?', true, () => {
                    deleteBarber(db, btn.dataset.id);
                });
                if (confirmed) {
                    deleteBarber(db, btn.dataset.id);
                }
            });
        });
    } catch (error) {
        console.error('Erro ao carregar barbeiros:', error);
        const barbersList = document.getElementById('barbersList');
        if (barbersList) {
            barbersList.innerHTML = '<div class="col"><p class="text-center">Erro ao carregar barbeiros: ' + error.message + '</p></div>';
        }
    }
}

async function deleteBarber(db, barberId) {
    try {
        await deleteDoc(doc(db, 'barbers', barberId));
        console.log('Barbeiro excluído com ID:', barberId);
        await loadBarbers(db);
    } catch (error) {
        console.error('Erro ao excluir barbeiro:', error);
        showPopup('Erro ao excluir barbeiro: ' + error.message);
    }
}

export async function addOrUpdateBarber(db, event) {
    event.preventDefault();
    try {
        const name = document.getElementById('barberName').value.trim();
        const barberId = document.getElementById('barberId').value;

        if (!name) {
            showPopup('Campo obrigatório: Nome do barbeiro.');
            return;
        }

        // Verifica se o nome já existe (exceto se for edição do mesmo barbeiro)
        const barbersSnapshot = await getDocs(collection(db, 'barbers'));
        const existingBarber = barbersSnapshot.docs.find(doc => doc.data().name.toLowerCase() === name.toLowerCase() && doc.id !== barberId);
        if (existingBarber) {
            showPopup('Nome já existente. Escolha outro nome.');
            return;
        }

        if (barberId) {
            // Atualização
            await setDoc(doc(db, 'barbers', barberId), { name }, { merge: true });
            console.log('Barbeiro atualizado com ID:', barberId);
        } else {
            // Adição
            const newId = `barber${Date.now()}`;
            await setDoc(doc(db, 'barbers', newId), { id: newId, name });
            console.log('Novo barbeiro adicionado com ID:', newId);
        }

        document.getElementById('barberId').value = '';
        document.getElementById('barberName').value = '';
        await loadBarbers(db);
    } catch (error) {
        console.error('Erro ao adicionar/atualizar barbeiro:', error);
        showPopup('Erro ao adicionar/atualizar barbeiro: ' + error.message);
    }
}