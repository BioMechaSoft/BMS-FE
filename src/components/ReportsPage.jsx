import React, { useEffect, useState, useMemo } from 'react';
import api from '../utils/api';
import './ReportsPage.css';
import ReportRow from './ReportRow';

const fmt = (n) => {
  const v = Number(n) || 0;
  return v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const startOfDayISO = (d) => {
  const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  return dd.toISOString();
};
const endOfDayISO = (d) => {
  const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return dd.toISOString();
};

const ReportsPage = () => {
  const [loading, setLoading] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [groupBy, setGroupBy] = useState('day');
  const [doctorId, setDoctorId] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [includeAppointments, setIncludeAppointments] = useState(true);

  const [totals, setTotals] = useState({ paid: 0, totalDue: 0, invoiced: 0 });
  const [groups, setGroups] = useState([]);
  const [usePersisted, setUsePersisted] = useState(false);
  const [reportEntries, setReportEntries] = useState([]);
  const [reportPage, setReportPage] = useState(1);
  const [reportTotal, setReportTotal] = useState(0);
  const [patientsThisMonth, setPatientsThisMonth] = useState(0);
  const [totalAppointments, setTotalAppointments] = useState(0);

  useEffect(() => {
    // load doctors for filter
    (async () => {
      try {
        const { data } = await api.get('/api/v1/user/doctors');
        setDoctors(data.doctors || []);
      } catch (e) {
        setDoctors([]);
      }
    })();
  }, []);

  const fetchSummary = async (opts = {}) => {
    setLoading(true);
    try {
      const s = opts.start || start;
      const e = opts.end || end;
      const grp = opts.groupBy || groupBy;
      const doc = opts.doctorId || doctorId;

      // Prefer invoice stats endpoint for payments (server computes paid/due)
      const q = [];
      if (s) q.push(`start=${encodeURIComponent(s)}`);
      if (e) q.push(`end=${encodeURIComponent(e)}`);
      if (grp) q.push(`group=${encodeURIComponent(grp)}`);
      if (doc) q.push(`doctor=${encodeURIComponent(doc)}`);
      const query = q.length ? `?${q.join('&')}` : '';

      const invRes = await api.get(`/api/v1/invoice/stats${query}`);
      const invData = invRes.data || {};
      const totalEarning = Number(invData.totalEarning || 0);
      const totalDue = Number(invData.totalDue || 0);
      const invGroups = Array.isArray(invData.groups) ? invData.groups : [];

      // Choose between persisted per-appointment reports or on-the-fly aggregation
      if (usePersisted) {
        const qparts = [];
        if (s) qparts.push(`start=${encodeURIComponent(s)}`);
        if (e) qparts.push(`end=${encodeURIComponent(e)}`);
        if (doctorId) qparts.push(`doctorId=${encodeURIComponent(doctorId)}`);
        qparts.push(`page=${reportPage}`);
        qparts.push(`limit=50`);
        if (opts.q) qparts.push(`q=${encodeURIComponent(opts.q)}`);
        const qstr = qparts.length ? `?${qparts.join('&')}` : '';
        const repRes = await api.get(`/api/v1/reports${qstr}`);
        const body = repRes.data || {};
        setReportTotal(body.total || 0);
        setReportEntries(body.entries || []);
  // aggregate quick totals from returned entries (use 'paid' field)
  const totPaid = (body.entries || []).reduce((s, r) => s + (Number(r.paid || r.revenue) || 0), 0);
  const totDue = (body.entries || []).reduce((s, r) => s + (Number(r.due) || 0), 0);
  setTotals({ paid: totPaid, totalDue: totDue, invoiced: totPaid + totDue });
      } else {
        // When includeAppointments is true, also fetch hybrid report (accounts for appts without invoices)
        if (includeAppointments) {
          const repRes = await api.get(`/api/v1/reports/summary${query.replace('group=', 'groupBy=')}`);
          const repTotals = repRes.data.totals || { revenue: 0, due: 0 };
          // server returns totals.revenue (invoice pipeline) - treat as paid
          setTotals({ paid: repTotals.revenue || 0, totalDue: repTotals.due || 0, invoiced: (repTotals.revenue || 0) + (repTotals.due || 0) });
          setGroups(repRes.data.byPeriod || []);
        } else {
    setTotals({ paid: totalEarning, totalDue, invoiced: totalEarning + totalDue });
          // map invGroups -> { period, revenue: totalEarning, due: totalDue }
          setGroups(invGroups.map(g => ({ period: g.period, revenue: g.totalEarning, due: g.totalDue, count: g.count })));
        }
      }

      // compute patients this month & total appointments (use appointment API as fallback)
      const apptsRes = await api.get('/api/v1/appointment/getall');
      const appts = apptsRes.data.appointments || [];
      setTotalAppointments(appts.length || 0);

      // patients this month: if start/end provided, use them, else current month
      const now = new Date();
      const sDate = s ? new Date(s + 'T00:00:00') : new Date(now.getFullYear(), now.getMonth(), 1);
      const eDate = e ? new Date(e + 'T23:59:59') : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const patientSet = new Set();
      appts.forEach(a => {
        try {
          const d = new Date(a.appointment_date);
          if (d >= sDate && d <= eDate) {
            if (a.patientId) patientSet.add(String(a.patientId));
          }
        } catch (e) {}
      });
      setPatientsThisMonth(patientSet.size);

    } catch (err) {
      toast.error('Failed to load report summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSummary(); }, []);

  const downloadCSV = () => {
    if (usePersisted) {
  const rows = [['AppointmentId','Date','DoctorId','Amount','Paid','Due','Status','Notes']];
  reportEntries.forEach(r => rows.push([r.appointmentId, r.appointmentDate ? String(r.appointmentDate).slice(0,10) : '', r.doctorId || '', r.amount||0, r.paid||r.revenue||0, r.due||0, r.status||'', r.notes||'' ]));
      const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""') }"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reports-entries-${(new Date()).toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return;
    }
    const rows = [['Period','Paid','Due','Invoiced','Count']];
    groups.forEach(g => rows.push([g.period, g.revenue||g.totalEarning||0, g.due||g.totalDue||0, (Number(g.revenue||g.totalEarning||0)+Number(g.due||g.totalDue||0)), g.count||g.invoices||g.appointments||0]));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""') }"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports-${groupBy || 'summary'}-${(new Date()).toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="reports-page page">
      <div className="banner">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <h3>Reports</h3>
            <p>Payments and patients summary. Use filters to narrow down by date and doctor.</p>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <label style={{display:'flex',flexDirection:'column'}}>
              Start
              <input type="date" value={start} onChange={(e)=>setStart(e.target.value)} />
            </label>
            <label style={{display:'flex',flexDirection:'column'}}>
              End
              <input type="date" value={end} onChange={(e)=>setEnd(e.target.value)} />
            </label>
            <label style={{display:'flex',flexDirection:'column'}}>
              Group
              <select value={groupBy} onChange={(e)=>setGroupBy(e.target.value)}>
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </label>
            <label style={{display:'flex',flexDirection:'column'}}>
              Doctor
              <select value={doctorId} onChange={(e)=>setDoctorId(e.target.value)}>
                <option value="">All</option>
                {doctors.map(d => <option key={d._id} value={d._id}>{d.firstName} {d.lastName}</option>)}
              </select>
            </label>
            <label style={{display:'flex',alignItems:'center',gap:6}}>
              <input type="checkbox" checked={includeAppointments} onChange={(e)=>setIncludeAppointments(e.target.checked)} /> Include appointments without invoices
            </label>
            <label style={{display:'flex',alignItems:'center',gap:6}}>
              <input type="checkbox" checked={usePersisted} onChange={(e)=>{ setUsePersisted(e.target.checked); setReportPage(1); }} /> Use persisted report entries
            </label>
            <button className="btn" onClick={()=>fetchSummary({ start, end, groupBy, doctorId })} disabled={loading}>{loading ? 'Loading...' : 'Apply'}</button>
            <button className="btn" onClick={downloadCSV}>Export CSV</button>
          </div>
        </div>
      </div>

      <div className="reports-cards">
        <div className="card">
          <p className="label">Total Payments</p>
          <h2 className="value">{fmt(totals.invoiced)}</h2>
          <small>Paid: {fmt(totals.paid)} • Due: {fmt(totals.totalDue)}</small>
        </div>

        <div className="card">
          <p className="label">Patients This Period</p>
          <h2 className="value">{patientsThisMonth}</h2>
          <small>Total Appointments: {totalAppointments}</small>
        </div>

        <div className="card">
          <p className="label">Groups</p>
          <h2 className="value">{groups.length}</h2>
          <small>Periods shown</small>
        </div>

        <div className="card">
          <p className="label">Last Refreshed</p>
          <h2 className="value">{(new Date()).toLocaleString()}</h2>
          <small>Realtime snapshot</small>
        </div>
      </div>

      <div className="table-wrap">
        <table className="reports-table">
          <thead>
            <tr>
              <th>Period</th>
              <th>Paid</th>
              <th>Due</th>
              <th>Invoiced</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.period}>
                <td>{g.period}</td>
                <td>{fmt(g.revenue || g.totalEarning || 0)}</td>
                <td>{fmt(g.due || g.totalDue || 0)}</td>
                <td>{fmt((Number(g.revenue || g.totalEarning || 0) + Number(g.due || g.totalDue || 0)))}</td>
                <td>{g.count || g.invoices || g.appointments || ''}</td>
              </tr>
            ))}
            {groups.length === 0 && (
              <tr><td colSpan={5} style={{textAlign:'center', padding:16}}>No data for selected filters</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default ReportsPage;
