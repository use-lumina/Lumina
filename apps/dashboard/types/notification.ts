export interface Alert {
  alert_id: string;
  alert_type: string;
  timestamp: string;
  reasoning?: string;
  message?: string;
  // Add any other properties that an alert object might have
}

export interface NotificationData {
  pagination: {
    total: number;
    // Potentially other pagination-related properties like limit, offset, etc.
  };
  data: Alert[];
}
