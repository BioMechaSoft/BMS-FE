import React, { useMemo } from 'react';

const formatCurrency = (v) => {
  const n = Number(v) || 0;
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const Reports = ({ appointments = [] }) => {
  const now = new Date();

  const { todayCount, monthCount, todayPayments, monthPayments } = useMemo(() => {
    let tCount = 0;
    let mCount = 0;
    let tPay = 0;
    let mPay = 0;

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    (appointments || []).forEach((a) => {
      try {
        const d = new Date(a.appointment_date);
        if (isNaN(d.getTime())) return;

        if (d >= startOfToday && d < new Date(startOfToday.getTime() + 24 * 3600 * 1000)) {
          tCount += 1;
          tPay += Number(a.feesAmount || a.fees || a.total || 0) || 0;
        }

        if (d >= startOfMonth) {
          mCount += 1;
          mPay += Number(a.feesAmount || a.fees || a.total || 0) || 0;
        }
      } catch (e) {
        // ignore
      }
    });

    return {
      todayCount: tCount,
      monthCount: mCount,
      todayPayments: tPay,
      monthPayments: mPay,
    };
  }, [appointments]);

  return (
    <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
      <div style={{ flex: 1, padding: 14, borderRadius: 12, background: '#e6f7ff' }}>
        <p>Patients Viewed Today</p>
        <h3>{todayCount}</h3>
        <p style={{ fontSize: 12, color: '#333' }}>Payments today: {formatCurrency(todayPayments)}</p>
      </div>

      <div style={{ flex: 1, padding: 14, borderRadius: 12, background: '#fff0f6' }}>
        <p>Patients This Month</p>
        <h3>{monthCount}</h3>
        <p style={{ fontSize: 12, color: '#333' }}>Payments this month: {formatCurrency(monthPayments)}</p>
      </div>

      <div style={{ flex: 1, padding: 14, borderRadius: 12, background: '#f0fff4' }}>
        <p>Total Appointments</p>
        <h3>{appointments.length}</h3>
        <p style={{ fontSize: 12, color: '#333' }}>Total payments: {formatCurrency((appointments || []).reduce((s, a) => s + (Number(a.feesAmount || a.fees || a.total || 0) || 0), 0))}</p>
      </div>
    </div>
  );
};

export default Reports;
