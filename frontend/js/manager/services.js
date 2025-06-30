import { collection, getDocs, doc, deleteDoc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { showPopup, showSection } from './utils.js';

let isServiceFormInitialized = false;

export async function initServices(db) {
    console.log('Inicializando eventos de serviços...');
    window.db = db;
    await loadBarbersForSelect(db); // Garante que o select seja carregado
    const serviceForm = document.getElementById('serviceForm');
    if (serviceForm && !isServiceFormInitialized) {
        serviceForm.addEventListener('submit', (event) => addOrUpdateService(db, event));
        isServiceFormInitialized = true; // Marca como inicializado
    }
    document.getElementById('servicesList').addEventListener('click', handleServiceActions);
}

async function loadBarbersForSelect(db) {
    const barberSelect = document.getElementById('serviceBarber');
    if (!barberSelect) return;
    barberSelect.innerHTML = '<option value="">Selecione um barbeiro</option>';
    try {
        const barbersSnapshot = await getDocs(collection(db, 'barbers'));
        if (barbersSnapshot.empty) {
            console.warn('Nenhum barbeiro encontrado para o select.');
        } else {
            barbersSnapshot.forEach(doc => {
                const barber = doc.data();
                const option = document.createElement('option');
                option.value = barber.id;
                option.textContent = barber.name;
                barberSelect.appendChild(option);
            });
            console.log('Select de barbeiros preenchido com:', barbersSnapshot.docs.map(doc => doc.data().name));
        }
    } catch (error) {
        console.error('Erro ao carregar barbeiros para o select:', error);
    }
}

export async function loadServices(db) {
    try {
        console.log('Carregando serviços...');
        const servicesList = document.getElementById('servicesList');
        servicesList.innerHTML = ''; // Limpa a lista antes de recarregar
        const servicesSnapshot = await getDocs(collection(db, 'services'));
        if (servicesSnapshot.empty) {
            servicesList.innerHTML = '<p class="text-center">Nenhum serviço encontrado.</p>';
            return;
        }

        for (const docSnapshot of servicesSnapshot.docs) {
            const service = docSnapshot.data();
            console.log('Service barberId:', service.barberId); // Depuração
            const barberDoc = await getDoc(doc(db, 'barbers', service.barberId));
            const barberName = barberDoc.exists() ? barberDoc.data().name : 'Desconhecido';
            const icon = '✂️'; // [PRINT] Fixa a tesoura como ícone padrão pra todos os serviços
            const card = document.createElement('div');
            card.className = 'service-card';
            card.setAttribute('data-id', docSnapshot.id);
            card.innerHTML = `
                <div class="service-info">
                    <h4>${icon} ${service.name}</h4> <!-- [PRINT] Tesoura aparece aqui pra todos os serviços -->
                    <p>Barbeiro: ${barberName}</p>
                    <p><strong>💵 R$ ${service.price.toFixed(2)}</strong> • ⏱️ ${service.duration} min</p>
                </div>
                <div class="service-actions">
                    <button class="btn btn-outline-secondary btn-sm edit-service" title="Editar serviço"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-outline-danger btn-sm delete-service" title="Excluir serviço"><i class="fas fa-trash-alt"></i></button>
                </div>
            `;
            servicesList.appendChild(card);
        }
    } catch (error) {
        console.error('Erro ao carregar serviços ou coleção não encontrada:', error);
        const servicesList = document.getElementById('servicesList');
        if (servicesList) {
            servicesList.innerHTML = '<p class="text-center">Erro ao carregar serviços ou coleção não encontrada.</p>';
        }
    }
}

async function addOrUpdateService(db, event) {
    event.preventDefault();
    try {
        const serviceId = document.getElementById('serviceId').value;
        const barberId = document.getElementById('serviceBarber').value;
        const name = document.getElementById('serviceName').value.trim();
        const price = parseFloat(document.getElementById('servicePrice').value);
        const duration = parseInt(document.getElementById('serviceDuration').value);

        // Validação visual
        let isValid = true;
        if (!name) {
            document.getElementById('serviceName').classList.add('is-invalid');
            isValid = false;
        } else {
            document.getElementById('serviceName').classList.remove('is-invalid');
        }
        if (!barberId) {
            document.getElementById('serviceBarber').classList.add('is-invalid');
            isValid = false;
        } else {
            document.getElementById('serviceBarber').classList.remove('is-invalid');
        }
        if (isNaN(price) || price <= 0) {
            document.getElementById('servicePrice').classList.add('is-invalid');
            isValid = false;
        } else {
            document.getElementById('servicePrice').classList.remove('is-invalid');
        }
        if (isNaN(duration) || duration <= 0) {
            document.getElementById('serviceDuration').classList.add('is-invalid');
            isValid = false;
        } else {
            document.getElementById('serviceDuration').classList.remove('is-invalid');
        }

        if (!isValid) return;

        console.log('Salvando serviço - ID:', serviceId, 'BarberId:', barberId, 'Nome:', name); // Depuração
        const id = serviceId || `service${Date.now()}`;
        await setDoc(doc(db, 'services', id), { id, barberId, name, price, duration });
        console.log('Serviço salvo com ID:', id);
        loadServices(db);
        document.getElementById('serviceForm').reset();
        document.getElementById('serviceId').value = '';
        document.getElementById('serviceForm').querySelector('button[type="submit"]').textContent = 'Adicionar/Editar Serviço';
        showPopup('Serviço salvo com sucesso!');
    } catch (error) {
        console.error('Erro ao salvar serviço:', error);
        showPopup('Erro ao salvar serviço: ' + error.message);
    }
}

function handleServiceActions(event) {
    const target = event.target;
    if (target.classList.contains('edit-service')) {
        editService(target.closest('.service-card').dataset.id);
    } else if (target.classList.contains('delete-service')) {
        deleteService(target.closest('.service-card').dataset.id);
    }
}

async function editService(serviceId) {
    const serviceDoc = await getDoc(doc(db, 'services', serviceId));
    if (serviceDoc.exists()) {
        const service = serviceDoc.data();
        document.getElementById('serviceId').value = serviceId;
        document.getElementById('serviceBarber').value = service.barberId || '';
        document.getElementById('serviceName').value = service.name;
        document.getElementById('servicePrice').value = service.price;
        document.getElementById('serviceDuration').value = service.duration;
        document.getElementById('serviceForm').querySelector('button[type="submit"]').textContent = 'Salvar Alterações';
        await loadBarbersForSelect(db); // Recarrega o select ao editar
    }
}

async function deleteService(serviceId) {
    const confirmed = await showPopup('Tem certeza que deseja excluir este serviço?', true, () => {
        const card = document.querySelector(`.service-card[data-id="${serviceId}"]`);
        if (card) card.classList.add('fade-out');
        setTimeout(async () => {
            await deleteDoc(doc(db, 'services', serviceId));
            console.log('Serviço excluído com ID:', serviceId);
            await loadServices(db);
        }, 300);
    });
    if (!confirmed) {
        const card = document.querySelector(`.service-card[data-id="${serviceId}"]`);
        if (card) card.classList.remove('fade-out');
    }
}