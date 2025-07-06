import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { showPopup, showSection, setFirestoreDb, getFirestoreDb } from './utils.js';
import { initBarbers, loadBarbers } from './barbers.js';
import { initAppointments, loadAppointments } from './appointments.js';
import { initServices, loadServices, loadBarbersForSelect as loadServiceBarbers } from './services.js';
import { initSchedules } from './schedules.js';
import { initStockModule, loadProducts, loadMovements } from './stock_new.js';
import { initCashFlow, loadCashFlowSummary } from './cashflow_new.js';
import { initDashboard } from './dashboard.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { firebaseConfig } from '../config.js';

console.log('manager.js carregado - Versão: 2025-06-09' );

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
            const db = getFirestoreDb(); // Obter a instância do db
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
                        // Aguardar um pouco para garantir que a seção foi carregada
                        setTimeout(() => {
                            const productsBtn = document.getElementById('stock-nav-products');
                            if (productsBtn) {
                                productsBtn.click();
                            }
                        }, 100);
                    } else if (link.id === 'nav-stock-movements') {
                        showSection('stock-section');
                        // Aguardar um pouco para garantir que a seção foi carregada
                        setTimeout(() => {
                            const movementsBtn = document.getElementById('stock-nav-movements');
                            if (movementsBtn) {
                                movementsBtn.click();
                            }
                        }, 100);
                    } else {
                        const sectionId = link.id.replace("nav-", "") + "-section";
                        showSection(sectionId);

                        // Carregamento específico para cada seção
                        if (sectionId === "cashflow-section") {
                            loadCashFlowData();
                        } else if (sectionId === "barbers-section" && !isBarbersLoaded) {
                            await loadBarbers();
                            isBarbersLoaded = true;
                        } else if (sectionId === "services-section") {
                            await loadServices();
                        } else if (sectionId === "appointments-section") {
                            await loadAppointments();
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
        setFirestoreDb(dbInstance); // Definir a instância do db globalmente

        waitForFirestore().then((db) => {
            console.log("DEBUG: Firestore instance (db) disponível no window.db:", !!db);
            initBarbers(db);
            initServices(db);
            initAppointments(db);
            initSchedules(db);
            initStockModule(db);
            initCashFlow(db);
            initDashboard(db);
            loadBarbers(db);
            loadServices(db);
            loadAppointments(db);
            loadServiceBarbers(db);
            showSection("appointments-section");
            isInitialized = true;
            isBarbersLoaded = true;
        }).catch(error => {
            console.error("DEBUG: Erro ao esperar Firestore:", error);
            showPopup("Erro ao inicializar o painel: " + error.message);
        });
    }
});
