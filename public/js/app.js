// ============ 全局状态 ============
let currentItems = [];
let companies = [];
let uploadedData = null;
let currentMapping = null;

// ============ 初始化 ============
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  loadCompanies();
  loadTemplates();
  loadHistory();
  addItemRow();
  setDefaultDate();
  initDocTypeSwitch();
  initFileUpload();
  setInterval(updatePreview, 500);
});

function setDefaultDate() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('doc_date').value = today;
}

// ============ 导航 ============
function initNavigation() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      link.classList.add('active');
      document.getElementById('page-' + page).classList.add('active');
      if (page === 'companies') loadCompanies();
      if (page === 'templates') loadTemplates();
      if (page === 'history') loadHistory();
    });
  });
}

// ============ 单证类型切换 ============
function initDocTypeSwitch() {
  document.getElementById('docType').addEventListener('change', (e) => {
    const type = e.target.value;
    const noLabel = document.getElementById('docNoLabel');
    const dateLabel = document.getElementById('docDateLabel');
    const badge = document.getElementById('previewBadge');
    const contractFields = document.getElementById('contractFields');
    const pkgCol = document.getElementById('pkgCol');
    const gwCol = document.getElementById('gwCol');
    const nwCol = document.getElementById('nwCol');
    const measCol = document.getElementById('measCol');
    const marksCol = document.getElementById('marksCol');
    const totalPkg = document.getElementById('totalPkg');
    const totalGW = document.getElementById('totalGW');
    const totalNW = document.getElementById('totalNW');
    const totalMeas = document.getElementById('totalMeas');
    const totalMarks = document.getElementById('totalMarks');

    if (type === 'invoice') {
      noLabel.textContent = 'Invoice No 发票号';
      dateLabel.textContent = 'Invoice Date 发票日期';
      badge.textContent = 'INVOICE';
      contractFields.style.display = 'none';
      [pkgCol, gwCol, nwCol, measCol, marksCol, totalPkg, totalGW, totalNW, totalMeas, totalMarks].forEach(el => el.style.display = 'none');
    } else if (type === 'packing') {
      noLabel.textContent = 'Invoice No 发票号';
      dateLabel.textContent = 'Date 日期';
      badge.textContent = 'PACKING LIST';
      contractFields.style.display = 'none';
      [pkgCol, gwCol, nwCol, measCol, marksCol, totalPkg, totalGW, totalNW, totalMeas, totalMarks].forEach(el => el.style.display = '');
    } else if (type === 'contract') {
      noLabel.textContent = 'Contract No 合同号';
      dateLabel.textContent = 'Contract Date 合同日期';
      badge.textContent = 'CONTRACT';
      contractFields.style.display = 'block';
      [pkgCol, gwCol, nwCol, measCol, marksCol, totalPkg, totalGW, totalNW, totalMeas, totalMarks].forEach(el => el.style.display = 'none');
    }
    updatePreview();
  });
}

// ============ 商品明细表格 ============
function addItemRow(data = {}) {
  const tbody = document.getElementById('itemsBody');
  const row = document.createElement('tr');
  row.innerHTML = `
    <td class="row-num">${tbody.children.length + 1}</td>
    <td><input type="text" class="itm-desc" value="${data.description || ''}" placeholder="Goods description"></td>
    <td><input type="number" class="itm-qty" value="${data.quantity || ''}" step="0.01" oninput="calcRow(this)"></td>
    <td><input type="text" class="itm-unit" value="${data.unit || 'PCS'}" style="width:60px;"></td>
    <td><input type="number" class="itm-price" value="${data.unit_price || ''}" step="0.01" oninput="calcRow(this)"></td>
    <td class="itm-amount">0.00</td>
    <td class="pkg-cell" style="display:none;"><input type="number" class="itm-pkg" value="${data.packages || ''}" step="1"></td>
    <td class="gw-cell" style="display:none;"><input type="number" class="itm-gw" value="${data.gross_weight || ''}" step="0.01"></td>
    <td class="nw-cell" style="display:none;"><input type="number" class="itm-nw" value="${data.net_weight || ''}" step="0.01"></td>
    <td class="meas-cell" style="display:none;"><input type="number" class="itm-meas" value="${data.measurement || ''}" step="0.001"></td>
    <td class="marks-cell" style="display:none;"><input type="text" class="itm-marks" value="${data.marks_numbers || ''}"></td>
    <td><button class="del-btn" onclick="removeItemRow(this)">&times;</button></td>
  `;
  tbody.appendChild(row);
  updatePackingColumns();
  calcTotals();
}

function removeItemRow(btn) {
  btn.closest('tr').remove();
  document.querySelectorAll('#itemsBody .row-num').forEach((el, i) => el.textContent = i + 1);
  calcTotals();
}

function calcRow(input) {
  const row = input.closest('tr');
  const qty = parseFloat(row.querySelector('.itm-qty').value) || 0;
  const price = parseFloat(row.querySelector('.itm-price').value) || 0;
  row.querySelector('.itm-amount').textContent = (qty * price).toFixed(2);
  calcTotals();
}

function calcTotals() {
  let total = 0, pkg = 0, gw = 0, nw = 0, meas = 0;
  document.querySelectorAll('#itemsBody tr').forEach(row => {
    total += parseFloat(row.querySelector('.itm-amount').textContent) || 0;
    pkg += parseFloat(row.querySelector('.itm-pkg')?.value) || 0;
    gw += parseFloat(row.querySelector('.itm-gw')?.value) || 0;
    nw += parseFloat(row.querySelector('.itm-nw')?.value) || 0;
    meas += parseFloat(row.querySelector('.itm-meas')?.value) || 0;
  });
  document.getElementById('totalAmount').textContent = total.toFixed(2);
  document.getElementById('totalPkg').textContent = pkg;
  document.getElementById('totalGW').textContent = gw.toFixed(2);
  document.getElementById('totalNW').textContent = nw.toFixed(2);
  document.getElementById('totalMeas').textContent = meas.toFixed(3);
}

function updatePackingColumns() {
  const type = document.getElementById('docType').value;
  const show = type === 'packing';
  document.querySelectorAll('.pkg-cell, .gw-cell, .nw-cell, .meas-cell, .marks-cell').forEach(el => {
    el.style.display = show ? '' : 'none';
  });
}

function getItemsData() {
  const items = [];
  document.querySelectorAll('#itemsBody tr').forEach(row => {
    items.push({
      description: row.querySelector('.itm-desc').value,
      quantity: row.querySelector('.itm-qty').value,
      unit: row.querySelector('.itm-unit').value,
      unit_price: row.querySelector('.itm-price').value,
      packages: row.querySelector('.itm-pkg')?.value || '',
      gross_weight: row.querySelector('.itm-gw')?.value || '',
      net_weight: row.querySelector('.itm-nw')?.value || '',
      measurement: row.querySelector('.itm-meas')?.value || '',
      marks_numbers: row.querySelector('.itm-marks')?.value || '',
    });
  });
  return items;
}

// ============ 表单数据收集 ============
function getFormData() {
  const type = document.getElementById('docType').value;
  const data = {
    doc_type: type,
    doc_no: document.getElementById('doc_no').value,
    invoice_no: document.getElementById('doc_no').value,
    contract_no: document.getElementById('doc_no').value,
    invoice_date: document.getElementById('doc_date').value,
    contract_date: document.getElementById('doc_date').value,
    seller_name: document.getElementById('seller_name').value,
    seller_address: document.getElementById('seller_address').value,
    seller_city: document.getElementById('seller_city').value,
    seller_country: document.getElementById('seller_country').value,
    seller_phone: document.getElementById('seller_phone').value,
    seller_email: document.getElementById('seller_email').value,
    buyer_name: document.getElementById('buyer_name').value,
    buyer_address: document.getElementById('buyer_address').value,
    buyer_city: document.getElementById('buyer_city').value,
    buyer_country: document.getElementById('buyer_country').value,
    buyer_phone: document.getElementById('buyer_phone').value,
    buyer_email: document.getElementById('buyer_email').value,
    payment_terms: document.getElementById('payment_terms').value,
    delivery_terms: document.getElementById('delivery_terms').value,
    port_of_loading: document.getElementById('port_of_loading').value,
    port_of_destination: document.getElementById('port_of_destination').value,
    currency: document.getElementById('currency').value,
    bank_name: document.getElementById('bank_name').value,
    bank_account: document.getElementById('bank_account').value,
    bank_swift: document.getElementById('bank_swift').value,
    bank_address: document.getElementById('bank_address').value,
    packing: document.getElementById('packing')?.value || '',
    shipping_mark: document.getElementById('shipping_mark')?.value || '',
  };
  return data;
}

// ============ 实时预览 ============
function updatePreview() {
  const data = getFormData();
  const items = getItemsData();
  const type = data.doc_type;
  const frame = document.getElementById('previewFrame');

  let html = '<div class="doc-preview">';
  if (type === 'invoice') {
    html += `<h2>COMMERCIAL INVOICE</h2>`;
  } else if (type === 'packing') {
    html += `<h2>PACKING LIST</h2>`;
  } else {
    html += `<h2>SALES CONTRACT</h2>`;
  }

  html += `<div style="display:flex;justify-content:space-between;margin-bottom:10px;">
    <div style="width:48%;">
      <div class="doc-label">SELLER</div>
      <div class="doc-value">${data.seller_name || '-'}</div>
      <div class="doc-value">${data.seller_address || ''}</div>
      <div class="doc-value">${data.seller_city || ''} ${data.seller_country || ''}</div>
    </div>
    <div style="width:48%;">
      <div class="doc-label">INVOICE INFO</div>
      <div class="doc-value">No: ${data.invoice_no || '-'}</div>
      <div class="doc-value">Date: ${data.invoice_date || '-'}</div>
      <div class="doc-value">Terms: ${data.payment_terms || '-'}</div>
    </div>
  </div>`;

  html += `<div style="margin-bottom:10px;">
    <div class="doc-label">BUYER</div>
    <div class="doc-value">${data.buyer_name || '-'}</div>
    <div class="doc-value">${data.buyer_address || ''}</div>
  </div>`;

  // 明细表
  html += '<table><thead><tr>';
  if (type === 'packing') {
    html += '<th>#</th><th>Description</th><th>Qty</th><th>Pkgs</th><th>G.W</th><th>N.W</th><th>CBM</th>';
  } else {
    html += '<th>#</th><th>Description</th><th>Qty</th><th>Unit</th><th>Price</th><th>Amount</th>';
  }
  html += '</tr></thead><tbody>';
  items.forEach((item, i) => {
    html += '<tr>';
    if (type === 'packing') {
      html += `<td>${i+1}</td><td>${item.description||''}</td><td>${item.quantity||''}</td><td>${item.packages||''}</td><td>${item.gross_weight||''}</td><td>${item.net_weight||''}</td><td>${item.measurement||''}</td>`;
    } else {
      const amt = (parseFloat(item.quantity)||0)*(parseFloat(item.unit_price)||0);
      html += `<td>${i+1}</td><td>${item.description||''}</td><td>${item.quantity||''}</td><td>${item.unit||''}</td><td>${item.unit_price||''}</td><td>${amt.toFixed(2)}</td>`;
    }
    html += '</tr>';
  });
  html += '</tbody></table>';

  if (type !== 'packing') {
    const total = items.reduce((s, it) => s + (parseFloat(it.quantity)||0)*(parseFloat(it.unit_price)||0), 0);
    html += `<div class="total-row" style="text-align:right;padding:4px;">TOTAL: <span class="total-amount">${total.toFixed(2)} ${data.currency}</span></div>`;
  }

  html += '</div>';
  frame.innerHTML = html;
}

// ============ 文件上传与AI识别 ============
function initFileUpload() {
  document.getElementById('fileUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const status = document.getElementById('uploadStatus');
    status.style.display = 'block';
    status.className = 'upload-status info';
    status.textContent = '正在上传并使用AI识别字段... Uploading and analyzing with AI...';

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload/recognize', { method: 'POST', body: formData });
      const result = await res.json();
      if (result.success) {
        uploadedData = result;
        status.className = 'upload-status success';
        status.textContent = `已识别 ${result.recognized_count}/${result.total_fields} 个字段，共 ${result.row_count} 行数据。请确认映射关系。 Recognized ${result.recognized_count}/${result.total_fields} fields from ${result.row_count} rows.`;
        showMappingModal(result);
      } else {
        status.className = 'upload-status error';
        status.textContent = '错误 Error: ' + result.error;
      }
    } catch (err) {
      status.className = 'upload-status error';
      status.textContent = '上传失败 Upload failed: ' + err.message;
    }
    e.target.value = '';
  });
}

function showMappingModal(result) {
  const tbody = document.getElementById('mappingBody');
  tbody.innerHTML = '';
  const targetFields = [
    { value: 'description', label: 'description 品名描述' },
    { value: 'quantity', label: 'quantity 数量' },
    { value: 'unit', label: 'unit 单位' },
    { value: 'unit_price', label: 'unit_price 单价' },
    { value: 'amount', label: 'amount 金额' },
    { value: 'packages', label: 'packages 件数' },
    { value: 'gross_weight', label: 'gross_weight 毛重' },
    { value: 'net_weight', label: 'net_weight 净重' },
    { value: 'measurement', label: 'measurement 体积' },
    { value: 'marks_numbers', label: 'marks_numbers 唛头' },
  ];

  result.headers.forEach((header, idx) => {
    const sample = result.sample_data[0]?.[header] || '';
    const mapped = result.field_mapping[header] || '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${header}</td>
      <td style="color:#888;font-size:12px;">${String(sample).substring(0, 30)}</td>
      <td>
        <select class="map-select" data-header="${header}" style="width:100%;padding:4px;border:1px solid #ddd;border-radius:4px;">
          <option value="">-- Skip 跳过 --</option>
          ${targetFields.map(f => `<option value="${f.value}" ${f.value === mapped ? 'selected' : ''}>${f.label}</option>`).join('')}
        </select>
      </td>
    `;
    tbody.appendChild(tr);
  });
  document.getElementById('mappingModal').classList.add('active');
}

function closeMappingModal() {
  document.getElementById('mappingModal').classList.remove('active');
}

function confirmMapping() {
  if (!uploadedData) return;
  const mapping = {};
  document.querySelectorAll('.map-select').forEach(sel => {
    mapping[sel.dataset.header] = sel.value || null;
  });

  const items = uploadedData.all_data.map(row => {
    const item = {};
    uploadedData.headers.forEach(h => {
      const target = mapping[h];
      if (target) item[target] = row[h] || '';
    });
    return item;
  });

  // 清空现有行并填充
  document.getElementById('itemsBody').innerHTML = '';
  items.forEach(item => addItemRow(item));

  closeMappingModal();
  showToast(`成功导入 ${items.length} 条商品 Imported ${items.length} items successfully`, 'success');
  updatePreview();
}

// ============ 生成/导出单证 ============
async function generateDocument(format) {
  const data = getFormData();
  const items = getItemsData();
  const version = document.getElementById('templateVersion').value;

  if (!data.doc_no) {
    showToast('请先填写单证号 Please enter document number first', 'error');
    return;
  }

  showToast(`正在生成${format.toUpperCase()}... Generating ${format.toUpperCase()}...`, 'info');

  try {
    const res = await fetch('/api/documents/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_type: data.doc_type, data, items, format, version }),
    });
    const result = await res.json();
    if (result.success) {
      showToast(`${format.toUpperCase()} 生成成功 ${format.toUpperCase()} generated successfully`, 'success');
      window.open(result.download_url, '_blank');
      saveDocument();
    } else {
      showToast('生成失败 Generation failed: ' + result.error, 'error');
    }
  } catch (err) {
    showToast('错误 Error: ' + err.message, 'error');
  }
}

async function saveDocument() {
  const data = getFormData();
  const items = getItemsData();
  try {
    await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doc_type: data.doc_type,
        doc_no: data.doc_no,
        data, items,
      }),
    });
    showToast('单证已保存到历史 Document saved to history', 'success');
  } catch (err) {
    showToast('保存失败 Save failed: ' + err.message, 'error');
  }
}

// ============ 公司管理 ============
async function loadCompanies() {
  try {
    const res = await fetch('/api/companies');
    companies = await res.json();
    renderCompaniesTable();
    populateCompanySelects();
  } catch (err) { console.error(err); }
}

function renderCompaniesTable() {
  const tbody = document.getElementById('companiesBody');
  const typeLabels = { seller: '卖方 Seller', buyer: '买方 Buyer', both: '两者 Both' };
  tbody.innerHTML = companies.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td><span class="badge" style="background:${c.type==='seller'?'#0f3460':'#e94560'}">${typeLabels[c.type] || c.type}</span></td>
      <td>${c.country || '-'}</td>
      <td>${c.phone || '-'}</td>
      <td>${c.email || '-'}</td>
      <td>
        <button class="btn btn-sm" onclick="editCompany(${c.id})">编辑 Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteCompany(${c.id})">删除 Delete</button>
      </td>
    </tr>
  `).join('');
}

function populateCompanySelects() {
  const sellerSel = document.getElementById('sellerSelect');
  const buyerSel = document.getElementById('buyerSelect');
  const opts = '<option value="">-- Select --</option>' +
    companies.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  sellerSel.innerHTML = opts;
  buyerSel.innerHTML = opts;

  sellerSel.onchange = () => fillCompanyForm(sellerSel.value, 'seller');
  buyerSel.onchange = () => fillCompanyForm(buyerSel.value, 'buyer');
}

function fillCompanyForm(id, role) {
  const c = companies.find(x => x.id == id);
  if (!c) return;
  document.getElementById(`${role}_name`).value = c.name || '';
  document.getElementById(`${role}_address`).value = c.address || '';
  document.getElementById(`${role}_city`).value = c.city || '';
  document.getElementById(`${role}_country`).value = c.country || '';
  document.getElementById(`${role}_phone`).value = c.phone || '';
  document.getElementById(`${role}_email`).value = c.email || '';
  if (role === 'seller') {
    document.getElementById('bank_name').value = c.bank_name || '';
    document.getElementById('bank_account').value = c.bank_account || '';
    document.getElementById('bank_swift').value = c.bank_swift || '';
    document.getElementById('bank_address').value = c.bank_address || '';
  }
  updatePreview();
}

function showCompanyModal() {
  document.getElementById('companyModalTitle').textContent = 'Add Company';
  document.getElementById('companyId').value = '';
  ['c_name','c_address','c_city','c_country','c_phone','c_email','c_tax_id','c_bank_name','c_bank_account','c_bank_swift','c_bank_address'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('c_type').value = 'seller';
  document.getElementById('companyModal').classList.add('active');
}

function editCompany(id) {
  const c = companies.find(x => x.id == id);
  if (!c) return;
  document.getElementById('companyModalTitle').textContent = 'Edit Company 编辑公司';
  document.getElementById('companyId').value = c.id;
  document.getElementById('c_name').value = c.name || '';
  document.getElementById('c_type').value = c.type || 'seller';
  document.getElementById('c_address').value = c.address || '';
  document.getElementById('c_city').value = c.city || '';
  document.getElementById('c_country').value = c.country || '';
  document.getElementById('c_phone').value = c.phone || '';
  document.getElementById('c_email').value = c.email || '';
  document.getElementById('c_tax_id').value = c.tax_id || '';
  document.getElementById('c_bank_name').value = c.bank_name || '';
  document.getElementById('c_bank_account').value = c.bank_account || '';
  document.getElementById('c_bank_swift').value = c.bank_swift || '';
  document.getElementById('c_bank_address').value = c.bank_address || '';
  document.getElementById('companyModal').classList.add('active');
}

function closeCompanyModal() {
  document.getElementById('companyModal').classList.remove('active');
}

async function saveCompany() {
  const id = document.getElementById('companyId').value;
  const payload = {
    name: document.getElementById('c_name').value,
    type: document.getElementById('c_type').value,
    address: document.getElementById('c_address').value,
    city: document.getElementById('c_city').value,
    country: document.getElementById('c_country').value,
    phone: document.getElementById('c_phone').value,
    email: document.getElementById('c_email').value,
    tax_id: document.getElementById('c_tax_id').value,
    bank_name: document.getElementById('c_bank_name').value,
    bank_account: document.getElementById('c_bank_account').value,
    bank_swift: document.getElementById('c_bank_swift').value,
    bank_address: document.getElementById('c_bank_address').value,
  };
  if (!payload.name) { showToast('公司名称必填 Company name is required', 'error'); return; }

  const url = id ? `/api/companies/${id}` : '/api/companies';
  const method = id ? 'PUT' : 'POST';
  await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  closeCompanyModal();
  loadCompanies();
  showToast('公司已保存 Company saved', 'success');
}

async function deleteCompany(id) {
  if (!confirm('Delete this company?')) return;
  await fetch(`/api/companies/${id}`, { method: 'DELETE' });
  loadCompanies();
  showToast('公司已删除 Company deleted', 'success');
}

// ============ 模板管理 ============
async function loadTemplates() {
  try {
    const res = await fetch('/api/templates');
    const templates = await res.json();
    const grid = document.getElementById('templateGrid');
    const typeNames = { invoice: '发票', packing: '装箱单', contract: '合同' };
    const versionNames = { v1: '经典版', v2: '现代版', v3: '简约版', custom: '自定义' };
    grid.innerHTML = templates.map(t => `
      <div class="template-card ${t.is_builtin ? 'builtin' : ''}">
        <span class="tpl-type">${t.doc_type.toUpperCase()} ${typeNames[t.doc_type] || ''}</span>
        <h4>${t.name}</h4>
        <div class="tpl-version">Version 版本: ${t.version} ${versionNames[t.version] || ''} ${t.is_builtin ? '(Built-in 内置)' : '(Custom 自定义)'}</div>
        ${!t.is_builtin ? `<button class="btn btn-sm btn-danger" style="margin-top:10px;" onclick="deleteTemplate(${t.id})">删除 Delete</button>` : ''}
      </div>
    `).join('');
  } catch (err) { console.error(err); }
}

async function uploadTemplate() {
  const name = document.getElementById('customTplName').value;
  const doc_type = document.getElementById('customTplType').value;
  const file = document.getElementById('customTplFile').files[0];
  if (!name || !file) { showToast('请填写名称并选择文件 Name and file are required', 'error'); return; }

  const formData = new FormData();
  formData.append('name', name);
  formData.append('doc_type', doc_type);
  formData.append('template', file);

  await fetch('/api/templates/upload', { method: 'POST', body: formData });
  loadTemplates();
  showToast('模板上传成功 Template uploaded', 'success');
}

async function deleteTemplate(id) {
  if (!confirm('Delete this template?')) return;
  await fetch(`/api/templates/${id}`, { method: 'DELETE' });
  loadTemplates();
  showToast('模板已删除 Template deleted', 'success');
}

// ============ 历史记录 ============
async function loadHistory() {
  try {
    const res = await fetch('/api/documents');
    const docs = await res.json();
    const tbody = document.getElementById('historyBody');
    tbody.innerHTML = docs.map(d => `
      <tr>
        <td><strong>${d.doc_no || 'Untitled 未命名'}</strong></td>
        <td><span class="badge">${d.doc_type.toUpperCase()}</span></td>
        <td>${d.seller_name || '-'}</td>
        <td>${d.buyer_name || '-'}</td>
        <td>${new Date(d.created_at).toLocaleDateString()}</td>
        <td>${d.status === 'draft' ? '草稿' : d.status}</td>
        <td>
          <button class="btn btn-sm" onclick="loadDocToGenerator(${d.id})">加载 Load</button>
          <button class="btn btn-sm btn-primary" onclick="exportFromHistory(${d.id}, 'pdf')">PDF</button>
          <button class="btn btn-sm btn-success" onclick="exportFromHistory(${d.id}, 'excel')">Excel</button>
          <button class="btn btn-sm btn-danger" onclick="deleteDoc(${d.id})">删除</button>
        </td>
      </tr>
    `).join('');
  } catch (err) { console.error(err); }
}

async function loadDocToGenerator(id) {
  const res = await fetch(`/api/documents/${id}`);
  const doc = await res.json();
  const data = doc.data || {};

  document.getElementById('docType').value = doc.doc_type;
  document.getElementById('docType').dispatchEvent(new Event('change'));
  document.getElementById('doc_no').value = data.invoice_no || data.contract_no || data.doc_no || '';
  document.getElementById('doc_date').value = data.invoice_date || data.contract_date || '';

  ['seller_name','seller_address','seller_city','seller_country','seller_phone','seller_email',
   'buyer_name','buyer_address','buyer_city','buyer_country','buyer_phone','buyer_email',
   'payment_terms','delivery_terms','port_of_loading','port_of_destination','currency',
   'bank_name','bank_account','bank_swift','bank_address',
   'packing','shipping_mark'].forEach(field => {
    const el = document.getElementById(field);
    if (el) el.value = data[field] || '';
  });

  document.getElementById('itemsBody').innerHTML = '';
  (doc.items || []).forEach(item => addItemRow(item));

  document.querySelector('.nav-link[data-page="generator"]').click();
  showToast('单证已加载到生成器 Document loaded to generator', 'success');
  updatePreview();
}

async function exportFromHistory(id, format) {
  try {
    const res = await fetch(`/api/documents/${id}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format }),
    });
    const result = await res.json();
    if (result.success) {
      window.open(result.download_url, '_blank');
      showToast(`${format.toUpperCase()} 已下载 ${format.toUpperCase()} downloaded`, 'success');
    }
  } catch (err) { showToast('导出失败 Export failed', 'error'); }
}

async function deleteDoc(id) {
  if (!confirm('Delete this document?')) return;
  await fetch(`/api/documents/${id}`, { method: 'DELETE' });
  loadHistory();
  showToast('单证已删除 Document deleted', 'success');
}

// ============ Toast 通知 ============
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; }, 2500);
  setTimeout(() => toast.remove(), 3000);
}
