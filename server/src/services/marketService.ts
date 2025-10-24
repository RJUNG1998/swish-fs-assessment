import { getPool } from '../config/database';
import { MarketWithDetails } from '../types';

const pool = getPool();

export class MarketService {
  async getAllMarketsWithDetails(): Promise<MarketWithDetails[]> {
    // Performance could be improved here
    const query = `
      SELECT
        m.*,
        p.name as player_name,
        p.team_nickname,
        p.team_abbr,
        p.position,
        st.name as stat_type_name
      FROM markets m
      JOIN players p ON m.player_id = p.id
      JOIN stat_types st ON m.stat_type_id = st.id
      ORDER BY p.name, st.name
    `;

    const [rows] = await pool.execute(query);
    const markets = rows as any[];

    // Calculate low/high lines and suspension status for each market
    const enrichedMarkets = await Promise.all(
      markets.map(async (market) => {
        const { low_line, high_line } = await this.getLowHighLines(market.player_id, market.stat_type_id);
        const is_suspended = await this.isMarketSuspended(market);

        return {
          ...market,
          low_line: low_line || market.line,
          high_line: high_line || market.line,
          is_suspended
        };
      })
    );

    return enrichedMarkets;
  }

  async getLowHighLines(
    playerId: number,
    statTypeId: number
  ): Promise<{ low_line: number | null; high_line: number | null }> {
    const query = `
      SELECT MIN(line) as low_line, MAX(line) as high_line
      FROM alternates
      WHERE player_id = ? AND stat_type_id = ?
    `;

    const [rows] = await pool.execute(query, [playerId, statTypeId]);
    const result = (rows as any[])[0];

    return {
      low_line: result.low_line,
      high_line: result.high_line
    };
  }

  async computeSuspensionStatus(market: any): Promise<boolean> {
    // Rule 1: Check marketSuspended flag
    if (market.market_suspended === 1) {
      return true;
    }

    // Rule 2: Check if optimal line exists in alternates
    const optimalLineQuery = `
      SELECT COUNT(*) as count
      FROM alternates
      WHERE player_id = ? AND stat_type_id = ? AND line = ?
    `;

    const [optimalRows] = await pool.execute(optimalLineQuery, [market.player_id, market.stat_type_id, market.line]);

    const optimalLineExists = (optimalRows as any[])[0].count > 0;

    if (!optimalLineExists) {
      return true;
    }

    // Rule 3: Check probabilities for optimal line
    // Check if market should be suspended based on probabilities
    const probabilityQuery = `
      SELECT under_odds, over_odds, push_odds
      FROM alternates
      WHERE player_id = ? AND stat_type_id = ? AND line = ?
      LIMIT 1
    `;

    const [probRows] = await pool.execute(probabilityQuery, [market.player_id, market.stat_type_id, market.line]);

    if ((probRows as any[]).length === 0) {
      return true;
    }

    const probabilities = (probRows as any[])[0];
    const hasValidProbability = [probabilities.under_odds, probabilities.over_odds, probabilities.push_odds].some(
      (p) => p >= 0.4
    );

    return !hasValidProbability;
  }

  async isMarketSuspended(market: any): Promise<boolean> {
    // If there's a manual override, use that
    if (market.manual_suspension !== null) {
      return Boolean(market.manual_suspension);
    }
    // Otherwise compute based on full business rules
    return await this.computeSuspensionStatus(market);
  }

  // TODO: Candidate needs to implement this method
  async updateManualSuspension(marketId: number, suspended: boolean): Promise<boolean> {
    try {
      const query = `
        UPDATE markets
        SET manual_suspension = ?, updated_at = ?
        WHERE id = ?
      `;

      // TODO: Execute the query with the correct parameters
      // Hint: valid suspepension values are 0, 1 or NULL
      const [result] = await pool.execute(query, [
        ,
        ,
        /* TODO: suspended value */ /* TODO: Set updated_at timestamp */ marketId
      ]);

      // TODO: Return true if the update was successful, false otherwise
      return /* TODO: Check if update was successful */;
    } catch (error) {
      console.error('Error updating manual suspension:', error);
      throw new Error('Failed to update manual suspension');
    }
  }

  async getFilteredMarkets(filters: {
    position?: string;
    statType?: string;
    suspensionStatus?: string;
    search?: string;
  }): Promise<MarketWithDetails[]> {
    let query = `
      SELECT
        m.*,
        p.name as player_name,
        p.team_nickname,
        p.team_abbr,
        p.position,
        st.name as stat_type_name
      FROM markets m
      JOIN players p ON m.player_id = p.id
      JOIN stat_types st ON m.stat_type_id = st.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (filters.position) {
      query += ' AND p.position = ?';
      params.push(filters.position);
    }

    if (filters.statType) {
      query += ' AND st.name = ?';
      params.push(filters.statType);
    }

    if (filters.search) {
      query += ' AND (p.name LIKE ? OR p.team_nickname LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    query += ' ORDER BY p.name, st.name';

    const [rows] = await pool.execute(query, params);
    const markets = rows as any[];

    // Calculate low/high lines and suspension status for each market
    const enrichedMarkets = await Promise.all(
      markets.map(async (market) => {
        const { low_line, high_line } = await this.getLowHighLines(market.player_id, market.stat_type_id);
        const is_suspended = await this.isMarketSuspended(market);

        return {
          ...market,
          low_line: low_line || market.line,
          high_line: high_line || market.line,
          is_suspended
        };
      })
    );

    // Apply suspension filter in memory (inefficient)
    if (filters.suspensionStatus) {
      const isSuspended = filters.suspensionStatus === 'suspended';
      return enrichedMarkets.filter((market) => market.is_suspended === isSuspended);
    }

    return enrichedMarkets;
  }
}
