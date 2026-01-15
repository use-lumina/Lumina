/**
 * Webhook Delivery System
 * Sends alerts to Slack, Discord, and PagerDuty with retry logic
 */

import type { Alert } from './alert-engine';

export interface WebhookConfig {
  slackWebhookUrl?: string;
  discordWebhookUrl?: string;
  pagerdutyIntegrationKey?: string;
  pagerdutyApiUrl?: string;
  dashboardUrl?: string;
  maxRetries?: number;
  retryDelayMs?: number;
}

const DEFAULT_CONFIG: WebhookConfig = {
  maxRetries: 3,
  retryDelayMs: 1000,
  pagerdutyApiUrl: 'https://events.pagerduty.com/v2/enqueue',
  dashboardUrl: 'http://localhost:3000',
};

/**
 * Send alert to all configured webhook channels
 */
export async function sendAlert(
  alert: Alert,
  config: WebhookConfig = {}
): Promise<{
  slack: { success: boolean; error?: string };
  discord: { success: boolean; error?: string };
  pagerduty: { success: boolean; error?: string };
}> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const results = await Promise.allSettled([
    cfg.slackWebhookUrl
      ? sendSlackAlert(alert, cfg.slackWebhookUrl, cfg)
      : Promise.resolve({ success: false, error: 'Not configured' }),
    cfg.discordWebhookUrl
      ? sendDiscordAlert(alert, cfg.discordWebhookUrl, cfg)
      : Promise.resolve({ success: false, error: 'Not configured' }),
    cfg.pagerdutyIntegrationKey
      ? sendPagerDutyAlert(alert, cfg.pagerdutyIntegrationKey, cfg)
      : Promise.resolve({ success: false, error: 'Not configured' }),
  ]);

  return {
    slack:
      results[0].status === 'fulfilled' ? results[0].value : { success: false, error: 'Failed' },
    discord:
      results[1].status === 'fulfilled' ? results[1].value : { success: false, error: 'Failed' },
    pagerduty:
      results[2].status === 'fulfilled' ? results[2].value : { success: false, error: 'Failed' },
  };
}

/**
 * Send alert to Slack with rich formatting
 */
async function sendSlackAlert(
  alert: Alert,
  webhookUrl: string,
  config: WebhookConfig
): Promise<{ success: boolean; error?: string }> {
  const payload = formatSlackAlert(alert, config.dashboardUrl || DEFAULT_CONFIG.dashboardUrl!);

  return sendWithRetry(
    webhookUrl,
    payload,
    config.maxRetries || DEFAULT_CONFIG.maxRetries!,
    config.retryDelayMs || DEFAULT_CONFIG.retryDelayMs!
  );
}

/**
 * Format alert for Slack
 */
export function formatSlackAlert(alert: Alert, dashboardUrl: string): object {
  const emoji = getSeverityEmoji(alert.severity);
  const color = getSeverityColor(alert.severity);
  const alertTypeLabel = alert.alertType.replace(/_/g, ' ').toUpperCase();

  const blocks: any[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${emoji} ${alertTypeLabel} Alert`,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Service:*\n\`${alert.details.serviceName}\``,
        },
        {
          type: 'mrkdwn',
          text: `*Endpoint:*\n\`${alert.details.endpoint}\``,
        },
        {
          type: 'mrkdwn',
          text: `*Severity:*\n${alert.severity}`,
        },
        {
          type: 'mrkdwn',
          text: `*Model:*\n${alert.details.model || 'N/A'}`,
        },
      ],
    },
  ];

  // Cost spike details
  if (alert.alertType === 'cost_spike' || alert.alertType === 'cost_and_quality') {
    if (
      alert.details.currentCost !== undefined &&
      alert.details.costIncreasePercent !== undefined
    ) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Cost Spike:*\n• Current: $${alert.details.currentCost.toFixed(4)}\n• Baseline: $${alert.details.baselineCost?.toFixed(4) || 'N/A'}\n• Increase: ${alert.details.costIncreasePercent.toFixed(1)}%`,
        },
      });
    }
  }

  // Quality drop details
  if (alert.alertType === 'quality_drop' || alert.alertType === 'cost_and_quality') {
    const qualityText: string[] = [];

    if (alert.details.hashSimilarity !== undefined) {
      qualityText.push(`• Hash Similarity: ${(alert.details.hashSimilarity * 100).toFixed(1)}%`);
    }

    if (alert.details.semanticScore !== undefined) {
      qualityText.push(
        `• Semantic Score: ${(alert.details.semanticScore * 100).toFixed(1)}%${alert.details.cached ? ' (cached)' : ''}`
      );
    }

    if (alert.details.scoringMethod) {
      qualityText.push(
        `• Method: ${alert.details.scoringMethod === 'hash_only' ? 'Structural' : alert.details.scoringMethod === 'semantic' ? 'Semantic' : 'Hybrid'}`
      );
    }

    if (qualityText.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Quality Analysis:*\n${qualityText.join('\n')}`,
        },
      });
    }
  }

  // Reasoning
  if (alert.details.reasoning) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Analysis:*\n${alert.details.reasoning}`,
      },
    });
  }

  // Action buttons
  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'View Trace',
          emoji: true,
        },
        url: `${dashboardUrl}/traces/${alert.traceId}`,
        action_id: 'view_trace',
      },
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'View Dashboard',
          emoji: true,
        },
        url: dashboardUrl,
        action_id: 'view_dashboard',
      },
    ],
  });

  return {
    blocks,
    attachments: [
      {
        color,
        fallback: `${alertTypeLabel} Alert: ${alert.details.serviceName}/${alert.details.endpoint}`,
      },
    ],
  };
}

/**
 * Send alert to Discord with embedded message
 */
async function sendDiscordAlert(
  alert: Alert,
  webhookUrl: string,
  config: WebhookConfig
): Promise<{ success: boolean; error?: string }> {
  const payload = formatDiscordAlert(alert, config.dashboardUrl || DEFAULT_CONFIG.dashboardUrl!);

  return sendWithRetry(
    webhookUrl,
    payload,
    config.maxRetries || DEFAULT_CONFIG.maxRetries!,
    config.retryDelayMs || DEFAULT_CONFIG.retryDelayMs!
  );
}

/**
 * Format alert for Discord
 */
export function formatDiscordAlert(alert: Alert, dashboardUrl: string): object {
  const emoji = getSeverityEmoji(alert.severity);
  const color = getDiscordColor(alert.severity);
  const alertTypeLabel = alert.alertType.replace(/_/g, ' ').toUpperCase();

  const fields: any[] = [
    {
      name: 'Service',
      value: `\`${alert.details.serviceName}\``,
      inline: true,
    },
    {
      name: 'Endpoint',
      value: `\`${alert.details.endpoint}\``,
      inline: true,
    },
    {
      name: 'Severity',
      value: alert.severity,
      inline: true,
    },
  ];

  if (alert.details.model) {
    fields.push({
      name: 'Model',
      value: alert.details.model,
      inline: true,
    });
  }

  // Cost spike details
  if (alert.alertType === 'cost_spike' || alert.alertType === 'cost_and_quality') {
    if (
      alert.details.currentCost !== undefined &&
      alert.details.costIncreasePercent !== undefined
    ) {
      fields.push({
        name: 'Cost Spike',
        value: `Current: $${alert.details.currentCost.toFixed(4)}\nBaseline: $${alert.details.baselineCost?.toFixed(4) || 'N/A'}\nIncrease: ${alert.details.costIncreasePercent.toFixed(1)}%`,
        inline: false,
      });
    }
  }

  // Quality drop details
  if (alert.alertType === 'quality_drop' || alert.alertType === 'cost_and_quality') {
    const qualityLines: string[] = [];

    if (alert.details.hashSimilarity !== undefined) {
      qualityLines.push(`Hash: ${(alert.details.hashSimilarity * 100).toFixed(1)}%`);
    }

    if (alert.details.semanticScore !== undefined) {
      qualityLines.push(
        `Semantic: ${(alert.details.semanticScore * 100).toFixed(1)}%${alert.details.cached ? ' (cached)' : ''}`
      );
    }

    if (qualityLines.length > 0) {
      fields.push({
        name: 'Quality Analysis',
        value: qualityLines.join('\n'),
        inline: false,
      });
    }
  }

  const embed = {
    title: `${emoji} ${alertTypeLabel} Alert`,
    description: alert.details.reasoning || 'Alert triggered',
    color,
    fields,
    timestamp: alert.timestamp.toISOString(),
    footer: {
      text: `Alert ID: ${alert.alertId}`,
    },
  };

  return {
    embeds: [embed],
    components: [
      {
        type: 1, // Action Row
        components: [
          {
            type: 2, // Button
            label: 'View Trace',
            style: 5, // Link
            url: `${dashboardUrl}/traces/${alert.traceId}`,
          },
          {
            type: 2,
            label: 'View Dashboard',
            style: 5,
            url: dashboardUrl,
          },
        ],
      },
    ],
  };
}

/**
 * Send alert to PagerDuty
 */
async function sendPagerDutyAlert(
  alert: Alert,
  integrationKey: string,
  config: WebhookConfig
): Promise<{ success: boolean; error?: string }> {
  const payload = formatPagerDutyAlert(alert, integrationKey);
  const apiUrl = config.pagerdutyApiUrl || DEFAULT_CONFIG.pagerdutyApiUrl!;

  return sendWithRetry(
    apiUrl,
    payload,
    config.maxRetries || DEFAULT_CONFIG.maxRetries!,
    config.retryDelayMs || DEFAULT_CONFIG.retryDelayMs!
  );
}

/**
 * Format alert for PagerDuty Events API v2
 */
export function formatPagerDutyAlert(alert: Alert, integrationKey: string): object {
  const alertTypeLabel = alert.alertType.replace(/_/g, ' ').toUpperCase();

  const customDetails: any = {
    service_name: alert.details.serviceName,
    endpoint: alert.details.endpoint,
    trace_id: alert.traceId,
    alert_type: alert.alertType,
  };

  if (alert.details.currentCost !== undefined) {
    customDetails.current_cost = alert.details.currentCost;
    customDetails.cost_increase_percent = alert.details.costIncreasePercent;
  }

  if (alert.details.semanticScore !== undefined) {
    customDetails.semantic_score = alert.details.semanticScore;
    customDetails.hash_similarity = alert.details.hashSimilarity;
  }

  return {
    routing_key: integrationKey,
    event_action: 'trigger',
    dedup_key: alert.alertId,
    payload: {
      summary: `${alertTypeLabel}: ${alert.details.serviceName}/${alert.details.endpoint}`,
      severity: mapSeverityToPagerDuty(alert.severity),
      source: 'lumina',
      timestamp: alert.timestamp.toISOString(),
      custom_details: customDetails,
    },
    links: [
      {
        href: `http://localhost:3000/traces/${alert.traceId}`,
        text: 'View Trace',
      },
    ],
  };
}

/**
 * Send HTTP request with exponential backoff retry
 */
async function sendWithRetry(
  url: string,
  payload: object,
  maxRetries: number,
  baseDelayMs: number
): Promise<{ success: boolean; error?: string }> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return { success: true };
      }

      const errorText = await response.text();

      // Don't retry on 4xx errors (except 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      // Retry on 5xx or 429
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }

      return {
        success: false,
        error: `HTTP ${response.status} after ${maxRetries} retries: ${errorText}`,
      };
    } catch (error) {
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}

/**
 * Helper functions
 */

function getSeverityEmoji(severity: string): string {
  switch (severity) {
    case 'HIGH':
      return '🚨';
    case 'MEDIUM':
      return '⚠️';
    case 'LOW':
      return 'ℹ️';
    default:
      return '📊';
  }
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'HIGH':
      return '#d32f2f'; // Red
    case 'MEDIUM':
      return '#ff9800'; // Orange
    case 'LOW':
      return '#2196f3'; // Blue
    default:
      return '#9e9e9e'; // Grey
  }
}

function getDiscordColor(severity: string): number {
  switch (severity) {
    case 'HIGH':
      return 0xd32f2f; // Red
    case 'MEDIUM':
      return 0xff9800; // Orange
    case 'LOW':
      return 0x2196f3; // Blue
    default:
      return 0x9e9e9e; // Grey
  }
}

function mapSeverityToPagerDuty(severity: string): string {
  switch (severity) {
    case 'HIGH':
      return 'critical';
    case 'MEDIUM':
      return 'warning';
    case 'LOW':
      return 'info';
    default:
      return 'info';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
