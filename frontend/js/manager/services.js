import { collection, getDocs, doc, deleteDoc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { showPopup, showSection, getFirestoreDb } from './utils.js'; // Importe getFirestoreDb

let isServiceFormInitialized = false;
let displayedServiceIds = new Set( );

export async function initServices(db) {
  console.log('Inicializando eventos de serviços...');
  // Não é necessário window.db = db aqui, pois getFirestoreDb() será usado
  await loadBarbersForSelect(); // Chama sem 'db', pois getFirestoreDb() será usado internamente
  const serviceForm = document.getElementById("serviceForm");
  if (serviceForm && !isServiceFormInitialized) {
    serviceForm.addEventListener("submit", (event) => addOrUpdateService(getFirestoreDb(), event)); // Passa a instância do DB
    isServiceFormInitialized = true;
  }
  document.getElementById("nav-services").addEventListener("click", async () => {
    await loadBarbersForSelect(); // Recarrega barbeiros para selects
    await loadServices(getFirestoreDb()); // Recarrega serviços
  });
  document.getElementById('servicesList').addEventListener('click', handleServiceActions);
}

export async function loadBarbersForSelect() {
  console.log('Carregando barbeiros para selects...');
  const db = getFirestoreDb(); // Obtém a instância do Firestore
  if (!db) {
      console.error("Firestore DB não disponível em loadBarbersForSelect.");
      return;
  }

  const selects = [
    document.getElementById('serviceBarber'),
    document.getElementById('scheduleBarber'),
    document.getElementById('barberFilter')
  ];

  selects.forEach(select => {
    if (select) {
      // Limpa e adiciona a opção padrão "Selecione um barbeiro" ou "Todos"
      select.innerHTML = '';
      const defaultOption = document.createElement('option');
      if (select.id === 'barberFilter') {
        defaultOption.value = 'all';
        defaultOption.textContent = 'Todos';
      } else {
        defaultOption.value = '';
        defaultOption.textContent = 'Selecione um barbeiro';
      }
      select.appendChild(defaultOption);
    }
  });

  try {
    const barbersSnapshot = await getDocs(collection(db, 'barbers'));
    if (barbersSnapshot.empty) {
      console.warn('Nenhum barbeiro encontrado para o select.');
    } else {
      barbersSnapshot.forEach(doc => {
        const barber = doc.data();
        selects.forEach(select => {
          if (select) {
            const option = document.createElement('option');
            option.value = doc.id; // ✅ CORREÇÃO: SEMPRE usar o doc.id real!
            option.textContent = barber.name;
            select.appendChild(option);
          }
        });
      });
      console.log('Select de barbeiros preenchido com:', barbersSnapshot.docs.map(doc => doc.data().name));
    }
  } catch (error) {
    console.error('Erro ao carregar barbeiros para o select:', error);
  }
}

export async function loadServices(db) {
  const currentDb = db || getFirestoreDb(); // Garante que db seja usado se passado, ou obtido
  if (!currentDb) {
      console.error("Firestore DB não disponível em loadServices.");
      return;
  }

  try {
    console.log('Carregando serviços...');
    const servicesList = document.getElementById('servicesList');
    servicesList.innerHTML = '';
    displayedServiceIds.clear();
    const servicesSnapshot = await getDocs(collection(currentDb, 'services')); // Usa currentDb
    if (servicesSnapshot.empty) {
      servicesList.innerHTML = '<p class="text-center">Nenhum serviço encontrado.</p>';
      return;
    }

    for (const docSnapshot of servicesSnapshot.docs) {
      const service = docSnapshot.data();
      const barberDoc = await getDoc(doc(currentDb, 'barbers', service.barberId)); // Usa currentDb
      const barberName = barberDoc.exists() ? barberDoc.data().name : 'Desconhecido';
      const icon = '✂️';
      if (!displayedServiceIds.has(docSnapshot.id)) {
        displayedServiceIds.add(docSnapshot.id);
        const card = document.createElement("div");
        card.className = "card";
        card.setAttribute("data-id", docSnapshot.id);
        card.innerHTML = `
          <div class="card-info">
            <h4>${icon} ${service.name}</h4>
            <p>Barbeiro: ${barberName}</p>
            <p><strong>💵 R$ ${service.price.toFixed(2)}</strong> • ⏱️ ${service.duration} min</p>
          </div>
          <div class="card-actions">
            <button class="action-btn btn-edit" data-id="${docSnapshot.id}" title="Editar serviço"><i class="fas fa-edit"></i></button>
            <button class="action-btn btn-delete" data-id="${docSnapshot.id}" title="Excluir serviço"><i class="fas fa-trash-alt"></i></button>
          </div>
        `;
        servicesList.appendChild(card);
      }
    }
  } catch (error) {
    console.error('Erro ao carregar serviços ou coleção não encontrada:', error);
    const servicesList = document.getElementById('servicesList');
    if (servicesList) {
      servicesList.innerHTML = '<p class="text-center">Erro ao carregar serviços ou coleção não encontrada.</p>';
    }
  }
}

async function addOrUpdateService(db, event) { // Recebe 'db' como argumento
  event.preventDefault();
  try {
    const serviceId = document.getElementById('serviceId').value;
    const barberId = document.getElementById('serviceBarber').value;
    const name = document.getElementById('serviceName').value.trim();
    const price = parseFloat(document.getElementById('servicePrice').value);
    const duration = parseInt(document.getElementById('serviceDuration').value);

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

    const id = serviceId || `service${Date.now()}`;
    await setDoc(doc(db, 'services', id), { id, barberId, name, price, duration }); // Usa 'db'
    loadServices(db); // Usa 'db'
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
  // Verifica se o clique foi em um botão de ação (edit ou delete)
  if (target.closest('.btn-edit')) {
    editService(target.closest('.btn-edit').dataset.id);
  } else if (target.closest('.btn-delete')) {
    deleteService(target.closest('.btn-delete').dataset.id);
  }
}

async function editService(serviceId) {
  const db = getFirestoreDb(); // Obtém a instância do Firestore
  if (!db) {
      console.error("Firestore DB não disponível em editService.");
      return;
  }
  const serviceDoc = await getDoc(doc(db, 'services', serviceId)); // Usa 'db'
  if (serviceDoc.exists()) {
    const service = serviceDoc.data();
    document.getElementById('serviceId').value = serviceId;
    document.getElementById('serviceBarber').value = service.barberId || '';
    document.getElementById('serviceName').value = service.name;
    document.getElementById('servicePrice').value = service.price;
    document.getElementById('serviceDuration').value = service.duration;
    document.getElementById('serviceForm').querySelector('button[type="submit"]').textContent = 'Salvar Alterações';
    await loadBarbersForSelect(); // Recarrega barbeiros para selects, usando getFirestoreDb() internamente
  }
}

async function deleteService(serviceId) {
  const db = getFirestoreDb(); // Obtém a instância do Firestore
  if (!db) {
      console.error("Firestore DB não disponível em deleteService.");
      return;
  }
  const confirmed = await showPopup('Tem certeza que deseja excluir este serviço?', true);
  if (confirmed) {
    try {
      const card = document.querySelector(`.card[data-id="${serviceId}"]`); // Ajustado para .card
      if (card) card.classList.add('fade-out');
      await deleteDoc(doc(db, 'services', serviceId)); // Usa 'db'
      console.log('Serviço excluído com ID:', serviceId);
      await loadServices(db); // Usa 'db'
      showPopup('Serviço excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir serviço:', error);
      showPopup('Erro ao excluir serviço: ' + error.message);
    }
  }
}
