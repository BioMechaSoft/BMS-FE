import React, { useState, useRef, useEffect } from "react";
import "./AutoSuggestInput.css";

export default function AutoSuggestInput({ value, onChange, suggestions = [], placeholder = "", single = false, onSelect, ...props }) {
  const [show, setShow] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const [highlight, setHighlight] = useState(0);
  const ref = useRef();

  // Get the last token after the last comma for suggestions (multi) or whole value (single)
  // Only comma is treated as the token separator so typing a space won't trigger suggestions.
  const getLastToken = (val) => {
    if (!val) return '';
    if (single) return val.trim();
    // split only on commas and return the last token
    const parts = val.split(',');
    return (parts[parts.length - 1] || '').trim();
  };

  const labelOf = (item) => {
    if (item == null) return '';
    if (typeof item === 'string') return item;
    return item.name || item.label || item.value || String(item);
  };

  useEffect(() => {
    if (!show) return;
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setShow(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [show]);

  useEffect(() => {
    const last = getLastToken(value);
    if (!last) setFiltered(suggestions);
    else setFiltered(suggestions.filter(s => labelOf(s).toLowerCase().includes(last.toLowerCase())));
    setHighlight(0);
  }, [value, suggestions, single]);

  function handleKey(e) {
    // if user types a comma, show suggestions for the new token
    if (e.key === ',') {
      setShow(true);
      return;
    }
    if (e.key === "ArrowDown") {
      setHighlight(h => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      setHighlight(h => Math.max(h - 1, 0));
    } else if ((e.key === "Enter" || (!single && e.key === ",")) && filtered[highlight]) {
      e.preventDefault();
      selectSuggestion(filtered[highlight]);
    }
  }

  function selectSuggestion(item) {
    const label = labelOf(item);
    if (single) {
      onChange({ target: { value: label } });
      if (onSelect) onSelect(item, label);
      setShow(false);
      setHighlight(0);
      return;
    }
    // Replace last token with selected suggestion, add comma
    let parts = value.split(',');
    parts[parts.length - 1] = label;
    let newVal = parts.map(p => p.trim()).filter(Boolean).join(', ');
    if (!newVal.endsWith(',')) newVal += ', ';
    onChange({ target: { value: newVal } });
    // notify caller that a suggestion was selected and provide the new input value
    if (onSelect) onSelect(item, newVal);
    setShow(true); // keep open for next
    setHighlight(0);
  }

  return (
    <div className="autosuggest-input" ref={ref}>
      <input
        {...props}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={e => {
          onChange(e);
          const v = e.target.value || '';
          if (single) setShow(true);
          // Show suggestions if there's a non-empty token (last part of string)
          const lastToken = getLastToken(v);
          setShow(lastToken.length > 0);
        }}
        onFocus={() => {
          const v = value || '';
          if (single) setShow(true);
          else setShow(v.indexOf(',') !== -1);
        }}
        onKeyDown={handleKey}
      />
      {show && filtered.length > 0 && (
        <ul className="suggestion-list">
          {filtered.map((it, i) => (
            <li
              key={i}
              className={i === highlight ? "highlight" : ""}
              onMouseDown={() => selectSuggestion(it)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{labelOf(it)}</span>
                {(it && typeof it === 'object' && (it._score || it._matchedAll)) && (
                  <small style={{ marginLeft: 8, color: it._matchedAll ? '#064e3b' : '#6b7280' }}>
                    {it._matchedAll ? 'Exact' : `Score ${it._score || 0}`}
                  </small>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}