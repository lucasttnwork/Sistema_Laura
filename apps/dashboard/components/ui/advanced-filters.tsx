import React, { useState } from 'react';
import { X, Filter, ChevronDown } from 'lucide-react';
import { Button } from './button';
import { Badge } from './badge';
import { Checkbox } from './checkbox';

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

export interface AdvancedFilter {
  key: string;
  label: string;
  options: FilterOption[];
  multiple?: boolean;
}

export interface AdvancedFiltersProps {
  filters: AdvancedFilter[];
  activeFilters: Record<string, string[]>;
  onFilterChange: (filterKey: string, values: string[]) => void;
  onClearAll: () => void;
  className?: string;
}

export function AdvancedFilters({
  filters,
  activeFilters,
  onFilterChange,
  onClearAll,
  className = '',
}: AdvancedFiltersProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const activeFilterCount = Object.values(activeFilters).reduce(
    (count, values) => count + values.length,
    0
  );

  const handleFilterToggle = (filterKey: string, value: string, multiple: boolean) => {
    const currentValues = activeFilters[filterKey] || [];

    if (multiple) {
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      onFilterChange(filterKey, newValues);
    } else {
      const newValues = currentValues.includes(value) ? [] : [value];
      onFilterChange(filterKey, newValues);
    }
  };

  const removeFilterValue = (filterKey: string, value: string) => {
    const currentValues = activeFilters[filterKey] || [];
    const newValues = currentValues.filter(v => v !== value);
    onFilterChange(filterKey, newValues);
  };

  const getFilterLabel = (filterKey: string, value: string) => {
    const filter = filters.find(f => f.key === filterKey);
    const option = filter?.options.find(o => o.value === value);
    return option?.label || value;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Active filters display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600">Filtros ativos:</span>
          {Object.entries(activeFilters).map(([filterKey, values]) =>
            values.map((value) => (
              <Badge
                key={`${filterKey}-${value}`}
                variant="secondary"
                className="flex items-center gap-1"
              >
                <span className="text-xs">
                  {filters.find(f => f.key === filterKey)?.label}: {getFilterLabel(filterKey, value)}
                </span>
                <button
                  onClick={() => removeFilterValue(filterKey, value)}
                  className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-xs h-6 px-2"
          >
            Limpar todos
          </Button>
        </div>
      )}

      {/* Filter dropdowns */}
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const activeValues = activeFilters[filter.key] || [];
          const isOpen = openDropdown === filter.key;

          return (
            <div key={filter.key} className="relative">
              <Button
                variant={activeValues.length > 0 ? "default" : "outline"}
                size="sm"
                onClick={() => setOpenDropdown(isOpen ? null : filter.key)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                {filter.label}
                {activeValues.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-xs">
                    {activeValues.length}
                  </Badge>
                )}
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </Button>

              {isOpen && (
                <div className="absolute top-full left-0 z-50 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg">
                  <div className="p-2 max-h-64 overflow-y-auto">
                    {filter.options.map((option) => {
                      const isSelected = activeValues.includes(option.value);
                      return (
                        <label
                          key={option.value}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer rounded"
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() =>
                              handleFilterToggle(filter.key, option.value, filter.multiple || false)
                            }
                          />
                          <span className="text-sm flex-1">{option.label}</span>
                          {option.count !== undefined && (
                            <span className="text-xs text-gray-500">({option.count})</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  {activeValues.length > 0 && (
                    <div className="border-t border-gray-200 p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onFilterChange(filter.key, [])}
                        className="w-full text-xs"
                      >
                        Limpar filtro
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Click outside to close dropdown */}
      {openDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpenDropdown(null)}
        />
      )}
    </div>
  );
}
