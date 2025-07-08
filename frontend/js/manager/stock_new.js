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
    addDoc 
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { showPopup, getFirestoreDb } from './utils.js';
import { registerRevenue, registerExpense } from './cashflow_enhanced.js';

// Estado global do módulo de estoque
const stockState = {
    products: [],
    movements: [],
    currentView: 'products',
    isLoading: false,
    db: null
};

// Inicialização do módulo de estoque
export function initStockModule( ) {
    console.log("🔄 Inicializando novo módulo de estoque...");
    
    const db = getFirestoreDb();
    if (!db) {
        console.error("❌ Instância do Firestore não fornecida em initStockModule");
        return;
    }
    
    stockState.db = db; // Ainda mantemos para compatibilidade interna, mas o ideal é remover
    console.log("✅ Firestore conectado ao módulo de estoque");
    
    // Configurar navegação entre views
    setupNavigation();
    
    // Configurar formulários
    setupProductForm();
    setupMovementForm();
    
    // Carregar dados iniciais
    loadProducts();
    
    console.log('✅ Módulo de estoque inicializado com sucesso');
}

// Configurar navegação entre produtos e movimentações
function setupNavigation() {
    const productsBtn = document.getElementById('stock-nav-products');
    const movementsBtn = document.getElementById('stock-nav-movements');
    const productsView = document.getElementById('stock-products-view');
    const movementsView = document.getElementById('stock-movements-view');
    
    if (!productsBtn || !movementsBtn || !productsView || !movementsView) {
        console.error('❌ Elementos de navegação não encontrados');
        return;
    }
    
    productsBtn.addEventListener('click', () => {
        switchView('products');
    });
    
    movementsBtn.addEventListener('click', () => {
        switchView('movements');
    });
    
    // Configurar filtro de produtos
    const productCategoryFilter = document.getElementById('product-category-filter');
    if (productCategoryFilter) {
        productCategoryFilter.addEventListener('change', () => {
            renderProducts();
        });
    }
}

// Alternar entre views
function switchView(view) {
    const productsBtn = document.getElementById('stock-nav-products');
    const movementsBtn = document.getElementById('stock-nav-movements');
    const productsView = document.getElementById('stock-products-view');
    const movementsView = document.getElementById('stock-movements-view');
    
    // Atualizar botões
    productsBtn.classList.toggle('active', view === 'products');
    movementsBtn.classList.toggle('active', view === 'movements');
    
    // Atualizar views
    productsView.classList.toggle('active', view === 'products');
    movementsView.classList.toggle('active', view === 'movements');
    
    stockState.currentView = view;
    
    if (view === 'products') {
        loadProducts();
    } else {
        loadMovements();
    }
}

// Configurar formulário de produtos
function setupProductForm() {
    const addBtn = document.getElementById('add-product-btn');
    const cancelBtn = document.getElementById('cancel-product-btn');
    const form = document.getElementById('product-form');
    const formContainer = document.getElementById('product-form-container');
    
    if (!addBtn || !cancelBtn || !form || !formContainer) {
        console.error('❌ Elementos do formulário de produto não encontrados');
        return;
    }
    
    addBtn.addEventListener('click', () => {
        showProductForm();
    });
    
    cancelBtn.addEventListener('click', () => {
        hideProductForm();
    });
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveProduct();
    });
}

// Mostrar formulário de produto
function showProductForm(product = null) {
    const formContainer = document.getElementById('product-form-container');
    const form = document.getElementById('product-form');
    
    if (product) {
        // Edição
        document.getElementById('product-id').value = product.id;
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-category').value = product.category || 'Higiene';
        document.getElementById('product-cost').value = product.averageCost;
        document.getElementById('product-price').value = product.sellingPrice;
        document.getElementById('product-supplier').value = product.supplier || '';
        document.getElementById('save-product-btn').textContent = 'Atualizar Produto';
    } else {
        // Novo produto
        form.reset();
        document.getElementById('product-id').value = '';
        document.getElementById('save-product-btn').textContent = 'Salvar Produto';
    }
    
    formContainer.style.display = 'block';
    document.getElementById('product-name').focus();
}

// Ocultar formulário de produto
function hideProductForm() {
    const formContainer = document.getElementById('product-form-container');
    const form = document.getElementById('product-form');
    
    formContainer.style.display = 'none';
    form.reset();
}

// Salvar produto
async function saveProduct() {
    const db = getFirestoreDb();
    if (!db) {
        console.error("Firestore não inicializado em saveProduct");
        return;
    }
    if (stockState.isLoading) return;
    
    try {
        stockState.isLoading = true;
        
        const productId = document.getElementById('product-id').value;
        const name = document.getElementById('product-name').value.trim();
        const category = document.getElementById('product-category').value;
        const cost = parseFloat(document.getElementById('product-cost').value) || 0;
        const price = parseFloat(document.getElementById('product-price').value) || 0;
        const supplier = document.getElementById('product-supplier').value.trim();
        
        if (!name) {
            showPopup('Nome do produto é obrigatório');
            return;
        }
        
        const id = productId || `product_${Date.now()}`;
        let quantity = 0;
        
        // Se for edição, manter a quantidade atual
        if (productId) {
            const existingProduct = stockState.products.find(p => p.id === productId);
            if (existingProduct) {
                quantity = existingProduct.quantity;
            }
        }
        
        const productData = {
            id,
            name,
            category,
            averageCost: cost,
            sellingPrice: price,
            supplier,
            quantity,
            createdAt: productId ? undefined : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Remover campos undefined
        Object.keys(productData).forEach(key => {
            if (productData[key] === undefined) {
                delete productData[key];
            }
        });
        
        console.log('💾 Salvando produto:', productData);
        
        await setDoc(doc(db, 'stock', id), productData);
        
        console.log('✅ Produto salvo com sucesso');
        showPopup('Produto salvo com sucesso!');
        
        hideProductForm();
        
        // Forçar atualização da lista de produtos
        await loadProducts();
        
        // Se estivermos na view de produtos, garantir que ela seja renderizada
        if (stockState.currentView === 'products') {
            renderProducts();
            updateProductsSummary();
            updateMovementFilters();
        }
        
    } catch (error) {
        console.error('❌ Erro ao salvar produto:', error);
        showPopup('Erro ao salvar produto: ' + error.message);
    } finally {
        stockState.isLoading = false;
    }
}

// Carregar produtos
async function loadProducts() {
    const db = getFirestoreDb();
    if (!db) {
        console.error("Firestore não inicializado em loadProducts");
        return;
    }
    if (stockState.isLoading) return;
    
    try {
        stockState.isLoading = true;
        console.log('🔄 Carregando produtos...');
        
        const productsContainer = document.getElementById('products-list');
        if (!productsContainer) {
            console.error('❌ Container de produtos não encontrado');
            return;
        }
        
        // Mostrar loading
        productsContainer.innerHTML = '<div class="loading">Carregando produtos...</div>';
        
        // Buscar produtos no Firestore
        const snapshot = await getDocs(collection(db, 'stock'));
        
        stockState.products = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            stockState.products.push({
                id: doc.id,
                ...data
            });
        });
        
        console.log(`✅ ${stockState.products.length} produtos carregados`);
        
        // Renderizar produtos
        renderProducts();
        updateProductsSummary();
        updateMovementFilters();
        
    } catch (error) {
        console.error('❌ Erro ao carregar produtos:', error);
        const productsContainer = document.getElementById('products-list');
        if (productsContainer) {
            productsContainer.innerHTML = `<div class="error">Erro ao carregar produtos: ${error.message}</div>`;
        }
        showPopup('Erro ao carregar produtos: ' + error.message);
    } finally {
        stockState.isLoading = false;
    }
}

// Renderizar lista de produtos
function renderProducts() {
    const container = document.getElementById('products-list');
    if (!container) return;
    
    // Obter filtro selecionado
    const categoryFilter = document.getElementById('product-category-filter');
    const selectedCategory = categoryFilter ? categoryFilter.value : 'all';
    
    // Filtrar produtos
    let filteredProducts = stockState.products;
    if (selectedCategory !== 'all') {
        filteredProducts = stockState.products.filter(product => 
            (product.category || 'Outros') === selectedCategory
        );
    }
    
    if (filteredProducts.length === 0) {
        const message = selectedCategory === 'all' 
            ? 'Nenhum produto cadastrado' 
            : `Nenhum produto encontrado na categoria "${selectedCategory}"`;
        
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h3>${message}</h3>
                <p>${selectedCategory === 'all' ? 'Clique em "Adicionar Produto" para começar' : 'Tente selecionar outra categoria'}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredProducts.map(product => {
        const totalValue = (product.quantity || 0) * (product.averageCost || 0);
        const isOutOfStock = (product.quantity || 0) === 0;
        
        return `
            <div class="product-card ${isOutOfStock ? 'out-of-stock' : ''}">
                <div class="product-header">
                    <h4><i class="fas fa-box"></i> ${product.name}</h4>
                    <span class="product-category">${product.category || 'Sem categoria'}</span>
                </div>
                <div class="product-info">
                    <div class="info-row">
                        <span class="label">Quantidade:</span>
                        <span class="value ${isOutOfStock ? 'out-of-stock' : ''}">${product.quantity || 0}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Custo médio:</span>
                        <span class="value">R$ ${(product.averageCost || 0).toFixed(2)}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Preço de venda:</span>
                        <span class="value">R$ ${(product.sellingPrice || 0).toFixed(2)}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Valor total:</span>
                        <span class="value total">R$ ${totalValue.toFixed(2)}</span>
                    </div>
                    ${product.supplier ? `
                        <div class="info-row">
                            <span class="label">Fornecedor:</span>
                            <span class="value">${product.supplier}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="product-actions">
                    <button class="action-btn entry" onclick="openMovementModal('${product.id}', 'entry')" title="Registrar Entrada">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="action-btn exit" onclick="openMovementModal('${product.id}', 'exit')" 
                            ${isOutOfStock ? 'disabled' : ''} title="Registrar Saída">
                        <i class="fas fa-minus"></i>
                    </button>
                    <button class="action-btn edit" onclick="editProduct('${product.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteProduct('${product.id}')" 
                            ${(product.quantity || 0) > 0 ? 'disabled' : ''} title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Atualizar resumo dos produtos
function updateProductsSummary() {
    const totalValue = stockState.products.reduce((sum, product) => {
        return sum + ((product.quantity || 0) * (product.averageCost || 0));
    }, 0);
    
    const totalProducts = stockState.products.length;
    
    const totalValueElement = document.getElementById('total-stock-value');
    const totalProductsElement = document.getElementById('total-products');
    
    if (totalValueElement) {
        totalValueElement.textContent = totalValue.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
    
    if (totalProductsElement) {
        totalProductsElement.textContent = totalProducts;
    }
}

// Atualizar filtros de movimentação
function updateMovementFilters() {
    const filter = document.getElementById('movement-product-filter');
    if (!filter) return;
    
    filter.innerHTML = '<option value="all">Todos os produtos</option>';
    
    stockState.products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = product.name;
        filter.appendChild(option);
    });
}

// Configurar formulário de movimentações
function setupMovementForm() {
    const modal = document.getElementById('stock-movement-modal');
    const closeBtn = document.getElementById('close-movement-modal');
    const cancelBtn = document.getElementById('cancel-movement-btn');
    const form = document.getElementById('movement-form');
    
    if (!modal || !closeBtn || !cancelBtn || !form) {
        console.error('❌ Elementos do modal de movimentação não encontrados');
        return;
    }
    
    closeBtn.addEventListener('click', () => {
        closeMovementModal();
    });
    
    cancelBtn.addEventListener('click', () => {
        closeMovementModal();
    });
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveMovement();
    });
    
    // Fechar modal ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeMovementModal();
        }
    });
    
    // Configurar filtros de movimentações
    const productFilter = document.getElementById('movement-product-filter');
    const typeFilter = document.getElementById('movement-type-filter');
    
    if (productFilter) {
        productFilter.addEventListener('change', () => {
            renderMovements();
        });
    }
    
    if (typeFilter) {
        typeFilter.addEventListener('change', () => {
            renderMovements();
        });
    }
}

// Carregar movimentações
async function loadMovements() {
    const db = getFirestoreDb();
    if (!db) {
        console.error("Firestore não inicializado em loadMovements");
        return;
    }
    if (stockState.isLoading) return;
    
    try {
        stockState.isLoading = true;
        console.log('🔄 Carregando movimentações...');
        
        const movementsContainer = document.getElementById('movements-list');
        if (!movementsContainer) {
            console.error('❌ Container de movimentações não encontrado');
            return;
        }
        
        // Mostrar loading
        movementsContainer.innerHTML = '<div class="loading">Carregando movimentações...</div>';
        
        // Buscar movimentações no Firestore
        const snapshot = await getDocs(
            query(collection(db, 'stock_movements'), orderBy('timestamp', 'desc'))
        );
        
        stockState.movements = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            stockState.movements.push({
                id: doc.id,
                ...data
            });
        });
        
        console.log(`✅ ${stockState.movements.length} movimentações carregadas`);
        
        // Renderizar movimentações
        renderMovements();
        
    } catch (error) {
        console.error('❌ Erro ao carregar movimentações:', error);
        const movementsContainer = document.getElementById('movements-list');
        if (movementsContainer) {
            movementsContainer.innerHTML = `<div class="error">Erro ao carregar movimentações: ${error.message}</div>`;
        }
        showPopup('Erro ao carregar movimentações: ' + error.message);
    } finally {
        stockState.isLoading = false;
    }
}

// Renderizar lista de movimentações
function renderMovements() {
    const container = document.getElementById('movements-list');
    if (!container) return;
    
    // Obter filtros selecionados
    const productFilter = document.getElementById('movement-product-filter');
    const typeFilter = document.getElementById('movement-type-filter');
    const selectedProduct = productFilter ? productFilter.value : 'all';
    const selectedType = typeFilter ? typeFilter.value : 'all';
    
    // Filtrar movimentações
    let filteredMovements = stockState.movements;
    
    if (selectedProduct !== 'all') {
        filteredMovements = filteredMovements.filter(movement => 
            movement.productId === selectedProduct
        );
    }
    
    if (selectedType !== 'all') {
        filteredMovements = filteredMovements.filter(movement => 
            movement.type === selectedType
        );
    }
    
    if (filteredMovements.length === 0) {
        const hasFilters = selectedProduct !== 'all' || selectedType !== 'all';
        const message = hasFilters 
            ? 'Nenhuma movimentação encontrada com os filtros aplicados' 
            : 'Nenhuma movimentação registrada';
        
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exchange-alt"></i>
                <h3>${message}</h3>
                <p>${hasFilters ? 'Tente ajustar os filtros' : 'As movimentações de entrada e saída aparecerão aqui'}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredMovements.map(movement => {
        const product = stockState.products.find(p => p.id === movement.productId);
        const productName = product ? product.name : movement.productId;
        const date = new Date(movement.timestamp);
        const formattedDate = date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        const isEntry = movement.type === 'entry';
        const unitCost = movement.unitCost || 0;
        const unitPrice = movement.unitPrice || 0;
        const profit = movement.profit || 0;
        
        return `
            <div class="movement-card ${movement.type}">
                <div class="movement-header">
                    <h4>
                        <i class="fas fa-${isEntry ? 'plus' : 'minus'}"></i>
                        ${productName}
                    </h4>
                    <span class="movement-type ${movement.type}">
                        ${isEntry ? 'Entrada' : 'Saída'}
                    </span>
                </div>
                <div class="movement-info">
                    <div class="info-row">
                        <span class="label">Data:</span>
                        <span class="value">${formattedDate}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Quantidade:</span>
                        <span class="value">${movement.quantity}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Custo unitário:</span>
                        <span class="value">R$ ${unitCost.toFixed(2)}</span>
                    </div>
                    ${!isEntry ? `
                        <div class="info-row">
                            <span class="label">Preço de venda:</span>
                            <span class="value">R$ ${unitPrice.toFixed(2)}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Lucro:</span>
                            <span class="value profit">R$ ${profit.toFixed(2)}</span>
                        </div>
                    ` : ''}
                    ${movement.reason ? `
                        <div class="info-row">
                            <span class="label">Motivo:</span>
                            <span class="value">${movement.reason}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Funções globais para serem chamadas pelos botões
window.editProduct = function(productId) {
    const product = stockState.products.find(p => p.id === productId);
    if (product) {
        showProductForm(product);
    }
};

window.deleteProduct = async function(productId) {
    const db = getFirestoreDb();
    if (!db) {
        console.error("Firestore não inicializado em deleteProduct");
        return;
    }
    const product = stockState.products.find(p => p.id === productId);
    if (!product) return;
    
    if ((product.quantity || 0) > 0) {
        showPopup('Não é possível excluir um produto com estoque');
        return;
    }
    
    const confirmed = confirm(`Tem certeza que deseja excluir o produto "${product.name}"?`);
    if (!confirmed) return;
    
    try {
        await deleteDoc(doc(db, 'stock', productId));
        showPopup('Produto excluído com sucesso!');
        await loadProducts();
    } catch (error) {
        console.error('❌ Erro ao excluir produto:', error);
        showPopup('Erro ao excluir produto: ' + error.message);
    }
};

window.openMovementModal = function(productId, type) {
    const product = stockState.products.find(p => p.id === productId);
    if (!product) return;
    
    const modal = document.getElementById('stock-movement-modal');
    const title = document.getElementById('movement-modal-title');
    const costGroup = document.getElementById('movement-cost-group');
    const priceGroup = document.getElementById('movement-price-group');
    
    // Configurar modal
    document.getElementById('movement-product-id').value = productId;
    document.getElementById('movement-type').value = type;
    
    if (type === 'entry') {
        title.textContent = `Registrar Entrada - ${product.name}`;
        costGroup.style.display = 'block';
        priceGroup.style.display = 'none';
        document.getElementById('movement-cost').value = product.averageCost || '';
        document.getElementById('movement-cost').required = true;
        document.getElementById('movement-price').required = false;
    } else {
        title.textContent = `Registrar Saída - ${product.name}`;
        costGroup.style.display = 'none';
        priceGroup.style.display = 'block';
        document.getElementById('movement-cost').value = product.averageCost || '';
        document.getElementById('movement-price').value = product.sellingPrice || '';
        document.getElementById('movement-cost').required = false;
        document.getElementById('movement-price').required = true;
    }
    
    modal.style.display = 'flex';
    document.getElementById('movement-quantity').focus();
};

function closeMovementModal() {
    const modal = document.getElementById('stock-movement-modal');
    const form = document.getElementById('movement-form');
    
    modal.style.display = 'none';
    form.reset();
}

// Salvar movimentação
async function saveMovement() {
    const db = getFirestoreDb();
    if (!db) {
        console.error("Firestore não inicializado em saveMovement");
        return;
    }
    if (stockState.isLoading) return;
    
    try {
        stockState.isLoading = true;
        
        const productId = document.getElementById('movement-product-id').value;
        const type = document.getElementById('movement-type').value;
        const quantity = parseInt(document.getElementById('movement-quantity').value) || 0;
        const unitCost = parseFloat(document.getElementById('movement-cost').value) || 0;
        const unitPrice = parseFloat(document.getElementById('movement-price').value) || 0;
        const reason = document.getElementById('movement-reason').value.trim();
        
        if (quantity <= 0) {
            showPopup('Quantidade deve ser maior que zero');
            return;
        }
        
        const product = stockState.products.find(p => p.id === productId);
        if (!product) {
            showPopup('Produto não encontrado');
            return;
        }
        
        if (type === 'exit' && quantity > (product.quantity || 0)) {
            showPopup('Quantidade insuficiente em estoque');
            return;
        }
        
        // Usar transação para garantir consistência
        await runTransaction(db, async (transaction) => {
            const productRef = doc(db, 'stock', productId);
            const productSnap = await transaction.get(productRef);
            
            if (!productSnap.exists()) {
                throw new Error('Produto não encontrado');
            }
            
            const currentProduct = productSnap.data();
            let newQuantity = currentProduct.quantity || 0;
            let newAverageCost = currentProduct.averageCost || 0;
            
            if (type === 'entry') {
                // Calcular novo custo médio
                const currentTotalCost = newQuantity * newAverageCost;
                const newTotalCost = currentTotalCost + (quantity * unitCost);
                newQuantity += quantity;
                newAverageCost = newQuantity > 0 ? newTotalCost / newQuantity : 0;
            } else {
                // Saída - apenas reduzir quantidade
                newQuantity -= quantity;
            }
            
            // Atualizar produto
            transaction.update(productRef, {
                quantity: newQuantity,
                averageCost: newAverageCost,
                updatedAt: new Date().toISOString()
            });
            
            // Criar movimentação
            const movementId = `movement_${Date.now()}`;
            const timestamp = new Date().toISOString();
            const profit = type === 'exit' ? (unitPrice - newAverageCost) * quantity : null;
            
            const movementData = {
                id: movementId,
                type,
                productId,
                quantity,
                unitCost: type === 'entry' ? unitCost : newAverageCost,
                unitPrice: type === 'exit' ? unitPrice : null,
                profit,
                timestamp,
                reason: reason || (type === 'entry' ? 'Entrada de estoque' : 'Saída de estoque')
            };
            
            transaction.set(doc(db, 'stock_movements', movementId), movementData);
        });
        
        // Registrar transação no fluxo de caixa
        try {
            if (type === 'entry') {
                // Entrada de estoque = Despesa
                const totalCost = quantity * unitCost;
                await registerExpense(db,
                    `Compra de estoque: ${product.name} (${quantity} unidades)`,
                    totalCost,
                    'supplies',
                    'stock_entry',
                    {
                        productId: productId,
                        quantity: quantity,
                        unitCost: unitCost,
                        stockMovementId: movementId
                    }
                );
                console.log('💸 Despesa registrada no fluxo de caixa');
            } else {
                // Saída de estoque = Receita
                const totalRevenue = quantity * unitPrice;
                await registerRevenue(db,
                    `Venda de produto: ${product.name} (${quantity} unidades)`,
                    totalRevenue,
                    'stock_sales',
                    'stock_exit',
                    {
                        productId: productId,
                        quantity: quantity,
                        unitPrice: unitPrice,
                        profit: profit,
                        stockMovementId: movementId
                    }
                );
                console.log('💰 Receita registrada no fluxo de caixa');
            }
        } catch (cashflowError) {
            console.warn('⚠️ Erro ao registrar no fluxo de caixa:', cashflowError);
            // Não interromper o processo se houver erro no fluxo de caixa
        }
        
        console.log('✅ Movimentação registrada com sucesso');
        showPopup(`${type === 'entry' ? 'Entrada' : 'Saída'} registrada com sucesso!`);
        
        closeMovementModal();
        await loadProducts();
        
        if (stockState.currentView === 'movements') {
            await loadMovements();
        }
        
    } catch (error) {
        console.error('❌ Erro ao registrar movimentação:', error);
        showPopup('Erro ao registrar movimentação: ' + error.message);
    } finally {
        stockState.isLoading = false;
    }
}

// Exportar funções principais
export { loadProducts, loadMovements };
