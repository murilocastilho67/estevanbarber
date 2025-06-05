import { showSection } from './utils.js';

function initStock(db) {
    console.log('Inicializando eventos de estoque...');
    const navStock = document.getElementById('nav-stock');
    if (navStock) {
        navStock.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Clicou em Estoque');
            showSection('stock-section');
        });
    } else {
        console.error('Elemento nav-stock não encontrado');
    }
}

export { initStock };