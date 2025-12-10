/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Intelligent Tool Selection System - Recommendation Engine
 * MIT License
 */

import { ToolIntelligenceRegistry } from "./ToolIntelligenceRegistry"
import { ContextualToolScorer } from "./ContextualToolScorer"
import { TaskPatternMatcher } from "./TaskPatternMatcher"
import { ToolSelectionLearningEngine } from "./ToolSelectionLearningEngine"
import {
  ToolRecommendation,
  RecommendationRequest,
  ValidationResult,
  TaskContext,
  ProjectContext
} from "./types"

export class IntelligentToolRecommender {
  constructor(
    private scorer: ContextualToolScorer,
    private toolRegistry: ToolIntelligenceRegistry,
    private patternMatcher: TaskPatternMatcher,
    private learningEngine: ToolSelectionLearningEngine
  ) { }

  async recommendTools(request: RecommendationRequest): Promise<ToolRecommendation[]> {
    try {
      // Get all available tools
      const availableTools = await this.getAvailableTools(request.availableTools)

      // Score tools based on context
      const scoredTools = await this.scorer.scoreTools(
        this.createTaskContext(request),
        availableTools
      )

      // Convert scores to recommendations
      const recommendations: ToolRecommendation[] = []

      for (const scoredTool of scoredTools) {
        const toolMetadata = await this.toolRegistry.getToolMetadata(scoredTool.toolName)
        if (!toolMetadata) { continue }

        const recommendation: ToolRecommendation = {
          tool: toolMetadata,
          score: scoredTool.score,
          confidence: scoredTool.confidence,
          reasoning: scoredTool.reasoning.join(", "),
          alternativeOptions: await this.getAlternativeOptions(toolMetadata, scoredTools),
          prerequisites: toolMetadata.prerequisites,
          estimatedExecutionTime: toolMetadata.performanceMetrics.avgExecutionTime,
          riskAssessment: this.assessRisk(toolMetadata, scoredTool.score)
        }

        recommendations.push(recommendation)
      }

      // Sort by score and confidence
      recommendations.sort((a, b) => {
        const scoreA = a.score * a.confidence
        const scoreB = b.score * b.confidence
        return scoreB - scoreA
      })

      // Apply constraints
      return this.applyConstraints(recommendations, request.constraints)
    } catch (error) {
      console.error("Failed to generate tool recommendations:", error)
      return []
    }
  }

  async explainRecommendation(recommendation: ToolRecommendation): Promise<string> {
    const { tool, score, confidence, reasoning } = recommendation

    let explanation = `I recommend using ${tool.name} because:\n`
    explanation += `- Score: ${(score * 100).toFixed(1)}%\n`
    explanation += `- Confidence: ${(confidence * 100).toFixed(1)}%\n`
    explanation += `- Reasoning: ${reasoning}\n`

    if (tool.capabilities.length > 0) {
      explanation += `- Capabilities: ${tool.capabilities.join(", ")}\n`
    }

    if (tool.domains.length > 0) {
      explanation += `- Domains: ${tool.domains.join(", ")}\n`
    }

    if (tool.performanceMetrics.successRate < 0.8) {
      explanation += `- Warning: This tool has a success rate of ${(tool.performanceMetrics.successRate * 100).toFixed(1)}%\n`
    }

    return explanation
  }

  /**
   * Get MCP server recommendations based on task context
   * Returns ranked list of MCP servers suitable for the task
   */
  async getMcpServerRecommendations(request: {
    taskDescription: string
    taskType?: string
    projectContext?: ProjectContext
    previousFailures?: string[]
  }): Promise<import("./types").McpServerRecommendation[]> {
    try {
      // Get all registered MCP servers
      const servers = this.toolRegistry.getAllMcpServers()

      if (servers.length === 0) {
        return []
      }

      // Extract keywords from task description
      const keywords = this.extractKeywords(request.taskDescription)

      // Determine task type if not provided
      const taskType = request.taskType || this.inferTaskType(request.taskDescription, keywords)

      // Create scoring context
      const scoringContext: import("./types").McpServerScoringContext = {
        userRequest: request.taskDescription,
        taskType,
        keywords,
        projectContext: request.projectContext || this.createDefaultProjectContext(),
        previousFailures: request.previousFailures || [],
        urgency: "medium"
      }

      // Score servers
      const scorer = this.toolRegistry.getMcpServerScorer()
      const recommendations = await scorer.scoreServers(servers, scoringContext)

      return recommendations
    } catch (error) {
      console.error("Failed to generate MCP server recommendations:", error)
      return []
    }
  }

  /**
   * Extract keywords from task description
   */
  private extractKeywords(text: string): string[] {
    const keywords = new Set<string>()
    const words = text.toLowerCase().split(/\s+/)

    // Common keywords to look for
    const importantKeywords = [
      "search", "find", "lookup", "query", "fetch", "get", "read",
      "documentation", "docs", "reference", "api", "guide",
      "file", "directory", "folder", "path",
      "web", "http", "url", "scrape", "download",
      "code", "programming", "development",
      "data", "analytics", "database"
    ]

    for (const word of words) {
      if (importantKeywords.includes(word) && word.length > 2) {
        keywords.add(word)
      }
    }

    return Array.from(keywords)
  }

  /**
   * Infer task type from description and keywords
   */
  private inferTaskType(description: string, keywords: string[]): string {
    const descLower = description.toLowerCase()

    if (keywords.includes("documentation") || keywords.includes("docs") || descLower.includes("look up")) {
      return "documentation_lookup"
    }
    if (keywords.includes("search") || keywords.includes("find") || keywords.includes("query")) {
      return "search"
    }
    if (keywords.includes("file") || keywords.includes("directory")) {
      return "file_operation"
    }
    if (keywords.includes("web") || keywords.includes("scrape") || keywords.includes("fetch")) {
      return "web_scraping"
    }
    if (keywords.includes("api") || descLower.includes("endpoint")) {
      return "api_call"
    }
    if (keywords.includes("code") || keywords.includes("programming")) {
      return "code_search"
    }

    return "general"
  }

  async getToolComposition(taskDescription: string): Promise<ToolRecommendation[][]> {
    try {
      // Analyze task complexity
      const entities = await this.patternMatcher.extractEntities(taskDescription)
      const complexity = await this.patternMatcher.assessTaskComplexity(taskDescription, entities)

      // Generate different composition strategies
      const compositions: ToolRecommendation[][] = []

      // Single tool approach (for simple tasks)
      if (complexity === "low") {
        const singleToolRec = await this.recommendTools({
          taskDescription,
          projectContext: this.createDefaultProjectContext(),
          availableTools: await this.toolRegistry.getAllToolNames()
        })
        compositions.push(singleToolRec.slice(0, 1))
      }

      // Multi-tool approach (for complex tasks)
      if (complexity === "medium" || complexity === "high") {
        const multiToolRec = await this.recommendTools({
          taskDescription,
          projectContext: this.createDefaultProjectContext(),
          availableTools: await this.toolRegistry.getAllToolNames()
        })
        compositions.push(multiToolRec.slice(0, 3))
      }

      // Domain-specific approach
      const domainTools = await this.getDomainSpecificRecommendations(entities)
      if (domainTools.length > 0) {
        compositions.push(domainTools)
      }

      return compositions
    } catch (error) {
      console.error("Failed to generate tool composition:", error)
      return []
    }
  }

  async validateRecommendation(recommendation: ToolRecommendation): Promise<ValidationResult> {
    const issues: string[] = []
    const suggestions: string[] = []
    let isValid = true

    // Check if tool exists
    const toolMetadata = await this.toolRegistry.getToolMetadata(recommendation.tool.name)
    if (!toolMetadata) {
      issues.push("Tool not found in registry")
      isValid = false
    }

    // Check prerequisites
    if (recommendation.prerequisites.length > 0) {
      suggestions.push(`Ensure prerequisites are met: ${recommendation.prerequisites.join(", ")}`)
    }

    // Check confidence threshold
    if (recommendation.confidence < 0.5) {
      issues.push("Low confidence recommendation")
      suggestions.push("Consider alternative tools with higher confidence")
      isValid = false
    }

    // Check risk assessment
    if (recommendation.riskAssessment === "high") {
      issues.push("High risk assessment")
      suggestions.push("Consider using alternative tools or additional safeguards")
    }

    // Check performance metrics
    if (toolMetadata && toolMetadata.performanceMetrics.successRate < 0.7) {
      issues.push("Low historical success rate")
      suggestions.push("Consider this tool has a lower success rate in similar contexts")
    }

    return {
      isValid,
      confidence: recommendation.confidence,
      issues,
      suggestions
    }
  }

  private async getAvailableTools(toolNames: string[]): Promise<string[]> {
    const availableTools: string[] = []

    for (const toolName of toolNames) {
      const metadata = await this.toolRegistry.getToolMetadata(toolName)
      if (metadata) {
        availableTools.push(toolName)
      }
    }

    return availableTools
  }

  private createTaskContext(request: RecommendationRequest): TaskContext {
    return {
      userRequest: request.taskDescription,
      projectType: request.projectContext.projectType,
      technologies: request.projectContext.technologies,
      fileStructure: {
        importantFiles: [],
        frequentlyModified: [],
        filePurposes: {},
        directories: [],
        entryPoints: []
      },
      recentActivity: [],
      userPreferences: {
        codingStyle: "unknown",
        commentingStyle: "unknown",
        namingConventions: [],
        preferredLibraries: [],
        avoidancePatterns: [],
        communicationStyle: "professional"
      },
      sessionHistory: []
    }
  }

  private createDefaultProjectContext(): ProjectContext {
    return {
      projectPath: "",
      projectType: "general",
      technologies: [],
      frameworks: [],
      dependencies: {},
      buildTools: [],
      testingFrameworks: [],
      codingStandards: [],
      architecture: []
    }
  }

  private async getAlternativeOptions(
    tool: any,
    scoredTools: any[]
  ): Promise<ToolRecommendation[]> {
    const alternatives: ToolRecommendation[] = []

    for (const altToolName of tool.alternatives) {
      const altScored = scoredTools.find(st => st.toolName === altToolName)
      if (altScored && altScored.score > 0.3) {
        const altMetadata = await this.toolRegistry.getToolMetadata(altToolName)
        if (altMetadata) {
          alternatives.push({
            tool: altMetadata,
            score: altScored.score,
            confidence: altScored.confidence,
            reasoning: altScored.reasoning.join(", "),
            alternativeOptions: [],
            prerequisites: altMetadata.prerequisites,
            estimatedExecutionTime: altMetadata.performanceMetrics.avgExecutionTime,
            riskAssessment: this.assessRisk(altMetadata, altScored.score)
          })
        }
      }
    }

    return alternatives.slice(0, 3) // Limit to top 3 alternatives
  }

  private assessRisk(tool: any, score: number): "low" | "medium" | "high" {
    // Risk assessment based on multiple factors
    let riskScore = 0

    // Performance-based risk
    if (tool.performanceMetrics.successRate < 0.7) { riskScore += 2 }
    else if (tool.performanceMetrics.successRate < 0.9) { riskScore += 1 }

    // Complexity-based risk
    if (tool.complexity === "high") { riskScore += 2 }
    else if (tool.complexity === "medium") { riskScore += 1 }

    // Score-based risk
    if (score < 0.3) { riskScore += 2 }
    else if (score < 0.6) { riskScore += 1 }

    // Determine risk level
    if (riskScore >= 4) { return "high" }
    if (riskScore >= 2) { return "medium" }
    return "low"
  }

  private applyConstraints(
    recommendations: ToolRecommendation[],
    constraints?: RecommendationRequest["constraints"]
  ): ToolRecommendation[] {
    if (!constraints) { return recommendations }

    let filtered = recommendations

    // Max complexity constraint
    if (constraints.maxComplexity) {
      const complexityOrder: Record<string, number> = { "low": 1, "medium": 2, "high": 3, "variable": 2 }
      const maxLevel = complexityOrder[constraints.maxComplexity]

      filtered = filtered.filter(rec =>
        (complexityOrder[rec.tool.complexity] || 2) <= maxLevel
      )
    }

    // Preferred domains constraint
    if (constraints.preferredDomains && constraints.preferredDomains.length > 0) {
      filtered = filtered.sort((a, b) => {
        const aHasPreferredDomain = a.tool.domains.some(d => constraints.preferredDomains!.includes(d))
        const bHasPreferredDomain = b.tool.domains.some(d => constraints.preferredDomains!.includes(d))

        if (aHasPreferredDomain && !bHasPreferredDomain) { return -1 }
        if (!aHasPreferredDomain && bHasPreferredDomain) { return 1 }
        return 0
      })
    }

    // Exclude tools constraint
    if (constraints.excludeTools && constraints.excludeTools.length > 0) {
      filtered = filtered.filter(rec =>
        !constraints.excludeTools!.includes(rec.tool.name)
      )
    }

    // Time limit constraint
    if (constraints.timeLimit) {
      filtered = filtered.filter(rec =>
        rec.estimatedExecutionTime <= constraints.timeLimit!
      )
    }

    return filtered
  }

  private async getDomainSpecificRecommendations(entities: any): Promise<ToolRecommendation[]> {
    // This would implement domain-specific recommendation logic
    // For now, return empty array as placeholder
    return []
  }
}
