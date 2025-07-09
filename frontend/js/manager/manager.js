import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { showPopup, showSection, setFirestoreDb, getFirestoreDb } from './utils.js';
import { initBarbers, loadBarbers } from './barbers.js';
import { initAppointments, loadAppointments } from './appointments.js';
import { initServices, loadServices, loadBarbersForSelect as loadServiceBarbers } from './services.js'; // Renomeado para evitar conflito
import { initSchedules, loadSchedules } from './schedules.js'; // Importe loadSchedules
import { initStockModule, loadProducts, loadMovements } from './stock_new.js';
import { initCashFlow, loadCashFlowData } from './cashflow_enhanced.js';
import { initDashboard, loadDashboardData } from './dashboard.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { firebaseConfig } from '../config.js';

console.log('manager_enhanced.js carregado - Versão: 2025-01-07');

const auth = getAuth();
console.log('Auth inicializado:', !!auth);
let isInitialized = false;
let isBarbersLoaded = false;

function waitForFirestore() {
    return new Promise((resolve, reject) => {
        const maxAttempts = 20;
        let attempts = 0;
        const checkDb = setInterval(() => {
            attempts++;
            const db = getFirestoreDb();
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

    const menuToggle = document.getElementById('menuToggle');
    const menuClose = document.getElementById('menuClose');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const mainContent = document.getElementById('mainContent');
    const logoutBtn = document.getElementById('logoutBtn');
    const navLogout = document.getElementById('nav-logout');

    if (menuToggle && menuClose && sidebar && sidebarOverlay && mainContent && logoutBtn && navLogout) {
        menuToggle.addEventListener('click', () => {
            console.log('menuToggle clicado');
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

        navLogout.addEventListener('click', async (e) => {
            e.preventDefault();
            await handleLogout();
        });

        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await handleLogout();
        });

        const navLinks = document.querySelectorAll('#sidebar nav a');
        navLinks.forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                
                // Remover classe active de todos os links
                navLinks.forEach(l => l.classList.remove('active'));
                // Adicionar classe active ao link clicado
                link.classList.add('active');
                
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
                } else {
                    // Tratamento especial para subitens do estoque
                    if (link.id === 'nav-stock-products') {
                        showSection('stock-section');
                        setTimeout(() => {
                            const productsBtn = document.getElementById('stock-nav-products');
                            if (productsBtn) {
                                productsBtn.click();
                            }
                        }, 100);
                    } else if (link.id === 'nav-stock-movements') {
                        showSection('stock-section');
                        setTimeout(() => {
                            const movementsBtn = document.getElementById('stock-nav-movements');
                            if (movementsBtn) {
                                movementsBtn.click();
                            }
                        }, 100);
                    } else if (link.id === 'nav-cashflow-summary') {
                        showSection('cashflow-section');
                        setTimeout(() => {
                            const summaryBtn = document.getElementById('cashflow-nav-summary');
                            if (summaryBtn) {
                                summaryBtn.click();
                            }
                        }, 100);
                    } else if (link.id === 'nav-cashflow-expenses') {
                        showSection('cashflow-section');
                        setTimeout(() => {
                            const expensesBtn = document.getElementById('cashflow-nav-expenses');
                            if (expensesBtn) {
                                expensesBtn.click();
                            }
                        }, 100);
                    } else {
                        const sectionId = link.id.replace("nav-", "") + "-section";
                        showSection(sectionId);

                        // Carregamento específico para cada seção
                        if (sectionId === "dashboard-section") {
                            await loadDashboardData();
                        } else if (sectionId === "cashflow-section") {
                            loadCashFlowData();
                        } else if (sectionId === "barbers-section" && !isBarbersLoaded) {
                            await loadBarbers();
                            isBarbersLoaded = true;
                        } else if (sectionId === "services-section") {
                            await loadServices();
                        } else if (sectionId === "appointments-section") {
                            const db = getFirestoreDb(); // Obtém a instância do DB
                            if (db) {
                                await loadAppointments(db); // Passa a instância do DB
                            } else {
                                console.error("Firestore DB não disponível para carregar agendamentos.");
                            }
                        } else if (sectionId === "schedules-section") {
                            await loadServiceBarbers();
                        }
                    }

                    sidebar.classList.remove('open');
                    sidebarOverlay.classList.remove('active');
                    menuToggle.style.display = 'block';
                    logoutBtn.style.display = 'block';
                }
            });
        });
        
        // Configurar filtros de data personalizada para dashboard
        const dashboardPeriodFilter = document.getElementById('dashboard-period-filter');
        const dashboardCustomDateFilters = document.getElementById('dashboard-custom-date-filters');
        const dashboardCustomDateFiltersEnd = document.getElementById('dashboard-custom-date-filters-end');
        
        if (dashboardPeriodFilter && dashboardCustomDateFilters && dashboardCustomDateFiltersEnd) {
            dashboardPeriodFilter.addEventListener('change', (e) => {
                const isCustom = e.target.value === 'custom';
                dashboardCustomDateFilters.style.display = isCustom ? 'flex' : 'none';
                dashboardCustomDateFiltersEnd.style.display = isCustom ? 'flex' : 'none';
            });
        }
        
        // Configurar filtros de data personalizada para fluxo de caixa
        const cashflowPeriodFilter = document.getElementById('cashflow-period-filter');
        const customDateFilters = document.getElementById('custom-date-filters');
        const customDateFiltersEnd = document.getElementById('custom-date-filters-end');
        
        if (cashflowPeriodFilter && customDateFilters && customDateFiltersEnd) {
            cashflowPeriodFilter.addEventListener('change', (e) => {
                const isCustom = e.target.value === 'custom';
                customDateFilters.style.display = isCustom ? 'flex' : 'none';
                customDateFiltersEnd.style.display = isCustom ? 'flex' : 'none';
            });
        }
        
    } else {
        console.error('Elementos do menu não encontrados:', { menuToggle, menuClose, sidebar, sidebarOverlay, mainContent, logoutBtn, navLogout });
    }
});

auth.onAuthStateChanged((user) => {
    console.log("DEBUG: onAuthStateChanged disparado");
    if (!auth) {
        console.error("DEBUG: Auth não inicializado");
        return;
    }
    if (!user) {
        console.error("DEBUG: Usuário não autenticado. Redirecionando para login...");
        window.location.href = "index.html";
        return;
    }
    console.log("DEBUG: Usuário autenticado:", user.email);
    if (!isInitialized) {
        const app = initializeApp(firebaseConfig);
        const dbInstance = getFirestore(app);
        setFirestoreDb(dbInstance); // Define a instância globalmente no utils.js

        waitForFirestore().then(async (db) => { // Use 'async' aqui
            console.log("DEBUG: Firestore instance (db) disponível no window.db:", !!db);
            
            // Inicialize todos os módulos passando a instância 'db'
            initBarbers(db);
            initServices(db);
            initAppointments(db);
            initSchedules(db);
            initStockModule(db);
            initCashFlow(db);
            initDashboard(db);

            // Carregue os dados iniciais
            await loadBarbers(db); // Certifique-se de que barbeiros são carregados primeiro
            await loadServiceBarbers(db); // Carrega barbeiros para selects de serviços e horários
            await loadServices(db);
            await loadAppointments(db); // Passa a instância do DB
            
            // Carregar dashboard por padrão
            showSection("dashboard-section");
            await loadDashboardData(); // Use await para garantir que o dashboard carregue completamente
            
            isInitialized = true;
            isBarbersLoaded = true; // Isso pode ser true após loadBarbers(db)
        }).catch(error => {
            console.error("DEBUG: Erro ao esperar Firestore:", error);
            showPopup("Erro ao inicializar o painel: " + error.message);
        });
    }
});