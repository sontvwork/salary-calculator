/* Dogosa — tính lương (hàm thuần, không đụng DOM). Mọi số tiền trả về tính bằng đồng. */
(function (g) {
  'use strict';
  const D = (g.Dogosa = g.Dogosa || {});

  const K = 1000; // 1k = 1.000đ
  const roundK = (vnd) => Math.round(vnd / K) * K;
  const nonNeg = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);

  /**
   * @param {{employees: Array, settings: {bonusPerProduct:number}, month: {products, workDays, participation}}} input
   * @returns {{rows, workshops, totalBonus, warnings, totals}}
   */
  D.calculate = function ({ employees, settings, month }) {
    const products = nonNeg(month.products);
    const totalBonus = Math.round(products * nonNeg(settings.bonusPerProduct) * K);

    const rows = employees.map((emp) => {
      const workDays = nonNeg(month.workDays[emp.id]);
      const dailyVnd = emp.dailyWage * K;
      return {
        emp,
        workDays,
        base: Math.round(workDays * dailyVnd),
        bonusByWs: {},
        bonus: 0,
        total: 0,
        extras: {},
        net: 0,
      };
    });
    const rowById = new Map(rows.map((r) => [r.emp.id, r]));

    const warnings = [];
    const workshops = D.WORKSHOPS.map((ws) => {
      const pool = Math.round(totalBonus * ws.share);
      const members = employees.filter((e) => e.workshops.includes(ws.key));
      const info = { ws, pool, members, mode: 'split', units: {}, totalUnits: 0, shares: {}, allocated: 0 };

      if (members.length === 0) {
        info.mode = 'empty';
        if (pool > 0) warnings.push(`${ws.name} chưa có nhân sự → quỹ ${D.fmtMoney(pool)} không được chia.`);
      } else if (members.length === 1) {
        info.mode = 'single';
        info.shares[members[0].id] = roundK(pool);
      } else {
        const parts = month.participation[ws.key] || {};
        for (const m of members) {
          info.units[m.id] = nonNeg(parts[m.id]);
          info.totalUnits += info.units[m.id];
        }
        if (info.totalUnits === 0) {
          if (pool > 0) warnings.push(`${ws.name}: chưa nhập số ${ws.unit} → quỹ ${D.fmtMoney(pool)} chưa được chia.`);
        } else {
          for (const m of members) info.shares[m.id] = roundK((pool * info.units[m.id]) / info.totalUnits);
        }
      }

      for (const id in info.shares) {
        const row = rowById.get(Number(id));
        row.bonusByWs[ws.key] = info.shares[id];
        row.bonus += info.shares[id];
        info.allocated += info.shares[id];
      }
      return info;
    });

    // total: lương cứng + thưởng SP. net: total cộng/trừ các khoản nhập tay trên trang in
    const extrasSrc = month.extras || {};
    const totals = { base: 0, bonus: 0, total: 0, extras: {}, net: 0 };
    for (const x of D.EXTRAS) totals.extras[x.key] = 0;
    for (const r of rows) {
      r.total = r.base + r.bonus;
      r.net = r.total;
      for (const x of D.EXTRAS) {
        const v = Math.round(nonNeg((extrasSrc[x.key] || {})[r.emp.id]) * K);
        r.extras[x.key] = v;
        r.net += x.sign * v;
        totals.extras[x.key] += v;
      }
      totals.base += r.base;
      totals.bonus += r.bonus;
      totals.total += r.total;
      totals.net += r.net;
    }

    return { rows, workshops, totalBonus, warnings, totals };
  };
})(globalThis);
