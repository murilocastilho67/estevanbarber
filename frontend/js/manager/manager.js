import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { showPopup, showSection } from './utils.js';
import { initBarbers, loadBarbers, addOrUpdateBarber } from './barbers.js';
import { initAppointments, loadAppointments } from './appointments.js';
import { initServices } from './services.js';
import { initSchedules } from './schedules.js';
import { initStock, loadStockMovements, loadStockProducts } from './stock.js';
import { initCashFlow, loadCashFlowSummary } from './cashflow.js';
import { initDashboard } from './dashboard.js';

console.log('manager.js carregado - Versão: 2025-06-09');

const auth = getAuth();
console.log('Auth inicializado:', !!auth);
let db = window.db;
let isLoadingBarbers = false;

function waitForFirestore() {
    return new Promise((resolve, reject) => {
        const maxAttempts = 20;
        let attempts = 0;
        const checkDb = setInterval(() => {
            attempts++;
            db = window.db;
            if (db) {
                clearInterval(checkDb);
                console.log('Firestore inicializado com sucesso');
                resolve(db);
            } else if (attempts >= maxAttempts) {
                clearInterval(checkDb);
                reject(new Error('Firestore não inicializado após 2 segundos'));
            }
        }, 100);
    });
}

async function handleLogout() {
    console.log('Clicou em Sair');
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Erro ao sair:', error);
        showPopup('Erro ao sair: ' + error.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado - Verificando inicialização do menu');
});

auth.onAuthStateChanged((user) => {
    console.log('onAuthStateChanged disparado');
    if (!auth) {
        console.error('Auth não inicializado');
        return;
    }
    if (isLoadingBarbers) {
        console.log('loadBarbers já em andamento, ignorando chamada duplicada.');
        return;
    }
    if (!user) {
        console.error('Usuário não autenticado. Redirecionando para login...');
        window.location.href = 'index.html';
        return;
    }
    console.log('Usuário autenticado:', user.email);
    isLoadingBarbers = true;
    waitForFirestore().then((db) => {
        window.db = db; // Garante que db esteja disponível globalmente
        initBarbers(db).catch(error => {
            console.error('Erro ao inicializar barbeiros:', error);
            const barbersList = document.getElementById('barbersList');
            if (barbersList) {
                barbersList.innerHTML = '<div class="col"><p class="text-center">Erro ao inicializar barbeiros: ' + error.message + '</p></div>';
            }
        }).finally(() => {
            isLoadingBarbers = false;
            console.log('loadBarbers finalizado');
        });
    }).catch(error => {
        console.error('Erro ao esperar Firestore:', error);
        showPopup('Erro ao inicializar o painel: ' + error.message);
    });
});

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM carregado, inicializando painel do gerente...');

    try {
        db = await waitForFirestore();

        initBarbers(db);
        initAppointments(db);
        initServices(db);
        initSchedules(db);
        initStock(db);
        initCashFlow(db);
        initDashboard(db);

        loadBarbers(db);
        loadAppointments(db);

        showSection('appointments-section');

        const navLogout = document.getElementById('nav-logout');
        const logoutBtn = document.getElementById('logoutBtn');

        if (navLogout) {
            navLogout.addEventListener('click', async (e) => {
                e.preventDefault();
                await handleLogout();
            });
        } else {
            console.error('Elemento nav-logout não encontrado');
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await handleLogout();
            });
        } else {
            console.error('Elemento logoutBtn não encontrado');
        }

        const menuToggle = document.getElementById('menuToggle');
        const menuClose = document.getElementById('menuClose');
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        const mainContent = document.getElementById('mainContent');

        if (menuToggle && menuClose && sidebar && sidebarOverlay && mainContent && logoutBtn) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.add('open');
                sidebarOverlay.classList.add('active');
                menuToggle.style.display = 'none';
                logoutBtn.style.display = 'none';
            });

            menuClose.addEventListener('click', () => {
                sidebar.classList.remove('open');
                sidebarOverlay.classList.remove('active');
                menuToggle.style.display = 'block';
                logoutBtn.style.display = 'block';
            });

            sidebarOverlay.addEventListener('click', () => {
                sidebar.classList.remove('open');
                sidebarOverlay.classList.remove('active');
                menuToggle.style.display = 'block';
                logoutBtn.style.display = 'block';
            });

            const navLinks = document.querySelectorAll('#sidebar nav a');
            navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (link.classList.contains('has-subitems')) {
                        const subitemsId = link.id + '-subitems';
                        const subitems = document.getElementById(subitemsId);
                        const icon = link.querySelector('.submenu-icon');
                        if (subitems) {
                            const isOpen = subitems.style.display === 'block';
                            subitems.style.display = isOpen ? 'none' : 'block';
                            icon.classList.toggle('fa-chevron-up', isOpen);
                            icon.classList.toggle('fa-chevron-down', !isOpen);
                            icon.style.transition = 'transform 0.3s';
                            icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
                        }
                    } else if (link.id === 'nav-stock-movements') {
                        showSection('stock-section');
                        document.getElementById('stock-movements-section').style.display = 'block';
                        document.getElementById('stock-products-section').style.display = 'none';
                        loadStockMovements(db);
                    } else if (link.id === 'nav-stock-products') {
                        showSection('stock-section');
                        document.getElementById('stock-movements-section').style.display = 'none';
                        document.getElementById('stock-products-section').style.display = 'block';
                        loadStockProducts(db);
                    } else if (link.id === 'nav-cashflow-summary') {
                        showSection('cashflow-section');
                        document.getElementById('cashflow-summary-section').style.display = 'block';
                        document.getElementById('cashflow-fixed-expense-section').style.display = 'none';
                        loadCashFlowSummary(db);
                    } else if (link.id === 'nav-cashflow-fixed-expense') {
                        showSection('cashflow-section');
                        document.getElementById('cashflow-summary-section').style.display = 'none';
                        document.getElementById('cashflow-fixed-expense-section').style.display = 'block';
                    } else {
                        showSection(link.id.replace('nav-', '') + '-section');
                    }
                    if (!link.classList.contains('has-subitems')) {
                        sidebar.classList.remove('open');
                        sidebarOverlay.classList.remove('active');
                        menuToggle.style.display = 'block';
                        logoutBtn.style.display = 'block';
                    }
                });
            });
        } else {
            console.error('Elementos do menu não encontrados');
        }

        // Adicionar evento ao formulário de barbeiro
        const barberForm = document.getElementById('barberForm');
        if (barberForm) {
            barberForm.addEventListener('submit', (event) => {
                addOrUpdateBarber(db, event);
            });
        } else {
            console.error('Elemento barberForm não encontrado');
        }

        // Auto-focus no input
        const barberNameInput = document.getElementById('barberName');
        if (barberNameInput) {
            barberNameInput.focus();
        } else {
            console.error('Elemento barberNameInput não encontrado');
        }

        // Validação em tempo real
        const barberNameInputElement = document.getElementById('barberName');
        if (barberNameInputElement) {
            barberNameInputElement.addEventListener('input', async () => {
                const name = barberNameInputElement.value.trim();
                if (!name) {
                    barberNameInputElement.setCustomValidity('Campo obrigatório');
                } else {
                    const barbersSnapshot = await getDocs(collection(db, 'barbers'));
                    const existingBarber = barbersSnapshot.docs.find(doc => doc.data().name.toLowerCase() === name.toLowerCase() && doc.id !== document.getElementById('barberId').value);
                    if (existingBarber) {
                        barberNameInputElement.setCustomValidity('Nome já existente');
                    } else {
                        barberNameInputElement.setCustomValidity('');
                    }
                }
                barberNameInputElement.reportValidity();
            });
        } else {
            console.error('Elemento barberNameInput não encontrado para validação');
        }
    } catch (error) {
        console.error('Erro ao inicializar o painel do gerente:', error);
        showPopup('Erro ao inicializar o painel: ' + error.message);
    }
});