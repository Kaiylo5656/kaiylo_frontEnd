import React from 'react';

const StatusFilterChips = ({ value, onChange }) => {
  const filters = [
    { key: 'pending', label: 'À feedback', description: 'Videos needing coach review' },
    { key: 'completed', label: 'Complété', description: 'Videos with feedback' },
    { key: 'all', label: 'Tous', description: 'All videos' }
  ];

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="appearance-none select-dark rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4845a] focus:border-transparent transition-colors"
      >
        {filters.map((filter) => (
          <option key={filter.key} value={filter.key}>
            {filter.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/60">
        ▾
      </span>
    </div>
  );
};

export default StatusFilterChips;

