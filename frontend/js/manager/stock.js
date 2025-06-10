import { collection, getDocs, doc, setDoc, deleteDoc, getDoc, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { showPopup, showSection } from './utils.js';

function toggleStockSubitems() {
    const stockGroup = document.getElementById('nav-stock-group');
    const subitems = document.querySelectorAll('.nav-subitem');
    const isOpen = stockGroup.classList.contains('open');

    subitems.forEach(subitem => {
        subitem.style.display = isOpen ? 'none' : 'flex';
    });
    stockGroup.classList.toggle('open');
}

async function loadStockMovements(db) {
    try {
        console.log('Carregando histórico de movimentações...');
        const stockMovementsList = document.getElementById('stockMovementsList');
        stockMovementsList.innerHTML = '';

        // Carrega os produtos pra mapear IDs pra nomes
        const productsSnapshot = await getDocs(collection(db, 'stock'));
        const productMap = {};
        productsSnapshot.forEach((docSnapshot) => {
            const product = docSnapshot.data();
            productMap[product.id] = product.name;
        });

        // Carrega as movimentações, ordenadas por timestamp (mais recente primeiro)
        let movementsQuery = query(collection(db, 'stock_movements'), orderBy('timestamp', 'desc'));
        const movementsSnapshot = await getDocs(movementsQuery);
        if (movementsSnapshot.empty) {
            stockMovementsList.innerHTML = '<p>Nenhuma movimentação encontrada.</p>';
            return;
        }

        movementsSnapshot.forEach((docSnapshot) => {
            const movement = docSnapshot.data();
            const productName = productMap[movement.productId] || movement.productId;
            const date = new Date(movement.timestamp);
            const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
            
            // Converte unitCost e unitPrice pra número e fornece um fallback
            const unitCost = typeof movement.unitCost === 'string' ? parseFloat(movement.unitCost) : movement.unitCost;
            const unitPrice = movement.type === 'exit' && movement.unitPrice != null ? (typeof movement.unitPrice === 'string' ? parseFloat(movement.unitPrice) : movement.unitPrice) : null;
            const profit = movement.type === 'exit' && movement.profit != null ? (typeof movement.profit === 'string' ? parseFloat(movement.profit) : movement.profit) : null;

            const card = document.createElement('div');
            card.className = 'movement-card';
            card.innerHTML = `
                <p><strong>Produto:</strong> ${productName}</p>
                <p><strong>Tipo:</strong> ${movement.type === 'entry' ? 'Entrada' : 'Saída'}</p>
                <p><strong>Data:</strong> ${formattedDate}</p>
                <p><strong>Quantidade:</strong> ${movement.quantity}</p>
                <p><strong>Custo por Unidade:</strong> R$${isNaN(unitCost) ? '0.00' : unitCost.toFixed(2)}</p>
                ${movement.type === 'exit' ? `
                    <p><strong>Valor de Venda:</strong> R$${isNaN(unitPrice) ? '0.00' : unitPrice.toFixed(2)}</p>
                    <p><strong>Lucro:</strong> R$${isNaN(profit) ? '0.00' : profit.toFixed(2)}</p>
                ` : ''}
                <p><strong>Motivo:</strong> ${movement.reason}</p>
            `;
            stockMovementsList.appendChild(card);
        });

        if (stockMovementsList.innerHTML === '') {
            stockMovementsList.innerHTML = '<p>Nenhuma movimentação encontrada.</p>';
        }
    } catch (error) {
        console.error('Erro ao carregar histórico de movimentações:', error);
        showPopup('Erro ao carregar histórico: ' + error.message);
    }
}

async function loadStockProducts(db) {
    try {
        console.log('Carregando produtos...');
        const stockList = document.getElementById('stockList');
        const totalStockValue = document.getElementById('totalStockValue');
        const movementProductFilter = document.getElementById('movementProductFilter');
        stockList.innerHTML = '';
        let totalValue = 0;

        // Carrega os produtos pra exibir na lista e no filtro
        const stockSnapshot = await getDocs(collection(db, 'stock'));
        if (stockSnapshot.empty) {
            stockList.innerHTML = '<p>Nenhum produto em estoque.</p>';
            totalStockValue.textContent = '0.00';
            movementProductFilter.innerHTML = '<option value="all">Todos</option>'; // Limpa o filtro
        } else {
            // Popula o filtro de produtos
            movementProductFilter.innerHTML = '<option value="all">Todos</option>';
            stockSnapshot.forEach((docSnapshot) => {
                const product = docSnapshot.data();
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = product.name;
                movementProductFilter.appendChild(option);
            });

            // Exibe os produtos como cards
            stockSnapshot.forEach((docSnapshot) => {
                const product = docSnapshot.data();
                const value = product.quantity * product.averageCost;
                totalValue += value;

                const card = document.createElement('div');
                card.className = 'stock-card';
                card.innerHTML = `
                    <div class="stock-info">
                        <h4>${product.name}</h4>
                        <p>Quantidade: ${product.quantity}</p>
                        <p>Custo Médio: R$${product.averageCost.toFixed(2)}</p>
                        <p>Valor de Venda: R$${product.sellingPrice.toFixed(2)}</p>
                        <p>Valor Total (Custo): R$${value.toFixed(2)}</p>
                        <p>Fornecedor: ${product.supplier || 'Não informado'}</p>
                        <p>Categoria: ${product.category || 'Não informado'}</p>
                    </div>
                    <div class="stock-actions">
                        <button class="action-btn stock-entry" data-id="${docSnapshot.id}" data-average-cost="${product.averageCost}">Entrada</button>
                        <button class="action-btn stock-exit" data-id="${docSnapshot.id}" data-average-cost="${product.averageCost}" data-selling-price="${product.sellingPrice}" ${product.quantity === 0 ? 'disabled' : ''}>Saída</button>
                        <button class="action-btn edit-stock" data-id="${docSnapshot.id}">Editar</button>
                        <button class="action-btn delete-stock" data-id="${docSnapshot.id}" ${product.quantity > 0 ? 'disabled' : ''}>Excluir</button>
                    </div>
                `;
                stockList.appendChild(card);
            });

            totalStockValue.textContent = totalValue.toFixed(2);
        }

        // Adiciona eventos aos botões de entrada
        document.querySelectorAll('.stock-entry').forEach(btn => {
            btn.addEventListener('click', () => {
                const productId = btn.dataset.id;
                const averageCost = parseFloat(btn.dataset.averageCost);
                showStockMovementPopup('Registrar Entrada', 'entry', productId, averageCost);
            });
        });

        // Adiciona eventos aos botões de saída
        document.querySelectorAll('.stock-exit').forEach(btn => {
            btn.addEventListener('click', () => {
                const productId = btn.dataset.id;
                const averageCost = parseFloat(btn.dataset.averageCost);
                const sellingPrice = parseFloat(btn.dataset.sellingPrice);
                showStockMovementPopup('Registrar Saída', 'exit', productId, averageCost, sellingPrice);
            });
        });

        // Adiciona eventos aos botões de editar
        document.querySelectorAll('.edit-stock').forEach(btn => {
            btn.addEventListener('click', async () => {
                const productId = btn.dataset.id;
                try {
                    const productDoc = await getDoc(doc(db, 'stock', productId));
                    if (productDoc.exists()) {
                        const product = productDoc.data();
                        document.getElementById('productId').value = productId;
                        document.getElementById('productName').value = product.name;
                        document.getElementById('costPrice').value = product.averageCost;
                        document.getElementById('sellingPrice').value = product.sellingPrice;
                        document.getElementById('supplier').value = product.supplier || '';
                        document.getElementById('category').value = product.category || 'Higiene';
                        document.getElementById('stockForm').querySelector('button[type="submit"]').textContent = 'Salvar Alterações';
                    }
                } catch (error) {
                    console.error('Erro ao carregar produto para edição:', error);
                    showPopup('Erro ao carregar produto para edição: ' + error.message);
                }
            });
        });

        // Adiciona eventos aos botões de excluir
        document.querySelectorAll('.delete-stock').forEach(btn => {
            btn.addEventListener('click', async () => {
                const confirmed = await showPopup('Excluir produto do estoque?', true);
                if (confirmed) {
                    try {
                        await deleteDoc(doc(db, 'stock', btn.dataset.id));
                        console.log('Produto excluído:', btn.dataset.id);
                        loadStockProducts(db);
                        showPopup('Produto excluído com sucesso!');
                    } catch (error) {
                        console.error('Erro ao excluir produto:', error);
                        showPopup('Erro ao excluir produto: ' + error.message);
                    }
                }
            });
        });
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        showPopup('Erro ao carregar produtos: ' + error.message);
    }
}

function showStockMovementPopup(title, type, productId, averageCost, sellingPrice = null) {
    const popup = document.getElementById('stockMovementPopup');
    const form = document.getElementById('stockMovementForm');
    const titleElement = document.getElementById('stockMovementTitle');
    const productIdInput = document.getElementById('movementProductId');
    const typeInput = document.getElementById('movementType');
    const unitCostLabel = document.getElementById('movementUnitCostLabel');
    const unitCostInput = document.getElementById('movementUnitCost');
    const unitPriceLabel = document.getElementById('movementUnitPriceLabel');
    const unitPriceInput = document.getElementById('movementUnitPrice');
    const cancelBtn = document.getElementById('stockMovementCancel');

    // Configura o pop-up
    titleElement.textContent = title;
    productIdInput.value = productId;
    typeInput.value = type;

    // Mostra/esconde campos com base no tipo de movimentação
    if (type === 'entry') {
        unitCostLabel.style.display = 'block';
        unitCostInput.style.display = 'block';
        unitCostInput.value = averageCost.toFixed(2);
        unitPriceLabel.style.display = 'none';
        unitPriceInput.style.display = 'none';
        unitPriceInput.value = '';
    } else {
        unitCostLabel.style.display = 'none';
        unitCostInput.style.display = 'none';
        unitCostInput.value = averageCost.toFixed(2); // Usa o custo médio atual
        unitPriceLabel.style.display = 'block';
        unitPriceInput.style.display = 'block';
        unitPriceInput.value = sellingPrice.toFixed(2);
    }

    // Exibe o pop-up
    popup.style.display = 'flex';

    // Configura o botão de cancelar
    const closePopup = () => {
        popup.style.display = 'none';
        form.reset();
    };
    cancelBtn.addEventListener('click', closePopup);

    // Configura o submit do formulário
    form.onsubmit = async (e) => {
        e.preventDefault();
        const quantity = parseInt(document.getElementById('movementQuantity').value);
        let unitCost = parseFloat(document.getElementById('movementUnitCost').value);
        let unitPrice = type === 'exit' ? parseFloat(document.getElementById('movementUnitPrice').value) : null;
        const reason = document.getElementById('movementReason').value;

        // Garante que unitCost e unitPrice sejam números válidos
        if (isNaN(unitCost)) {
            unitCost = 0;
            console.warn('unitCost inválido, usando 0 como fallback');
        }
        if (type === 'exit' && isNaN(unitPrice)) {
            unitPrice = 0;
            console.warn('unitPrice inválido, usando 0 como fallback');
        }

        try {
            const productDoc = await getDoc(doc(db, 'stock', productId));
            if (!productDoc.exists()) throw new Error('Produto não encontrado');

            const product = productDoc.data();
            let newQuantity = product.quantity;
            let newAverageCost = product.averageCost;

            if (type === 'entry') {
                // Calcula o novo custo médio
                const currentTotalCost = product.quantity * product.averageCost;
                const newTotalCost = (quantity * unitCost) + currentTotalCost;
                newQuantity = product.quantity + quantity;
                newAverageCost = newQuantity > 0 ? newTotalCost / newQuantity : 0;
            } else {
                // Verifica se há estoque suficiente
                if (quantity > product.quantity) {
                    throw new Error('Quantidade insuficiente em estoque');
                }
                newQuantity = product.quantity - quantity;
                newAverageCost = product.averageCost; // Custo médio não muda na saída
            }

            // Atualiza o produto
            await setDoc(doc(db, 'stock', productId), {
                ...product,
                quantity: newQuantity,
                averageCost: newAverageCost
            });

            // Registra a movimentação
            const movementId = `movement${Date.now()}`;
            const timestamp = new Date().toISOString();
            const profit = type === 'exit' ? (unitPrice - unitCost) * quantity : null;
            await setDoc(doc(db, 'stock_movements', movementId), {
                id: movementId,
                type,
                productId,
                quantity,
                unitCost,
                unitPrice,
                profit,
                timestamp,
                reason
            });

            closePopup();
            loadStockProducts(db); // Recarrega só a seção de produtos
            showPopup(`${type === 'entry' ? 'Entrada' : 'Saída'} registrada com sucesso!`);
        } catch (error) {
            console.error(`Erro ao registrar ${type === 'entry' ? 'entrada' : 'saída'}:`, error);
            showPopup(`Erro ao registrar ${type === 'entry' ? 'entrada' : 'saída'}: ${error.message}`);
        }
    };
}

function initStock(db) {
    console.log('Inicializando eventos de estoque...');
    const navStockGroup = document.getElementById('nav-stock-group');
    const navStockMovements = document.getElementById('nav-stock-movements');
    const navStockProducts = document.getElementById('nav-stock-products');

    if (navStockGroup) {
        navStockGroup.addEventListener('click', (e) => {
            e.preventDefault();
            toggleStockSubitems();
        });
    } else {
        console.error('Elemento nav-stock-group não encontrado');
    }

    if (navStockMovements) {
        navStockMovements.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Clicou em Movimentações');
            showSection('stock-section');
            document.getElementById('stock-movements-section').classList.add('active');
            document.getElementById('stock-products-section').classList.remove('active');
            loadStockMovements(db);
        });
    } else {
        console.error('Elemento nav-stock-movements não encontrado');
    }

    if (navStockProducts) {
        navStockProducts.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Clicou em Produtos');
            showSection('stock-section');
            document.getElementById('stock-products-section').classList.add('active');
            document.getElementById('stock-movements-section').classList.remove('active');
            loadStockProducts(db);
        });
    } else {
        console.error('Elemento nav-stock-products não encontrado');
    }

    const stockForm = document.getElementById('stockForm');
    if (stockForm) {
        stockForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const productId = document.getElementById('productId').value;
            const name = document.getElementById('productName').value;
            const costPrice = parseFloat(document.getElementById('costPrice').value);
            const sellingPrice = parseFloat(document.getElementById('sellingPrice').value);
            const supplier = document.getElementById('supplier').value;
            const category = document.getElementById('category').value;
            const id = productId || `product${Date.now()}`; // Usa o ID existente ou cria um novo

            try {
                // Garante que costPrice e sellingPrice sejam números válidos
                const averageCost = isNaN(costPrice) ? 0 : costPrice;
                const validSellingPrice = isNaN(sellingPrice) ? 0 : sellingPrice;

                // Se for um produto novo, define quantidade e custo médio iniciais como 0
                // A quantidade será ajustada via movimentações de entrada
                const productData = {
                    id,
                    name,
                    quantity: 0,
                    averageCost,
                    sellingPrice: validSellingPrice,
                    supplier,
                    category
                };

                if (productId) {
                    // Se for edição, preserva a quantidade e atualiza o custo médio
                    const existingProductDoc = await getDoc(doc(db, 'stock', productId));
                    if (existingProductDoc.exists()) {
                        const existingProduct = existingProductDoc.data();
                        productData.quantity = existingProduct.quantity;
                    }
                }

                await setDoc(doc(db, 'stock', id), productData);
                console.log('Produto salvo:', id);
                loadStockProducts(db);
                document.getElementById('stockForm').reset();
                document.getElementById('productId').value = '';
                document.getElementById('stockForm').querySelector('button[type="submit"]').textContent = 'Adicionar Produto';
                showPopup('Produto salvo com sucesso!');
            } catch (error) {
                console.error('Erro ao salvar produto:', error);
                showPopup('Erro ao salvar produto: ' + error.message);
            }
        });
    } else {
        console.error('Elemento stockForm não encontrado');
    }
}

export { initStock, loadStockMovements, loadStockProducts };