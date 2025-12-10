/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Intelligent Tool Selection System - Core Types and Interfaces
 * MIT License
 */

export interface ToolIntelligenceMetadata {
  name: string
  description: string
  capabilities: string[]
  domains: string[]  // e.g., "web-scraping", "file-operations", "data-analysis"
  complexity: "low" | "medium" | "high" | "variable"
  reliability: number  // 0-1 score based on success rates
  typicalUseCases: string[]
  prerequisites: string[]
  alternatives: string[]
  performanceMetrics: PerformanceMetrics
  contextualRelevance: ContextualRelevance
  mcpServer?: string  // For MCP tools
  inputSchema?: any
  outputSchema?: any
}

export interface PerformanceMetrics {
  avgExecutionTime: number
  successRate: number
  errorPatterns: string[]
  lastUsed: number
  usageCount: number
}

export interface ContextualRelevance {
  projectTypes: string[]
  filePatterns: string[]
  dependencies: string[]
  technologies: string[]
}

export interface ToolPerformanceRecord {
  toolName: string
  timestamp: number
  executionTime: number
  success: boolean
  error?: string
  context: TaskContext
  userInput: string
  outputQuality: number
}

export interface TaskContext {
  userRequest: string
  projectType: string
  technologies: string[]
  fileStructure: FileStructureMemory
  recentActivity: ActivityRecord[]
  userPreferences: UserPreferences
  sessionHistory: SessionRecord[]
}

export interface FileStructureMemory {
  importantFiles: string[]
  frequentlyModified: string[]
  filePurposes: Record<string, string>
  directories: string[]
  entryPoints: string[]
}

export interface ActivityRecord {
  type: "tool_use" | "file_edit" | "command_execution" | "conversation"
  timestamp: number
  description: string
  success: boolean
  duration?: number
}

export interface UserPreferences {
  codingStyle: string
  commentingStyle: string
  namingConventions: string[]
  preferredLibraries: string[]
  avoidancePatterns: string[]
  communicationStyle: string
}

export interface SessionRecord {
  id: string
  startTime: number
  endTime?: number
  tasks: string[]
  toolsUsed: string[]
  success: boolean
}

export interface ToolScore {
  toolName: string
  score: number
  confidence: number
  reasoning: string[]
  factors: {
    relevanceMatch: number
    performanceScore: number
    contextFit: number
    reliabilityScore: number
    userPreferenceScore: number
  }
}

export interface ToolRecommendation {
  tool: ToolIntelligenceMetadata
  score: number
  confidence: number
  reasoning: string
  alternativeOptions: ToolRecommendation[]
  prerequisites: string[]
  estimatedExecutionTime: number
  riskAssessment: "low" | "medium" | "high"
}

export interface RecommendationRequest {
  taskDescription: string
  projectContext: ProjectContext
  availableTools: string[]
  constraints?: {
    maxComplexity?: "low" | "medium" | "high"
    preferredDomains?: string[]
    excludeTools?: string[]
    timeLimit?: number
  }
}

export interface ProjectContext {
  projectPath: string
  projectType: string
  technologies: string[]
  frameworks: string[]
  dependencies: Record<string, string>
  buildTools: string[]
  testingFrameworks: string[]
  codingStandards: string[]
  architecture: string[]
}

export interface ToolSelectionPattern {
  id: string
  taskPattern: string
  selectedTools: string[]
  success: boolean
  executionTime: number
  userFeedback?: "positive" | "negative" | "neutral"
  context: TaskContext
  createdAt: number
}

export interface ToolSelectionInsight {
  pattern: string
  recommendation: string
  confidence: number
  supportingEvidence: ToolSelectionPattern[]
}

export interface ValidationResult {
  isValid: boolean
  confidence: number
  issues: string[]
  suggestions: string[]
}

export interface CachedRecommendation {
  taskHash: string
  recommendations: ToolRecommendation[]
  timestamp: number
  hitCount: number
}

export interface PerformanceInsight {
  type: "performance_degradation" | "usage_pattern" | "error_trend" | "optimization_opportunity"
  severity: "low" | "medium" | "high"
  description: string
  recommendation: string
  data: any
}

export interface ToolExecutionContext {
  toolName: string
  executionTime: number
  success: boolean
  error?: string
  context: TaskContext
  userInput: string
  output?: any
}

export interface ProcessingTask {
  id: string
  type: "performance_update" | "pattern_analysis" | "learning" | "cache_cleanup"
  priority: number
  data: any
  createdAt: number
}

export interface PerformanceUpdate {
  toolName: string
  record: ToolPerformanceRecord
}

export interface UserFeedback {
  toolName: string
  taskId: string
  rating: number  // 1-5
  comment?: string
  timestamp: number
}

export interface ABTestConfig {
  testName: string
  controlGroup: string
  variantGroup: string
  trafficSplit: number  // 0-1, percentage for control group
  metrics: string[]
  duration: number  // in days
}

export interface ABTestResult {
  testName: string
  winner: "control" | "variant" | "inconclusive"
  confidence: number
  metrics: Record<string, {
    control: number
    variant: number
    improvement: number
    significance: number
  }>
  recommendations: string[]
}

export interface HealthReport {
  overallStatus: "healthy" | "degraded" | "critical"
  recommendationQuality: number
  systemPerformance: number
  learningEffectiveness: number
  userSatisfaction: number
  issues: string[]
  recommendations: string[]
  lastUpdated: number
}

export interface ComparisonResult {
  controlTools: ToolRecommendation[]
  variantTools: ToolRecommendation[]
  overlapScore: number
  differences: string[]
  recommendation: "control" | "variant" | "inconclusive"
  confidence: number
}

export interface WorkflowPlan {
  id: string
  description: string
  steps: WorkflowStep[]
  estimatedTotalTime: number
  confidence: number
  riskAssessment: "low" | "medium" | "high"
  alternativePlans: WorkflowPlan[]
}

export interface WorkflowStep {
  id: string
  toolName: string
  description: string
  inputRequirements: string[]
  outputExpectations: string[]
  dependencies: string[]  // IDs of steps this depends on
  estimatedTime: number
  confidence: number
  riskLevel: "low" | "medium" | "high"
  rollbackStrategy?: string
}

export interface DependencyGraph {
  nodes: Map<string, WorkflowStep>
  edges: Map<string, string[]>  // stepId -> dependent step IDs
  cycles: string[][]
}

export interface CompositionStrategy {
  name: string
  description: string
  适用条件: string[]
  toolSelectionLogic: (context: TaskContext, tools: ToolIntelligenceMetadata[]) => Promise<ToolRecommendation[]>
  workflowGeneration: (selectedTools: ToolRecommendation[], context: TaskContext) => Promise<WorkflowPlan>
}

// ============================================================================
// MCP Server Intelligence Types
// ============================================================================

/**
 * Intelligence metadata for an MCP server
 * Extends tool intelligence to server-level capabilities
 */
export interface McpServerIntelligence {
  serverName: string
  description: string
  capabilities: string[]  // Inferred from tools: ["documentation", "web-scraping", "file-operations"]
  domains: string[]  // Broader categories: ["development", "research", "automation"]
  confidence: number  // 0-1 confidence in capability inference
  toolCount: number
  resourceCount: number
  performanceMetrics: McpServerPerformanceMetrics
  useCasePatterns: string[]  // Common use cases: ["API documentation lookup", "code search"]
  keywords: string[]  // Keywords for matching: ["docs", "api", "reference", "search"]
  status: "connected" | "connecting" | "disconnected"
  lastUsed?: number
}

/**
 * Performance metrics specific to MCP servers
 */
export interface McpServerPerformanceMetrics {
  avgResponseTime: number
  successRate: number
  errorRate: number
  timeoutRate: number
  totalRequests: number
  failedRequests: number
  lastSuccessTime?: number
  lastFailureTime?: number
  consecutiveFailures: number  // For fallback logic
}

/**
 * Recommendation for using an MCP server
 */
export interface McpServerRecommendation {
  server: McpServerIntelligence
  score: number  // 0-1 relevance score
  confidence: number  // 0-1 confidence in recommendation
  reasoning: string[]  // Why this server is recommended
  suggestedTools: string[]  // Specific tools to use from this server
  alternatives: McpServerRecommendation[]  // Fallback options
  riskAssessment: "low" | "medium" | "high"
  estimatedResponseTime: number
}

/**
 * Context for scoring MCP servers
 */
export interface McpServerScoringContext {
  userRequest: string
  taskType: string  // "documentation_lookup", "file_operation", "web_scraping", etc.
  keywords: string[]  // Extracted keywords from user request
  projectContext: ProjectContext
  previousFailures: string[]  // Names of servers that failed recently
  urgency: "low" | "medium" | "high"  // Affects timeout tolerance
}

/**
 * Result of attempting to use an MCP server
 */
export interface McpServerUsageResult {
  serverName: string
  toolName: string
  success: boolean
  responseTime: number
  error?: string
  errorType?: "timeout" | "connection" | "tool_error" | "invalid_response"
  timestamp: number
  retryAttempt: number
}

/**
 * Fallback strategy for MCP server failures
 */
export interface McpServerFallbackStrategy {
  primaryServer: string
  fallbackServers: string[]  // Ordered by preference
  maxRetries: number
  retryDelay: number  // milliseconds
  timeoutThreshold: number  // milliseconds
  shouldFallback: (result: McpServerUsageResult) => boolean
}

/**
 * Pattern for learning MCP server usage
 */
export interface McpServerUsagePattern {
  id: string
  taskPattern: string  // Regex or description of task type
  preferredServer: string
  successRate: number
  avgResponseTime: number
  sampleSize: number
  lastUpdated: number
  context: {
    projectTypes: string[]
    keywords: string[]
    domains: string[]
  }
}

/**
 * Capability mapping for automatic inference
 */
export interface CapabilityMapping {
  capability: string
  keywords: string[]  // Keywords that indicate this capability
  toolNamePatterns: string[]  // Regex patterns for tool names
  descriptionPatterns: string[]  // Regex patterns for descriptions
  confidence: number  // Base confidence for this mapping
}

