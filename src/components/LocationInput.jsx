import { useState, useEffect, useRef } from 'react';

export default function LocationInput({ 
  label, 
  value, 
  onChange, 
  suggestions, 
  onSelect, 
  placeholder, 
  icon 
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative flex-1" ref={wrapperRef}>
      <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-2 transition-all hover:border-blue-500 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
        <span className="text-gray-500 mr-3">{icon}</span>
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            {label}
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder={placeholder}
            className="w-full text-base font-medium text-gray-900 outline-none bg-transparent"
            autoComplete="off"
          />
        </div>
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
          {suggestions.map((location, idx) => (
            <div
              key={idx}
              onClick={() => {
                onSelect(location);
                setShowSuggestions(false);
              }}
              className="px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
            >
              {location.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}