import { useEffect, useState } from "react";
import api from "../utils/api";

export default function useSymptomSuggestions() {
  const [advices, setAdvices] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        let all = [];
        let page = 1, totalPages = 1;
        while (page <= totalPages) {
          const { data } = await api.get(`/api/v1/medical`, { params: { page, limit: 100 } });
          if (data.advices) {
            all.push(...data.advices);
          }
          totalPages = data.totalPages || 1;
          page++;
        }
        // deduplicate by name
        const map = new Map();
        all.filter(Boolean).forEach(a => {
          const key = (a.name || '').trim();
          if (!key) return;
          if (!map.has(key)) map.set(key, a);
        });
        setAdvices(Array.from(map.values()));
      } catch (e) {
        setAdvices([]);
      }
    })();
  }, []);
  // For backward compatibility, callers may expect array of strings; but AutoSuggestInput can accept objects.
  return advices;
}
