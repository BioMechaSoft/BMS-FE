import React, { useEffect, useState, useMemo } from "react";
import api from "../utils/api";
import "./ReportsPage.css";
import ReportRow from "./ReportRow";
import "./InvoiceEditor.css";
import { FaEye } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import { RiMoneyRupeeCircleFill } from "react-icons/ri";
import { FaSearch } from "react-icons/fa";
import useSound from "use-sound";

const fmt = (n) => {
  const v = Number(n) || 0;
  return v.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const startOfDayISO = (d) => {
  const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  return dd.toISOString();
};
const endOfDayISO = (d) => {
  const dd = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    23,
    59,
    59,
    999
  );
  return dd.toISOString();
};

const ReportsPage = () => {
  const [loading, setLoading] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [groupBy, setGroupBy] = useState("day");
  const [doctorId, setDoctorId] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [includeAppointments, setIncludeAppointments] = useState(true);

  const [totals, setTotals] = useState({ paid: 0, totalDue: 0, invoiced: 0 });
  const [groups, setGroups] = useState([]);
  const [usePersisted, setUsePersisted] = useState(false);
  const [reportEntries, setReportEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerAppointmentId, setDrawerAppointmentId] = useState(null);
  const [invoicesForAppointment, setInvoicesForAppointment] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceSaving, setInvoiceSaving] = useState(false);
  const [reportPage, setReportPage] = useState(1);
  const [reportTotal, setReportTotal] = useState(0);
  const [patientsThisMonth, setPatientsThisMonth] = useState(0);
  const [totalAppointments, setTotalAppointments] = useState(0);

  const [playSettledSound] = useSound("/settled.mp3");

  useEffect(() => {
    // load doctors for filter
    (async () => {
      try {
        const { data } = await api.get("/api/v1/user/doctors");
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
      const query = q.length ? `?${q.join("&")}` : "";

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
        if (opts.q || searchTerm)
          qparts.push(`q=${encodeURIComponent(opts.q || searchTerm)}`);
        const qstr = qparts.length ? `?${qparts.join("&")}` : "";
        const repRes = await api.get(`/api/v1/reports${qstr}`);
        const body = repRes.data || {};
        setReportTotal(body.total || 0);
        setReportEntries(body.entries || []);
        // aggregate quick totals from returned entries (use 'paid' field)
        const totPaid = (body.entries || []).reduce(
          (s, r) => s + (Number(r.paid || r.revenue) || 0),
          0
        );
        const totDue = (body.entries || []).reduce(
          (s, r) => s + (Number(r.due) || 0),
          0
        );
        setTotals({
          paid: totPaid,
          totalDue: totDue,
          invoiced: totPaid + totDue,
        });
      } else {
        // When includeAppointments is true, also fetch hybrid report (accounts for appts without invoices)
        if (includeAppointments) {
          const repRes = await api.get(
            `/api/v1/reports/summary${query.replace("group=", "groupBy=")}`
          );
          const repTotals = repRes.data.totals || { revenue: 0, due: 0 };
          // server returns totals.revenue (invoice pipeline) - treat as paid
          setTotals({
            paid: repTotals.revenue || 0,
            totalDue: repTotals.due || 0,
            invoiced: (repTotals.revenue || 0) + (repTotals.due || 0),
          });
          setGroups(repRes.data.byPeriod || []);
        } else {
          setTotals({
            paid: totalEarning,
            totalDue,
            invoiced: totalEarning + totalDue,
          });
          // map invGroups -> { period, revenue: totalEarning, due: totalDue }
          setGroups(
            invGroups.map((g) => ({
              period: g.period,
              revenue: g.totalEarning,
              due: g.totalDue,
              count: g.count,
            }))
          );
        }
      }

      // compute patients this month & total appointments (use appointment API as fallback)
      const apptsRes = await api.get("/api/v1/appointment/getall");
      const appts = apptsRes.data.appointments || [];
      setTotalAppointments(appts.length || 0);

      // patients this month: if start/end provided, use them, else current month
      const now = new Date();
      const sDate = s
        ? new Date(s + "T00:00:00")
        : new Date(now.getFullYear(), now.getMonth(), 1);
      const eDate = e
        ? new Date(e + "T23:59:59")
        : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const patientSet = new Set();
      appts.forEach((a) => {
        try {
          const d = new Date(a.appointment_date);
          if (d >= sDate && d <= eDate) {
            if (a.patientId) patientSet.add(String(a.patientId));
          }
        } catch (e) {}
      });
      setPatientsThisMonth(patientSet.size);
    } catch (err) {
      toast.error("Failed to load report summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  // fetch invoices for an appointment and open drawer
  const openInvoiceDrawer = async (appointmentId) => {
    setDrawerLoading(true);
    setDrawerAppointmentId(appointmentId);
    setDrawerOpen(true);
    try {
      const res = await api.get(`/api/v1/invoice/appointment/${appointmentId}`);
      setInvoicesForAppointment(res.data.invoices || []);
    } catch (e) {
      setInvoicesForAppointment([]);
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerAppointmentId(null);
    setInvoicesForAppointment([]);
    setSelectedInvoice(null);
  };

  const editInvoice = (inv) => {
    setSelectedInvoice({ ...inv });
  };

  const saveInvoice = async () => {
    if (!selectedInvoice || !selectedInvoice._id) return;
    setInvoiceSaving(true);
    try {
      const payload = { ...selectedInvoice };
      // avoid sending populated objects for patient/doctor/appointment
      delete payload.patient;
      delete payload.doctor;
      delete payload.appointment;
      const res = await api.put(
        `/api/v1/invoice/${selectedInvoice._id}`,
        payload
      );
      // refresh list
      const refreshed = await api.get(
        `/api/v1/invoice/appointment/${drawerAppointmentId}`
      );
      setInvoicesForAppointment(refreshed.data.invoices || []);
      setSelectedInvoice(null);
      if (payload.status === "Paid") {
        playSettledSound();
      }
      fetchSummary();
    } catch (e) {
      console.warn("Failed to save invoice", e);
    } finally {
      setInvoiceSaving(false);
    }
  };

  const deleteInvoice = async (id) => {
    if (!window.confirm("Delete invoice? This cannot be undone.")) return;
    try {
      await api.delete(`/api/v1/invoice/${id}`);
      const refreshed = await api.get(
        `/api/v1/invoice/appointment/${drawerAppointmentId}`
      );
      setInvoicesForAppointment(refreshed.data.invoices || []);
      fetchSummary();
    } catch (e) {
      console.warn("Failed to delete invoice", e);
    }
  };

  const settleInvoice = async (inv) => {
    try {
      // call explicit settle endpoint which will append payment and normalize
      await api.post(`/api/v1/invoice/${inv._id}/settle`);
      const refreshed = await api.get(
        `/api/v1/invoice/appointment/${drawerAppointmentId}`
      );
      setInvoicesForAppointment(refreshed.data.invoices || []);
      playSettledSound();
      fetchSummary();
    } catch (e) {
      console.warn("Failed to settle invoice", e);
    }
  };

  const onSearchKey = (e) => {
    if (e.key === "Enter") fetchSummary({ q: searchTerm });
  };

  const downloadCSV = () => {
    if (usePersisted) {
      const rows = [
        [
          "AppointmentId",
          "Date",
          "DoctorId",
          "Amount",
          "Paid",
          "Due",
          "Status",
          "Notes",
        ],
      ];
      reportEntries.forEach((r) =>
        rows.push([
          r.appointmentId,
          r.appointmentDate ? String(r.appointmentDate).slice(0, 10) : "",
          r.doctorId || "",
          r.amount || 0,
          r.paid || r.revenue || 0,
          r.due || 0,
          r.status || "",
          r.notes || "",
        ])
      );
      const csv = rows
        .map((r) =>
          r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reports-entries-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return;
    }
    const rows = [["Period", "Paid", "Due", "Invoiced", "Count"]];
    groups.forEach((g) =>
      rows.push([
        g.period,
        g.revenue || g.totalEarning || 0,
        g.due || g.totalDue || 0,
        Number(g.revenue || g.totalEarning || 0) +
          Number(g.due || g.totalDue || 0),
        g.count || g.invoices || g.appointments || 0,
      ])
    );
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reports-${groupBy || "summary"}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="reports-page page">
      <div className="banner">
        <div className="content-box">
          <div className="desc-dev-box">
            <div>
              <h3>Reports</h3>
              <p>
                Payments and patients summary. Use filters to narrow down by
                date and doctor.
              </p>
            </div>
            <div className="input-container">
              <label>
                Start
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </label>
              <label>
                End
                <input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </label>
              <label>
                Group
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                </select>
              </label>
              <label>
                Doctor
                <select
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                >
                  <option value="">All</option>
                  {doctors.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.firstName} {d.lastName}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div className="check-btn-box">
            <div className="label-box">
              <label>
                <input
                  type="checkbox"
                  checked={includeAppointments}
                  onChange={(e) => setIncludeAppointments(e.target.checked)}
                />{" "}
                Include appointments without invoices
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={usePersisted}
                  onChange={(e) => {
                    setUsePersisted(e.target.checked);
                    setReportPage(1);
                  }}
                />{" "}
                Use persisted report entries
              </label>
            </div>
            <div className="btn-box">
              <button
                className="btn"
                onClick={() => fetchSummary({ start, end, groupBy, doctorId })}
                disabled={loading}
              >
                {loading ? "Loading..." : "Apply"}
              </button>
              <button className="btn" onClick={downloadCSV}>
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="reports-cards">
        <div className="card">
          <p className="label">Total Payments</p>
          <h2 className="value">{fmt(totals.invoiced)}</h2>
          <small>
            Paid: {fmt(totals.paid)} • Due: {fmt(totals.totalDue)}
          </small>
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
          <h2 className="value">{new Date().toLocaleDateString("CA")}</h2>
          <small>Realtime snapshot</small>
        </div>
      </div>

      <div className="search-container">
        <div className="search-box">
          <input
            placeholder="Search reports by appointment id or patient"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={onSearchKey}
          />
            <FaSearch 
              style={{padding:"0.5rem", backgroundColor:"#096dd9",color:"white",height:"2rem",width:"2rem",borderRadius:"0.3rem"}}
              onClick={() => fetchSummary({ q: searchTerm })}
            />
        </div>
        <div>
          <button
            className="btn"
            onClick={() => {
              setUsePersisted(true);
              fetchSummary();
            }}
          >
            Switch to Persisted Entries
          </button>
        </div>
      </div>

      <div className="table-wrap">
        {usePersisted ? (
          <table className="reports-table">
            <thead>
              <tr>
                <th>AppointmentId</th>
                <th>Date</th>
                <th>Doctor</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Due</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(reportEntries || []).map((r) => (
                <tr key={r._id}>
                  <td
                    style={{
                      maxWidth: 180,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {r.appointmentId}
                  </td>
                  <td>
                    {r.appointmentDate
                      ? String(r.appointmentDate).slice(0, 10)
                      : ""}
                  </td>
                  <td>
                    {r.doctorId && (r.doctorId.firstName || r.doctorId.name)
                      ? `${r.doctorId.firstName || r.doctorId.name} ${
                          r.doctorId.lastName || ""
                        }`
                      : r.doctorId || ""}
                  </td>
                  <td>{fmt(r.amount)}</td>
                  <td>{fmt(r.paid || r.revenue)}</td>
                  <td>{fmt(r.due)}</td>
                  <td>{r.status}</td>
                  <td style={{ display: "flex", gap: "1rem",alignItems:"center" }}>
                    <FaEye 
                      title="View Details"
                      style={{color:"#096dd9"}}
                      onClick={() => openInvoiceDrawer(r.appointmentId)} 
                    />
                    <MdDelete 
                      title="Delete"
                      style={{color:"var(--danger-color)"}}
                      onClick={async () => {
                        if (window.confirm("Delete this report entry?")) {
                          await api.delete(`/api/v1/reports/${r._id}`);
                          fetchSummary();
                        }
                      }}
                    />
                    <RiMoneyRupeeCircleFill 
                      title="Mark as paid"
                      style={{color:"var(--secondary-color)"}}
                      onClick={async () => {
                        if (
                          window.confirm(
                            "Mark this appointment as Paid? This will settle all invoices for the appointment."
                          )
                        ) {
                          try {
                            await api.put(
                              `/api/v1/invoice/appointment/${r.appointmentId}`,
                              { payments: [{ amount: 0 }] }
                            ); // trigger update route to be safe
                            // better: fetch all invoices and call settle on each
                            const invs = await api.get(
                              `/api/v1/invoice/appointment/${r.appointmentId}`
                            );
                            if (
                              invs.data &&
                              Array.isArray(invs.data.invoices)
                            ) {
                              for (const ii of invs.data.invoices) {
                                await api.post(
                                  `/api/v1/invoice/${ii._id}/settle`
                                );
                              }
                            }
                            fetchSummary();
                          } catch (e) {
                            console.warn("Mark paid failed", e);
                          }
                        }
                      }}
                    />
                  </td>
                </tr>
              ))}
              {(!reportEntries || reportEntries.length === 0) && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 16 }}>
                    No report entries found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
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
                  <td>
                    {fmt(
                      Number(g.revenue || g.totalEarning || 0) +
                        Number(g.due || g.totalDue || 0)
                    )}
                  </td>
                  <td>{g.count || g.invoices || g.appointments || ""}</td>
                </tr>
              ))}
              {groups.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 16 }}>
                    No data for selected filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Drawer for invoices */}
      {drawerOpen && (
        <div className="invoice-overlay" onClick={closeDrawer}></div>
      )}
      {drawerOpen && (
        <div className="invoice-drawer">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3>Invoices for {drawerAppointmentId}</h3>
            <div>
              <button className="btn" onClick={closeDrawer}>
                Close
              </button>
            </div>
          </div>
          {drawerLoading && <p>Loading...</p>}
          {!drawerLoading && (
            <div>
              <div className="invoice-list">
                {invoicesForAppointment.map((inv) => (
                  <div key={inv._id} className="invoice-item">
                    <div className="meta">
                      <strong>{inv.invoiceNumber || inv._id}</strong>
                      <small>Total: {fmt(inv.total)}</small>
                      <small>
                        Paid:{" "}
                        {(inv.payments || []).reduce(
                          (s, p) => s + (Number(p.amount) || 0),
                          0
                        )}
                      </small>
                      <small>Status: {inv.status}</small>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn-small"
                        onClick={() => editInvoice(inv)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-small"
                        onClick={() => settleInvoice(inv)}
                      >
                        Settle
                      </button>
                      <button
                        className="btn-small"
                        style={{ background: "#d9534f" }}
                        onClick={() => deleteInvoice(inv._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {invoicesForAppointment.length === 0 && (
                  <div>No invoices for this appointment</div>
                )}
              </div>

              {selectedInvoice && (
                <div className="invoice-editor">
                  <h4>
                    Edit Invoice{" "}
                    {selectedInvoice.invoiceNumber || selectedInvoice._id}
                  </h4>
                  <label>
                    Invoice Number
                    <input
                      value={selectedInvoice.invoiceNumber || ""}
                      onChange={(e) =>
                        setSelectedInvoice((s) => ({
                          ...s,
                          invoiceNumber: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Total
                    <input
                      value={selectedInvoice.total || 0}
                      onChange={(e) =>
                        setSelectedInvoice((s) => ({
                          ...s,
                          total: Number(e.target.value || 0),
                        }))
                      }
                    />
                  </label>
                  <label>
                    Status
                    <select
                      value={selectedInvoice.status || "Unpaid"}
                      onChange={(e) =>
                        setSelectedInvoice((s) => ({
                          ...s,
                          status: e.target.value,
                        }))
                      }
                    >
                      <option>Unpaid</option>
                      <option>Partial</option>
                      <option>Paid</option>
                    </select>
                  </label>
                  <label>
                    Notes
                    <textarea
                      value={selectedInvoice.notes || ""}
                      onChange={(e) =>
                        setSelectedInvoice((s) => ({
                          ...s,
                          notes: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn"
                      onClick={saveInvoice}
                      disabled={invoiceSaving}
                    >
                      {invoiceSaving ? "Saving..." : "Save"}
                    </button>
                    <button
                      className="btn"
                      onClick={() => setSelectedInvoice(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default ReportsPage;
