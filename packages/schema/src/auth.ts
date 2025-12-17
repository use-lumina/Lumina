import { z } from 'zod';

/**
 * API Key Schema
 * Represents an API key for SDK authentication
 */
export const ApiKeySchema = z.object({
  api_key: z.string().regex(/^lumina_(live|test)_[a-zA-Z0-9]{32}$/),
  customer_id: z.string().min(1),
  environment: z.enum(['live', 'test']),

  // Metadata
  name: z.string().optional(), // User-friendly name like "Production Key"
  description: z.string().optional(),

  // Status
  is_active: z.boolean().default(true),
  created_at: z.coerce.date(),
  last_used_at: z.coerce.date().optional(),
  expires_at: z.coerce.date().optional(),

  // Rate limiting
  rate_limit_per_minute: z.number().int().positive().default(1000),

  // Permissions (for future RBAC)
  permissions: z.array(z.string()).optional(),
});

export type ApiKey = z.infer<typeof ApiKeySchema>;

/**
 * Customer Schema
 * Represents a customer account (tenant)
 */
export const CustomerSchema = z.object({
  customer_id: z.string().min(1),
  customer_name: z.string().min(1),

  // Contact
  email: z.string().email(),
  company: z.string().optional(),

  // Plan
  plan: z.enum(['free', 'starter', 'pro', 'enterprise']).default('free'),
  status: z.enum(['active', 'suspended', 'cancelled']).default('active'),

  // Limits
  monthly_trace_limit: z.number().int().positive().default(100000),
  retention_days: z.number().int().positive().default(7),

  // Metadata
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  metadata: z.record(z.unknown()).optional(),
});

export type Customer = z.infer<typeof CustomerSchema>;

/**
 * User Schema
 * Represents a user that can log into the dashboard
 */
export const UserSchema = z.object({
  user_id: z.string().min(1),
  customer_id: z.string().min(1), // Links to customer

  // Identity
  email: z.string().email(),
  name: z.string().min(1),
  password_hash: z.string().optional(), // bcrypt hash

  // Status
  is_active: z.boolean().default(true),
  email_verified: z.boolean().default(false),

  // Role (for future team management)
  role: z.enum(['owner', 'admin', 'developer', 'viewer']).default('owner'),

  // Timestamps
  created_at: z.coerce.date(),
  last_login_at: z.coerce.date().optional(),
});

export type User = z.infer<typeof UserSchema>;

/**
 * Session/JWT Token Payload Schema
 */
export const TokenPayloadSchema = z.object({
  user_id: z.string().min(1),
  customer_id: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['owner', 'admin', 'developer', 'viewer']),

  // Standard JWT claims
  iat: z.number().int().positive(), // Issued at
  exp: z.number().int().positive(), // Expires at
});

export type TokenPayload = z.infer<typeof TokenPayloadSchema>;

/**
 * Authentication Request Schemas
 */
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  success: z.boolean(),
  token: z.string().optional(), // JWT token
  user: UserSchema.omit({ password_hash: true }).optional(),
  error: z.string().optional(),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

/**
 * API Key Creation Request
 */
export const CreateApiKeyRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  environment: z.enum(['live', 'test']),
  expires_at: z.coerce.date().optional(),
  rate_limit_per_minute: z.number().int().positive().default(1000),
});

export type CreateApiKeyRequest = z.infer<typeof CreateApiKeyRequestSchema>;

export const CreateApiKeyResponseSchema = z.object({
  success: z.boolean(),
  api_key: z.string().optional(), // Only shown once!
  key_id: z.string().optional(),
  error: z.string().optional(),
});

export type CreateApiKeyResponse = z.infer<typeof CreateApiKeyResponseSchema>;

/**
 * Authenticated Request Context
 * Injected into request context by auth middleware
 */
export const AuthContextSchema = z.object({
  customer_id: z.string().min(1),
  environment: z.enum(['live', 'test']),
  api_key: z.string().optional(),
  user_id: z.string().optional(),
  role: z.enum(['owner', 'admin', 'developer', 'viewer']).optional(),
});

export type AuthContext = z.infer<typeof AuthContextSchema>;
