# Candidate Assessment Brief

## Overview

This is a **focused, skeleton-based version** of our Full Stack assessment. You will implement the required tasks described below.

The project is a simple app which displays a taple representation of pre-loaded data. Data consists of,

- **props:** this represents the _optimal_ betting line being offered for each market, where a **market** is defined as the line for a specific stat type of a player.
  - i.e. for Russell Westbrook, his 4 unique markets and respective optimal lines are points(19.0), rebounds(9.0), assists(8.5), and steals(1.5).
- **alternates:** this represents _all_ of the lines offered at one point for a market, and their respective under, over, and push probabilities.

**Use of an AI coding agent is allowed, however you will need to understand all code that is implemented during the in-person interview.**

## What's Pre-built for You

✅ **Complete Infrastructure:**

- Docker MySQL setup
- React + Vite + TypeScript frontend
- Node.js + Express + TypeScript backend
- Database schema and migrations
- Data seeding from JSON files
- Basic UI components and styling

✅ **Core Functionality:**

- Market data display table
- Basic filtering system
- Database connections and API structure

## Your Assessment Tasks

### 🐛 Primary Tasks (Required)

#### 1. Implement Market Statistics Component

**File:** `client/src/App.tsx` and create new component

- **Goal:** Create a React component that shows real-time market statistics
- **Requirements:** Display total markets, suspension counts, and loading indicator
- **Challenge:** Component should update reactively if/when data changes

#### 2. Implement Manual Suspension API

**File:** `server/src/routes/markets.ts` and `server/src/services/marketService.ts`

- **Issue:** Manual suspension toggle buttons don't work
- **Goal:** Complete the backend API and SQL implementation
- **Challenge:** Ensure proper error handling and database updates

#### 3. Implement Player/Team Search

**File:** `client/src/components/MarketFilters.tsx` and `client/src/App.tsx`

- **Issue:** Player/team search functionality is missing from the filters
- **Goal:** Add a search input that filters markets by player name or team
- **Challenge:** Implement effecient API calls and integrate with existing filter pattern

### 🔧 Secondary Tasks (Choose 1-2)

#### 4. Fix SQL Performance

**File:** `server/src/services/marketService.ts`

- **Issue:** Calculating low/high lines is inefficient
- **Challenge:** How can queries be optimizied to address this ineffiency?

#### 5. Fix Market Suspension Logic Bug

**File:** `server/src/services/marketService.ts`

- **Issue:** Some markets that should be suspended are showing as active
- **Goal:** Debug and fix the suspension calculation logic
- **Challenge:** Understand the [business rules](#business-rules) and identify the incorrect implementation

#### 6. Fix Race Condition

**File:** `client/src/hooks/useMarkets.ts`

- **Issue:** Rapid clicking of suspension toggle can cause inconsistent state
- **Challenge:** Prevent multiple simultaneous API calls for the same market

## Skills We're Testing

1. **JavaScript/React/TypeScript** (70%)
   - Component development
   - State management
   - TypeScript usage

2. **API Design** (20%)
   - Backend implementation
   - Error handling

3. **SQL/Database** (10%)
   - Performance considerations

## Business Rules

### Market Suspension Logic

A market is **automatically suspended** if ANY of these conditions are true:

1. `marketSuspended = 1`
2. Optimal line doesn't exist for the given market
3. **All** probabilities (under, over, push) for optimal line are ≤ 40%

### Manual Override

- Users can manually suspend/activate any market
- Manual setting overrides computed suspension status
- Manual overrides persist in database

## API Endpoints

- `GET /api/markets` - Get filtered markets
- `GET /api/markets/filterOptions` - Get filter options
- `PUT /api/markets/:id/suspension` - Manually update suspension

## Database Schema

- `players` - Player information
- `markets` - Main betting lines with suspension status
- `alternates` - All available lines with probabilities
- `stat_types` - Lookup table for stat types

## Evaluation Criteria

- **Correctness:** Bugs are fixed properly
- **Code Quality:** Clean, readable code following existing patterns
- **Performance:** Efficient queries and API usage
- **TypeScript Usage:** Proper typing where helpful
- **Testing:** Consider edge cases

## Time Expectation

**4 hours** - but feel free to take up to 24 hours to submit

## Submission

1. Ensure `npm start` works from a clean environment
2. Include a brief summary of what you fixed/implemented
3. Mention any assumptions or trade-offs you made
