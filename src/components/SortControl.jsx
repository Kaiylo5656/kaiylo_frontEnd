import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from './ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

const SortControl = ({ sort, dir, onChange, sortOptions: customSortOptions }) => {
  const [open, setOpen] = useState(false);
  
  const defaultSortOptions = [
    { value: 'createdAt', dir: 'desc', label: 'Création (Plus récent)' },
    { value: 'createdAt', dir: 'asc', label: 'Création (Plus ancien)' },
    { value: 'name', dir: 'asc', label: 'Nom (A–Z)' },
    { value: 'name', dir: 'desc', label: 'Nom (Z–A)' }
  ];
  
  const sortOptions = customSortOptions || defaultSortOptions;

  // Get current sort option label
  const currentOption = sortOptions.find(option => 
    option.value === sort && option.dir === dir
  ) || sortOptions[0];

  // Determine arrow direction based on sort direction
  const showArrow = sort === 'name' || sort === 'createdAt' || sort === 'joinedAt';
  const arrowUp = dir === 'asc';

  const handleSelect = (value, direction) => {
    onChange(value, direction);
  };

  // Create a unique value for each option to use in RadioGroup
  const getOptionValue = (option) => `${option.value}-${option.dir}`;
  const currentValue = getOptionValue(currentOption);

  // Check if a custom sort is selected (different from default: createdAt desc)
  const defaultSort = defaultSortOptions[0]; // Création (Plus récent)
  const isCustomSort = sort !== defaultSort.value || dir !== defaultSort.dir;
  const isActive = open || isCustomSort;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          className={`bg-primary hover:bg-primary/90 font-extralight py-2 px-[15px] rounded-[50px] transition-colors flex items-center gap-2 text-primary-foreground justify-center md:justify-start flex-1 md:flex-none ${
            isActive ? 'bg-primary/90' : ''
          }`}
          style={{
            backgroundColor: isActive ? 'rgba(212, 132, 89, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            color: isActive ? '#D48459' : 'rgba(250, 250, 250, 0.75)'
          }}
          title={`Trier: ${currentOption.label}`}
          aria-label={`Trier: ${currentOption.label}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4">
            <path fill="currentColor" d="M470.6 566.6L566.6 470.6C575.8 461.4 578.5 447.7 573.5 435.7C568.5 423.7 556.9 416 544 416L480 416L480 96C480 78.3 465.7 64 448 64C430.3 64 416 78.3 416 96L416 416L352 416C339.1 416 327.4 423.8 322.4 435.8C317.4 447.8 320.2 461.5 329.3 470.7L425.3 566.7C437.8 579.2 458.1 579.2 470.6 566.7zM214.6 73.4C202.1 60.9 181.8 60.9 169.3 73.4L73.3 169.4C64.1 178.6 61.4 192.3 66.4 204.3C71.4 216.3 83.1 224 96 224L160 224L160 544C160 561.7 174.3 576 192 576C209.7 576 224 561.7 224 544L224 224L288 224C300.9 224 312.6 216.2 317.6 204.2C322.6 192.2 319.8 178.5 310.7 169.3L214.7 73.3z"/>
          </svg>
          <span>Trier</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        side="bottom"
        align="start"
        sideOffset={8}
        className="w-56 rounded-xl [&_span.absolute.left-2]:hidden transition-all duration-200 ease-out"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(10px)',
          borderColor: 'rgba(255, 255, 255, 0.1)'
        }}
      >
        <DropdownMenuRadioGroup value={currentValue} onValueChange={(value) => {
          const option = sortOptions.find(opt => getOptionValue(opt) === value);
          if (option) {
            handleSelect(option.value, option.dir);
          }
        }}>
          {sortOptions.map((option) => {
            const optionValue = getOptionValue(option);
            const isSelected = optionValue === currentValue;
            return (
              <DropdownMenuRadioItem
                key={optionValue}
                value={optionValue}
                className={`w-full px-5 py-2 pl-5 text-left text-sm transition-all duration-200 ease-in-out flex items-center justify-between cursor-pointer ${
                  isSelected 
                    ? 'bg-primary/20 text-primary font-normal' 
                    : 'text-foreground font-light'
                }`}
                style={
                  isSelected
                    ? { backgroundColor: 'rgba(212, 132, 89, 0.2)', color: '#D48459' }
                    : {}
                }
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.2)';
                    const span = e.currentTarget.querySelector('span');
                    if (span) {
                      span.style.color = '#D48459';
                      span.style.fontWeight = '400';
                    }
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = '';
                    const span = e.currentTarget.querySelector('span');
                    if (span) {
                      span.style.color = '';
                      span.style.fontWeight = '';
                    }
                  }
                }}
              >
                <span>{option.label}</span>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 448 512" 
                  className={`h-4 w-4 font-normal transition-all duration-200 ease-in-out ${
                    isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                  }`}
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M434.8 70.1c14.3 10.4 17.5 30.4 7.1 44.7l-256 352c-5.5 7.6-14 12.3-23.4 13.1s-18.5-2.7-25.1-9.3l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l101.5 101.5 234-321.7c10.4-14.3 30.4-17.5 44.7-7.1z"/>
                </svg>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SortControl;
