const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * 生成单证 PDF 文件
 */
function generatePDF(docType, version, data, items = []) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const filename = `${docType}_${data.doc_no || 'draft'}_${Date.now()}.pdf`;
    const outputPath = path.join(__dirname, '..', '..', 'exports', filename);
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const styles = getStyleConfig(version);

    if (docType === 'invoice') {
      buildInvoicePDF(doc, data, items, styles);
    } else if (docType === 'packing') {
      buildPackingPDF(doc, data, items, styles);
    } else if (docType === 'contract') {
      buildContractPDF(doc, data, items, styles);
    }

    doc.end();
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

function getStyleConfig(version) {
  const configs = {
    v1: { titleColor: '#1a1a2e', accentColor: '#e94560', headerBg: '#1a1a2e', fontFamily: 'Times-Roman' },
    v2: { titleColor: '#0f3460', accentColor: '#e94560', headerBg: '#0f3460', fontFamily: 'Helvetica' },
    v3: { titleColor: '#333333', accentColor: '#666666', headerBg: '#f5f5f5', fontFamily: 'Helvetica' },
  };
  return configs[version] || configs.v1;
}

function buildInvoicePDF(doc, data, items, styles) {
  // 标题
  doc.fontSize(24).fillColor(styles.titleColor).font('Helvetica-Bold');
  doc.text('COMMERCIAL INVOICE', { align: 'center' });
  doc.moveDown(1);

  // 分隔线
  doc.strokeColor(styles.accentColor).lineWidth(2).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(1);

  // 卖方和发票信息
  const startY = doc.y;
  doc.fontSize(10).fillColor(styles.accentColor).font('Helvetica-Bold');
  doc.text('SELLER / EXPORTER', 50, startY, { width: 240 });
  doc.text('INVOICE INFORMATION', 300, startY, { width: 245 });

  doc.font('Helvetica').fontSize(9).fillColor('#333');
  const sellerText = `${data.seller_name || ''}\n${data.seller_address || ''}\n${data.seller_city || ''} ${data.seller_country || ''}\nTel: ${data.seller_phone || ''}\nEmail: ${data.seller_email || ''}`;
  doc.text(sellerText, 50, doc.y, { width: 240 });

  const infoY = startY + 15;
  const infoFields = [
    ['Invoice No:', data.invoice_no || ''],
    ['Invoice Date:', data.invoice_date || ''],
    ['Payment Terms:', data.payment_terms || ''],
    ['Delivery Terms:', data.delivery_terms || ''],
    ['Port of Loading:', data.port_of_loading || ''],
    ['Port of Destination:', data.port_of_destination || ''],
    ['Currency:', data.currency || 'USD'],
  ];
  let iy = infoY;
  infoFields.forEach(([label, val]) => {
    doc.font('Helvetica-Bold').text(label, 300, iy, { width: 100 });
    doc.font('Helvetica').text(val, 400, iy, { width: 145 });
    iy += 14;
  });

  doc.y = Math.max(doc.y, iy + 10);
  doc.moveDown(0.5);

  // 买方
  doc.fontSize(10).fillColor(styles.accentColor).font('Helvetica-Bold');
  doc.text('BUYER / IMPORTER', 50, doc.y, { width: 240 });
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(9).fillColor('#333');
  doc.text(`${data.buyer_name || ''}\n${data.buyer_address || ''}\n${data.buyer_city || ''} ${data.buyer_country || ''}\nTel: ${data.buyer_phone || ''}`, 50, doc.y, { width: 240 });
  doc.moveDown(1);

  // 商品明细表
  const tableTop = doc.y + 5;
  const colWidths = [30, 200, 60, 50, 75, 80];
  const colX = [50, 80, 280, 340, 390, 465];
  const headers = ['No.', 'Description', 'Qty', 'Unit', 'Unit Price', 'Amount'];

  // 表头
  doc.fillColor(styles.headerBg).rect(50, tableTop, 495, 22).fill();
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(9);
  headers.forEach((h, i) => {
    doc.text(h, colX[i], tableTop + 6, { width: colWidths[i], align: i >= 2 ? 'right' : 'left' });
  });

  // 明细行
  let rowY = tableTop + 22;
  let totalAmount = 0;
  doc.fillColor('#333').font('Helvetica').fontSize(9);
  items.forEach((item, idx) => {
    const amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
    totalAmount += amount;
    const rowH = 20;
    if (rowY + rowH > 750) { doc.addPage(); rowY = 50; }
    doc.strokeColor('#ccc').lineWidth(0.5);
    doc.rect(50, rowY, 495, rowH).stroke();
    const vals = [idx + 1, item.description || '', item.quantity || '', item.unit || '', item.unit_price || '', amount.toFixed(2)];
    vals.forEach((v, i) => {
      doc.text(String(v), colX[i] + 3, rowY + 5, { width: colWidths[i] - 6, align: i >= 2 ? 'right' : 'left' });
    });
    rowY += rowH;
  });

  // 空行
  for (let i = 0; i < Math.max(0, 5 - items.length); i++) {
    doc.strokeColor('#ccc').rect(50, rowY, 495, 20).stroke();
    rowY += 20;
  }

  // 总计
  doc.fillColor('#f0f0f0').rect(50, rowY, 495, 22).fill();
  doc.fillColor('#333').font('Helvetica-Bold').fontSize(10);
  doc.text('TOTAL AMOUNT', 50, rowY + 6, { width: 415, align: 'right' });
  doc.fillColor(styles.accentColor).text(totalAmount.toFixed(2), 465, rowY + 6, { width: 80, align: 'right' });
  doc.y = rowY + 30;

  // 银行信息
  if (data.bank_name) {
    doc.moveDown(0.5);
    doc.fillColor(styles.accentColor).font('Helvetica-Bold').fontSize(10);
    doc.text('BANK INFORMATION');
    doc.moveDown(0.2);
    doc.fillColor('#333').font('Helvetica').fontSize(9);
    doc.text(`Bank Name: ${data.bank_name || ''}\nAccount No: ${data.bank_account || ''}\nSWIFT: ${data.bank_swift || ''}\nBank Address: ${data.bank_address || ''}`);
  }

  // 签名
  doc.y = 780;
  doc.fontSize(9).fillColor('#666').font('Helvetica-Oblique');
  doc.text('Authorized Signature', 50, doc.y, { width: 240, align: 'center' });
  doc.text('Company Stamp', 305, doc.y, { width: 240, align: 'center' });
}

function buildPackingPDF(doc, data, items, styles) {
  doc.fontSize(24).fillColor(styles.titleColor).font('Helvetica-Bold');
  doc.text('PACKING LIST', { align: 'center' });
  doc.moveDown(1);
  doc.strokeColor(styles.accentColor).lineWidth(2).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(1);

  const startY = doc.y;
  doc.fontSize(10).fillColor(styles.accentColor).font('Helvetica-Bold');
  doc.text('SELLER / EXPORTER', 50, startY, { width: 240 });
  doc.text('INFORMATION', 300, startY, { width: 245 });
  doc.font('Helvetica').fontSize(9).fillColor('#333');
  doc.text(`${data.seller_name || ''}\n${data.seller_address || ''}\n${data.seller_city || ''} ${data.seller_country || ''}`, 50, doc.y, { width: 240 });

  let iy = startY + 15;
  [['Invoice No:', data.invoice_no || ''], ['Date:', data.invoice_date || ''], ['Payment Terms:', data.payment_terms || '']].forEach(([l, v]) => {
    doc.font('Helvetica-Bold').text(l, 300, iy, { width: 100 });
    doc.font('Helvetica').text(v, 400, iy, { width: 145 });
    iy += 14;
  });
  doc.y = Math.max(doc.y, iy + 10);
  doc.moveDown(0.5);

  doc.fontSize(10).fillColor(styles.accentColor).font('Helvetica-Bold');
  doc.text('BUYER / CONSIGNEE', 50, doc.y, { width: 240 });
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(9).fillColor('#333');
  doc.text(`${data.buyer_name || ''}\n${data.buyer_address || ''}\n${data.buyer_city || ''} ${data.buyer_country || ''}`, 50, doc.y, { width: 240 });
  doc.moveDown(1);

  const tableTop = doc.y + 5;
  const colX = [50, 80, 200, 310, 370, 430, 490];
  const colW = [30, 120, 110, 60, 60, 60, 55];
  const headers = ['No.', 'Marks & Nos', 'Description', 'Pkgs', 'G.W(KG)', 'N.W(KG)', 'CBM'];

  doc.fillColor(styles.headerBg).rect(50, tableTop, 495, 25).fill();
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(8);
  headers.forEach((h, i) => doc.text(h, colX[i], tableTop + 8, { width: colW[i], align: i >= 3 ? 'center' : 'left' }));

  let rowY = tableTop + 25;
  let tp = 0, tg = 0, tn = 0, tm = 0;
  doc.fillColor('#333').font('Helvetica').fontSize(8);
  items.forEach((item, idx) => {
    tp += parseFloat(item.packages) || 0;
    tg += parseFloat(item.gross_weight) || 0;
    tn += parseFloat(item.net_weight) || 0;
    tm += parseFloat(item.measurement) || 0;
    if (rowY + 20 > 750) { doc.addPage(); rowY = 50; }
    doc.strokeColor('#ccc').rect(50, rowY, 495, 20).stroke();
    const vals = [idx + 1, item.marks_numbers || '', item.description || '', item.packages || '', item.gross_weight || '', item.net_weight || '', item.measurement || ''];
    vals.forEach((v, i) => doc.text(String(v), colX[i] + 2, rowY + 5, { width: colW[i] - 4, align: i >= 3 ? 'right' : 'left' }));
    rowY += 20;
  });
  for (let i = 0; i < Math.max(0, 5 - items.length); i++) {
    doc.strokeColor('#ccc').rect(50, rowY, 495, 20).stroke();
    rowY += 20;
  }

  doc.fillColor('#f0f0f0').rect(50, rowY, 495, 22).fill();
  doc.fillColor('#333').font('Helvetica-Bold').fontSize(9);
  doc.text('TOTAL', 80, rowY + 6, { width: 120 });
  doc.text(tp, 310, rowY + 6, { width: 60, align: 'right' });
  doc.text(tg.toFixed(2), 370, rowY + 6, { width: 60, align: 'right' });
  doc.text(tn.toFixed(2), 430, rowY + 6, { width: 60, align: 'right' });
  doc.text(tm.toFixed(3), 490, rowY + 6, { width: 55, align: 'right' });
  doc.y = rowY + 30;

  doc.fontSize(9).fillColor('#333').font('Helvetica-Bold');
  doc.text(`Total Packages: ${tp}    Total G.W: ${tg.toFixed(2)} KG    Total N.W: ${tn.toFixed(2)} KG    Total CBM: ${tm.toFixed(3)}`);
  doc.y = 780;
  doc.fontSize(9).fillColor('#666').font('Helvetica-Oblique');
  doc.text('Authorized Signature', 50, doc.y, { width: 240, align: 'center' });
  doc.text('Company Stamp', 305, doc.y, { width: 240, align: 'center' });
}

function buildContractPDF(doc, data, items, styles) {
  doc.fontSize(24).fillColor(styles.titleColor).font('Helvetica-Bold');
  doc.text('SALES CONTRACT', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#333');
  doc.text(`Contract No: ${data.contract_no || ''}    Date: ${data.contract_date || ''}`, { align: 'center' });
  doc.moveDown(1);
  doc.strokeColor(styles.accentColor).lineWidth(2).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(1);

  const parties = [
    ['THE SELLER:', data.seller_name, data.seller_address, data.seller_city, data.seller_country],
    ['THE BUYER:', data.buyer_name, data.buyer_address, data.buyer_city, data.buyer_country],
  ];
  parties.forEach((p) => {
    doc.fontSize(11).fillColor(styles.accentColor).font('Helvetica-Bold');
    doc.text(p[0]);
    doc.moveDown(0.2);
    doc.fontSize(10).fillColor('#333').font('Helvetica');
    doc.text(`${p[1] || ''}\n${p[2] || ''}\n${p[3] || ''} ${p[4] || ''}`);
    doc.moveDown(0.8);
  });

  const clauses = [
    ['5. DELIVERY TERMS', data.delivery_terms || ''],
    ['6. PAYMENT TERMS', data.payment_terms || ''],
    ['7. PACKING', data.packing || 'In standard export packing.'],
    ['8. SHIPPING MARK', data.shipping_mark || "At seller's option."],
    ['9. PORT OF LOADING', data.port_of_loading || ''],
    ['10. PORT OF DESTINATION', data.port_of_destination || ''],
  ];

  clauses.forEach(([title, content]) => {
    if (doc.y > 700) doc.addPage();
    doc.fontSize(10).fillColor(styles.titleColor).font('Helvetica-Bold');
    doc.text(title);
    doc.moveDown(0.1);
    doc.fontSize(9).fillColor('#333').font('Helvetica');
    doc.text(content || '');
    doc.moveDown(0.4);
  });

  // 商品明细
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor(styles.accentColor).font('Helvetica-Bold');
  doc.text('GOODS DETAILS');
  doc.moveDown(0.3);

  const tableTop = doc.y;
  const colX = [50, 80, 300, 370, 445];
  const colW = [30, 220, 70, 75, 100];
  doc.fillColor(styles.headerBg).rect(50, tableTop, 495, 22).fill();
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(9);
  ['No.', 'Description', 'Quantity', 'Unit Price', 'Amount'].forEach((h, i) =>
    doc.text(h, colX[i], tableTop + 6, { width: colW[i], align: i >= 2 ? 'right' : 'left' }));

  let rowY = tableTop + 22;
  let total = 0;
  doc.fillColor('#333').font('Helvetica').fontSize(9);
  items.forEach((item, idx) => {
    const amt = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
    total += amt;
    if (rowY + 20 > 750) { doc.addPage(); rowY = 50; }
    doc.strokeColor('#ccc').rect(50, rowY, 495, 20).stroke();
    [idx + 1, item.description || '', item.quantity || '', item.unit_price || '', amt.toFixed(2)].forEach((v, i) =>
      doc.text(String(v), colX[i] + 3, rowY + 5, { width: colW[i] - 6, align: i >= 2 ? 'right' : 'left' }));
    rowY += 20;
  });

  doc.fillColor('#f0f0f0').rect(50, rowY, 495, 22).fill();
  doc.fillColor('#333').font('Helvetica-Bold').fontSize(10);
  doc.text('TOTAL', 50, rowY + 6, { width: 395, align: 'right' });
  doc.fillColor(styles.accentColor).text(total.toFixed(2), 445, rowY + 6, { width: 100, align: 'right' });

  doc.y = 780;
  doc.fontSize(10).fillColor('#333').font('Helvetica-Bold');
  doc.text('THE SELLER', 50, doc.y, { width: 240, align: 'center' });
  doc.text('THE BUYER', 305, doc.y, { width: 240, align: 'center' });
  doc.y += 40;
  doc.fontSize(9).fillColor('#666').font('Helvetica-Oblique');
  doc.text('Signature & Date', 50, doc.y, { width: 240, align: 'center' });
  doc.text('Signature & Date', 305, doc.y, { width: 240, align: 'center' });
}

module.exports = { generatePDF };
