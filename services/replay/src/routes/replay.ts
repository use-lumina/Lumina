import { Hono } from 'hono';
import { getDB } from '../database/postgres';
import {
  calculateHashSimilarity,
  calculateSemanticSimilarity,
  simulateResponseVariation,
} from '../utils/similarity';

const app = new Hono();

/**
 * POST /replay/capture
 * Create a replay set from selected traces
 */
app.post('/capture', async (c) => {
  try {
    const db = getDB();
    const sql = db.getClient();

    // Parse request body
    const body = await c.req.json();
    const { name, description, traceIds, createdBy } = body;

    // Validate input
    if (!name || !traceIds || !Array.isArray(traceIds) || traceIds.length === 0) {
      return c.json(
        {
          error: 'Invalid input',
          message: 'name and traceIds array are required',
        },
        400
      );
    }

    // Verify traces exist
    const traces = await sql`
      SELECT trace_id FROM traces
      WHERE trace_id = ANY(${traceIds})
    `;

    if (traces.length !== traceIds.length) {
      return c.json(
        {
          error: 'Invalid traces',
          message: `Found ${traces.length} of ${traceIds.length} traces`,
        },
        400
      );
    }

    // Create replay set
    const replaySet = await sql`
      INSERT INTO replay_sets (
        name,
        description,
        trace_ids,
        created_by,
        total_traces,
        status
      )
      VALUES (
        ${name},
        ${description || null},
        ${traceIds},
        ${createdBy || null},
        ${traceIds.length},
        'pending'
      )
      RETURNING
        replay_id,
        name,
        description,
        trace_ids,
        created_at,
        created_by,
        status,
        total_traces
    `;

    return c.json({
      success: true,
      replaySet: replaySet[0],
    });
  } catch (error) {
    console.error('Error creating replay set:', error);
    return c.json(
      {
        error: 'Failed to create replay set',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /replay/run
 * Execute a replay set
 */
app.post('/run', async (c) => {
  try {
    const db = getDB();
    const sql = db.getClient();

    // Parse request body
    const body = await c.req.json();
    const { replayId } = body;

    if (!replayId) {
      return c.json(
        {
          error: 'Invalid input',
          message: 'replayId is required',
        },
        400
      );
    }

    // Get replay set
    const replaySets = await sql`
      SELECT * FROM replay_sets
      WHERE replay_id = ${replayId}
      LIMIT 1
    `;

    if (replaySets.length === 0) {
      return c.json({ error: 'Replay set not found' }, 404);
    }

    const replaySet = replaySets[0];

    // Update status to running
    await sql`
      UPDATE replay_sets
      SET status = 'running'
      WHERE replay_id = ${replayId}
    `;

    // Get traces to replay
    const traces = await sql`
      SELECT
        trace_id,
        span_id,
        prompt,
        response,
        cost_usd,
        latency_ms,
        model,
        service_name,
        endpoint
      FROM traces
      WHERE trace_id = ANY(${replaySet.trace_ids})
    `;

    // Execute replays (in a real system, this would call the actual LLM endpoints)
    // For MVP, we'll simulate by re-executing the same prompts
    let completedCount = 0;

    for (const trace of traces) {
      try {
        // Simulate replay execution with realistic variations
        // In production, this would:
        // 1. Send the original prompt to the LLM endpoint
        // 2. Get the new response
        // 3. Compare with original

        // For MVP: Simulate LLM non-determinism with slight response variations
        const replayResponse = simulateResponseVariation(trace.response, 0.15); // 15% chance of variation
        const replayCost = parseFloat(trace.cost_usd) * (0.95 + Math.random() * 0.1); // Cost variation ±5%
        const originalLatency = Math.floor(parseFloat(trace.latency_ms)); // Ensure integer
        const replayLatency = Math.floor(originalLatency * (0.9 + Math.random() * 0.2)); // Latency variation ±10%

        // Calculate REAL hash similarity (character-level comparison)
        const hashSimilarity = calculateHashSimilarity(trace.response, replayResponse);

        // Calculate REAL semantic similarity (word-level comparison)
        const semanticScore = calculateSemanticSimilarity(trace.response, replayResponse);

        // Create diff summary
        const diffSummary = {
          cost_diff: replayCost - parseFloat(trace.cost_usd),
          cost_diff_percent: ((replayCost - parseFloat(trace.cost_usd)) / parseFloat(trace.cost_usd)) * 100,
          latency_diff: replayLatency - originalLatency,
          latency_diff_percent: ((replayLatency - originalLatency) / originalLatency) * 100,
          response_changed: hashSimilarity < 1.0,
        };

        // Store result
        await sql`
          INSERT INTO replay_results (
            replay_id,
            trace_id,
            span_id,
            original_response,
            replay_response,
            original_cost,
            replay_cost,
            original_latency,
            replay_latency,
            hash_similarity,
            semantic_score,
            diff_summary,
            status
          )
          VALUES (
            ${replayId},
            ${trace.trace_id},
            ${trace.span_id},
            ${trace.response},
            ${replayResponse},
            ${trace.cost_usd},
            ${replayCost},
            ${originalLatency},
            ${replayLatency},
            ${hashSimilarity},
            ${semanticScore},
            ${JSON.stringify(diffSummary)},
            'completed'
          )
        `;

        completedCount++;

        // Update progress
        await sql`
          UPDATE replay_sets
          SET completed_traces = ${completedCount}
          WHERE replay_id = ${replayId}
        `;
      } catch (traceError) {
        console.error(`Error replaying trace ${trace.trace_id}:`, traceError);
      }
    }

    // Mark replay set as completed
    await sql`
      UPDATE replay_sets
      SET
        status = 'completed',
        completed_traces = ${completedCount}
      WHERE replay_id = ${replayId}
    `;

    return c.json({
      success: true,
      replayId,
      completedCount,
      totalTraces: traces.length,
    });
  } catch (error) {
    console.error('Error executing replay:', error);

    // Try to update status to failed
    try {
      const db = getDB();
      const sql = db.getClient();
      const body = await c.req.json();
      await sql`
        UPDATE replay_sets
        SET status = 'failed'
        WHERE replay_id = ${body.replayId}
      `;
    } catch (updateError) {
      console.error('Error updating replay status:', updateError);
    }

    return c.json(
      {
        error: 'Failed to execute replay',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /replay/:id
 * Get replay set status and summary
 */
app.get('/:id', async (c) => {
  try {
    const replayId = c.req.param('id');
    const db = getDB();
    const sql = db.getClient();

    // Get replay set
    const replaySets = await sql`
      SELECT * FROM replay_sets
      WHERE replay_id = ${replayId}
      LIMIT 1
    `;

    if (replaySets.length === 0) {
      return c.json({ error: 'Replay set not found' }, 404);
    }

    const replaySet = replaySets[0];

    // Get results summary
    const summary = await sql`
      SELECT
        COUNT(*) as total_results,
        AVG(hash_similarity) as avg_hash_similarity,
        AVG(semantic_score) as avg_semantic_score,
        AVG(replay_cost - original_cost) as avg_cost_diff,
        AVG(replay_latency - original_latency) as avg_latency_diff,
        COUNT(*) FILTER (WHERE hash_similarity < 1.0) as response_changes
      FROM replay_results
      WHERE replay_id = ${replayId}
    `;

    return c.json({
      replaySet,
      summary: summary[0] || null,
    });
  } catch (error) {
    console.error('Error fetching replay status:', error);
    return c.json(
      {
        error: 'Failed to fetch replay status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /replay/:id/diff
 * Get detailed comparison results
 */
app.get('/:id/diff', async (c) => {
  try {
    const replayId = c.req.param('id');
    const db = getDB();
    const sql = db.getClient();

    // Parse query parameters
    const { limit = '50', offset = '0', showOnlyChanges = 'false' } = c.req.query();

    // Build query
    const conditions = ['replay_id = $1'];
    const params: any[] = [replayId];

    if (showOnlyChanges === 'true') {
      conditions.push('hash_similarity < 1.0');
    }

    const whereClause = conditions.join(' AND ');

    // Get diff results
    const results = await sql.unsafe(
      `
      SELECT
        r.result_id,
        r.trace_id,
        r.original_response,
        r.replay_response,
        r.original_cost,
        r.replay_cost,
        r.original_latency,
        r.replay_latency,
        r.hash_similarity,
        r.semantic_score,
        r.diff_summary,
        r.executed_at,
        t.service_name,
        t.endpoint,
        t.model,
        t.prompt
      FROM replay_results r
      JOIN traces t ON r.trace_id = t.trace_id AND r.span_id = t.span_id
      WHERE ${whereClause}
      ORDER BY r.executed_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `,
      [...params, parseInt(limit), parseInt(offset)]
    );

    // Get total count
    const countResult = await sql.unsafe(
      `
      SELECT COUNT(*) as total
      FROM replay_results
      WHERE ${whereClause}
    `,
      params
    );

    const total = parseInt(countResult[0]?.total || '0');

    return c.json({
      data: results,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + results.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching replay diff:', error);
    return c.json(
      {
        error: 'Failed to fetch replay diff',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /replay
 * List all replay sets
 */
app.get('/', async (c) => {
  try {
    const db = getDB();
    const sql = db.getClient();

    // Parse query parameters
    const { status, limit = '50', offset = '0' } = c.req.query();

    // Build query
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      conditions.push(`status = $${paramCount}`);
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get replay sets
    const replaySets = await sql.unsafe(
      `
      SELECT
        replay_id,
        name,
        description,
        created_at,
        created_by,
        status,
        total_traces,
        completed_traces
      FROM replay_sets
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `,
      [...params, parseInt(limit), parseInt(offset)]
    );

    // Get total count
    const countResult = await sql.unsafe(
      `
      SELECT COUNT(*) as total
      FROM replay_sets
      ${whereClause}
    `,
      params
    );

    const total = parseInt(countResult[0]?.total || '0');

    return c.json({
      data: replaySets,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + replaySets.length < total,
      },
    });
  } catch (error) {
    console.error('Error listing replay sets:', error);
    return c.json(
      {
        error: 'Failed to list replay sets',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default app;