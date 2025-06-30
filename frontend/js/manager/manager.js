import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { showPopup, showSection } from './utils.js';
import { initBarbers, loadBarbers } from './barbers.js';
import { initAppointments, loadAppointments } from './appointments.js';
import { initServices, loadServices, loadBarbersForSelect as loadServiceBarbers } from './services.js';
import { initSchedules } from './schedules.js';
import { initStock, loadStockMovements, loadStockProducts } from './stock.js';
import { initCashFlow, loadCashFlowSummary } from './cashflow.js';
import { initDashboard } from './dashboard.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { firebaseConfig } from '../config.js';

console.log('manager.js carregado - Versão: 2025-06-09');

const auth = getAuth();
console.log('Auth inicializado:', !!auth);
let db = window.db;
let isInitialized = false;
let isBarbersLoaded = false; // Flag pra controlar carga de barbeiros

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

// Inicialização do menu lateral (independente do Firebase)
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
                    const sectionId = link.id.replace('nav-', '') + '-section';
                    showSection(sectionId);
                    // Só carrega dados se a seção ainda não foi carregada
                    if (sectionId === 'barbers-section' && !isBarbersLoaded) {
                        await loadBarbers(db);
                        isBarbersLoaded = true;
                    } else if (sectionId === 'services-section') {
                        await loadServices(db);
                    } else if (sectionId === 'appointments-section') {
                        await loadAppointments(db);
                    } else if (sectionId === 'schedules-section') {
                        await loadServiceBarbers(db); // Preenche o select de barbeiros
                    }
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
        console.error('Elementos do menu não encontrados:', { menuToggle, menuClose, sidebar, sidebarOverlay, mainContent, logoutBtn, navLogout });
    }
});

// Inicialização do painel (dependente do Firebase)
auth.onAuthStateChanged((user) => {
    console.log('onAuthStateChanged disparado');
    if (!auth) {
        console.error('Auth não inicializado');
        return;
    }
    if (!user) {
        console.error('Usuário não autenticado. Redirecionando para login...');
        window.location.href = 'index.html';
        return;
    }
    console.log('Usuário autenticado:', user.email);
    if (!isInitialized) {
        waitForFirestore().then((db) => {
            window.db = db;
            initBarbers(db);
            initServices(db);
            initAppointments(db);
            initSchedules(db);
            initStock(db);
            initCashFlow(db);
            initDashboard(db);
            loadBarbers(db); // Chama uma vez após autenticação
            loadServices(db);
            loadAppointments(db);
            loadServiceBarbers(db); // Preenche os selects de barbeiros
            showSection('appointments-section');
            isInitialized = true;
            isBarbersLoaded = true; // Marca como carregado na inicialização
        }).catch(error => {
            console.error('Erro ao esperar Firestore:', error);
            showPopup('Erro ao inicializar o painel: ' + error.message);
        });
    }
});