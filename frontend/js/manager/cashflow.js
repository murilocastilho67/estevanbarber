import { showSection } from './utils.js';

function initCashFlow(db) {
    console.log('Inicializando eventos de fluxo de caixa...');
    const navCashFlow = document.getElementById('nav-cashflow');
    if (navCashFlow) {
        navCashFlow.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Clicou em Fluxo de Caixa');
            showSection('cashflow-section');
        });
    } else {
        console.error('Elemento nav-cashflow não encontrado');
    }
}

export { initCashFlow };