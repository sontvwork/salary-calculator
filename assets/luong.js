/* Dogosa — trang Tính lương */
(function () {
  'use strict';
  const D = window.Dogosa;
  const { store, WORKSHOPS, escapeHtml, fmtMoney, fmtNum, fmtK } = D;
  const $ = (id) => document.getElementById(id);

  let employees, settings, month;

  function load() {
    employees = store.getEmployees();
    settings = store.getSettings();
    month = store.getMonth();
  }

  const membersOf = (wsKey) => employees.filter((e) => e.workshops.includes(wsKey));
  const chip = (wsKey) => `<span class="chip chip-${wsKey}">${D.workshopByKey(wsKey).name}</span>`;
  const valueOf = (v) => (v == null ? '' : String(v));

  // Chuẩn hoá giá trị nhập: '' → null; ngày công bước 0.5; còn lại số nguyên ≥ 0
  function sanitize(kind, raw) {
    if (raw === '' || raw == null) return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    const v = Math.max(0, n);
    return kind === 'workDays' ? Math.round(v * 2) / 2 : Math.round(v);
  }

  // Số tiền gọn: chẵn nghìn → '56k', còn lại giữ nguyên dạng đầy đủ
  const shortMoney = (v) => (v % 1000 === 0 ? fmtK(v / 1000) : fmtMoney(v));

  /* ---------- Render phần có ô nhập (chỉ khi dữ liệu nền thay đổi) ---------- */
  function renderStructure() {
    const hasEmp = employees.length > 0;
    $('emptyState').hidden = hasEmp;
    $('content').hidden = !hasEmp;
    $('resetMonth').hidden = !hasEmp;
    $('threshold').textContent = D.ATTENDANCE_THRESHOLD;
    if (!hasEmp) return;

    $('products').value = valueOf(month.products);
    $('rateValue').textContent = fmtNum(settings.bonusPerProduct);

    $('workDayRows').innerHTML = employees
      .map(
        (e) => `<tr>
          <td class="name-cell">${escapeHtml(e.name)}</td>
          <td><div class="chips">${e.workshops.map(chip).join('') || '<span class="muted small">—</span>'}</div></td>
          <td class="num">${fmtK(e.dailyWage)}</td>
          <td class="num"><input type="number" class="input-cell" min="0" step="0.5" inputmode="decimal" data-workdays="${e.id}" value="${valueOf(month.workDays[e.id])}" aria-label="Ngày công của ${escapeHtml(e.name)}"></td>
          <td class="num"><span id="base-${e.id}">0 đ</span></td>
        </tr>`
      )
      .join('');

    const splitWs = WORKSHOPS.filter((w) => membersOf(w.key).length >= 2);
    $('participation').innerHTML = splitWs
      .map((w) => {
        const unitLabel = w.unit === 'giờ' ? 'Số giờ' : 'Số tấm';
        const rows = membersOf(w.key)
          .map(
            (e) => `<tr>
              <td class="name-cell">${escapeHtml(e.name)}</td>
              <td class="num"><input type="number" class="input-cell" min="0" step="1" inputmode="numeric" placeholder="0"
                  data-ws="${w.key}" data-emp="${e.id}" value="${valueOf(month.participation[w.key][e.id])}"
                  aria-label="${unitLabel} ${w.name} của ${escapeHtml(e.name)}"></td>
              <td class="num muted" id="pct-${w.key}-${e.id}">—</td>
              <td class="num" id="amt-${w.key}-${e.id}">—</td>
            </tr>`
          )
          .join('');
        return `<div class="ws-card">
          <div class="ws-card-head">${chip(w.key)}<span class="small muted">Quỹ <b class="ws-pool" id="pool-${w.key}">0 đ</b></span></div>
          <table class="ws-table">
            <thead><tr><th>Nhân sự</th><th class="num">${unitLabel}</th><th class="num">Tỷ lệ</th><th class="num">Thưởng</th></tr></thead>
            <tbody>${rows}</tbody>
            <tfoot><tr><td>Tổng</td><td class="num" id="units-${w.key}">0 ${w.unit}</td><td></td><td class="num" id="alloc-${w.key}">0 đ</td></tr></tfoot>
          </table>
        </div>`;
      })
      .join('');

    update();
  }

  /* ---------- Cập nhật các số tính toán (mỗi lần gõ) ---------- */
  function update() {
    const r = D.calculate({ employees, settings, month });

    $('totalBonus').textContent = fmtMoney(r.totalBonus);

    $('pools').innerHTML = r.workshops
      .map((info) => {
        const { ws, pool, members, mode, totalUnits } = info;
        let sub;
        if (mode === 'empty') sub = '<span class="text-warn">Chưa có nhân sự</span>';
        else if (mode === 'single') sub = `1 người · ${escapeHtml(members[0].name)}`;
        else if (totalUnits === 0) sub = `${members.length} người · <span class="text-warn">chưa nhập ${ws.unit}</span>`;
        else sub = `${members.length} người · ${fmtNum(totalUnits)} ${ws.unit}`;
        return `<div class="stat">
          <div class="stat-label"><span>${ws.name}</span><span class="chip chip-${ws.key}">${Math.round(ws.share * 100)}%</span></div>
          <div class="stat-value">${fmtMoney(pool)}</div>
          <div class="stat-sub">${sub}</div>
        </div>`;
      })
      .join('');

    for (const row of r.rows) {
      $('base-' + row.emp.id).textContent = fmtMoney(row.base);
    }

    const notes = [];
    for (const info of r.workshops) {
      const { ws } = info;
      if (info.mode === 'split') {
        $('pool-' + ws.key).textContent = fmtMoney(info.pool);
        $('units-' + ws.key).textContent = `${fmtNum(info.totalUnits)} ${ws.unit}`;
        $('alloc-' + ws.key).textContent = fmtMoney(info.allocated);
        for (const m of info.members) {
          const pct = info.totalUnits ? (info.units[m.id] / info.totalUnits) * 100 : null;
          $(`pct-${ws.key}-${m.id}`).textContent = pct == null ? '—' : fmtNum(Math.round(pct * 10) / 10) + '%';
          $(`amt-${ws.key}-${m.id}`).textContent = info.shares[m.id] == null ? '—' : fmtMoney(info.shares[m.id]);
        }
      } else if (info.mode === 'single') {
        notes.push(`<b>${ws.name}</b> chỉ có 1 người (${escapeHtml(info.members[0].name)}) → nhận toàn bộ quỹ ${fmtMoney(info.pool)}, không cần nhập.`);
      } else {
        notes.push(`<b>${ws.name}</b> chưa có nhân sự nào.`);
      }
    }
    if (!$('participation').children.length) notes.unshift('Không có phân xưởng nào từ 2 người trở lên nên không cần nhập mức độ tham gia.');
    $('wsNotes').innerHTML = notes.map((n) => `<div class="callout callout-info">${n}</div>`).join('');

    $('warnings').innerHTML = r.warnings.map((w) => `<div class="callout callout-warn">${escapeHtml(w)}</div>`).join('');

    $('payrollRows').innerHTML = r.rows
      .map((row) => {
        const parts = Object.keys(row.bonusByWs)
          .map((k) => `${D.workshopByKey(k).name} ${shortMoney(row.bonusByWs[k])}`)
          .join(' · ');
        return `<tr>
          <td class="name-cell">${escapeHtml(row.emp.name)}</td>
          <td class="num">${fmtNum(row.workDays)}</td>
          <td class="num">${fmtMoney(row.base)}</td>
          <td class="num">${fmtMoney(row.bonus)}${parts ? `<span class="sub">${parts}</span>` : ''}</td>
          <td class="num">${row.attendance ? fmtMoney(row.attendance) : '<span class="muted">—</span>'}</td>
          <td class="num total-cell">${fmtMoney(row.total)}</td>
        </tr>`;
      })
      .join('');

    const canExport = employees.some((e) => month.workDays[e.id] > 0);
    $('exportBtn').disabled = !canExport;
    $('exportBtn').title = canExport ? '' : 'Nhập ngày công của ít nhất 1 nhân sự để xuất bảng lương';

    const t = r.totals;
    $('payrollFoot').innerHTML = `<tr>
      <td>Tổng cộng (${r.rows.length} người)</td>
      <td></td>
      <td class="num">${fmtMoney(t.base)}</td>
      <td class="num">${fmtMoney(t.bonus)}</td>
      <td class="num">${fmtMoney(t.attendance)}</td>
      <td class="num total-cell">${fmtMoney(t.total)}</td>
    </tr>`;
  }

  /* ---------- Nhập liệu ---------- */
  function applyInput(el) {
    if (el.id === 'products') {
      month.products = sanitize('products', el.value);
    } else if (el.dataset.workdays) {
      const v = sanitize('workDays', el.value);
      if (v == null) delete month.workDays[el.dataset.workdays];
      else month.workDays[el.dataset.workdays] = v;
    } else if (el.dataset.ws) {
      const map = month.participation[el.dataset.ws];
      const v = sanitize('units', el.value);
      if (v == null) delete map[el.dataset.emp];
      else map[el.dataset.emp] = v;
    } else return null;
    store.saveMonth(month);
    update();
    return true;
  }

  const content = $('content');
  content.addEventListener('input', (ev) => applyInput(ev.target));
  // Khi rời ô: hiển thị lại giá trị đã chuẩn hoá (VD 25.3 → 25.5)
  content.addEventListener('change', (ev) => {
    const el = ev.target;
    if (!applyInput(el)) return;
    let v;
    if (el.id === 'products') v = month.products;
    else if (el.dataset.workdays) v = month.workDays[el.dataset.workdays];
    else v = month.participation[el.dataset.ws][el.dataset.emp];
    el.value = valueOf(v);
  });

  /* ---------- Sửa mức thưởng / sản phẩm ---------- */
  const rateView = $('rateView');
  const rateEdit = $('rateEdit');
  const rateInput = $('rateInput');
  let rateCancelled = false;

  function openRateEdit() {
    rateCancelled = false;
    rateInput.value = settings.bonusPerProduct;
    rateView.hidden = true;
    rateEdit.hidden = false;
    rateInput.focus();
    rateInput.select();
  }

  function closeRateEdit(save) {
    if (rateEdit.hidden) return;
    if (save) {
      const v = Number(rateInput.value);
      if (rateInput.value.trim() === '' || !Number.isInteger(v) || v < 0) {
        D.toast('Mức thưởng phải là số nguyên ≥ 0', 'danger');
      } else if (v !== settings.bonusPerProduct) {
        settings.bonusPerProduct = v;
        store.saveSettings(settings);
        $('rateValue').textContent = fmtNum(v);
        update();
        D.toast(`Đã lưu mức thưởng ${fmtK(v)}/sản phẩm`, 'ok');
      }
    }
    rateEdit.hidden = true;
    rateView.hidden = false;
  }

  $('rateEditBtn').addEventListener('click', openRateEdit);
  rateInput.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      closeRateEdit(true);
    } else if (ev.key === 'Escape') {
      rateCancelled = true;
      closeRateEdit(false);
    }
  });
  rateInput.addEventListener('blur', () => {
    if (!rateCancelled) closeRateEdit(true);
  });

  /* ---------- Xuất bảng lương ---------- */
  $('exportBtn').addEventListener('click', () => {
    // Không xuất khi còn phân xưởng có quỹ thưởng nhưng chưa chia được
    const r = D.calculate({ employees, settings, month });
    if (r.warnings.length) {
      D.toast('Chưa chia được hết thưởng sản phẩm. Xem cảnh báo ở mục Bảng lương.', 'danger');
      $('warnings').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    location.href = 'bang-luong.html';
  });

  /* ---------- Làm mới dữ liệu tháng ---------- */
  $('resetMonth').addEventListener('click', () => {
    if (!confirm('Xoá toàn bộ số sản phẩm, ngày công, giờ/tấm và các khoản thưởng/trừ lỗi của tháng hiện tại?\nDanh sách nhân sự và mức thưởng được giữ nguyên.')) return;
    store.clearMonth();
    month = store.getMonth();
    renderStructure();
    D.toast('Đã làm mới dữ liệu tháng', 'ok');
  });

  // Đồng bộ khi trang Nhân sự (tab khác) thay đổi dữ liệu
  window.addEventListener('storage', (ev) => {
    if (!D.isOwnKey(ev.key)) return;
    load();
    renderStructure();
  });

  load();
  renderStructure();
})();
