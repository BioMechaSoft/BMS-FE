import React, { useState, useRef, useEffect } from "react";
import "./AutoSuggestInput.css";

export default function AutoSuggestInput({ value, onChange, suggestions = [], placeholder = "", single = false, onSelect, ...props }) {
  const [show, setShow] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const [highlight, setHighlight] = useState(0);
  const ref = useRef();

  // Get the last token after comma for suggestions (multi) or whole value (single)
  const getLastToken = (val) => {
    if (!val) return '';
    if (single) return val.trim();
    const parts = val.split(',');
    return parts[parts.length - 1].trim();
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
    if (!show) setShow(true);
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
          setShow(true);
        }}
        onFocus={() => setShow(true)}
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
