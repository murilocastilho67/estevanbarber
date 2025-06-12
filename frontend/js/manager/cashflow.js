import { getDocs, collection, query, where, orderBy, addDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { showPopup, showSection } from './utils.js';

function initCashFlow(db) {
    console.log('Inicializando eventos de fluxo de caixa...');
    const navCashFlow = document.getElementById('nav-cashflow');
    if (navCashFlow) {
        navCashFlow.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Clicou em Fluxo de Caixa');
            showSection('cashflow-section');
            loadCashFlow(db);
        });
    } else {
        console.error('Elemento nav-cashflow não encontrado');
    }

    const expenseForm = document.getElementById('expenseForm');
    if (expenseForm) {
        expenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const amount = parseFloat(document.getElementById('expenseAmount').value);
            const description = document.getElementById('expenseDescription').value;
            const category = document.getElementById('expenseCategory').value;
            const cashFlowData = {
                id: `cf_${Date.now()}`,
                type: 'expense',
                amount,
                description,
                source: category,
                timestamp: new Date().toISOString()
            };
            await addDoc(collection(db, 'cash_flow_transactions'), cashFlowData);
            expenseForm.reset();
            loadCashFlow(db);
            showPopup('Despesa registrada com sucesso!');
        });
    } else {
        console.error('Elemento expenseForm não encontrado');
    }
}

async function loadCashFlow(db) {
    try {
        const cashFlowList = document.getElementById('cashflowList');
        if (cashFlowList) {
            cashFlowList.innerHTML = '<p>Carregando transações...</p>';
            const q = query(collection(db, 'cash_flow_transactions'), orderBy('timestamp', 'desc'));
            const snapshot = await getDocs(q);
            cashFlowList.innerHTML = '';
            let totalRevenue = 0, totalExpense = 0;
            snapshot.forEach(doc => {
                const data = doc.data();
                const div = document.createElement('div');
                div.innerHTML = `<p>${data.timestamp} - ${data.type}: R$${data.amount.toFixed(2)} - ${data.description} (${data.source})</p>`;
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

export { initCashFlow, loadCashFlow };