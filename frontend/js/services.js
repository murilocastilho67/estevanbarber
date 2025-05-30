import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const db = window.db;

async function loadBarbers() {
    try {
        const barberSelect = document.getElementById('barber');
        const barbersSnapshot = await getDocs(collection(db, 'barbers'));
        barberSelect.innerHTML = ''; // Limpa opções existentes
        barbersSnapshot.forEach((doc) => {
            const barber = doc.data();
            const option = document.createElement('option');
            option.value = barber.id;
            option.textContent = barber.name;
            barberSelect.appendChild(option);
        });
        // Carrega serviços do primeiro barbeiro por padrão
        if (barbersSnapshot.docs.length > 0) {
            loadServices(barbersSnapshot.docs[0].data().id);
        }
    } catch (error) {
        console.error('Erro ao carregar barbeiros:', error);
        alert('Erro ao carregar barbeiros');
    }
}

async function loadServices(barberId) {
    try {
        const servicesList = document.getElementById('servicesList');
        servicesList.innerHTML = ''; // Limpa lista
        const servicesSnapshot = await getDocs(collection(db, 'services'));
        let totalPrice = 0;
        let totalTime = 0;

        servicesSnapshot.forEach((doc) => {
            const service = doc.data();
            if (service.barberId === barberId) {
                const div = document.createElement('div');
                div.innerHTML = `
                    <input type="checkbox" id="${service.id}" value="${service.id}">
                    <label for="${service.id}">${service.name} - R$${service.price.toFixed(2)} (${service.duration} min)</label>
                `;
                servicesList.appendChild(div);

                // Atualiza totais quando marcar/desmarcar
                div.querySelector('input').addEventListener('change', () => {
                    if (div.querySelector('input').checked) {
                        totalPrice += service.price;
                        totalTime += service.duration;
                    } else {
                        totalPrice -= service.price;
                        totalTime -= service.duration;
                    }
                    document.getElementById('totalPrice').textContent = totalPrice.toFixed(2);
                    document.getElementById('totalTime').textContent = totalTime;
                    document.getElementById('chooseSchedule').disabled = totalPrice === 0;
                });
            }
        });
    } catch (error) {
        console.error('Erro ao carregar serviços:', error);
        alert('Erro ao carregar serviços');
    }
}

document.getElementById('barber').addEventListener('change', (e) => {
    loadServices(e.target.value);
});

document.getElementById('chooseSchedule').addEventListener('click', () => {
    document.getElementById('calendar').style.display = 'block';
});

document.getElementById('next').addEventListener('click', () => {
    alert('Indo para confirmação...');
    window.location.href = 'confirmation.html';
});

// Carrega barbeiros ao iniciar
loadBarbers();