import { 
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    query, 
    where, 
    orderBy 
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { showPopup, getFirestoreDb } from './utils.js';

// Estado global do módulo de dashboard
const dashboardState = {
    appointments: [],
    transactions: [],
    barbers: [],
    services: [],
    isLoading: false,
    charts: {},
    filters: {
        period: 'month',
        startDate: null,
        endDate: null
    }
};

// Inicialização do módulo de dashboard
export function initDashboard() {
    console.log("📊 Inicializando módulo de dashboard...");
    
    const db = getFirestoreDb();
    if (!db) {
        console.error("❌ Instância do Firestore não fornecida em initDashboard");
        return;
    }
    
    // Configurar filtros
    setupDashboardFilters();
    
    console.log("✅ Módulo de dashboard inicializado com sucesso");
}

// Configurar filtros do dashboard
function setupDashboardFilters() {
    const periodFilter = document.getElementById('dashboard-period-filter');
    const startDateFilter = document.getElementById('dashboard-start-date');
    const endDateFilter = document.getElementById('dashboard-end-date');
    const customDateFilters = document.getElementById('dashboard-custom-date-filters');
    
    if (periodFilter) {
        periodFilter.addEventListener('change', (e) => {
            dashboardState.filters.period = e.target.value;
            
            // Mostrar/ocultar filtros de data personalizada
            if (customDateFilters) {
                customDateFilters.style.display = e.target.value === 'custom' ? 'flex' : 'none';
            }
            
            updateDashboardDateFilters();
            loadDashboardData();
        });
    }
    
    if (startDateFilter) {
        startDateFilter.addEventListener('change', (e) => {
            dashboardState.filters.startDate = e.target.value;
            if (dashboardState.filters.period === 'custom') {
                loadDashboardData();
            }
        });
    }
    
    if (endDateFilter) {
        endDateFilter.addEventListener('change', (e) => {
            dashboardState.filters.endDate = e.target.value;
            if (dashboardState.filters.period === 'custom') {
                loadDashboardData();
            }
        });
    }
    
    // Configurar datas iniciais
    updateDashboardDateFilters();
}

// Atualizar filtros de data do dashboard
function updateDashboardDateFilters() {
    const period = dashboardState.filters.period;
    const today = new Date();
    let startDate, endDate;
    
    switch (period) {
        case 'today':
            startDate = endDate = today;
            break;
        case 'week':
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 7);
            endDate = today;
            break;
        case 'month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            break;
        case 'year':
            startDate = new Date(today.getFullYear(), 0, 1);
            endDate = new Date(today.getFullYear(), 11, 31);
            break;
        case 'custom':
            // Não alterar as datas para período customizado
            return;
        default:
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }
    
    const startDateInput = document.getElementById('dashboard-start-date');
    const endDateInput = document.getElementById('dashboard-end-date');
    
    if (startDateInput) {
        startDateInput.value = startDate.toISOString().split('T')[0];
        dashboardState.filters.startDate = startDateInput.value;
    }
    
    if (endDateInput) {
        endDateInput.value = endDate.toISOString().split('T')[0];
        dashboardState.filters.endDate = endDateInput.value;
    }
}

// Carregar dados do dashboard
export async function loadDashboardData() {
    const db = getFirestoreDb();
    if (!db) {
        console.error("❌ Firestore não inicializado no módulo de dashboard.");
        return;
    }
    
    if (dashboardState.isLoading) return;
    
    try {
        dashboardState.isLoading = true;
        console.log('📊 Carregando dados do dashboard...');
        
        // Carregar dados em paralelo
        await Promise.all([
            loadAppointmentsData(db),
            loadTransactionsData(db),
            loadBarbersData(db),
            loadServicesData(db)
        ]);
        
        // Processar e exibir métricas
        calculateAndDisplayMetrics();
        
        // Gerar gráficos
        generateCharts();
        
        console.log('✅ Dashboard carregado com sucesso');
        
    } catch (error) {
        console.error('❌ Erro ao carregar dashboard:', error);
        showPopup('Erro ao carregar dashboard: ' + error.message);
    } finally {
        dashboardState.isLoading = false;
    }
}

// Carregar dados de agendamentos
async function loadAppointmentsData(db) {
    try {
        const snapshot = await getDocs(collection(db, 'appointments'));
        
        dashboardState.appointments = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            dashboardState.appointments.push({
                id: doc.id,
                ...data
            });
        });
        
        console.log(`✅ ${dashboardState.appointments.length} agendamentos carregados para o dashboard`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar agendamentos para o dashboard:', error);
    }
}

// Carregar dados de transações
async function loadTransactionsData(db) {
    try {
        const snapshot = await getDocs(collection(db, 'cash_flow_transactions'));
        
        dashboardState.transactions = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            dashboardState.transactions.push({
                id: doc.id,
                ...data
            });
        });
        
        console.log(`✅ ${dashboardState.transactions.length} transações carregadas para o dashboard`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar transações para o dashboard:', error);
    }
}

// Carregar dados de barbeiros
async function loadBarbersData(db) {
    try {
        const snapshot = await getDocs(collection(db, 'barbers'));
        
        dashboardState.barbers = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            dashboardState.barbers.push({
                id: doc.id,
                ...data
            });
        });
        
        console.log(`✅ ${dashboardState.barbers.length} barbeiros carregados para o dashboard`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar barbeiros para o dashboard:', error);
    }
}

// Carregar dados de serviços
async function loadServicesData(db) {
    try {
        const snapshot = await getDocs(collection(db, 'services'));
        
        dashboardState.services = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            dashboardState.services.push({
                id: doc.id,
                ...data
            });
        });
        
        console.log(`✅ ${dashboardState.services.length} serviços carregados para o dashboard`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar serviços para o dashboard:', error);
    }
}

// Filtrar dados baseado no período selecionado
function filterDataByPeriod(data, dateField = 'date') {
    if (!dashboardState.filters.startDate || !dashboardState.filters.endDate) {
        return data;
    }
    
    const startDate = new Date(dashboardState.filters.startDate);
    const endDate = new Date(dashboardState.filters.endDate);
    endDate.setHours(23, 59, 59, 999);
    
    return data.filter(item => {
        const itemDate = new Date(item[dateField]);
        return itemDate >= startDate && itemDate <= endDate;
    });
}

// Calcular e exibir métricas principais
function calculateAndDisplayMetrics() {
    console.log('📊 Calculando métricas do dashboard...');
    
    // Filtrar dados pelo período
    const filteredAppointments = filterDataByPeriod(dashboardState.appointments);
    const filteredTransactions = filterDataByPeriod(dashboardState.transactions);
    
    // Métricas de agendamentos
    const totalAppointments = filteredAppointments.length;
    const completedAppointments = filteredAppointments.filter(apt => apt.status === 'completed').length;
    const noShowAppointments = filteredAppointments.filter(apt => apt.status === 'no-show').length;
    const canceledAppointments = filteredAppointments.filter(apt => apt.status === 'canceled').length;
    
    // Métricas financeiras
    const revenues = filteredTransactions.filter(t => t.type === 'revenue');
    const expenses = filteredTransactions.filter(t => t.type === 'expense');
    
    const totalRevenue = revenues.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + (t.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    
    // Atualizar elementos do DOM
    updateMetricCard('total-appointments-metric', totalAppointments);
    updateMetricCard('completed-appointments-metric', completedAppointments);
    updateMetricCard('no-show-appointments-metric', noShowAppointments);
    updateMetricCard('canceled-appointments-metric', canceledAppointments);
    
    updateMetricCard('total-revenue-metric', `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    updateMetricCard('total-expenses-metric', `R$ ${totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    updateMetricCard('net-profit-metric', `R$ ${netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    
    // Taxa de conversão
    const conversionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments * 100).toFixed(1) : 0;
    updateMetricCard('conversion-rate-metric', `${conversionRate}%`);
    
    console.log('✅ Métricas calculadas e exibidas');
}

// Atualizar card de métrica
function updateMetricCard(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

// Gerar gráficos
function generateCharts() {
    console.log('📊 Gerando gráficos do dashboard...');
    
    generateAppointmentsByBarberChart();
    generateRevenueByBarberChart();
    generateTopServicesChart();
    generateWeeklyDistributionChart();
    
    console.log('✅ Gráficos gerados');
}

// Gráfico de agendamentos por barbeiro
function generateAppointmentsByBarberChart() {
    const canvas = document.getElementById('appointments-by-barber-chart');
    if (!canvas || !window.Chart) return;
    
    // Destruir gráfico anterior se existir
    if (dashboardState.charts.appointmentsByBarber) {
        dashboardState.charts.appointmentsByBarber.destroy();
    }
    
    const filteredAppointments = filterDataByPeriod(dashboardState.appointments);
    const completedAppointments = filteredAppointments.filter(apt => apt.status === 'completed');
    
    // Agrupar por barbeiro
    const barberStats = {};
    completedAppointments.forEach(apt => {
        const barber = dashboardState.barbers.find(b => b.id === apt.barberId);
        const barberName = barber ? barber.name : 'Desconhecido';
        
        if (!barberStats[barberName]) {
            barberStats[barberName] = 0;
        }
        barberStats[barberName]++;
    });
    
    const labels = Object.keys(barberStats);
    const data = Object.values(barberStats);
    
    const ctx = canvas.getContext('2d');
    dashboardState.charts.appointmentsByBarber = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Agendamentos Realizados',
                data: data,
                backgroundColor: '#36A2EB',
                borderColor: '#36A2EB',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Gráfico de receita por barbeiro
function generateRevenueByBarberChart() {
    const canvas = document.getElementById('revenue-by-barber-chart');
    if (!canvas || !window.Chart) return;
    
    // Destruir gráfico anterior se existir
    if (dashboardState.charts.revenueByBarber) {
        dashboardState.charts.revenueByBarber.destroy();
    }
    
    const filteredAppointments = filterDataByPeriod(dashboardState.appointments);
    const completedAppointments = filteredAppointments.filter(apt => apt.status === 'completed');
    
    // Agrupar receita por barbeiro
    const barberRevenue = {};
    completedAppointments.forEach(apt => {
        const barber = dashboardState.barbers.find(b => b.id === apt.barberId);
        const barberName = barber ? barber.name : 'Desconhecido';
        
        if (!barberRevenue[barberName]) {
            barberRevenue[barberName] = 0;
        }
        barberRevenue[barberName] += apt.totalPrice || 0;
    });
    
    const labels = Object.keys(barberRevenue);
    const data = Object.values(barberRevenue);
    
    const ctx = canvas.getContext('2d');
    dashboardState.charts.revenueByBarber = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Receita (R$)',
                data: data,
                backgroundColor: '#4BC0C0',
                borderColor: '#4BC0C0',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + value.toLocaleString('pt-BR');
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Receita: R$ ' + context.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                        }
                    }
                }
            }
        }
    });
}

// Gráfico de serviços mais realizados
function generateTopServicesChart() {
    const canvas = document.getElementById('top-services-chart');
    if (!canvas || !window.Chart) return;
    
    // Destruir gráfico anterior se existir
    if (dashboardState.charts.topServices) {
        dashboardState.charts.topServices.destroy();
    }
    
    const filteredAppointments = filterDataByPeriod(dashboardState.appointments);
    const completedAppointments = filteredAppointments.filter(apt => apt.status === 'completed');
    
    // Contar serviços
    const serviceCount = {};
    completedAppointments.forEach(apt => {
        if (apt.services && Array.isArray(apt.services)) {
            apt.services.forEach(service => {
                const serviceName = service.name || 'Serviço Desconhecido';
                if (!serviceCount[serviceName]) {
                    serviceCount[serviceName] = 0;
                }
                serviceCount[serviceName]++;
            });
        }
    });
    
    // Ordenar e pegar os top 5
    const sortedServices = Object.entries(serviceCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
    
    const labels = sortedServices.map(([name]) => name);
    const data = sortedServices.map(([,count]) => count);
    
    const ctx = canvas.getContext('2d');
    dashboardState.charts.topServices = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0',
                    '#9966FF'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Gráfico de distribuição semanal
function generateWeeklyDistributionChart() {
    const canvas = document.getElementById('weekly-distribution-chart');
    if (!canvas || !window.Chart) return;
    
    // Destruir gráfico anterior se existir
    if (dashboardState.charts.weeklyDistribution) {
        dashboardState.charts.weeklyDistribution.destroy();
    }
    
    const filteredAppointments = filterDataByPeriod(dashboardState.appointments);
    const completedAppointments = filteredAppointments.filter(apt => apt.status === 'completed');
    
    // Agrupar por dia da semana
    const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const weeklyData = new Array(7).fill(0);
    
    completedAppointments.forEach(apt => {
        const date = new Date(apt.date);
        const dayOfWeek = date.getDay();
        weeklyData[dayOfWeek]++;
    });
    
    const ctx = canvas.getContext('2d');
    dashboardState.charts.weeklyDistribution = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weekDays,
            datasets: [{
                label: 'Agendamentos Realizados',
                data: weeklyData,
                borderColor: '#FF6384',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Exportar estado para debug
export { dashboardState };

