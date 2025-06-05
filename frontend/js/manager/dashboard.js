import { showSection } from './utils.js';

function initDashboard(db) {
    console.log('Inicializando eventos de dashboard...');
    const navDashboard = document.getElementById('nav-dashboard');
    if (navDashboard) {
        navDashboard.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Clicou em Dashboard');
            showSection('dashboard-section');
        });
    } else {
        console.error('Elemento nav-dashboard não encontrado');
    }
}

export { initDashboard };