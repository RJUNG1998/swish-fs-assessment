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
router.put('/:id/suspension', async (req, res) => {
  try {
    const marketId = parseInt(req.params.id);
    const { suspended } = req.body;

    if (isNaN(marketId)) {
      return res.status(400).json({ success: false, error: 'Invalid market ID' });
    }
    if (typeof suspended !== 'boolean') {
      return res.status(400).json({ success: false, error: 'Invalid suspended value' });
    }

    // Update the DB with the user input
    const response = await marketService.updateManualSuspension(marketId, suspended);
    if (!response) {
      return res.status(404).json({ success: false, error: 'Market not found' })
    }

    res.json({
      success: true,
      message: `Market ${marketId} suspension updated`,
      data: { id: marketId, suspended }
    });
  } catch (error) {
    console.error('Error updating manual suspension:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update manual suspension'
    });
  }
});

// PUT /api/markets/:id/removeManualSuspension - Remove manual suspension
router.put('/:id/removeManualSuspension', async (req, res) => {
  try {
    const marketId = parseInt(req.params.id);

    if (isNaN(marketId)) {
      return res.status(400).json({ success: false, error: 'Invalid market ID' });
    }

    const response = await marketService.removeManualSuspension(marketId);
    if (!response) {
      return res.status(404).json({ success: false, error: 'Market not found' })
    }

    res.json({
      success: true,
      message: `Market ${marketId} manual suspension removed`,
      data: { id: marketId }
    });
  } catch (error) {
    console.error('Error removing manual suspension:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to removing manual suspension'
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
