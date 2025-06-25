import { getDocs, collection, query, where, orderBy, addDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { showPopup, showSection } from './utils.js';

function initCashFlow(db) {
    console.log('Inicializando eventos de fluxo de caixa...');
    const navCashFlow = document.getElementById('nav-cashflow');
    if (navCashFlow) {
        navCashFlow.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Clicou em Fluxo de Caixa');
            // Não carrega resumo aqui, só abre o submenu
        });
    } else {
        console.error('Elemento nav-cashflow não encontrado');
    }
}

async function loadCashFlowSummary(db) {
    try {
        const cashFlowList = document.getElementById('cashflowList');
        if (cashFlowList) {
            cashFlowList.innerHTML = '<p>Carregando transações...</p>';
            const barberFilter = document.getElementById('cashflowBarberFilter').value;
            const dateFilter = document.getElementById('cashflowDateFilter').value;
            const typeFilter = document.getElementById('cashflowTypeFilter').value;
            let q = query(collection(db, 'cash_flow_transactions'), orderBy('timestamp', 'desc'));

            if (barberFilter !== 'all') {
                q = query(q, where('relatedEntityId', 'in', [
                    ...await getDocs(query(collection(db, 'appointments'), where('barberId', '==', barberFilter))).docs.map(doc => doc.id)
                ]));
            }
            if (dateFilter) {
                const date = new Date(dateFilter);
                q = query(q, where('timestamp', '>=', date.toISOString().split('T')[0]));
            }
            if (typeFilter !== 'all') {
                q = query(q, where('type', '==', typeFilter));
            }

            const snapshot = await getDocs(q);
            cashFlowList.innerHTML = '';
            let totalRevenue = 0, totalExpense = 0;
            snapshot.forEach(doc => {
                const data = doc.data();
                const date = new Date(data.timestamp);
                const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                const description = data.description.replace(/_/g, ' ').replace('service sale', 'Venda de Serviço').replace('product purchase', 'Compra de Produto').replace('stock sale', 'Venda de Estoque');
                const div = document.createElement('div');
                div.innerHTML = `<p><strong>Data:</strong> ${formattedDate} - <strong>Tipo:</strong> ${data.type === 'revenue' ? 'Receita' : 'Despesa'} - <strong>Descrição:</strong> ${description} - <strong>Valor:</strong> R$${data.amount.toFixed(2)} - <strong>Categoria:</strong> ${data.source}</p>`;
                cashFlowList.appendChild(div);
                if (data.type === 'revenue') totalRevenue += data.amount;
                else totalExpense += data.amount;
            });
            document.getElementById('totalRevenue').textContent = totalRevenue.toFixed(2);
            document.getElementById('totalExpense').textContent = totalExpense.toFixed(2);
            document.getElementById('netBalance').textContent = (totalRevenue - totalExpense).toFixed(2);
        }
    } catch (error) {
        console.error('Erro ao carregar fluxo de caixa:', error);
        showPopup('Erro ao carregar fluxo de caixa: ' + error.message);
    }
}

const fixedExpenseForm = document.getElementById('fixedExpenseForm');
if (fixedExpenseForm) {
    fixedExpenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('fixedExpenseAmount').value);
        const description = document.getElementById('fixedExpenseDescription').value;
        const category = document.getElementById('fixedExpenseCategory').value;
        const frequency = document.getElementById('fixedExpenseFrequency').value;
        const dueDate = document.getElementById('fixedExpenseDueDate').value;
        const cashFlowData = {
            id: `cf_${Date.now()}`,
            type: 'expense',
            amount,
            description: `${description} (Fixa - ${frequency})`,
            source: category,
            timestamp: new Date().toISOString(),
            dueDate
        };
        await addDoc(collection(db, 'cash_flow_transactions'), cashFlowData);
        fixedExpenseForm.reset();
        loadCashFlowSummary(db);
        showPopup('Despesa fixa registrada com sucesso!');
    });
} else {
    console.error('Elemento fixedExpenseForm não encontrado');
}

export { initCashFlow, loadCashFlowSummary };