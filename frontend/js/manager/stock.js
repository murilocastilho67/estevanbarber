import { collection, getDocs, doc, setDoc, deleteDoc, getDoc, query, where, orderBy, runTransaction, addDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { showPopup, showSection } from './utils.js';

async function createCashFlowTransaction(db, movement) {
    const { type, productId, quantity, unitCost, unitPrice, timestamp, reason, productName } = movement;
    const cashFlowData = {
        id: `cf_${Date.now()}`,
        type: type === 'entry' ? 'expense' : 'revenue',
        amount: type === 'entry' ? quantity * unitCost : quantity * unitPrice,
        description: `${type === 'entry' ? 'Compra' : 'Venda'} de ${productName || 'produto'}`,
        source: type === 'entry' ? 'product_purchase' : 'stock_sale',
        relatedEntityId: movement.id,
        timestamp: timestamp || new Date().toISOString(),
        category: type === 'entry' ? 'inventory' : 'sales'
    };
    const cashFlowRef = await addDoc(collection(db, 'cash_flow_transactions'), cashFlowData);
    return cashFlowRef.id;
}

async function loadStockMovements(db) {
    try {
        console.log('Carregando histórico de movimentações...');
        const stockMovementsList = document.getElementById('stockMovementsList');
        stockMovementsList.innerHTML = '';

        const productsSnapshot = await getDocs(collection(db, 'stock'));
        const productMap = {};
        if (!productsSnapshot.empty) {
            productsSnapshot.forEach((docSnapshot) => {
                const product = docSnapshot.data();
                productMap[product.id] = product.name;
            });
        }

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
            
            const unitCost = typeof movement.unitCost === 'string' ? parseFloat(movement.unitCost) : movement.unitCost;
            const unitPrice = movement.type === 'exit' && movement.unitPrice != null ? (typeof movement.unitPrice === 'string' ? parseFloat(movement.unitPrice) : movement.unitPrice) : null;
            const profit = movement.type === 'exit' && movement.profit != null ? (typeof movement.profit === 'string' ? parseFloat(movement.profit) : movement.profit) : null;

            const card = document.createElement("div");
            card.className = "card"; // Usando a classe card padronizada
            card.innerHTML = `
                <div class="card-info">
                    <h4><i class="fas fa-exchange-alt"></i> ${productName}</h4>
                    <p><strong>Tipo:</strong> ${movement.type === "entry" ? "Entrada" : "Saída"}</p>
                    <p><strong>Data:</strong> ${formattedDate}</p>
                    <p><strong>Quantidade:</strong> ${movement.quantity}</p>
                    <p><strong>Custo por Unidade:</strong> R$${isNaN(unitCost) ? "0.00" : unitCost.toFixed(2)}</p>
                    ${movement.type === "exit" ? `
                        <p><strong>Valor de Venda:</strong> R$${isNaN(unitPrice) ? "0.00" : unitPrice.toFixed(2)}</p>
                        <p><strong>Lucro:</strong> R$${isNaN(profit) ? "0.00" : profit.toFixed(2)}</p>
                    ` : ""}
                    <p><strong>Motivo:</strong> ${movement.reason}</p>
                </div>
            `;
            stockMovementsList.appendChild(card);
        });
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

        const stockSnapshot = await getDocs(collection(db, 'stock'));
        if (stockSnapshot.empty) {
            stockList.innerHTML = '<p>Nenhum produto em estoque.</p>';
            totalStockValue.textContent = '0.00';
            movementProductFilter.innerHTML = '<option value="all">Todos</option>';
        } else {
            movementProductFilter.innerHTML = '<option value="all">Todos</option>';
            stockSnapshot.forEach((docSnapshot) => {
                const product = docSnapshot.data();
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = product.name;
                movementProductFilter.appendChild(option);
            });

            stockSnapshot.forEach((docSnapshot) => {
                const product = docSnapshot.data();
                const value = product.quantity * product.averageCost;
                totalValue += value;

                const card = document.createElement("div");
                card.className = "card"; // Usando a classe card padronizada
                card.innerHTML = `
                    <div class="card-info">
                        <h4><i class="fas fa-box"></i> ${product.name}</h4>
                        <p><strong>Quantidade:</strong> ${product.quantity}</p>
                        <p><strong>Custo Médio:</strong> R$${product.averageCost.toFixed(2)}</p>
                        <p><strong>Valor de Venda:</strong> R$${product.sellingPrice.toFixed(2)}</p>
                        <p><strong>Valor Total (Custo):</strong> R$${value.toFixed(2)}</p>
                        <p><strong>Fornecedor:</strong> ${product.supplier || "Não informado"}</p>
                        <p><strong>Categoria:</strong> ${product.category || "Não informado"}</p>
                    </div>
                    <div class="card-actions">
                        <button class="action-btn btn-entry" data-id="${docSnapshot.id}" data-average-cost="${product.averageCost}" title="Registrar Entrada"><i class="fas fa-plus"></i></button>
                        <button class="action-btn btn-exit" data-id="${docSnapshot.id}" data-average-cost="${product.averageCost}" data-selling-price="${product.sellingPrice}" ${product.quantity === 0 ? "disabled" : ""} title="Registrar Saída"><i class="fas fa-minus"></i></button>
                        <button class="action-btn btn-edit" data-id="${docSnapshot.id}" title="Editar Produto"><i class="fas fa-edit"></i></button>
                        <button class="action-btn btn-delete" data-id="${docSnapshot.id}" ${product.quantity > 0 ? "disabled" : ""} title="Excluir Produto"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                stockList.appendChild(card);
            });

            totalStockValue.textContent = totalValue.toFixed(2);
        }
        document.querySelectorAll(".btn-entry").forEach(btn => {
            btn.addEventListener("click", () => {
                const productId = btn.dataset.id;
                const averageCost = parseFloat(btn.dataset.averageCost);
                showStockMovementPopup("Registrar Entrada", "entry", productId, averageCost);
            });
        });

        document.querySelectorAll(".btn-exit").forEach(btn => {
            btn.addEventListener("click", () => {
                const productId = btn.dataset.id;
                const averageCost = parseFloat(btn.dataset.averageCost);
                const sellingPrice = parseFloat(btn.dataset.sellingPrice);
                showStockMovementPopup("Registrar Saída", "exit", productId, averageCost, sellingPrice);
            });
        });

        document.querySelectorAll(".btn-edit").forEach(btn => {
            btn.addEventListener("click", async () => {
                const productId = btn.dataset.id;
                try {
                    const productDoc = await getDoc(doc(db, "stock", productId));
                    if (productDoc.exists()) {
                        const product = productDoc.data();
                        document.getElementById("productId").value = productId;
                        document.getElementById("productName").value = product.name;
                        document.getElementById("costPrice").value = product.averageCost;
                        document.getElementById("sellingPrice").value = product.sellingPrice;
                        document.getElementById("supplier").value = product.supplier || "";
                        document.getElementById("category").value = product.category || "Higiene";
                        document.getElementById("stockForm").querySelector("button[type=\"submit\"]").textContent = "Salvar Alterações";
                    }
                } catch (error) {
                    console.error("Erro ao carregar produto para edição:", error);
                    showPopup("Erro ao carregar produto para edição: " + error.message);
                }
            });
        });

        document.querySelectorAll(".btn-delete").forEach(btn => {
            btn.addEventListener("click", async () => {
                const confirmed = await showPopup("Excluir produto do estoque?", true);
                if (confirmed) {
                    try {
                        await deleteDoc(doc(db, "stock", btn.dataset.id));
                        console.log("Produto excluído:", btn.dataset.id);
                        loadStockProducts(db);
                        showPopup("Produto excluído com sucesso!");
                    } catch (error) {
                        console.error("Erro ao excluir produto:", error);
                        showPopup("Erro ao excluir produto: " + error.message);
                    }
                }
            });
        });    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        showPopup('Erro ao carregar produtos: ' + error.message);
    }
}

async function showStockMovementPopup(title, type, productId, averageCost, sellingPrice = null) {
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

    titleElement.textContent = title;
    productIdInput.value = productId;
    typeInput.value = type;

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
        unitCostInput.value = averageCost.toFixed(2);
        unitPriceLabel.style.display = 'block';
        unitPriceInput.style.display = 'block';
        unitPriceInput.value = sellingPrice.toFixed(2);
    }

    popup.style.display = 'flex';

    const closePopup = () => {
        popup.style.display = 'none';
        form.reset();
    };
    cancelBtn.addEventListener('click', closePopup);

    form.onsubmit = async (e) => {
        e.preventDefault();
        const quantity = parseInt(document.getElementById('movementQuantity').value);
        let unitCost = parseFloat(document.getElementById('movementUnitCost').value);
        let unitPrice = type === 'exit' ? parseFloat(document.getElementById('movementUnitPrice').value) : null;
        const reason = document.getElementById('movementReason').value;

        if (isNaN(unitCost)) unitCost = 0;
        if (type === 'exit' && isNaN(unitPrice)) unitPrice = 0;

        try {
            const productDoc = await getDoc(doc(db, 'stock', productId));
            if (!productDoc.exists()) throw new Error('Produto não encontrado');

            const product = productDoc.data();
            let newQuantity = product.quantity;
            let newAverageCost = product.averageCost;

            await runTransaction(db, async (transaction) => {
                const productRef = doc(db, 'stock', productId);
                const productSnap = await transaction.get(productRef);
                if (!productSnap.exists()) throw new Error('Produto não encontrado na transação');

                const currentProduct = productSnap.data();
                if (type === 'entry') {
                    const currentTotalCost = currentProduct.quantity * currentProduct.averageCost;
                    const newTotalCost = (quantity * unitCost) + currentTotalCost;
                    newQuantity = currentProduct.quantity + quantity;
                    newAverageCost = newQuantity > 0 ? newTotalCost / newQuantity : 0;
                } else {
                    if (quantity > currentProduct.quantity) throw new Error('Quantidade insuficiente em estoque');
                    newQuantity = currentProduct.quantity - quantity;
                    newAverageCost = currentProduct.averageCost;
                }

                transaction.set(productRef, {
                    ...currentProduct,
                    quantity: newQuantity,
                    averageCost: newAverageCost
                });

                const movementId = `movement${Date.now()}`;
                const timestamp = new Date().toISOString();
                const profit = type === 'exit' ? (unitPrice - unitCost) * quantity : null;
                const movementData = {
                    id: movementId,
                    type,
                    productId,
                    quantity,
                    unitCost,
                    unitPrice,
                    profit,
                    timestamp,
                    reason,
                    cashFlowTransactionId: null
                };
                const movementRef = await transaction.set(doc(db, 'stock_movements', movementId), movementData);

                // Cria transação de fluxo de caixa
                const cashFlowData = {
                    id: `cf_${Date.now()}`,
                    type: type === 'entry' ? 'expense' : 'revenue',
                    amount: type === 'entry' ? quantity * unitCost : quantity * unitPrice,
                    description: `${type === 'entry' ? 'Compra' : 'Venda'} de ${currentProduct.name || 'produto'}`,
                    source: type === 'entry' ? 'product_purchase' : 'stock_sale',
                    relatedEntityId: movementId,
                    timestamp,
                    category: type === 'entry' ? 'inventory' : 'sales'
                };
                const cashFlowRef = await addDoc(collection(db, 'cash_flow_transactions'), cashFlowData);
                transaction.update(doc(db, 'stock_movements', movementId), { cashFlowTransactionId: cashFlowRef.id });
            });

            closePopup();
            loadStockProducts(db);
            showPopup(`${type === 'entry' ? 'Entrada' : 'Saída'} registrada com sucesso!`);
        } catch (error) {
            console.error(`Erro ao registrar ${type === 'entry' ? 'entrada' : 'saída'}:`, error);
            showPopup(`Erro ao registrar ${type === 'entry' ? 'entrada' : 'saída'}: ${error.message}`);
        }
    };
}

function initStock(db) {
    console.log('Inicializando eventos de estoque...');
    const navStockMovements = document.getElementById('nav-stock-movements');
    const navStockProducts = document.getElementById('nav-stock-products');

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
            const id = productId || `product${Date.now()}`;

            try {
                const averageCost = isNaN(costPrice) ? 0 : costPrice;
                const validSellingPrice = isNaN(sellingPrice) ? 0 : sellingPrice;

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

export { initStock, loadStockMovements, loadStockProducts, showStockMovementPopup };