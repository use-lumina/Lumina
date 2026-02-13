import { Hono } from 'hono';
import { inArray, isNull, and } from 'drizzle-orm';
import {
  getDatabase,
  traces,
  createReplaySet,
  getReplaySet,
  updateReplaySetStatus,
  incrementCompletedTraces,
  createReplayResult,
  getReplayResults,
  getReplayResultsWithTraces,
  getReplayStats,
  getAllReplaySets,
  deleteReplaySet,
} from '../database/client';
import {
  calculateHashSimilarity,
  calculateSemanticSimilarity,
  simulateResponseVariation,
} from '../utils/similarity';
import { callLLM, inferProvider } from '../utils/llm-caller';

const app = new Hono();

/**
 * POST /replay/capture
 * Create a replay set from selected traces
 */
app.post('/capture', async (c) => {
  try {
    const db = getDatabase();

    // Parse request body
    const body = await c.req.json();
    const { name, description, traceIds, createdBy } = body;

    console.log('[Replay Capture] Received:', { name, traceIds, traceIdsLength: traceIds?.length });

    // Validate input
    if (!name || !traceIds || !Array.isArray(traceIds) || traceIds.length === 0) {
      console.log('[Replay Capture] Validation failed:', {
        name,
        traceIds,
        isArray: Array.isArray(traceIds),
      });
      return c.json(
        {
          error: 'Invalid input',
          message: 'name and traceIds array are required',
        },
        400
      );
    }

    // Verify traces exist (get unique trace IDs only, not all spans)
    const existingTraces = await db
      .selectDistinct({ traceId: traces.traceId })
      .from(traces)
      .where(inArray(traces.traceId, traceIds));

    if (existingTraces.length !== traceIds.length) {
      return c.json(
        {
          error: 'Invalid traces',
          message: `Found ${existingTraces.length} of ${traceIds.length} traces`,
        },
        400
      );
    }

    // Create replay set
    const replayId = await createReplaySet(db, {
      name,
      description: description || null,
      traceIds,
      createdBy: createdBy || null,
      totalTraces: traceIds.length,
      status: 'pending',
    });

    // Fetch the created replay set
    const replaySet = await getReplaySet(db, replayId);

    // Convert to snake_case for dashboard compatibility
    const formattedReplaySet = {
      replay_id: replaySet.replayId,
      name: replaySet.name,
      description: replaySet.description,
      trace_ids: replaySet.traceIds,
      created_at: replaySet.createdAt,
      created_by: replaySet.createdBy,
      status: replaySet.status,
      total_traces: replaySet.totalTraces,
      completed_traces: replaySet.completedTraces,
      started_at: replaySet.startedAt,
      completed_at: replaySet.completedAt,
      error_message: replaySet.errorMessage,
      metadata: replaySet.metadata,
    };

    return c.json({
      success: true,
      replaySet: formattedReplaySet,
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
 * Execute a replay set with optional new model/prompt
 */
app.post('/run', async (c) => {
  try {
    const db = getDatabase();

    // Parse request body
    const body = await c.req.json();

    // Check if LLM API keys are available
    const hasApiKeys = !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);

    const {
      replayId,
      newModel,
      newPrompt,
      newSystemPrompt,
      useRealLLM = hasApiKeys, // Default to real LLM only if API keys are set, otherwise simulate
    } = body;

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
    const replaySet = await getReplaySet(db, replayId);

    if (!replaySet) {
      return c.json({ error: 'Replay set not found' }, 404);
    }

    // Update status to running
    await updateReplaySetStatus(db, replayId, 'running');

    // Get traces to replay (only root spans - those with no parent)
    const tracesToReplay = await db
      .select({
        traceId: traces.traceId,
        spanId: traces.spanId,
        prompt: traces.prompt,
        response: traces.response,
        costUsd: traces.costUsd,
        latencyMs: traces.latencyMs,
        model: traces.model,
        provider: traces.provider,
        serviceName: traces.serviceName,
        endpoint: traces.endpoint,
      })
      .from(traces)
      .where(
        and(
          inArray(traces.traceId, replaySet.traceIds),
          isNull(traces.parentSpanId) // Only replay root spans
        )
      );

    // Execute replays
    let completedCount = 0;

    for (const trace of tracesToReplay) {
      try {
        let replayResponse: string;
        let replayCost: number;
        let replayLatency: number;
        let replayModel: string;
        let replayProvider: string;

        // Determine if we should make real LLM calls
        if (useRealLLM) {
          // REAL MODE: Call actual LLM APIs
          console.log(`[Replay] Making real LLM call for trace ${trace.traceId}`);

          // Determine the model and prompt to use
          replayModel = newModel || trace.model;
          replayProvider = newModel
            ? inferProvider(newModel)
            : trace.provider || inferProvider(trace.model);
          const promptToUse = newPrompt || trace.prompt;
          const systemPromptToUse = newSystemPrompt || null;

          // Call the LLM
          const llmResult = await callLLM({
            provider: replayProvider,
            model: replayModel,
            prompt: promptToUse || '',
            systemPrompt: systemPromptToUse || undefined,
            temperature: 0.7,
            maxTokens: 1000,
          });

          replayResponse = llmResult.response;
          replayCost = llmResult.cost;
          replayLatency = llmResult.latency;
        } else {
          // SIMULATION MODE: Generate a simulated response (for testing)
          console.log(`[Replay] Simulating response for trace ${trace.traceId}`);

          const start = performance.now();
          replayResponse = simulateResponseVariation(trace.response || '', 0.1);
          replayLatency = performance.now() - start;

          replayModel = newModel || trace.model;
          replayProvider = inferProvider(replayModel);
          replayCost = (trace.costUsd || 0) * 0.95; // Simulate slightly lower cost
        }

        // Calculate similarity scores
        const hashSimilarity = calculateHashSimilarity(trace.response || '', replayResponse);
        const semanticScore = calculateSemanticSimilarity(trace.response || '', replayResponse);

        // Calculate diff summary
        const diffSummary = {
          lengthDiff: replayResponse.length - (trace.response?.length || 0),
          hashSimilarity,
          semanticScore,
          costDiff: replayCost - (trace.costUsd || 0),
          latencyDiff: replayLatency - trace.latencyMs,
        };

        // Store replay result
        await createReplayResult(db, {
          replayId,
          traceId: trace.traceId,
          spanId: trace.spanId,
          originalResponse: trace.response || '',
          replayResponse,
          originalCost: String(trace.costUsd || 0),
          replayCost: String(replayCost),
          originalLatency: trace.latencyMs,
          replayLatency: Math.round(replayLatency),
          hashSimilarity: String(hashSimilarity.toFixed(4)),
          semanticScore: String(semanticScore.toFixed(4)),
          diffSummary,
          replayPrompt: newPrompt || null,
          replayModel: newModel || null,
          replaySystemPrompt: newSystemPrompt || null,
          status: 'completed',
        });

        completedCount++;

        // Update replay set progress
        await incrementCompletedTraces(db, replayId);

        console.log(`[Replay] Completed ${completedCount}/${tracesToReplay.length} replays`);
      } catch (traceError) {
        console.error(`Error replaying trace ${trace.traceId}:`, traceError);
        // Continue with other traces even if one fails
      }
    }

    // Update final status
    const finalStatus = completedCount === tracesToReplay.length ? 'completed' : 'partial';
    await updateReplaySetStatus(db, replayId, finalStatus, completedCount);

    return c.json({
      success: true,
      replayId,
      completedTraces: completedCount,
      totalTraces: tracesToReplay.length,
      status: finalStatus,
    });
  } catch (error) {
    console.error('Error running replay:', error);
    return c.json(
      {
        error: 'Failed to run replay',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /replay/:id
 * Get replay set details with results
 */
app.get('/:id', async (c) => {
  try {
    const replayId = c.req.param('id');
    const db = getDatabase();

    // Get replay set
    const replaySet = await getReplaySet(db, replayId);

    if (!replaySet) {
      return c.json({ error: 'Replay set not found' }, 404);
    }

    // Get replay results with trace data
    const results = await getReplayResultsWithTraces(db, replayId);

    // Get statistics
    const stats = await getReplayStats(db, replayId);

    // Convert to snake_case for dashboard compatibility
    const formattedReplaySet = {
      replay_id: replaySet.replayId,
      name: replaySet.name,
      description: replaySet.description,
      trace_ids: replaySet.traceIds,
      created_at: replaySet.createdAt,
      created_by: replaySet.createdBy,
      status: replaySet.status,
      total_traces: replaySet.totalTraces,
      completed_traces: replaySet.completedTraces,
      started_at: replaySet.startedAt,
      completed_at: replaySet.completedAt,
      error_message: replaySet.errorMessage,
      metadata: replaySet.metadata,
    };

    const formattedResults = results.map((result) => ({
      result_id: result.resultId,
      replay_id: result.replayId,
      trace_id: result.traceId,
      span_id: result.spanId,
      original_response: result.originalResponse,
      replay_response: result.replayResponse,
      original_cost: result.originalCost,
      replay_cost: result.replayCost,
      original_latency: result.originalLatency,
      replay_latency: result.replayLatency,
      hash_similarity: result.hashSimilarity,
      semantic_score: result.semanticScore,
      diff_summary: result.diffSummary,
      status: result.status,
      created_at: result.createdAt,
    }));

    const formattedStats = stats
      ? {
          avg_hash_similarity: stats.avgHashSimilarity,
          avg_semantic_score: stats.avgSemanticScore,
          avg_cost_diff: stats.avgCostDiff,
          avg_latency_diff: stats.avgLatencyDiff,
          total_cost_savings: stats.totalCostSavings,
        }
      : null;

    return c.json({
      replay_set: formattedReplaySet,
      results: formattedResults,
      summary: formattedStats,
    });
  } catch (error) {
    console.error('Error fetching replay details:', error);
    return c.json(
      {
        error: 'Failed to fetch replay details',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /replay/:id/diff
 * Get detailed diff for a specific replay result
 */
app.get('/:id/diff', async (c) => {
  try {
    const replayId = c.req.param('id');
    const { traceId, limit, offset } = c.req.query();
    const db = getDatabase();

    // Get replay results
    const results = await getReplayResults(db, replayId);

    // If traceId is provided, return diff for that specific trace
    if (traceId) {
      const result = results.find((r) => r.traceId === traceId);

      if (!result) {
        return c.json({ error: 'Replay result not found' }, 404);
      }

      // Calculate detailed diff
      const originalLines = result.originalResponse.split('\n');
      const replayLines = result.replayResponse.split('\n');

      // Simple line-by-line diff
      const diff = originalLines.map((line, index) => {
        const replayLine = replayLines[index] || '';
        return {
          lineNumber: index + 1,
          original: line,
          replay: replayLine,
          changed: line !== replayLine,
        };
      });

      // Add any extra lines in replay response
      for (let i = originalLines.length; i < replayLines.length; i++) {
        diff.push({
          lineNumber: i + 1,
          original: '',
          replay: replayLines[i],
          changed: true,
        });
      }

      return c.json({
        trace_id: traceId,
        replay_id: replayId,
        original_response: result.originalResponse,
        replay_response: result.replayResponse,
        hash_similarity: result.hashSimilarity,
        semantic_score: result.semanticScore,
        diff,
        diff_summary: result.diffSummary,
      });
    }

    // Otherwise, return all results with snake_case conversion
    const limitNum = limit ? parseInt(limit) : 50;
    const offsetNum = offset ? parseInt(offset) : 0;
    const paginatedResults = results.slice(offsetNum, offsetNum + limitNum);

    const formattedResults = paginatedResults.map((result) => ({
      result_id: result.resultId,
      replay_id: result.replayId,
      trace_id: result.traceId,
      span_id: result.spanId,
      original_response: result.originalResponse,
      replay_response: result.replayResponse,
      original_cost: result.originalCost,
      replay_cost: result.replayCost,
      original_latency: result.originalLatency,
      replay_latency: result.replayLatency,
      hash_similarity: result.hashSimilarity,
      semantic_score: result.semanticScore,
      diff_summary: result.diffSummary,
      replay_prompt: result.replayPrompt,
      replay_model: result.replayModel,
      replay_system_prompt: result.replaySystemPrompt,
      status: result.status,
      error_message: result.errorMessage,
      created_at: result.createdAt,
    }));

    return c.json({
      data: formattedResults,
      pagination: {
        total: results.length,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < results.length,
      },
    });
  } catch (error) {
    console.error('Error generating diff:', error);
    return c.json(
      {
        error: 'Failed to generate diff',
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
    const db = getDatabase();
    const { status, limit, offset } = c.req.query();

    const limitNum = limit ? parseInt(limit) : 50;
    const offsetNum = offset ? parseInt(offset) : 0;

    const replaySets = await getAllReplaySets(db, {
      status,
      limit: limitNum,
      offset: offsetNum,
    });

    // Get total count for pagination
    // Note: getAllReplaySets returns all matching sets, so length is the count
    // For proper pagination, we should query count separately, but for now use length
    const total = replaySets.length;

    // Convert to snake_case for dashboard compatibility
    const formattedReplaySets = replaySets.map((set) => ({
      replay_id: set.replayId,
      name: set.name,
      description: set.description,
      trace_ids: set.traceIds,
      created_at: set.createdAt,
      created_by: set.createdBy,
      status: set.status,
      total_traces: set.totalTraces,
      completed_traces: set.completedTraces,
      started_at: set.startedAt,
      completed_at: set.completedAt,
      error_message: set.errorMessage,
      metadata: set.metadata,
    }));

    return c.json({
      data: formattedReplaySets,
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + replaySets.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching replay sets:', error);
    return c.json(
      {
        error: 'Failed to fetch replay sets',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * DELETE /replay/:id
 * Delete a replay set and its results
 */
app.delete('/:id', async (c) => {
  try {
    const replayId = c.req.param('id');
    const db = getDatabase();

    // Check if replay set exists
    const replaySet = await getReplaySet(db, replayId);

    if (!replaySet) {
      return c.json({ error: 'Replay set not found' }, 404);
    }

    // Delete replay set (cascades to results)
    await deleteReplaySet(db, replayId);

    return c.json({
      success: true,
      message: 'Replay set deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting replay set:', error);
    return c.json(
      {
        error: 'Failed to delete replay set',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default app;
