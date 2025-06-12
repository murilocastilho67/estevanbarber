import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { showPopup, showSection } from './utils.js';
import { initBarbers, loadBarbers } from './barbers.js';
import { initAppointments, loadAppointments } from './appointments.js';
import { initServices } from './services.js';
import { initSchedules } from './schedules.js';
import { initStock, loadStockMovements, loadStockProducts } from './stock.js';
import { initCashFlow, loadCashFlow } from './cashflow.js';
import { initDashboard } from './dashboard.js';

console.log('manager.js carregado - Versão: 2025-06-09');

const auth = getAuth();
console.log('Auth inicializado:', !!auth);
let db = window.db;
let isLoadingBarbers = false; // Declarando a variável global

// Função pra esperar o Firestore estar inicializado
function waitForFirestore() {
    return new Promise((resolve, reject) => {
        const maxAttempts = 20; // Máximo de tentativas (2 segundos)
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
        }, 100); // Verifica a cada 100ms
    });
}

// Função de logout
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
        loadBarbers(db).catch(error => {
            console.error('Erro no onAuthStateChanged:', error);
            const servicesList = document.getElementById('servicesList');
            if (servicesList) {
                servicesList.innerHTML = '<p>Erro ao verificar autenticação: ' + error.message + '</p>';
            }
        }).finally(() => {
            isLoadingBarbers = false;
            console.log('loadBarbers finalizado');
        });
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

            const navGroups = document.querySelectorAll('.accordion-button');
            navGroups.forEach(group => {
                group.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('Clicou no accordion:', group.textContent.trim());
                });
            });

            sidebar.querySelectorAll('a').forEach(link => {
                if (!link.classList.contains('accordion-button')) {
                    link.addEventListener('click', () => {
                        sidebar.classList.remove('open');
                        sidebarOverlay.classList.remove('active');
                        menuToggle.style.display = 'block';
                        logoutBtn.style.display = 'block';
                    });
                }
            });
        } else {
            console.error('Elementos do menu não encontrados');
        }
    } catch (error) {
        console.error('Erro ao inicializar o painel do gerente:', error);
        showPopup('Erro ao inicializar o painel: ' + error.message);
    }
});