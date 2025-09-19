import { useState, useMemo } from 'react';

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

export interface TableFilter {
  key: string;
  label: string;
  options: FilterOption[];
  multiple?: boolean;
}

export interface UseDataTableOptions<T> {
  data: T[];
  filters?: TableFilter[];
  searchFields?: (keyof T)[];
  sortOptions?: {
    key: keyof T;
    label: string;
    defaultDirection?: 'asc' | 'desc';
  }[];
}

export function useDataTable<T extends Record<string, any>>({
  data,
  filters = [],
  searchFields = [],
  sortOptions = [],
}: UseDataTableOptions<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [sortBy, setSortBy] = useState<{
    key: keyof T | null;
    direction: 'asc' | 'desc' | null;
  }>({ key: null, direction: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Search functionality
  const searchFilteredData = useMemo(() => {
    if (!searchTerm || searchFields.length === 0) return data;

    return data.filter((item) =>
      searchFields.some((field) => {
        const value = item[field];
        return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
      })
    );
  }, [data, searchTerm, searchFields]);

  // Filter functionality
  const filteredData = useMemo(() => {
    let result = searchFilteredData;

    Object.entries(activeFilters).forEach(([filterKey, selectedValues]) => {
      if (selectedValues.length === 0) return;

      result = result.filter((item) => {
        const value = item[filterKey];
        return selectedValues.includes(value?.toString() || '');
      });
    });

    return result;
  }, [searchFilteredData, activeFilters]);

  // Sort functionality
  const sortedData = useMemo(() => {
    if (!sortBy.key || !sortBy.direction) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortBy.key!];
      const bValue = b[sortBy.key!];

      if (aValue < bValue) return sortBy.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortBy.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortBy]);

  // Pagination
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const totalItems = sortedData.length;

  // Actions
  const updateFilter = (filterKey: string, values: string[]) => {
    setActiveFilters((prev) => ({
      ...prev,
      [filterKey]: values,
    }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const clearFilter = (filterKey: string) => {
    setActiveFilters((prev) => ({
      ...prev,
      [filterKey]: [],
    }));
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setActiveFilters({});
    setCurrentPage(1);
  };

  const updateSort = (key: keyof T, direction?: 'asc' | 'desc') => {
    if (sortBy.key === key && sortBy.direction === direction) {
      // If same sort, toggle direction
      const newDirection = direction === 'asc' ? 'desc' : direction === 'desc' ? null : 'asc';
      setSortBy({
        key: newDirection ? key : null,
        direction: newDirection,
      });
    } else {
      setSortBy({ key, direction: direction || 'asc' });
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const resetTable = () => {
    setSearchTerm('');
    setActiveFilters({});
    setSortBy({ key: null, direction: null });
    setCurrentPage(1);
  };

  return {
    // Data
    data: paginatedData,
    totalItems,
    totalPages,
    currentPage,

    // Search
    searchTerm,
    setSearchTerm,

    // Filters
    activeFilters,
    updateFilter,
    clearFilter,
    clearAllFilters,

    // Sort
    sortBy,
    updateSort,

    // Pagination
    pageSize,
    setPageSize,
    goToPage,

    // Actions
    resetTable,
  };
}
