import express from 'express';
import { MarketService } from '../services/marketService';

const router = express.Router();
const marketService = new MarketService();

// GET /api/markets/filterOptions - Get available filter options
router.get('/filterOptions', async (req, res) => {
  try {
    const markets = await marketService.getAllMarketsWithDetails();

    const positions = [...new Set(markets.map((m) => m.position))];
    const statTypes = [...new Set(markets.map((m) => m.stat_type_name))];

    res.json({
      success: true,
      data: {
        positions: positions.sort(),
        statTypes: statTypes.sort(),
        suspensionStatuses: ['suspended', 'active']
      }
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch filter options'
    });
  }
});

// PUT /api/markets/:id/suspension - Update manual suspension
// TODO: Candidate needs to implement this endpoint
router.put('/:id/suspension', async (req, res) => {
  try {
    const marketId = parseInt(req.params.id);
    const { suspended } = req.body;

    // MISSING IMPLEMENTATION - Candidate task

    res.status(501).json({
      success: false,
      error: 'Manual suspension update not implemented'
    });
  } catch (error) {
    console.error('Error updating manual suspension:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update manual suspension'
    });
  }
});

// GET /api/markets - Get all markets with filtering
router.get('/', async (req, res) => {
  try {
    const filters = {
      position: req.query.position as string,
      statType: req.query.statType as string,
      suspensionStatus: req.query.suspensionStatus as string,
      search: req.query.search as string
    };

    // Remove undefined values
    Object.keys(filters).forEach(
      (key) => filters[key as keyof typeof filters] === undefined && delete filters[key as keyof typeof filters]
    );

    const markets = await marketService.getFilteredMarkets(filters);

    res.json({
      success: true,
      data: markets,
      count: markets.length
    });
  } catch (error) {
    console.error('Error fetching markets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch markets'
    });
  }
});

export default router;
