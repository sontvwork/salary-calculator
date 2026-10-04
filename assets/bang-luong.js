/* Dogosa — trang In bảng lương */
(function () {
  'use strict';
  const D = window.Dogosa;
  const { store, WORKSHOPS, EXTRAS, escapeHtml, fmtNum, fmtK } = D;
  const $ = (id) => document.getElementById(id);

  let employees, settings, month;

  function load() {
    employees = store.getEmployees();
    settings = store.getSettings();
    month = store.getMonth();
  }

  const valueOf = (v) => (v == null ? '' : String(v));
  // Tiền (đồng) → dạng k; 0 hiện '—'
  const k = (vnd) => fmtK(vnd / 1000);
  const kOrDash = (vnd) => (vnd ? k(vnd) : '<span class="muted">—</span>');

  // Số nguyên ≥ 0; '' → null
  function sanitize(raw) {
    if (raw === '' || raw == null) return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    return Math.round(Math.max(0, n));
  }

  // Chỉ in nhân sự có ngày công > 0
  function printRows() {
    const r = D.calculate({ employees, settings, month });
    return { r, rows: r.rows.filter((row) => row.workDays > 0) };
  }

  /* ---------- Render bảng và ô nhập (chỉ khi dữ liệu nền thay đổi) ---------- */
  function renderStructure() {
    const { r, rows } = printRows();
    $('emptyState').hidden = rows.length > 0;
    $('content').hidden = rows.length === 0;
    $('printBtn').disabled = rows.length === 0;
    if (!rows.length) return;

    $('warnings').innerHTML = r.warnings.map((w) => `<div class="callout callout-warn">${escapeHtml(w)}</div>`).join('');

    $('printHead').innerHTML = `<tr>
        <th rowspan="2">Tên</th>
        <th rowspan="2" class="num">Lương cứng</th>
        <th rowspan="2" class="num">Chuyên cần</th>
        <th colspan="${WORKSHOPS.length}" class="group">Thưởng sản phẩm</th>
        ${EXTRAS.map((x) => `<th rowspan="2" class="num">${x.name}</th>`).join('')}
        <th rowspan="2" class="num">Tổng</th>
      </tr>
      <tr>${WORKSHOPS.map((w) => `<th class="num sub-th">${w.name}</th>`).join('')}</tr>`;

    $('printRows').innerHTML = rows
      .map((row) => {
        const e = row.emp;
        return `<tr>
          <td class="name-cell">${escapeHtml(e.name)}</td>
          <td class="num">${k(row.base)}<span class="sub">${fmtK(e.dailyWage)} × ${fmtNum(row.workDays)}</span></td>
          <td class="num">${kOrDash(row.attendance)}</td>
          ${WORKSHOPS.map((w) => `<td class="num">${kOrDash(row.bonusByWs[w.key])}</td>`).join('')}
          ${EXTRAS.map(
            (x) => `<td class="num"><input type="number" class="input-cell" min="0" step="1" inputmode="numeric"
                data-extra="${x.key}" data-emp="${e.id}" value="${valueOf(month.extras[x.key][e.id])}"
                aria-label="${x.name} của ${escapeHtml(e.name)}"><span class="print-only" id="pv-${x.key}-${e.id}"></span></td>`
          ).join('')}
          <td class="num total-cell" id="net-${e.id}"></td>
        </tr>`;
      })
      .join('');

    update();
  }

  /* ---------- Cập nhật cột Tổng và dòng tổng cộng (mỗi lần gõ) ---------- */
  function update() {
    const { rows } = printRows();
    const sum = (f) => rows.reduce((s, row) => s + f(row), 0);

    for (const row of rows) {
      $('net-' + row.emp.id).textContent = k(row.net);
      // Bản in hiện giá trị dạng k thay cho ô nhập
      for (const x of EXTRAS) $(`pv-${x.key}-${row.emp.id}`).innerHTML = kOrDash(row.extras[x.key]);
    }

    $('printFoot').innerHTML = `<tr>
      <td>Tổng cộng (${rows.length} người)</td>
      <td class="num">${k(sum((row) => row.base))}</td>
      <td class="num">${k(sum((row) => row.attendance))}</td>
      ${WORKSHOPS.map((w) => `<td class="num">${k(sum((row) => row.bonusByWs[w.key] || 0))}</td>`).join('')}
      ${EXTRAS.map((x) => `<td class="num">${k(sum((row) => row.extras[x.key]))}</td>`).join('')}
      <td class="num total-cell">${k(sum((row) => row.net))}</td>
    </tr>`;
  }

  /* ---------- Nhập liệu ---------- */
  function applyInput(el) {
    if (!el.dataset.extra) return false;
    const map = month.extras[el.dataset.extra];
    const v = sanitize(el.value);
    if (v == null) delete map[el.dataset.emp];
    else map[el.dataset.emp] = v;
    store.saveMonth(month);
    update();
    return true;
  }

  const content = $('content');
  content.addEventListener('input', (ev) => applyInput(ev.target));
  // Khi rời ô: hiển thị lại giá trị đã chuẩn hoá (VD 70.4 → 70)
  content.addEventListener('change', (ev) => {
    const el = ev.target;
    if (!applyInput(el)) return;
    el.value = valueOf(month.extras[el.dataset.extra][el.dataset.emp]);
  });

  $('printBtn').addEventListener('click', () => window.print());

  // Đồng bộ khi trang khác (tab khác) thay đổi dữ liệu
  window.addEventListener('storage', (ev) => {
    if (!D.isOwnKey(ev.key)) return;
    load();
    renderStructure();
  });

  $('printDate').textContent = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  load();
  renderStructure();
})();
