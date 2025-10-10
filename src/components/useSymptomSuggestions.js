import { useEffect, useState } from "react";
import api from "../utils/api";

export default function useSymptomSuggestions() {
  const [symptoms, setSymptoms] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        let all = [];
        let page = 1, totalPages = 1;
        while (page <= totalPages) {
          const { data } = await api.get(`/api/v1/medical`, { params: { page, limit: 50 } });
          if (data.advices) {
            for (const adv of data.advices) {
              if (Array.isArray(adv.symptoms)) all.push(...adv.symptoms);
            }
          }
          totalPages = data.totalPages || 1;
          page++;
        }
        // deduplicate and sort
        setSymptoms(Array.from(new Set(all.filter(Boolean).map(s => s.trim()))).sort());
      } catch (e) {
        setSymptoms([]);
      }
    })();
  }, []);
  return symptoms;
}
