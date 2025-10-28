import React from 'react';

const StatusFilterChips = ({ value, onChange }) => {
  const filters = [
    { key: 'pending', label: 'À feedback', description: 'Videos needing coach review' },
    { key: 'completed', label: 'Complété', description: 'Videos with feedback' },
    { key: 'all', label: 'Tous', description: 'All videos' }
  ];

  return (
    <div className="flex items-center gap-2">
      {filters.map(filter => (
        <button
          key={filter.key}
          onClick={() => onChange(filter.key)}
          className={`px-3 py-2 rounded-[5px] text-base font-light transition-all duration-200 ${
            value === filter.key
              ? 'bg-[#d4845a] text-white'
              : 'bg-[#1a1a1a] text-white/75 border border-white/10 hover:bg-white/5 hover:border-[#d4845a]'
          }`}
          title={filter.description}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
};

export default StatusFilterChips;

