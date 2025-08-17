/**
 * Security Types for AAABuilder
 * Defines authentication, authorization, and security-related interfaces
 */

// Authentication Types
export interface AuthConfig {
  enableAuth: boolean;
  jwtSecret: string;
  apiKeys: string[];
  sessionSecret?: string;
  encryptionKey?: string;
  tokenExpiry?: string;
  refreshTokenExpiry?: string;
}

export interface AuthUser {
  id: string;
  type: 'api-key' | 'jwt' | 'session';
  permissions: Permission[];
  metadata?: Record<string, any>;
  createdAt: Date;
  lastLogin?: Date;
}

export interface AuthToken {
  token: string;
  type: 'access' | 'refresh';
  expiresAt: Date;
  userId: string;
  permissions: Permission[];
}

export interface LoginRequest {
  apiKey?: string;
  username?: string;
  password?: string;
  refreshToken?: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  user?: AuthUser;
  expiresIn?: number;
  error?: string;
}

// Authorization Types
export interface Permission {
  resource: string;
  action: PermissionAction;
  conditions?: PermissionCondition[];
}

export type PermissionAction = 
  | 'read' | 'write' | 'execute' | 'delete' | 'admin'
  | 'agents:read' | 'agents:write' | 'agents:execute' | 'agents:delete'
  | 'providers:read' | 'providers:write' | 'providers:configure'
  | 'system:read' | 'system:write' | 'system:admin';

export interface PermissionCondition {
  field: string;
  operator: 'eq' | 'ne' | 'in' | 'nin' | 'gt' | 'lt' | 'gte' | 'lte';
  value: any;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  inherits?: string[];
}

// Security Configuration
export interface SecurityConfig {
  auth: AuthConfig;
  cors: CorsConfig;
  rateLimit: RateLimitConfig;
  encryption: EncryptionConfig;
  audit: AuditConfig;
}

export interface CorsConfig {
  origin: string[] | string | boolean;
  credentials: boolean;
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders?: string[];
  maxAge?: number;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  saltLength: number;
  iterations: number;
}

export interface AuditConfig {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logActions: AuditAction[];
  retention: number; // days
  storage: 'file' | 'database' | 'external';
}

export type AuditAction = 
  | 'login' | 'logout' | 'agent_execute' | 'agent_create' | 'agent_update' | 'agent_delete'
  | 'provider_configure' | 'system_config' | 'api_access' | 'error' | 'security_event';

// Audit and Logging
export interface AuditLog {
  id: string;
  timestamp: Date;
  userId?: string;
  action: AuditAction;
  resource: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
}

export interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  details: Record<string, any>;
  resolved: boolean;
  resolvedAt?: Date;
}

export type SecurityEventType = 
  | 'failed_login' | 'brute_force' | 'invalid_token' | 'permission_denied'
  | 'rate_limit_exceeded' | 'suspicious_activity' | 'data_breach' | 'system_compromise';

// Encryption and Secrets
export interface EncryptedData {
  data: string;
  iv: string;
  salt: string;
  algorithm: string;
  keyId?: string;
}

export interface SecretManager {
  encrypt(data: string, keyId?: string): Promise<EncryptedData>;
  decrypt(encryptedData: EncryptedData): Promise<string>;
  generateKey(keyId: string): Promise<string>;
  rotateKey(keyId: string): Promise<void>;
  deleteKey(keyId: string): Promise<void>;
}

export interface VaultConfig {
  type: 'env' | 'file' | 'hashicorp' | 'aws' | 'azure' | 'gcp';
  url?: string;
  token?: string;
  namespace?: string;
  path?: string;
  options?: Record<string, any>;
}

// API Security
export interface ApiKeyConfig {
  key: string;
  name: string;
  permissions: Permission[];
  rateLimit?: RateLimitConfig;
  ipWhitelist?: string[];
  expiresAt?: Date;
  createdAt: Date;
  lastUsed?: Date;
}

export interface RequestContext {
  user?: AuthUser;
  permissions: Permission[];
  ipAddress: string;
  userAgent: string;
  requestId: string;
  timestamp: Date;
}

// Security Middleware Types
export interface SecurityMiddleware {
  authenticate(req: any, res: any, next: any): Promise<void>;
  authorize(permissions: Permission[]): (req: any, res: any, next: any) => Promise<void>;
  rateLimit(config?: RateLimitConfig): (req: any, res: any, next: any) => void;
  audit(action: AuditAction): (req: any, res: any, next: any) => void;
}

// Security Validation
export interface SecurityValidator {
  validateApiKey(key: string): Promise<boolean>;
  validateToken(token: string): Promise<AuthUser | null>;
  validatePermissions(user: AuthUser, required: Permission[]): boolean;
  validateRequest(req: any): Promise<RequestContext>;
}

// Security Monitoring
export interface SecurityMonitor {
  logEvent(event: SecurityEvent): Promise<void>;
  detectAnomalies(context: RequestContext): Promise<SecurityEvent[]>;
  generateReport(timeRange: TimeRange): Promise<SecurityReport>;
  getMetrics(): Promise<SecurityMetrics>;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface SecurityReport {
  timeRange: TimeRange;
  totalRequests: number;
  failedLogins: number;
  securityEvents: SecurityEvent[];
  topUsers: UserActivity[];
  topEndpoints: EndpointActivity[];
  recommendations: string[];
}

export interface UserActivity {
  userId: string;
  requestCount: number;
  lastActivity: Date;
  failedAttempts: number;
}

export interface EndpointActivity {
  endpoint: string;
  requestCount: number;
  errorRate: number;
  avgResponseTime: number;
}

export interface SecurityMetrics {
  activeUsers: number;
  totalApiKeys: number;
  requestsPerMinute: number;
  errorRate: number;
  securityEvents: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}