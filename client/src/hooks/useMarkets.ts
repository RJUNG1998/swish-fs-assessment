import { useState, useEffect, useRef } from 'react';
import { Market, Filters } from '../types';
import { api } from '../services/api';

export const useMarkets = () => {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const updatingRef = useRef<Record<number, boolean>>({});

  const fetchMarkets = async (filters?: Partial<Filters>) => {
    try {
      setLoading(true);
      setError(null);

      // Remove empty filter values
      const cleanFilters = filters
        ? Object.fromEntries(Object.entries(filters).filter(([_, value]) => value && value !== ''))
        : {};

      const result = await api.getMarkets(cleanFilters);
      setMarkets(result.data);
    } catch (err) {
      console.error('Error fetching markets:', err);
      setError('Failed to fetch markets');
    } finally {
      setLoading(false);
    }
  };

  // Handle manual suspension override toggle
  const toggleSuspension = async (marketId: number) => {
    if (updatingRef.current[marketId]) return; // prevent race
    updatingRef.current[marketId] = true;

    const market = markets.find((m) => m.id === marketId);
    if (!market) return;

    try {
      let newManualSuspension: number | null;
      let newSuspendedState: boolean;

      if (market.manual_suspension !== null) {
        // Remove the manual override
        newManualSuspension = null;
        // Need to compute what the effective state would be without override
        // For optimistic update, we'll approximate it (server will compute the real value)
        newSuspendedState = market.market_suspended === 1;
      } else {
        // Set manual override to opposite of current effective state
        newManualSuspension = market.is_suspended ? 0 : 1;
        newSuspendedState = !market.is_suspended;
      }

      // Update UI immediately (optimistic update)
      setMarkets((prevMarkets) =>
        prevMarkets.map((m) =>
          m.id === marketId
            ? {
                ...m,
                manual_suspension: newManualSuspension,
                is_suspended: newSuspendedState
              }
            : m
        )
      );

      // Update server
      if (newManualSuspension === null) {
        await api.removeManualSuspension(marketId);
      } else {
        await api.updateManualSuspension(marketId, Boolean(newManualSuspension));
      }
    } catch (err) {
      console.error('Error updating manual override:', err);
      // Revert optimistic update on error
      setMarkets((prevMarkets) =>
        prevMarkets.map((m) =>
          m.id === marketId
            ? {
                ...m,
                manual_suspension: market.manual_suspension,
                is_suspended: market.is_suspended
              }
            : m
        )
      );
    } finally {
      updatingRef.current[marketId] = false;
    }
  };

  useEffect(() => {
    fetchMarkets();
  }, []);

  return {
    markets,
    loading,
    error,
    fetchMarkets,
    toggleSuspension
  };
};
