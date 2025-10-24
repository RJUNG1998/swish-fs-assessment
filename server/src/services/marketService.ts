import { OkPacketParams } from 'mysql2';
import { getPool } from '../config/database';
import { MarketWithDetails } from '../types';

const pool = getPool();

export class MarketService {
  async getAllMarketsWithDetails(): Promise<MarketWithDetails[]> {
    // Performance could be improved here
    const query = `
      SELECT 
        m.*,
        p.name AS player_name,
        p.team_nickname,
        p.team_abbr,
        p.position,
        st.name AS stat_type_name,
        lh.low_line,
        lh.high_line,
        a.under_odds,
        a.over_odds,
        a.push_odds
      FROM markets m
      JOIN players p ON m.player_id = p.id
      JOIN stat_types st ON m.stat_type_id = st.id
      LEFT JOIN (
        SELECT 
          player_id, 
          stat_type_id, 
          MIN(line) AS low_line, 
          MAX(line) AS high_line
        FROM alternates
        GROUP BY player_id, stat_type_id
      ) lh ON m.player_id = lh.player_id AND m.stat_type_id = lh.stat_type_id
      LEFT JOIN alternates a 
        ON a.player_id = m.player_id 
        AND a.stat_type_id = m.stat_type_id 
        AND a.line = m.line
      ORDER BY p.name, st.name
    `;

    const [rows] = await pool.execute(query);
    const markets = rows as any[];

    // Calculate low/high lines and suspension status for each market
    const enrichedMarkets = await Promise.all(
      markets.map(async (market) => {
        const low_line = market.low_line ?? market.line;
        const high_line = market.high_line ?? market.line;

        const is_suspended = market.manual_suspension !== null
          ? Boolean(market.manual_suspension)
          : market.market_suspended === 1 ||
            market.under_odds === undefined ||
            market.over_odds === undefined ||
            market.push_odds === undefined ||
            [market.under_odds, market.over_odds, market.push_odds].every((p) => p <= 0.4);

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

  // This method is not being used after the performance improvement.
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

  // This method is not being used after the performance improvement.
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

  // This method is not being used after the performance improvement.
  async isMarketSuspended(market: any): Promise<boolean> {
    // If there's a manual override, use that
    if (market.manual_suspension !== null) {
      return Boolean(market.manual_suspension);
    }
    // Otherwise compute based on full business rules
    return await this.computeSuspensionStatus(market);
  }

  async updateManualSuspension(marketId: number, suspended: boolean): Promise<boolean> {
    try {
      const query = `
        UPDATE markets
        SET manual_suspension = ?, updated_at = ?
        WHERE id = ?
      `;

      const manualValue = suspended ? 1 : 0;
      const updatedAt = new Date();
      const [result] = await pool.execute(query, [manualValue
        , updatedAt
        , marketId
      ]);
      const okPacket = result as OkPacketParams;
      return okPacket.affectedRows > 0;
    } catch (error) {
      console.error('Error updating manual suspension:', error);
      throw new Error('Failed to update manual suspension');
    }
  }

  async removeManualSuspension(marketId: number): Promise<boolean> {
    const query = `
      UPDATE markets
      SET manual_suspension = NULL, updated_at = ?
      WHERE id = ?
    `;
    const [result] = await pool.execute(query, [new Date(), marketId]);
    return (result as OkPacketParams).affectedRows > 0;
  }

  async getFilteredMarkets(filters: {
    position?: string;
    statType?: string;
    suspensionStatus?: string;
    search?: string;
  }): Promise<MarketWithDetails[]> {
    const params: any[] = [];

    let query = `
      WITH market_data AS (
        SELECT
          m.*,
          p.name AS player_name,
          p.team_nickname,
          p.team_abbr,
          p.position,
          st.name AS stat_type_name,
          lh.low_line,
          lh.high_line,
          a.under_odds,
          a.over_odds,
          a.push_odds,
          CASE
            WHEN m.manual_suspension IS NOT NULL THEN m.manual_suspension
            WHEN m.market_suspended = 1 THEN 1
            WHEN a.under_odds IS NULL OR a.over_odds IS NULL OR a.push_odds IS NULL THEN 1
            WHEN a.under_odds <= 0.4 AND a.over_odds <= 0.4 AND a.push_odds <= 0.4 THEN 1
            ELSE 0
          END AS is_suspended
        FROM markets m
        JOIN players p ON m.player_id = p.id
        JOIN stat_types st ON m.stat_type_id = st.id
        LEFT JOIN (
          SELECT player_id, stat_type_id, MIN(line) AS low_line, MAX(line) AS high_line
          FROM alternates
          GROUP BY player_id, stat_type_id
        ) lh ON m.player_id = lh.player_id AND m.stat_type_id = lh.stat_type_id
        LEFT JOIN alternates a
          ON a.player_id = m.player_id
          AND a.stat_type_id = m.stat_type_id
          AND a.line = m.line
        WHERE 1=1
    `;

    // Apply filters that can be done in SQL
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

    query += ') SELECT * FROM market_data WHERE 1=1';

    // Apply suspension filter directly in SQL
    if (filters.suspensionStatus) {
      if (filters.suspensionStatus === 'suspended') {
        query += ' AND is_suspended = 1';
      } else if (filters.suspensionStatus === 'active') {
        query += ' AND is_suspended = 0';
      }
    }

    query += ' ORDER BY player_name, stat_type_name';

    const [rows] = await pool.execute(query, params);
    const markets = rows as any[];

    // Optional: fallback in TS for low_line/high_line
    return markets.map((market) => ({
      ...market,
      low_line: market.low_line ?? market.line,
      high_line: market.high_line ?? market.line,
      is_suspended: Boolean(market.is_suspended),
    }));
  }
}
