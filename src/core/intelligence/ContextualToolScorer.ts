/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Intelligent Tool Selection System - Contextual Tool Scorer
 * MIT License
 */

import {
  ToolIntelligenceMetadata,
  TaskContext,
  ToolScore,
  ToolPerformanceRecord,
  UserPreferences,
  ActivityRecord
} from "./types"
import { ToolIntelligenceRegistry } from "./ToolIntelligenceRegistry"
import { MemoryManager } from "../memory/MemoryManager"

export class ContextualToolScorer {
  constructor(
    private toolRegistry: ToolIntelligenceRegistry,
    private memoryManager: MemoryManager
  ) {}

  /**
   * Score tools based on task context and multiple factors
   */
  async scoreTools(taskContext: TaskContext, candidateTools: string[]): Promise<ToolScore[]> {
    const scores: ToolScore[] = []

    for (const toolName of candidateTools) {
      const toolMetadata = await this.toolRegistry.getToolMetadata(toolName)
      if (!toolMetadata) {continue}

      const score = await this.calculateToolScore(toolMetadata, taskContext)
      scores.push(score)
    }

    // Sort by score (descending) and confidence (descending)
    return scores.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score
      }
      return b.confidence - a.confidence
    })
  }

  /**
   * Calculate comprehensive score for a single tool
   */
  private async calculateToolScore(
    tool: ToolIntelligenceMetadata,
    context: TaskContext
  ): Promise<ToolScore> {
    const relevanceMatch = await this.calculateRelevanceMatch(tool, context)
    const performanceScore = await this.calculatePerformanceScore(tool.name, context)
    const contextFit = await this.calculateContextFit(tool, context)
    const reliabilityScore = this.calculateReliabilityScore(tool)
    const userPreferenceScore = await this.calculateUserPreferenceScore(tool.name, context)

    // Calculate weighted final score
    const weights = {
      relevance: 0.35,
      performance: 0.25,
      context: 0.20,
      reliability: 0.15,
      userPreference: 0.05
    }

    const finalScore = 
      relevanceMatch * weights.relevance +
      performanceScore * weights.performance +
      contextFit * weights.context +
      reliabilityScore * weights.reliability +
      userPreferenceScore * weights.userPreference

    // Calculate confidence based on data availability and consistency
    const confidence = this.calculateConfidence(tool, {
      relevanceMatch,
      performanceScore,
      contextFit,
      reliabilityScore,
      userPreferenceScore
    })

    // Generate reasoning
    const reasoning = this.generateReasoning(tool, context, {
      relevanceMatch,
      performanceScore,
      contextFit,
      reliabilityScore,
      userPreferenceScore
    })

    return {
      toolName: tool.name,
      score: Math.min(finalScore, 1.0),
      confidence,
      reasoning,
      factors: {
        relevanceMatch,
        performanceScore,
        contextFit,
        reliabilityScore,
        userPreferenceScore
      }
    }
  }

  /**
   * Calculate how well the tool matches the task requirements
   */
  async calculateRelevanceMatch(tool: ToolIntelligenceMetadata, context: TaskContext): Promise<number> {
    let score = 0
    const requestLower = context.userRequest.toLowerCase()

    // Direct capability matching (highest weight)
    for (const capability of tool.capabilities) {
      if (requestLower.includes(capability.toLowerCase())) {
        score += 0.4
      }
    }

    // Domain matching
    for (const domain of tool.domains) {
      if (requestLower.includes(domain.toLowerCase())) {
        score += 0.3
      }
    }

    // Use case matching
    for (const useCase of tool.typicalUseCases) {
      if (requestLower.includes(useCase.toLowerCase())) {
        score += 0.2
      }
    }

    // Technology matching
    const techMatches = context.technologies.filter(tech => 
      tool.contextualRelevance.technologies.includes(tech)
    ).length
    if (techMatches > 0) {
      score += 0.1 * (techMatches / Math.max(context.technologies.length, 1))
    }

    // Project type matching
    if (tool.contextualRelevance.projectTypes.includes("all") || 
        tool.contextualRelevance.projectTypes.includes(context.projectType)) {
      score += 0.2
    }

    return Math.min(score, 1.0)
  }

  /**
   * Calculate performance score based on historical data
   */
  async calculatePerformanceScore(toolName: string, context: TaskContext): Promise<number> {
    const toolMetadata = await this.toolRegistry.getToolMetadata(toolName)
    if (!toolMetadata) {return 0}

    const metrics = toolMetadata.performanceMetrics
    
    // Base score from success rate
    let score = metrics.successRate * 0.6

    // Execution time factor (faster is better, but not too fast to indicate simplicity)
    const optimalTime = this.getOptimalExecutionTime(toolName)
    const timeFactor = Math.max(0, 1 - Math.abs(metrics.avgExecutionTime - optimalTime) / optimalTime)
    score += timeFactor * 0.2

    // Usage frequency (more used tools are generally more reliable)
    const usageFactor = Math.min(1, metrics.usageCount / 50) // Normalize to 50 uses as max
    score += usageFactor * 0.1

    // Recency factor (recently used tools are more relevant)
    const daysSinceLastUsed = (Date.now() - metrics.lastUsed) / (1000 * 60 * 60 * 24)
    const recencyFactor = Math.max(0, 1 - daysSinceLastUsed / 30) // Decay over 30 days
    score += recencyFactor * 0.1

    return Math.min(score, 1.0)
  }

  /**
   * Calculate how well the tool fits the current context
   */
  async calculateContextFit(tool: ToolIntelligenceMetadata, context: TaskContext): Promise<number> {
    let score = 0

    // File structure relevance
    if (context.fileStructure.importantFiles.length > 0) {
      const fileMatches = tool.contextualRelevance.filePatterns.some(pattern =>
        this.matchesFilePattern(pattern, context.fileStructure.importantFiles)
      )
      if (fileMatches) {score += 0.3}
    }

    // Recent activity relevance
    const recentToolUses = context.recentActivity.filter(activity => 
      activity.type === "tool_use" && activity.success
    )
    if (recentToolUses.length > 0) {
      const recentSuccess = recentToolUses.slice(-5).some(activity =>
        activity.description.includes(tool.name)
      )
      if (recentSuccess) {score += 0.2}
    }

    // Session history relevance
    const sessionSuccess = context.sessionHistory.some(session =>
      session.toolsUsed.includes(tool.name) && session.success
    )
    if (sessionSuccess) {score += 0.2}

    // Prerequisites check
    const prerequisitesMet = this.checkPrerequisites(tool.prerequisites, context)
    score += prerequisitesMet * 0.3

    return Math.min(score, 1.0)
  }

  /**
   * Calculate reliability score based on tool's inherent reliability
   */
  calculateReliabilityScore(tool: ToolIntelligenceMetadata): number {
    let score = tool.reliability * 0.7

    // Error pattern penalty
    const errorCount = tool.performanceMetrics.errorPatterns.length
    const errorPenalty = Math.min(0.3, errorCount * 0.1)
    score -= errorPenalty

    // Complexity penalty (more complex tools are less reliable)
    const complexityPenalty = {
      "low": 0,
      "medium": 0.1,
      "high": 0.2,
      "variable": 0.15
    }[tool.complexity] || 0.1
    score -= complexityPenalty

    return Math.max(0, Math.min(score, 1.0))
  }

  /**
   * Calculate user preference score based on learned preferences
   */
  async calculateUserPreferenceScore(toolName: string, context: TaskContext): Promise<number> {
    let score = 0.5 // Base score

    // Check user's preferred libraries/technologies
    if (context.userPreferences.preferredLibraries.some(lib => 
      toolName.toLowerCase().includes(lib.toLowerCase())
    )) {
      score += 0.3
    }

    // Check avoidance patterns
    if (context.userPreferences.avoidancePatterns.some(pattern => 
      toolName.toLowerCase().includes(pattern.toLowerCase())
    )) {
      score -= 0.4
    }

    // Check coding style preferences
    if (context.userPreferences.codingStyle === "automated" && 
        (toolName.includes("execute") || toolName.includes("run"))) {
      score += 0.2
    }

    // Learn from memory patterns
    const projectMemory = await this.memoryManager.loadProjectMemory(context.projectType)
    if (projectMemory) {
      const successfulPatterns = projectMemory.learnedPatterns.filter(pattern => 
        pattern.confidence > 0.7 && pattern.pattern.includes(toolName)
      )
      if (successfulPatterns.length > 0) {
        score += 0.2 * Math.min(1, successfulPatterns.length / 5)
      }
    }

    return Math.max(0, Math.min(score, 1.0))
  }

  /**
   * Calculate confidence in the score
   */
  private calculateConfidence(
    tool: ToolIntelligenceMetadata,
    factors: {
      relevanceMatch: number
      performanceScore: number
      contextFit: number
      reliabilityScore: number
      userPreferenceScore: number
    }
  ): number {
    let confidence = 0.5 // Base confidence

    // Data availability
    if (tool.performanceMetrics.usageCount > 10) {confidence += 0.2}
    if (tool.performanceMetrics.usageCount > 50) {confidence += 0.1}

    // Score consistency (lower variance = higher confidence)
    const scores = Object.values(factors)
    const variance = this.calculateVariance(scores)
    const consistencyBonus = Math.max(0, 0.3 - variance)
    confidence += consistencyBonus

    // High relevance increases confidence
    if (factors.relevanceMatch > 0.7) {confidence += 0.1}

    // High reliability increases confidence
    if (factors.reliabilityScore > 0.8) {confidence += 0.1}

    return Math.min(confidence, 1.0)
  }

  /**
   * Generate human-readable reasoning for the score
   */
  private generateReasoning(
    tool: ToolIntelligenceMetadata,
    context: TaskContext,
    factors: {
      relevanceMatch: number
      performanceScore: number
      contextFit: number
      reliabilityScore: number
      userPreferenceScore: number
    }
  ): string[] {
    const reasoning: string[] = []

    if (factors.relevanceMatch > 0.7) {
      reasoning.push(`Strong relevance to task: ${tool.capabilities.slice(0, 2).join(", ")}`)
    } else if (factors.relevanceMatch > 0.4) {
      reasoning.push(`Moderate relevance to task`)
    }

    if (factors.performanceScore > 0.8) {
      reasoning.push(`Excellent historical performance (${(tool.performanceMetrics.successRate * 100).toFixed(1)}% success rate)`)
    } else if (factors.performanceScore > 0.6) {
      reasoning.push(`Good historical performance`)
    }

    if (factors.contextFit > 0.7) {
      reasoning.push(`Well-suited to current project context`)
    }

    if (factors.reliabilityScore > 0.8) {
      reasoning.push(`Highly reliable tool`)
    } else if (factors.reliabilityScore < 0.5) {
      reasoning.push(`Lower reliability score`)
    }

    if (factors.userPreferenceScore > 0.7) {
      reasoning.push(`Matches user preferences`)
    }

    if (tool.complexity === "high") {
      reasoning.push(`High complexity tool`)
    } else if (tool.complexity === "low") {
      reasoning.push(`Simple, reliable tool`)
    }

    return reasoning
  }

  /**
   * Get optimal execution time for a tool type
   */
  private getOptimalExecutionTime(toolName: string): number {
    const optimalTimes: Record<string, number> = {
      "read_file": 500,
      "write_to_file": 800,
      "replace_in_file": 600,
      "execute_command": 3000,
      "search_files": 2000,
      "list_files": 300,
      "list_code_definition_names": 1500,
      "use_mcp_tool": 2000,
      "ask_followup_question": 100,
      "attempt_completion": 100
    }

    return optimalTimes[toolName] || 2000
  }

  /**
   * Check if file pattern matches any files
   */
  private matchesFilePattern(pattern: string, files: string[]): boolean {
    if (pattern === "*") {return true}
    
    const regex = new RegExp(pattern.replace(/\*/g, ".*").replace(/\?/g, "."))
    return files.some(file => regex.test(file))
  }

  /**
   * Check if prerequisites are met
   */
  private checkPrerequisites(prerequisites: string[], context: TaskContext): number {
    if (prerequisites.length === 0) {return 1.0}

    let met = 0
    for (const prereq of prerequisites) {
      if (prereq === "directory-exists" && context.fileStructure.directories.length > 0) {
        met++
      } else if (prereq === "file-exists" && context.fileStructure.importantFiles.length > 0) {
        met++
      } else if (prereq === "shell-access") {
        met++ // Assume shell access is available
      } else if (prereq === "mcp-server-connected") {
        // This would need to be checked against actual MCP server status
        met++ // Assume connected for now
      } else if (prereq === "source-files-exist") {
        const sourceExtensions = [".js", ".ts", ".py", ".java", ".cpp", ".cs", ".go", ".rs"]
        const hasSourceFiles = context.fileStructure.importantFiles.some(file =>
          sourceExtensions.some(ext => file.endsWith(ext))
        )
        if (hasSourceFiles) {met++}
      }
    }

    return met / prerequisites.length
  }

  /**
   * Calculate variance of an array of numbers
   */
  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) {return 0}
    
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2))
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length
  }

  /**
   * Get top N tools for a given context
   */
  async getTopTools(
    taskContext: TaskContext,
    candidateTools: string[],
    limit: number = 5
  ): Promise<ToolScore[]> {
    const scores = await this.scoreTools(taskContext, candidateTools)
    return scores.slice(0, limit)
  }

  /**
   * Explain why a tool was scored a certain way
   */
  async explainScore(toolName: string, taskContext: TaskContext): Promise<string> {
    const toolMetadata = await this.toolRegistry.getToolMetadata(toolName)
    if (!toolMetadata) {
      return `Tool ${toolName} not found in registry`
    }

    const score = await this.calculateToolScore(toolMetadata, taskContext)
    
    const explanation = [
      `Tool: ${toolName}`,
      `Overall Score: ${(score.score * 100).toFixed(1)}%`,
      `Confidence: ${(score.confidence * 100).toFixed(1)}%`,
      "",
      "Scoring Factors:",
      `- Relevance Match: ${(score.factors.relevanceMatch * 100).toFixed(1)}%`,
      `- Performance Score: ${(score.factors.performanceScore * 100).toFixed(1)}%`,
      `- Context Fit: ${(score.factors.contextFit * 100).toFixed(1)}%`,
      `- Reliability Score: ${(score.factors.reliabilityScore * 100).toFixed(1)}%`,
      `- User Preference Score: ${(score.factors.userPreferenceScore * 100).toFixed(1)}%`,
      "",
      "Reasoning:",
      ...score.reasoning.map(reason => `- ${reason}`)
    ]

    return explanation.join("\n")
  }
}
