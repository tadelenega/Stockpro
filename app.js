'use strict';
// ─── State ────────────────────────────────────────────────────────────────
const DB = {
  products: [],
  transactions: [],
  load() {
    this.products = JSON.parse(localStorage.getItem('sms_products') || '[]');
    this.transactions = JSON.parse(localStorage.getItem('sms_transactions') || '[]');
  },
  save() {
    localStorage.setItem('sms_products', JSON.stringify(this.products));
    localStorage.setItem('sms_transactions', JSON.stringify(this.transactions));
  },
  nextId(arr) {
    return arr.length ? Math.max(...arr.map(i => i.id)) + 1 : 1;
  }
};

// ─── Navigation ──────────────────────────────────────────────────────────
const pages = {
  dashboard: 'Dashboard',
  products: 'Products',
  transactions: 'Transactions',
  reports: 'Reports'
};

function navigate(key) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const page = document.getElementById('page-' + key);
  if (page) page.classList.add('active');
  const nav = document.querySelector(`.nav-item[data-page="${key}"]`);
  if (nav) nav.classList.add('active');
  document.getElementById('pageTitle').textContent = pages[key] || key;
  closeSidebar();
  if (key === 'dashboard') renderDashboard();
  if (key === 'products') renderProducts();
  if (key === 'transactions') renderTransactions();
  if (key === 'reports') renderReports();
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    navigate(item.dataset.page);
  });
});

// ─── Sidebar mobile ───────────────────────────────────────────────────────
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
}
document.getElementById('menuBtn').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ─── Helpers ─────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

function statusBadge(product) {
  if (product.qty <= 0) return '<span class="badge badge-red">Out of stock</span>';
  if (product.qty <= (product.minQty || 0)) return '<span class="badge badge-amber">Low stock</span>';
  return '<span class="badge badge-green">In stock</span>';
}

function statusOf(product) {
  if (product.qty <= 0) return 'out';
  if (product.qty <= (product.minQty || 0)) return 'low';
  return 'ok';
}

function getProductName(id) {
  const p = DB.products.find(x => x.id === id);
  return p ? p.name : 'Unknown';
}

// ─── Dashboard ────────────────────────────────────────────────────────────
function renderDashboard() {
  const total = DB.products.length;
  const inStock = DB.products.filter(p => statusOf(p) === 'ok').length;
  const low = DB.products.filter(p => statusOf(p) === 'low').length;
  const out = DB.products.filter(p => statusOf(p) === 'out').length;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-instock').textContent = inStock;
  document.getElementById('stat-low').textContent = low;
  document.getElementById('stat-out').textContent = out;

  // Alerts
  const alerts = DB.products.filter(p => statusOf(p) !== 'ok');
  const alertBody = document.getElementById('alertBody');
  const noAlerts = document.getElementById('noAlerts');
  if (alerts.length === 0) {
    alertBody.innerHTML = '';
    noAlerts.style.display = 'block';
  } else {
    noAlerts.style.display = 'none';
    alertBody.innerHTML = alerts.map(p => `
      <tr>
        <td>${p.name}</td>
        <td>${p.category || '—'}</td>
        <td><strong>${p.qty}</strong> ${p.unit || ''}</td>
        <td>${p.minQty || 0}</td>
        <td>${statusBadge(p)}</td>
      </tr>`).join('');
  }

  // Recent transactions (last 5)
  const recent = [...DB.transactions].reverse().slice(0, 5);
  const recentBody = document.getElementById('recentTxBody');
  const noRecent = document.getElementById('noRecentTx');
  if (recent.length === 0) {
    recentBody.innerHTML = '';
    noRecent.style.display = 'block';
  } else {
    noRecent.style.display = 'none';
    recentBody.innerHTML = recent.map(t => `
      <tr>
        <td>${fmtDate(t.date)}</td>
        <td>${getProductName(t.productId)}</td>
        <td><span class="tx-${t.type}">${txLabel(t.type)}</span></td>
        <td>${t.qty > 0 ? '+' : ''}${t.qty}</td>
        <td>${t.note || '—'}</td>
      </tr>`).join('');
  }
}

function txLabel(type) {
  if (type === 'in') return '▲ Stock In';
  if (type === 'out') return '▼ Stock Out';
  return '± Adjustment';
}

// ─── Products ────────────────────────────────────────────────────────────
let _productSearch = '';
let _categoryFilter = '';

function renderProducts() {
  updateCategoryFilter();
  let list = DB.products;
  if (_productSearch) {
    const q = _productSearch.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  }
  if (_categoryFilter) {
    list = list.filter(p => p.category === _categoryFilter);
  }

  const body = document.getElementById('productBody');
  const noP = document.getElementById('noProducts');

  if (list.length === 0) {
    body.innerHTML = '';
    noP.style.display = 'block';
  } else {
    noP.style.display = 'none';
    body.innerHTML = list.map(p => `
      <tr>
        <td><strong>${p.name}</strong>${p.desc ? `<br><small style="color:var(--text-secondary)">${p.desc}</small>` : ''}</td>
        <td>${p.category || '—'}</td>
        <td><code style="font-size:12px">${p.sku || '—'}</code></td>
        <td><strong>${p.qty}</strong> ${p.unit || ''}</td>
        <td>${p.minQty || 0}</td>
        <td>ETB ${parseFloat(p.price || 0).toLocaleString('en-ET', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
        <td>${statusBadge(p)}</td>
        <td>
          <button class="action-btn" onclick="openEditProduct(${p.id})">Edit</button>
          <button class="action-btn" onclick="openStockTx(${p.id})">Stock</button>
          <button class="action-btn danger" onclick="openDelete(${p.id})">Delete</button>
        </td>
      </tr>`).join('');
  }
}

function updateCategoryFilter() {
  const cats = [...new Set(DB.products.map(p => p.category).filter(Boolean))].sort();
  const sel = document.getElementById('categoryFilter');
  const cur = sel.value;
  sel.innerHTML = '<option value="">All Categories</option>' +
    cats.map(c => `<option value="${c}" ${c === cur ? 'selected' : ''}>${c}</option>`).join('');
  updateCategoryDatalist();
}

function updateCategoryDatalist() {
  const cats = [...new Set(DB.products.map(p => p.category).filter(Boolean))].sort();
  document.getElementById('categoryList').innerHTML =
    cats.map(c => `<option value="${c}">`).join('');
}

document.getElementById('productSearch').addEventListener('input', e => {
  _productSearch = e.target.value;
  renderProducts();
});
document.getElementById('categoryFilter').addEventListener('change', e => {
  _categoryFilter = e.target.value;
  renderProducts();
});

// ─── Product Modal ────────────────────────────────────────────────────────
function openAddProduct() {
  document.getElementById('editProductId').value = '';
  document.getElementById('modalTitle').textContent = 'Add Product';
  ['pName','pCategory','pSku','pUnit','pDesc','pSupplier'].forEach(id => document.getElementById(id).value = '');
  ['pQty','pMinQty','pPrice'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('productError').textContent = '';
  document.getElementById('productModal').classList.add('open');
}

function openEditProduct(id) {
  const p = DB.products.find(x => x.id === id);
  if (!p) return;
  document.getElementById('editProductId').value = p.id;
  document.getElementById('modalTitle').textContent = 'Edit Product';
  document.getElementById('pName').value = p.name || '';
  document.getElementById('pCategory').value = p.category || '';
  document.getElementById('pSku').value = p.sku || '';
  document.getElementById('pUnit').value = p.unit || '';
  document.getElementById('pQty').value = p.qty || 0;
  document.getElementById('pMinQty').value = p.minQty || '';
  document.getElementById('pPrice').value = p.price || '';
  document.getElementById('pSupplier').value = p.supplier || '';
  document.getElementById('pDesc').value = p.desc || '';
  document.getElementById('productError').textContent = '';
  document.getElementById('productModal').classList.add('open');
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('open');
}

document.getElementById('addProductBtn').addEventListener('click', openAddProduct);
document.getElementById('closeProductModal').addEventListener('click', closeProductModal);
document.getElementById('cancelProductModal').addEventListener('click', closeProductModal);

document.getElementById('saveProductBtn').addEventListener('click', () => {
  const name = document.getElementById('pName').value.trim();
  const category = document.getElementById('pCategory').value.trim();
  const qty = parseInt(document.getElementById('pQty').value) || 0;
  if (!name) { document.getElementById('productError').textContent = 'Product name is required.'; return; }

  const editId = document.getElementById('editProductId').value;
  if (editId) {
    const idx = DB.products.findIndex(p => p.id === parseInt(editId));
    if (idx !== -1) {
      DB.products[idx] = {
        ...DB.products[idx],
        name,
        category,
        sku: document.getElementById('pSku').value.trim(),
        unit: document.getElementById('pUnit').value.trim(),
        qty,
        minQty: parseInt(document.getElementById('pMinQty').value) || 0,
        price: parseFloat(document.getElementById('pPrice').value) || 0,
        supplier: document.getElementById('pSupplier').value.trim(),
        desc: document.getElementById('pDesc').value.trim(),
      };
    }
  } else {
    DB.products.push({
      id: DB.nextId(DB.products),
      name, category,
      sku: document.getElementById('pSku').value.trim(),
      unit: document.getElementById('pUnit').value.trim(),
      qty,
      minQty: parseInt(document.getElementById('pMinQty').value) || 0,
      price: parseFloat(document.getElementById('pPrice').value) || 0,
      supplier: document.getElementById('pSupplier').value.trim(),
      desc: document.getElementById('pDesc').value.trim(),
      createdAt: new Date().toISOString()
    });
  }
  DB.save();
  closeProductModal();
  renderProducts();
});

// ─── Delete ───────────────────────────────────────────────────────────────
let _deleteId = null;

function openDelete(id) {
  _deleteId = id;
  const p = DB.products.find(x => x.id === id);
  document.getElementById('deleteProductName').textContent = p ? p.name : '';
  document.getElementById('deleteModal').classList.add('open');
}

document.getElementById('closeDeleteModal').addEventListener('click', () => document.getElementById('deleteModal').classList.remove('open'));
document.getElementById('cancelDeleteModal').addEventListener('click', () => document.getElementById('deleteModal').classList.remove('open'));
document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
  if (_deleteId) {
    DB.products = DB.products.filter(p => p.id !== _deleteId);
    DB.transactions = DB.transactions.filter(t => t.productId !== _deleteId);
    DB.save();
    _deleteId = null;
    document.getElementById('deleteModal').classList.remove('open');
    renderProducts();
  }
});

// ─── Transactions ─────────────────────────────────────────────────────────
function renderTransactions() {
  const body = document.getElementById('txBody');
  const noTx = document.getElementById('noTx');
  const list = [...DB.transactions].reverse();
  if (list.length === 0) {
    body.innerHTML = '';
    noTx.style.display = 'block';
  } else {
    noTx.style.display = 'none';
    body.innerHTML = list.map(t => `
      <tr>
        <td>${fmtDate(t.date)}</td>
        <td>${getProductName(t.productId)}</td>
        <td><span class="tx-${t.type}">${txLabel(t.type)}</span></td>
        <td>${t.qty > 0 ? '+' : ''}${t.qty}</td>
        <td>${t.note || '—'}</td>
      </tr>`).join('');
  }
}

function openTxModal(preselect) {
  const sel = document.getElementById('txProduct');
  sel.innerHTML = DB.products.map(p =>
    `<option value="${p.id}" ${p.id === preselect ? 'selected' : ''}>${p.name} (Qty: ${p.qty})</option>`
  ).join('');
  if (DB.products.length === 0) {
    alert('Please add at least one product first.');
    return;
  }
  document.getElementById('txQty').value = '';
  document.getElementById('txNote').value = '';
  document.getElementById('txType').value = 'in';
  document.getElementById('txError').textContent = '';
  document.getElementById('txModal').classList.add('open');
}

function openStockTx(id) {
  openTxModal(id);
}

document.getElementById('addTxBtn').addEventListener('click', () => openTxModal());
document.getElementById('closeTxModal').addEventListener('click', () => document.getElementById('txModal').classList.remove('open'));
document.getElementById('cancelTxModal').addEventListener('click', () => document.getElementById('txModal').classList.remove('open'));

document.getElementById('saveTxBtn').addEventListener('click', () => {
  const productId = parseInt(document.getElementById('txProduct').value);
  const type = document.getElementById('txType').value;
  const qty = parseInt(document.getElementById('txQty').value);
  const note = document.getElementById('txNote').value.trim();

  if (!qty || qty < 1) { document.getElementById('txError').textContent = 'Quantity must be at least 1.'; return; }

  const p = DB.products.find(x => x.id === productId);
  if (!p) return;

  let delta = qty;
  if (type === 'out') delta = -qty;
  if (type === 'adjust') delta = qty - p.qty;

  const newQty = p.qty + delta;
  if (newQty < 0) { document.getElementById('txError').textContent = 'Insufficient stock. Current qty: ' + p.qty; return; }

  p.qty = newQty;
  DB.transactions.push({
    id: DB.nextId(DB.transactions),
    productId,
    type,
    qty: delta,
    note,
    date: new Date().toISOString()
  });
  DB.save();
  document.getElementById('txModal').classList.remove('open');
  renderTransactions();
  renderProducts();
});

// ─── Reports ──────────────────────────────────────────────────────────────
function renderReports() {
  const totalValue = DB.products.reduce((s, p) => s + p.qty * (p.price || 0), 0);
  const totalUnits = DB.products.reduce((s, p) => s + p.qty, 0);
  const cats = [...new Set(DB.products.map(p => p.category).filter(Boolean))];

  document.getElementById('rpt-value').textContent = 'ETB ' + totalValue.toLocaleString('en-ET', {maximumFractionDigits:2});
  document.getElementById('rpt-units').textContent = totalUnits.toLocaleString();
  document.getElementById('rpt-cats').textContent = cats.length;
  document.getElementById('rpt-tx').textContent = DB.transactions.length;

  const catReport = cats.map(cat => {
    const products = DB.products.filter(p => p.category === cat);
    const totalQty = products.reduce((s, p) => s + p.qty, 0);
    const totalVal = products.reduce((s, p) => s + p.qty * (p.price || 0), 0);
    return { cat, count: products.length, totalQty, totalVal };
  });

  document.getElementById('catReportBody').innerHTML = catReport.map(r => `
    <tr>
      <td>${r.cat}</td>
      <td>${r.count}</td>
      <td>${r.totalQty.toLocaleString()}</td>
      <td>ETB ${r.totalVal.toLocaleString('en-ET', {maximumFractionDigits:2})}</td>
    </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text-secondary);padding:24px">No data yet.</td></tr>';
}

// ─── Export CSV ───────────────────────────────────────────────────────────
document.getElementById('exportCsvBtn').addEventListener('click', () => {
  const headers = ['Name','Category','SKU','Qty','Unit','Min Qty','Unit Price (ETB)','Supplier','Status'];
  const rows = DB.products.map(p => [
    p.name, p.category || '', p.sku || '', p.qty, p.unit || '',
    p.minQty || 0, p.price || 0, p.supplier || '', statusOf(p)
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'stock-report-' + new Date().toISOString().slice(0,10) + '.csv';
  a.click();
});

document.getElementById('printBtn').addEventListener('click', () => window.print());

// ─── Demo Data (first load) ───────────────────────────────────────────────
function seedDemoData() {
  if (DB.products.length > 0) return;
  const demo = [
    { name: 'A4 Paper Ream', category: 'Stationery', sku: 'STA-001', unit: 'Ream', qty: 45, minQty: 10, price: 180, supplier: 'Office Plus', desc: '500 sheets per ream' },
    { name: 'Black Ink Cartridge', category: 'Stationery', sku: 'STA-002', unit: 'Pcs', qty: 3, minQty: 5, price: 650, supplier: 'Tech Supplies', desc: 'HP compatible' },
    { name: 'Office Chair', category: 'Furniture', sku: 'FUR-001', unit: 'Pcs', qty: 12, minQty: 2, price: 3200, supplier: 'Merkato Furniture', desc: 'Ergonomic with armrests' },
    { name: 'Network Switch 24-Port', category: 'IT Equipment', sku: 'IT-001', unit: 'Pcs', qty: 2, minQty: 1, price: 8500, supplier: 'Ethio Telecom', desc: 'Managed switch' },
    { name: 'Projector Bulb', category: 'IT Equipment', sku: 'IT-002', unit: 'Pcs', qty: 0, minQty: 2, price: 2200, supplier: 'Digital World', desc: 'BenQ compatible' },
    { name: 'Whiteboard Marker', category: 'Stationery', sku: 'STA-003', unit: 'Box', qty: 8, minQty: 3, price: 95, supplier: 'Office Plus', desc: 'Assorted colors' },
  ];
  demo.forEach((d, i) => {
    DB.products.push({ id: i + 1, ...d, createdAt: new Date().toISOString() });
  });
  DB.transactions.push(
    { id: 1, productId: 1, type: 'in', qty: 45, note: 'Initial stock', date: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 2, productId: 2, type: 'out', qty: -2, note: 'Issued to IT dept', date: new Date(Date.now() - 86400000).toISOString() },
    { id: 3, productId: 5, type: 'out', qty: -1, note: 'Projector room 2', date: new Date().toISOString() },
  );
  DB.save();
}

// ─── Init ─────────────────────────────────────────────────────────────────
DB.load();
seedDemoData();
navigate('dashboard');
