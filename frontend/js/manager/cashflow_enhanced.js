import { 
    collection, 
    getDocs, 
    doc, 
    setDoc, 
    deleteDoc, 
    getDoc, 
    query, 
    where, 
    orderBy, 
    runTransaction, 
    addDoc,
    Timestamp 
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { showPopup, getFirestoreDb } from './utils.js';

// Estado global do módulo de fluxo de caixa
const cashflowState = {
    transactions: [],
    categories: [],
    currentView: 'summary',
    isLoading: false,
    db: null,
    chart: null,
    filters: {
        period: 'month',
        type: 'all',
        startDate: null,
        endDate: null
    }
};

// Categorias padrão de despesas e receitas
const defaultCategories = [
    // Categorias de Despesas
    { id: 'rent', name: 'Aluguel', type: 'expense', icon: 'fas fa-home' },
    { id: 'utilities', name: 'Contas (Luz, Água, Internet)', type: 'expense', icon: 'fas fa-bolt' },
    { id: 'salaries', name: 'Salários', type: 'expense', icon: 'fas fa-users' },
    { id: 'supplies', name: 'Materiais e Suprimentos', type: 'expense', icon: 'fas fa-box' },
    { id: 'marketing', name: 'Marketing', type: 'expense', icon: 'fas fa-bullhorn' },
    { id: 'maintenance', name: 'Manutenção', type: 'expense', icon: 'fas fa-tools' },
    { id: 'taxes', name: 'Impostos', type: 'expense', icon: 'fas fa-file-invoice-dollar' },
    { id: 'other_expense', name: 'Outras Despesas', type: 'expense', icon: 'fas fa-minus-circle' },
    
    // Categorias de Receitas
    { id: 'services', name: 'Serviços Realizados', type: 'revenue', icon: 'fas fa-cut' },
    { id: 'stock_sales', name: 'Vendas de Produtos', type: 'revenue', icon: 'fas fa-shopping-cart' },
    { id: 'other_revenue', name: 'Outras Receitas', type: 'revenue', icon: 'fas fa-plus-circle' }
];

// Inicialização do módulo de fluxo de caixa
export function initCashFlow() {
    console.log("💰 Inicializando módulo de fluxo de caixa aprimorado...");
    
    const db = getFirestoreDb();
    if (!db) {
        console.error("❌ Instância do Firestore não fornecida em initCashFlow");
        return;
    }
    
    cashflowState.db = db;
    console.log("✅ Firestore conectado ao módulo de fluxo de caixa");
    
    // Inicializar categorias padrão
    initializeCategories(); // Não precisa passar db, pois getFirestoreDb() é usado internamente
    
    // Configurar navegação entre views
    setupNavigation();
    
    // Configurar formulários
    setupExpenseForm();
    setupCategoryManagement();
    
    // Configurar filtros
    setupFilters();
    
    console.log("✅ Módulo de fluxo de caixa inicializado com sucesso");
}

// Exportar função para carregar o resumo quando a seção for ativada
export async function loadCashFlowData() {
    const db = getFirestoreDb();
    if (!db) {
        console.error("❌ Firestore não inicializado no módulo de fluxo de caixa ao carregar dados.");
        return;
    }
    await loadTransactions(); // Aguarda o carregamento das transações
    if (cashflowState.currentView === 'summary') {
        loadSummary();
    } else if (cashflowState.currentView === 'expenses') {
        loadRecentExpenses();
    }
}

async function initializeCategories() {
    const db = getFirestoreDb();
    if (!db) {
        console.error("❌ Firestore não inicializado em initializeCategories");
        return;
    }
    try {
        // Verificar se as categorias já existem
        const categoriesSnapshot = await getDocs(collection(db, 'expense_categories'));
        
        if (categoriesSnapshot.empty) {
            console.log('📝 Criando categorias padrão...');
            
            // Criar categorias padrão
            for (const category of defaultCategories) {
                await setDoc(doc(db, 'expense_categories', category.id), {
                    ...category,
                    createdAt: new Date().toISOString()
                });
            }
            
            console.log('✅ Categorias padrão criadas');
        }
        
        // Carregar categorias
        await loadCategories();
        
    } catch (error) {
        console.error('❌ Erro ao inicializar categorias:', error);
        // Se houver erro de permissão, usar categorias padrão em memória
        if (error.code === 'permission-denied' || error.message.includes('Missing or insufficient permissions')) {
            console.warn('⚠️ Erro de permissão ao acessar categorias do Firestore. Usando categorias padrão em memória.');
            cashflowState.categories = defaultCategories;
            updateCategorySelects();
        } else {
            showPopup('Erro ao inicializar categorias: ' + error.message, false, null, 'error');
        }
    }
}

// Carregar categorias
async function loadCategories() {
    const db = getFirestoreDb();
    if (!db) {
        console.error("❌ Firestore não inicializado em loadCategories");
        return;
    }
    try {
        const snapshot = await getDocs(collection(db, 'expense_categories'));
        
        cashflowState.categories = [];
        snapshot.forEach((doc) => {
            cashflowState.categories.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`✅ ${cashflowState.categories.length} categorias carregadas`);
        updateCategorySelects();
        
    } catch (error) {
        console.error('❌ Erro ao carregar categorias:', error);
        // Se houver erro de permissão, usar categorias padrão em memória
        if (error.code === 'permission-denied' || error.message.includes('Missing or insufficient permissions')) {
            console.warn('⚠️ Erro de permissão ao carregar categorias do Firestore. Usando categorias padrão em memória.');
            cashflowState.categories = defaultCategories;
            updateCategorySelects();
        } else {
            showPopup('Erro ao carregar categorias: ' + error.message, false, null, 'error');
        }
    }
}

// Atualizar selects de categoria
function updateCategorySelects() {
    const expenseSelect = document.getElementById('expense-category');
    if (!expenseSelect) return;
    
    // Limpar opções existentes
    expenseSelect.innerHTML = '<option value="">Selecione uma categoria</option>';
    
    // Adicionar categorias de despesa
    const expenseCategories = cashflowState.categories.filter(cat => cat.type === 'expense');
    expenseCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        expenseSelect.appendChild(option);
    });
}

// Configurar navegação entre views
function setupNavigation() {
    const summaryBtn = document.getElementById('cashflow-nav-summary');
    const expensesBtn = document.getElementById('cashflow-nav-expenses');
    const categoriesBtn = document.getElementById('cashflow-nav-categories');
    const summaryView = document.getElementById('cashflow-summary-view');
    const expensesView = document.getElementById('cashflow-expenses-view');
    const categoriesView = document.getElementById('cashflow-categories-view');
    
    if (!summaryBtn || !expensesBtn || !summaryView || !expensesView) {
        console.error('❌ Elementos de navegação do fluxo de caixa não encontrados');
        return;
    }
    
    summaryBtn.addEventListener('click', () => {
        switchView('summary');
    });
    
    expensesBtn.addEventListener('click', () => {
        switchView('expenses');
    });
    
    if (categoriesBtn) {
        categoriesBtn.addEventListener('click', () => {
            switchView('categories');
        });
    }
}

// Alternar entre views
function switchView(view) {
    const summaryBtn = document.getElementById('cashflow-nav-summary');
    const expensesBtn = document.getElementById('cashflow-nav-expenses');
    const categoriesBtn = document.getElementById('cashflow-nav-categories');
    const summaryView = document.getElementById('cashflow-summary-view');
    const expensesView = document.getElementById('cashflow-expenses-view');
    const categoriesView = document.getElementById('cashflow-categories-view');
    
    // Atualizar botões
    summaryBtn.classList.toggle('active', view === 'summary');
    expensesBtn.classList.toggle('active', view === 'expenses');
    if (categoriesBtn) categoriesBtn.classList.toggle('active', view === 'categories');
    
    // Atualizar views
    summaryView.classList.toggle('active', view === 'summary');
    expensesView.classList.toggle('active', view === 'expenses');
    if (categoriesView) categoriesView.classList.toggle('active', view === 'categories');
    
    cashflowState.currentView = view;
    
    // Recarregar dados após a troca de view
    loadCashFlowData();
}

// Configurar formulário de despesas
function setupExpenseForm() {
    const form = document.getElementById('expense-form');
    const cancelBtn = document.getElementById('cancel-expense-btn');
    
    if (!form || !cancelBtn) {
        console.error('❌ Elementos do formulário de despesa não encontrados');
        return;
    }
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveExpense();
    });
    
    cancelBtn.addEventListener('click', () => {
        form.reset();
        // Definir data padrão como hoje
        document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
    });
    
    // Definir data padrão como hoje
    const dateInput = document.getElementById('expense-date');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
}

// Configurar gerenciamento de categorias
function setupCategoryManagement() {
    // Esta função será implementada quando adicionarmos a view de categorias
    console.log('📝 Configuração de gerenciamento de categorias preparada');
}

// Configurar filtros
function setupFilters() {
    const periodFilter = document.getElementById('cashflow-period-filter');
    const typeFilter = document.getElementById('cashflow-type-filter');
    const startDateFilter = document.getElementById('cashflow-start-date');
    const endDateFilter = document.getElementById('cashflow-end-date');
    const customDateFilters = document.getElementById('custom-date-filters');
    
    if (periodFilter) {
        periodFilter.addEventListener('change', (e) => {
            cashflowState.filters.period = e.target.value;
            
            // Mostrar/ocultar filtros de data personalizada
            if (customDateFilters) {
                customDateFilters.style.display = e.target.value === 'custom' ? 'flex' : 'none';
            }
            
            updateDateFilters();
            loadCashFlowData(); // Recarrega todos os dados e atualiza a view
        });
    }
    
    if (typeFilter) {
        typeFilter.addEventListener('change', (e) => {
            cashflowState.filters.type = e.target.value;
            loadCashFlowData(); // Recarrega todos os dados e atualiza a view
        });
    }
    
    if (startDateFilter) {
        startDateFilter.addEventListener('change', (e) => {
            cashflowState.filters.startDate = e.target.value;
            if (cashflowState.filters.period === 'custom') {
                loadCashFlowData(); // Recarrega todos os dados e atualiza a view
            }
        });
    }
    
    if (endDateFilter) {
        endDateFilter.addEventListener('change', (e) => {
            cashflowState.filters.endDate = e.target.value;
            if (cashflowState.filters.period === 'custom') {
                loadCashFlowData(); // Recarrega todos os dados e atualiza a view
            }
        });
    }
    
    // Configurar datas iniciais
    updateDateFilters();
}

// Atualizar filtros de data baseado no período selecionado
function updateDateFilters() {
    const period = cashflowState.filters.period;
    const today = new Date();
    let startDate, endDate;
    
    switch (period) {
        case 'today':
            startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
            break;
        case 'week':
            startDate = new Date(today);
            startDate.setDate(today.getDate() - today.getDay()); // Início da semana (domingo)
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(today);
            endDate.setDate(today.getDate() + (6 - today.getDay())); // Fim da semana (sábado)
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'year':
            startDate = new Date(today.getFullYear(), 0, 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(today.getFullYear(), 11, 31);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'custom':
            // Não alterar as datas para período customizado, elas vêm dos inputs
            return;
        default:
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            endDate.setHours(23, 59, 59, 999);
    }
    
    const startDateInput = document.getElementById('cashflow-start-date');
    const endDateInput = document.getElementById('cashflow-end-date');
    
    if (startDateInput) {
        startDateInput.value = startDate.toISOString().split('T')[0];
        cashflowState.filters.startDate = startDateInput.value;
    }
    
    if (endDateInput) {
        endDateInput.value = endDate.toISOString().split('T')[0];
        cashflowState.filters.endDate = endDateInput.value;
    }
}

// Carregar transações
async function loadTransactions() {
    const db = getFirestoreDb();
    if (!db) {
        console.error("❌ Firestore não inicializado no módulo de fluxo de caixa ao carregar transações.");
        return;
    }
    if (cashflowState.isLoading) return;
    
    try {
        cashflowState.isLoading = true;
        console.log('💰 Carregando transações...');
        
        // Buscar transações no Firestore
        const snapshot = await getDocs(
            query(collection(db, 'cash_flow_transactions'), orderBy('date', 'desc'))
        );
        
        cashflowState.transactions = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            // Converte a data para o formato YYYY-MM-DD se for um Timestamp do Firestore
            let transactionDate = data.date;
            if (transactionDate instanceof Timestamp) {
                transactionDate = transactionDate.toDate().toISOString().split('T')[0];
            }
            cashflowState.transactions.push({
                id: doc.id,
                ...data,
                date: transactionDate // Garante que a data esteja no formato correto
            });
        });
        
        console.log(`✅ ${cashflowState.transactions.length} transações carregadas`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar transações:', error);
        showPopup('Erro ao carregar transações: ' + error.message, false, null, 'error');
    } finally {
        cashflowState.isLoading = false;
    }
}

// Carregar resumo financeiro
function loadSummary() {
    console.log('📊 Carregando resumo financeiro...');
    
    // Filtrar transações baseado nos filtros
    const filteredTransactions = filterTransactions();
    
    // Calcular totais
    const totals = calculateTotals(filteredTransactions);
    
    // Atualizar cards de resumo
    updateSummaryCards(totals);
    
    // Atualizar gráfico
    updateChart(filteredTransactions);
    
    // Atualizar lista de transações
    renderTransactions(filteredTransactions);
}

// Filtrar transações baseado nos filtros ativos
function filterTransactions() {
    let filtered = [...cashflowState.transactions];
    
    // Filtro por tipo
    if (cashflowState.filters.type !== 'all') {
        filtered = filtered.filter(transaction => transaction.type === cashflowState.filters.type);
    }
    
    // Filtro por data
    if (cashflowState.filters.startDate && cashflowState.filters.endDate) {
        const startDate = new Date(cashflowState.filters.startDate + 'T00:00:00'); // Adiciona T00:00:00 para evitar problemas de fuso horário
        const endDate = new Date(cashflowState.filters.endDate + 'T23:59:59.999'); // Adiciona T23:59:59.999 para incluir o dia inteiro
        
        filtered = filtered.filter(transaction => {
            const transactionDate = new Date(transaction.date + 'T00:00:00'); // Garante que a data da transação também seja tratada como início do dia
            return transactionDate >= startDate && transactionDate <= endDate;
        });
    }
    
    return filtered;
}

// Calcular totais
function calculateTotals(transactions) {
    const totals = {
        revenue: 0,
        expenses: 0,
        balance: 0
    };
    
    transactions.forEach(transaction => {
        if (transaction.type === 'revenue') {
            totals.revenue += transaction.amount || 0;
        } else if (transaction.type === 'expense') {
            totals.expenses += transaction.amount || 0;
        }
    });
    
    totals.balance = totals.revenue - totals.expenses;
    
    return totals;
}

// Atualizar cards de resumo
function updateSummaryCards(totals) {
    const revenueElement = document.getElementById('total-revenue');
    const expensesElement = document.getElementById('total-expenses');
    const balanceElement = document.getElementById('total-balance');
    
    if (revenueElement) {
        revenueElement.textContent = `R$ ${totals.revenue.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }
    
    if (expensesElement) {
        expensesElement.textContent = `R$ ${totals.expenses.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }
    
    if (balanceElement) {
        balanceElement.textContent = `R$ ${totals.balance.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
        
        // Atualizar cor baseado no saldo
        balanceElement.className = 'summary-value';
        if (totals.balance > 0) {
            balanceElement.classList.add('positive');
        } else if (totals.balance < 0) {
            balanceElement.classList.add('negative');
        }
    }
}

// Atualizar gráfico
function updateChart(transactions) {
    const canvas = document.getElementById("cashflow-chart");
    if (!canvas || canvas.offsetParent === null) {
        console.warn("Canvas do gráfico de fluxo de caixa não encontrado ou não visível.");
        return;
    }
    
    const ctx = canvas.getContext("2d");
    
    // Destruir gráfico anterior se existir
    if (cashflowState.chart) {
        cashflowState.chart.destroy();
    }
    
    // Agrupar transações por categoria
    const categoryData = {};
    
    transactions.forEach(transaction => {
        const category = cashflowState.categories.find(cat => cat.id === transaction.category);
        const categoryName = category ? category.name : 'Outros';
        
        if (!categoryData[categoryName]) {
            categoryData[categoryName] = 0;
        }
        
        categoryData[categoryName] += transaction.amount || 0;
    });
    
    const labels = Object.keys(categoryData);
    const data = Object.values(categoryData);
    
    // Criar novo gráfico
    if (window.Chart && labels.length > 0) {
        cashflowState.chart = new Chart(ctx, {
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
                        '#9966FF',
                        '#FF9F40',
                        '#FF6384',
                        '#C9CBCF'
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
}

// Renderizar lista de transações (usado tanto para resumo quanto para despesas recentes)
function renderTransactions(transactionsToRender) {
    const container = document.getElementById('cashflow-transactions-list');
    if (!container) return;
    
    if (transactionsToRender.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-line"></i>
                <h3>Nenhuma transação encontrada</h3>
                <p>As transações aparecerão aqui conforme forem registradas</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = transactionsToRender.map(transaction => {
        const category = cashflowState.categories.find(cat => cat.id === transaction.category);
        const categoryIcon = category ? category.icon : 'fas fa-circle';
        
        const date = new Date(transaction.date + 'T00:00:00'); // Garante que a data seja tratada como início do dia
        const formattedDate = date.toLocaleDateString('pt-BR');
        
        const isRevenue = transaction.type === 'revenue';

        // Traduzir a origem
        let translatedSource = transaction.source;
        if (transaction.source === 'appointment_completed') {
            translatedSource = 'Serviço Realizado';
        }
        
        const formattedDueDate = transaction.dueDate ? new Date(transaction.dueDate + 'T00:00:00').toLocaleDateString('pt-BR') : null;
        const formattedPaymentDate = transaction.paymentDate ? new Date(transaction.paymentDate + 'T00:00:00').toLocaleDateString('pt-BR') : null;

        // Conteúdo da descrição principal
        let mainDescription = transaction.description;
        // Se for uma receita de serviço, a descrição já deve ser suficiente, não precisa da categoria separada
        if (transaction.source === 'appointment_completed' && category && category.id === 'services') {
            // A descrição já vem como 'Serviço de [nome do serviço]', então não precisamos da categoria aqui
            // A categoria 'Serviços Realizados' já é inferida pela origem
            mainDescription = transaction.description; // Mantém a descrição original do agendamento
        } else {
            // Para outras transações, inclui a categoria na descrição se não for redundante
            mainDescription = `${transaction.description} (${category ? category.name : 'Outros'})`;
        }

        return `
            <div class="transaction-card ${transaction.type}">
                <div class="transaction-icon">
                    <i class="${categoryIcon}"></i>
                </div>
                <div class="transaction-info">
                    <h4>${mainDescription}</h4>
                    <p class="transaction-date-info">
                        <span>Lançamento: ${formattedDate}</span>
                        ${formattedDueDate ? `<span>Vencimento: ${formattedDueDate}</span>` : ''}
                        ${formattedPaymentDate ? `<span>Pagamento: ${formattedPaymentDate}</span>` : ''}
                    </p>
                    ${transaction.source ? `<p class="transaction-source">Origem: ${translatedSource}</p>` : ''}
                </div>
                <div class="transaction-footer">
                    <div class="transaction-amount ${transaction.type}">
                        ${isRevenue ? '+' : '-'} R$ ${(transaction.amount || 0).toFixed(2)}
                    </div>
                    <div class="transaction-actions">
                        <button class="action-btn edit" onclick="editTransaction('${transaction.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="deleteTransaction('${transaction.id}')" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Salvar despesa
async function saveExpense() {
    const db = getFirestoreDb();
    if (!db) {
        console.error("❌ Firestore não inicializado no módulo de fluxo de caixa ao salvar despesa.");
        showPopup('Erro: Firestore não inicializado.', false, null, 'error');
        return;
    }
    if (cashflowState.isLoading) return;
    
    try {
        cashflowState.isLoading = true;
        
        const description = document.getElementById('expense-description').value.trim();
        const category = document.getElementById('expense-category').value;
        const amount = parseFloat(document.getElementById('expense-amount').value) || 0;
        const date = document.getElementById('expense-date').value;
        const dueDate = document.getElementById('expense-due-date')?.value || null;
        const paymentDate = document.getElementById('expense-payment-date')?.value || null;
        
        if (!description || !category || amount <= 0 || !date) {
            showPopup('Todos os campos obrigatórios (Descrição, Categoria, Valor, Data) devem ser preenchidos.', false, null, 'warning');
            return;
        }
        
        const transactionId = `expense_${Date.now()}`;
        
        const transactionData = {
            id: transactionId,
            type: 'expense',
            description,
            category,
            amount,
            date,
            dueDate,
            paymentDate,
            source: 'manual',
            createdAt: new Date().toISOString()
        };
        
        console.log("💾 Salvando despesa:", transactionData);
        
        await setDoc(doc(db, 'cash_flow_transactions', transactionId), transactionData);
        
        console.log('✅ Despesa salva com sucesso');
        showPopup('Despesa registrada com sucesso!', false, null, 'success');
        
        // Limpar formulário
        document.getElementById('expense-form').reset();
        // Redefinir data padrão
        document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
        
        // Recarregar todos os dados e atualizar a view
        await loadTransactions();
        if (cashflowState.currentView === 'expenses') {
            loadRecentExpenses();
        } else if (cashflowState.currentView === 'summary') {
            loadSummary();
        }
        
    } catch (error) {
        console.error('❌ Erro ao salvar despesa:', error);
        showPopup('Erro ao salvar despesa: ' + error.message, false, null, 'error');
    } finally {
        cashflowState.isLoading = false;
    }
}

// Carregar despesas recentes
async function loadRecentExpenses() {
    console.log('📋 Carregando despesas recentes...');
    
    // Filtrar apenas despesas dos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0); // Zera a hora para comparação
    
    const recentExpenses = cashflowState.transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date + 'T00:00:00'); // Garante que a data da transação seja tratada como início do dia
        return transaction.type === 'expense' && transactionDate >= thirtyDaysAgo;
    });
    
    // Ordena as despesas recentes da mais nova para a mais antiga
    recentExpenses.sort((a, b) => new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00'));

    renderTransactions(recentExpenses); // Usa renderTransactions para exibir
}

// Registrar receita automaticamente (chamada por outros módulos)
export async function registerRevenue(description, amount, category = 'other_revenue', source = 'automatic', additionalData = {}) {
    const db = getFirestoreDb();
    if (!db) {
        console.error('❌ Firestore não inicializado no módulo de fluxo de caixa');
        return;
    }
    
    try {
        const transactionId = `revenue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const transactionData = {
            id: transactionId,
            type: 'revenue',
            description,
            category,
            amount: parseFloat(amount) || 0,
            date: new Date().toISOString().split('T')[0],
            source,
            createdAt: new Date().toISOString(),
            ...additionalData
        };
        
        console.log('💰 Registrando receita automática:', transactionData);
        
        await setDoc(doc(db, 'cash_flow_transactions', transactionId), transactionData);
        
        console.log('✅ Receita registrada automaticamente');
        
        // Recarregar dados se estivermos na view de fluxo de caixa
        await loadTransactions();
        if (cashflowState.currentView === 'summary') {
            loadSummary();
        } else if (cashflowState.currentView === 'expenses') {
            loadRecentExpenses();
        }
        
        return transactionId;
        
    } catch (error) {
        console.error('❌ Erro ao registrar receita automática:', error);
        showPopup('Erro ao registrar receita: ' + error.message, false, null, 'error');
        throw error;
    }
}

// Registrar despesa automaticamente (chamada por outros módulos)
export async function registerExpense(description, amount, category = 'other_expense', source = 'automatic', additionalData = {}) {
    const db = getFirestoreDb();
    if (!db) {
        console.error('❌ Firestore não inicializado no módulo de fluxo de caixa');
        return;
    }
    
    try {
        const transactionId = `expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const transactionData = {
            id: transactionId,
            type: 'expense',
            description,
            category,
            amount: parseFloat(amount) || 0,
            date: new Date().toISOString().split('T')[0],
            source,
            createdAt: new Date().toISOString(),
            ...additionalData
        };
        
        console.log('💸 Registrando despesa automática:', transactionData);
        
        await setDoc(doc(db, 'cash_flow_transactions', transactionId), transactionData);
        
        console.log('✅ Despesa registrada automaticamente');
        
        // Recarregar dados se estivermos na view de fluxo de caixa
        await loadTransactions();
        if (cashflowState.currentView === 'summary') {
            loadSummary();
        } else if (cashflowState.currentView === 'expenses') {
            loadRecentExpenses();
        }
        
        return transactionId;
        
    } catch (error) {
        console.error('❌ Erro ao registrar despesa automática:', error);
        showPopup('Erro ao registrar despesa: ' + error.message, false, null, 'error');
        throw error;
    }
}

// Funções globais para serem chamadas pelos botões
window.editTransaction = function(transactionId) {
    const transaction = cashflowState.transactions.find(t => t.id === transactionId);
    if (transaction) {
        // TODO: Implementar edição de transação
        showPopup('Funcionalidade de edição em desenvolvimento', false, null, 'info');
    }
};

window.deleteTransaction = async function(transactionId) {
    const db = getFirestoreDb();
    if (!db) {
        console.error("❌ Firestore não inicializado no módulo de fluxo de caixa ao excluir transação.");
        showPopup('Erro: Firestore não inicializado.', false, null, 'error');
        return;
    }
    const transaction = cashflowState.transactions.find(t => t.id === transactionId);
    if (!transaction) return;
    
    const confirmed = await showPopup(`Tem certeza que deseja excluir a transação "${transaction.description}"?`, true);
    if (confirmed) {
        try {
            await deleteDoc(doc(db, 'cash_flow_transactions', transactionId));
            showPopup('Transação excluída com sucesso!', false, null, 'success');
            await loadTransactions();
            
            if (cashflowState.currentView === 'expenses') {
                loadRecentExpenses();
            } else if (cashflowState.currentView === 'summary') {
                loadSummary();
            }
            
        } catch (error) {
            console.error('❌ Erro ao excluir transação:', error);
            showPopup('Erro ao excluir transação: ' + error.message, false, null, 'error');
        }
    }
};

// Exportar função de carregamento de resumo para uso externo
export function loadCashFlowSummary() {
    // Esta função agora apenas chama loadCashFlowData para recarregar tudo
    loadCashFlowData();
}

// Exportar estado para debug
export { cashflowState };