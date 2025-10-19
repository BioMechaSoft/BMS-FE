import { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';

// Hook: fetches medicines and exposes helpers and suggestion lists
export default function useMedicineSuggestions(opts = {}) {
  const { page = 1, limit = 200 } = opts;
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchAll = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/api/v1/medical`, { params: { page, limit } });
        // backend may return { advices } or { medicines } or { data }
        const list = data.advices || data.medicines || data.items || data.data || [];
        let normalized = Array.isArray(list) ? list : [];
        // If advices contain nested `medicines`, flatten them into separate entries
        const flatMeds = [];
        normalized.forEach((it) => {
          if (Array.isArray(it.medicines) && it.medicines.length) {
            it.medicines.forEach((m) => {
              flatMeds.push({
                ...m,
                // carry parent context for potential scoring
                _adviceName: it.name,
                _adviceSymptoms: it.symptoms || [],
              });
            });
          }
        });
        // merged list keeps advices as well (so callers can prefer structured advices)
        const merged = [...normalized, ...flatMeds];
        if (mounted) setMedicines(merged);
      } catch (e) {
        if (mounted) setMedicines([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchAll();
    return () => { mounted = false; };
  }, [page, limit]);

  const byName = (q) => {
    if (!q) return medicines;
    const lower = q.toLowerCase();
    return medicines.filter(m => (m.name || '').toLowerCase().includes(lower));
  };

  const findByName = (name) => medicines.find(m => (m.name || '').toLowerCase() === (name || '').toLowerCase());

  const lists = useMemo(() => {
    const doses = new Set();
    const frequencies = new Set();
    const routes = new Set();
    const durations = new Set();
    const types = new Set();
    medicines.forEach(m => {
      if (m.dose) doses.add(String(m.dose));
      if (m.frequency) frequencies.add(String(m.frequency));
      if (m.route) routes.add(String(m.route));
      if (m.duration) durations.add(String(m.duration));
      if (m.type) types.add(String(m.type));
    });
    return {
      doses: Array.from(doses).filter(Boolean).slice(0, 60),
      frequencies: Array.from(frequencies).filter(Boolean).slice(0, 60),
      routes: Array.from(routes).filter(Boolean).slice(0, 60),
      durations: Array.from(durations).filter(Boolean).slice(0, 60),
      types: Array.from(types).filter(Boolean).slice(0, 60),
    };
  }, [medicines]);

  return {
    medicines,
    loading,
    byName,
    findByName,
    lists,
  };
}
