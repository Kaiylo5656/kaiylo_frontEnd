import React from 'react';
import { ChevronDown, ArrowUpDown } from 'lucide-react';

const SortControl = ({ sort, dir, onChange }) => {
  const sortOptions = [
    { value: 'createdAt', dir: 'desc', label: 'Creation (Newest first)' },
    { value: 'createdAt', dir: 'asc', label: 'Creation (Oldest first)' },
    { value: 'name', dir: 'asc', label: 'Name (A–Z)' },
    { value: 'name', dir: 'desc', label: 'Name (Z–A)' }
  ];

  const currentOption = sortOptions.find(option => 
    option.value === sort && option.dir === dir
  ) || sortOptions[0]; // Default to newest first

  const handleChange = (e) => {
    const selectedValue = e.target.value;
    const [newSort, newDir] = selectedValue.split('|');
    onChange(newSort, newDir);
  };

  return (
    <div className="relative">
      <select
        value={`${sort}|${dir}`}
        onChange={handleChange}
        className="appearance-none bg-input border border-border rounded-lg px-4 py-2 pr-8 text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer min-w-[180px]"
        aria-label="Sort exercises"
      >
        {sortOptions.map((option, index) => (
          <option key={index} value={`${option.value}|${option.dir}`}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
};

export default SortControl;
