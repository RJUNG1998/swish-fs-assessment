import React, { useState, useEffect } from 'react';
import { Filters, FilterOptions } from '../types';
import { api } from '../services/api';

interface Props {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export const MarketFilters: React.FC<Props> = ({ filters, onFiltersChange }) => {
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    positions: [],
    statTypes: [],
    suspensionStatuses: []
  });

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const options = await api.getFilterOptions();
        setFilterOptions(options);
      } catch (error) {
        console.error('Error loading filter options:', error);
      }
    };

    loadFilterOptions();
  }, []);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  return (
    <div className="filters-container">
      <h3>Filters</h3>

      <div className="filters-grid">
        {/* Player/Team Name Filter */}
        <div className='filter-player-team'>
          <label className="form-label">Player/Team:</label>
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder="Search player/team name..."
            className="form-input"
          />
        </div>

        {/* Position Filter */}
        <div className="filter-group">
          <label className="form-label">Position:</label>
          <select
            value={filters.position}
            onChange={(e) => handleFilterChange('position', e.target.value)}
            className="form-select"
          >
            <option value="">All Positions</option>
            {filterOptions.positions.map((position) => (
              <option key={position} value={position}>
                {position}
              </option>
            ))}
          </select>
        </div>

        {/* Stat Type Filter */}
        <div className="filter-group">
          <label className="form-label">Stat Type:</label>
          <select
            value={filters.statType}
            onChange={(e) => handleFilterChange('statType', e.target.value)}
            className="form-select"
          >
            <option value="">All Stats</option>
            {filterOptions.statTypes.map((statType) => (
              <option key={statType} value={statType}>
                {statType}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="form-label">Market Status:</label>
          <select
            value={filters.suspensionStatus}
            onChange={(e) => handleFilterChange('suspensionStatus', e.target.value)}
            className="form-select"
          >
            <option value="">All Markets</option>
            <option value="active">Released</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>
    </div>
  );
};
