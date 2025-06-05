import { collection, getDocs, doc, deleteDoc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { showPopup, showSection } from './utils.js';

async function loadServices(db) {
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
                        loadServices(db);
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

function initServices(db) {
    console.log('Inicializando eventos de serviços...');
    const navServices = document.getElementById('nav-services');
    if (navServices) {
        navServices.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Clicou em Serviços');
            showSection('services-section');
            loadServices(db);
        });
    } else {
        console.error('Elemento nav-services não encontrado');
    }

    const serviceForm = document.getElementById('serviceForm');
    if (serviceForm) {
        serviceForm.addEventListener('submit', async (e) => {
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
                loadServices(db);
                document.getElementById('serviceForm').reset();
                document.getElementById('serviceId').value = '';
                document.getElementById('serviceForm').querySelector('button[type="submit"]').textContent = 'Adicionar/Editar Serviço';
                showPopup('Serviço salvo com sucesso!');
            } catch (error) {
                console.error('Erro ao salvar serviço:', error);
                showPopup('Erro ao salvar serviço: ' + error.message);
            }
        });
    } else {
        console.error('Elemento serviceForm não encontrado');
    }
}

export { initServices, loadServices };