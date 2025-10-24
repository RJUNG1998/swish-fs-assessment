import React from 'react';
import { Market } from "../types";

interface Props {
  markets: Market[];
  loading: boolean;
}

export const MarketStatistics: React.FC<Props> = ({ markets, loading }) => {
  const totalMarkets = markets.length;
  const suspendedMarkets = markets.filter(m => m.is_suspended).length;

  if (loading) {
    return <div>Loading market statistics...</div>;
  }

  return (
    <div className="stats-container">
      <p><strong>Total Markets:</strong> {totalMarkets}</p>
      <p><strong>Suspended Markets:</strong> {suspendedMarkets}</p>
    </div>
  )
}