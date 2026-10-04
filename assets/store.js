/* Dogosa — hằng số, lưu trữ localStorage và helper định dạng dùng chung */
(function (g) {
  'use strict';
  const D = (g.Dogosa = g.Dogosa || {});

  D.WORKSHOPS = [
    { key: 'cnc', name: 'Cắt CNC', share: 0.2, unit: 'tấm' },
    { key: 'edge', name: 'Dán cạnh', share: 0.2, unit: 'giờ' },
    { key: 'drill', name: 'Khoan', share: 0.2, unit: 'tấm' },
    { key: 'pack', name: 'Đóng gói', share: 0.4, unit: 'tấm' },
  ];
  // Các khoản nhập tay trên trang in bảng lương (đơn vị k). sign: +1 cộng, -1 trừ
  D.EXTRAS = [
    { key: 'wood', name: 'Thưởng kéo gỗ', sign: 1 },
    { key: 'holiday', name: 'Thưởng lễ tết', sign: 1 },
    { key: 'penalty', name: 'Trừ lỗi', sign: -1 },
  ];
  D.ATTENDANCE_THRESHOLD = 26;
  D.DEFAULT_BONUS_PER_PRODUCT = 10; // k / sản phẩm
  D.NAME_MAX = 300;

  const KEYS = {
    employees: 'dogosa.employees',
    nextId: 'dogosa.nextId',
    settings: 'dogosa.settings',
    month: 'dogosa.month',
  };
  D.KEYS = KEYS;

  const WS_KEYS = D.WORKSHOPS.map((w) => w.key);
  const EXTRA_KEYS = D.EXTRAS.map((x) => x.key);
  const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const isNonNeg = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      const v = JSON.parse(raw);
      return v == null ? fallback : v;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('[Dogosa] Không lưu được dữ liệu', key, e);
      return false;
    }
  }

  function normalizeEmployee(e) {
    return {
      id: e.id,
      name: String(e.name || '').slice(0, D.NAME_MAX),
      dailyWage: isNonNeg(e.dailyWage) ? Math.round(e.dailyWage) : 0,
      workshops: Array.isArray(e.workshops) ? WS_KEYS.filter((k) => e.workshops.includes(k)) : [],
    };
  }

  // Giữ lại các số hợp lệ trong map { id: number }
  function cleanNumberMap(m) {
    const out = {};
    if (isObj(m)) for (const k in m) if (isNonNeg(m[k])) out[k] = m[k];
    return out;
  }

  D.store = {
    getEmployees() {
      const list = read(KEYS.employees, []);
      if (!Array.isArray(list)) return [];
      return list.filter((e) => isObj(e) && Number.isInteger(e.id)).map(normalizeEmployee);
    },

    saveEmployees(list) {
      return write(KEYS.employees, list);
    },

    // ID tự tăng, không tái sử dụng ID đã xoá
    takeNextId() {
      const maxId = this.getEmployees().reduce((m, e) => Math.max(m, e.id), 0);
      const stored = read(KEYS.nextId, 1);
      const id = Math.max(Number.isInteger(stored) ? stored : 1, maxId + 1);
      write(KEYS.nextId, id + 1);
      return id;
    },

    getSettings() {
      const s = read(KEYS.settings, {});
      return {
        bonusPerProduct: isObj(s) && isNonNeg(s.bonusPerProduct) ? s.bonusPerProduct : D.DEFAULT_BONUS_PER_PRODUCT,
      };
    },

    saveSettings(s) {
      return write(KEYS.settings, s);
    },

    getMonth() {
      const m = read(KEYS.month, {});
      const src = isObj(m) ? m : {};
      const participation = {};
      for (const k of WS_KEYS) participation[k] = cleanNumberMap(isObj(src.participation) ? src.participation[k] : null);
      const extras = {};
      for (const k of EXTRA_KEYS) extras[k] = cleanNumberMap(isObj(src.extras) ? src.extras[k] : null);
      return {
        products: isNonNeg(src.products) ? src.products : null,
        workDays: cleanNumberMap(src.workDays),
        participation,
        extras,
      };
    },

    saveMonth(m) {
      return write(KEYS.month, m);
    },

    clearMonth() {
      try {
        localStorage.removeItem(KEYS.month);
      } catch (e) {
        /* bỏ qua */
      }
    },

    // Xoá dữ liệu tháng của nhân sự đã bị xoá
    purgeEmployeeFromMonth(id) {
      const m = this.getMonth();
      delete m.workDays[id];
      for (const k of WS_KEYS) delete m.participation[k][id];
      for (const k of EXTRA_KEYS) delete m.extras[k][id];
      this.saveMonth(m);
    },
  };

  D.isOwnKey = (key) => key == null || Object.values(KEYS).includes(key);

  D.fmtNum = (n) => Number(n || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
  D.fmtMoney = (vnd) => Math.round(vnd || 0).toLocaleString('vi-VN') + ' đ';
  D.fmtK = (k) => D.fmtNum(k) + 'k';

  D.escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  D.workshopByKey = (key) => D.WORKSHOPS.find((w) => w.key === key);

  // Toast thông báo nhỏ góc màn hình
  D.toast = function (msg, type) {
    let box = document.getElementById('toasts');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toasts';
      box.className = 'toasts';
      document.body.appendChild(box);
    }
    const el = document.createElement('div');
    el.className = 'toast' + (type ? ' toast-' + type : '');
    el.textContent = msg;
    box.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 250);
    }, 2200);
  };
})(globalThis);
