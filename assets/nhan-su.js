/* Dogosa — trang Danh sách nhân sự */
(function () {
  'use strict';
  const D = window.Dogosa;
  const { store, WORKSHOPS, escapeHtml, fmtK } = D;
  const $ = (id) => document.getElementById(id);

  const ICON_EDIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
  const ICON_DELETE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/></svg>';

  let employees = store.getEmployees();
  let editingId = null;

  const form = $('empForm');
  const nameInput = $('name');
  const wageInput = $('dailyWage');

  // Checkbox phân xưởng
  $('wsChecks').innerHTML = WORKSHOPS.map(
    (w) => `<label class="pill-check"><input type="checkbox" name="ws" value="${w.key}"><span>${w.name}</span></label>`
  ).join('');
  const wsBoxes = () => [...form.querySelectorAll('input[name="ws"]')];

  function renderStats() {
    $('wsStats').innerHTML = WORKSHOPS.map((w) => {
      const n = employees.filter((e) => e.workshops.includes(w.key)).length;
      return `<div class="stat">
        <div class="stat-label"><span>${w.name}</span><span class="chip chip-${w.key}">${Math.round(w.share * 100)}%</span></div>
        <div class="stat-value">${n} <span class="small muted" style="font-weight:500">người</span></div>
      </div>`;
    }).join('');
  }

  function renderList() {
    $('headCount').textContent = employees.length ? `${employees.length} nhân sự` : 'Chưa có nhân sự';
    $('listEmpty').hidden = employees.length > 0;
    $('listWrap').hidden = employees.length === 0;
    $('empRows').innerHTML = employees
      .map((e) => {
        const chips = e.workshops.length
          ? e.workshops.map((k) => `<span class="chip chip-${k}">${D.workshopByKey(k).name}</span>`).join('')
          : '<span class="muted small">—</span>';
        return `<tr class="${e.id === editingId ? 'row-editing' : ''}">
          <td class="muted">${e.id}</td>
          <td class="name-cell">${escapeHtml(e.name)}</td>
          <td class="num">${fmtK(e.dailyWage)}<span class="muted small">/ngày</span></td>
          <td><div class="chips">${chips}</div></td>
          <td><div class="actions">
            <button type="button" class="icon-btn" data-edit="${e.id}" title="Sửa" aria-label="Sửa ${escapeHtml(e.name)}">${ICON_EDIT}</button>
            <button type="button" class="icon-btn danger" data-delete="${e.id}" title="Xoá" aria-label="Xoá ${escapeHtml(e.name)}">${ICON_DELETE}</button>
          </div></td>
        </tr>`;
      })
      .join('');
  }

  function render() {
    renderStats();
    renderList();
  }

  function updateNameCount() {
    $('nameCount').textContent = `${nameInput.value.length}/${D.NAME_MAX}`;
  }

  function setError(input, errEl, msg) {
    input.classList.toggle('invalid', !!msg);
    $(errEl).textContent = msg || '';
  }

  function resetForm() {
    editingId = null;
    form.reset();
    setError(nameInput, 'nameErr', '');
    setError(wageInput, 'wageErr', '');
    $('formTitle').textContent = 'Thêm nhân sự';
    $('submitBtn').textContent = 'Thêm nhân sự';
    $('cancelBtn').hidden = true;
    $('editingBadge').hidden = true;
    updateNameCount();
    renderList();
  }

  function startEdit(id) {
    const e = employees.find((x) => x.id === id);
    if (!e) return;
    editingId = id;
    nameInput.value = e.name;
    wageInput.value = e.dailyWage;
    wsBoxes().forEach((b) => (b.checked = e.workshops.includes(b.value)));
    setError(nameInput, 'nameErr', '');
    setError(wageInput, 'wageErr', '');
    $('formTitle').textContent = 'Sửa nhân sự';
    $('submitBtn').textContent = 'Lưu thay đổi';
    $('cancelBtn').hidden = false;
    $('editingBadge').hidden = false;
    $('editingBadge').textContent = `ID ${id}`;
    updateNameCount();
    renderList();
    nameInput.focus();
  }

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const name = nameInput.value.trim();
    const wageRaw = wageInput.value.trim();
    const wage = Number(wageRaw);
    let ok = true;

    if (!name) {
      setError(nameInput, 'nameErr', 'Vui lòng nhập họ tên.');
      ok = false;
    } else if (name.length > D.NAME_MAX) {
      setError(nameInput, 'nameErr', `Tối đa ${D.NAME_MAX} ký tự.`);
      ok = false;
    } else setError(nameInput, 'nameErr', '');

    if (wageRaw === '' || !Number.isInteger(wage) || wage < 0) {
      setError(wageInput, 'wageErr', 'Lương cứng phải là số nguyên ≥ 0 (đơn vị k/ngày).');
      ok = false;
    } else setError(wageInput, 'wageErr', '');

    if (!ok) {
      form.querySelector('.invalid').focus();
      return;
    }

    const workshops = wsBoxes().filter((b) => b.checked).map((b) => b.value);
    employees = store.getEmployees(); // lấy bản mới nhất phòng khi tab khác vừa sửa

    if (editingId != null) {
      const e = employees.find((x) => x.id === editingId);
      if (e) Object.assign(e, { name, dailyWage: wage, workshops });
      store.saveEmployees(employees);
      D.toast(`Đã cập nhật "${name}"`, 'ok');
    } else {
      employees.push({ id: store.takeNextId(), name, dailyWage: wage, workshops });
      store.saveEmployees(employees);
      D.toast(`Đã thêm "${name}"`, 'ok');
    }
    resetForm();
    renderStats();
    nameInput.focus();
  });

  $('cancelBtn').addEventListener('click', resetForm);
  nameInput.addEventListener('input', updateNameCount);

  $('empRows').addEventListener('click', (ev) => {
    const editBtn = ev.target.closest('[data-edit]');
    const delBtn = ev.target.closest('[data-delete]');
    if (editBtn) startEdit(Number(editBtn.dataset.edit));
    if (delBtn) {
      const id = Number(delBtn.dataset.delete);
      const e = employees.find((x) => x.id === id);
      if (!e || !confirm(`Xoá nhân sự "${e.name}"?\nDữ liệu ngày công / giờ công tháng này của người này cũng bị xoá.`)) return;
      employees = store.getEmployees().filter((x) => x.id !== id);
      store.saveEmployees(employees);
      store.purgeEmployeeFromMonth(id);
      if (editingId === id) resetForm();
      render();
      D.toast(`Đã xoá "${e.name}"`, 'danger');
    }
  });

  // Đồng bộ khi trang khác (tab khác) thay đổi dữ liệu
  window.addEventListener('storage', (ev) => {
    if (!D.isOwnKey(ev.key)) return;
    employees = store.getEmployees();
    if (editingId != null && !employees.some((e) => e.id === editingId)) resetForm();
    render();
  });

  render();
  updateNameCount();
})();
