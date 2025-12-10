/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Intelligent Tool Selection System - Learning Engine
 * MIT License
 */

import {
  ToolSelectionPattern,
  ToolSelectionInsight,
  UserFeedback,
  TaskContext
} from "./types"

export class ToolSelectionLearningEngine {
  private patterns: ToolSelectionPattern[] = []
  private insights: ToolSelectionInsight[] = []

  async recordSelection(pattern: ToolSelectionPattern): Promise<void> {
    this.patterns.push(pattern)
    
    // Keep only the most recent patterns (limit to 1000)
    if (this.patterns.length > 1000) {
      this.patterns = this.patterns.slice(-1000)
    }
    
    // Trigger learning analysis
    await this.analyzePatterns()
  }

  async analyzePatterns(): Promise<ToolSelectionInsight[]> {
    const insights: ToolSelectionInsight[] = []
    
    // Group patterns by task pattern
    const patternGroups = this.groupPatternsByTaskPattern(this.patterns)
    
    for (const [taskPattern, groupPatterns] of Object.entries(patternGroups)) {
      if (groupPatterns.length >= 3) { // Only analyze patterns with enough data
        const insight = await this.analyzePatternGroup(taskPattern, groupPatterns)
        if (insight) {
          insights.push(insight)
        }
      }
    }
    
    // Update insights
    this.insights = insights
    return insights
  }

  async predictOptimalTools(taskContext: TaskContext): Promise<string[]> {
    // Find similar patterns from history
    const similarPatterns = await this.findSimilarPatterns(taskContext)
    
    if (similarPatterns.length === 0) {
      return []
    }
    
    // Analyze successful patterns
    const successfulPatterns = similarPatterns.filter(p => p.success)
    
    if (successfulPatterns.length === 0) {
      return []
    }
    
    // Count tool frequency in successful patterns
    const toolFrequency: Record<string, number> = {}
    
    for (const pattern of successfulPatterns) {
      for (const tool of pattern.selectedTools) {
        toolFrequency[tool] = (toolFrequency[tool] || 0) + 1
      }
    }
    
    // Sort by frequency and return top tools
    const sortedTools = Object.entries(toolFrequency)
      .sort(([, a], [, b]) => b - a)
      .map(([tool]) => tool)
    
    return sortedTools.slice(0, 5) // Return top 5 tools
  }

  async updateFromFeedback(toolName: string, feedback: UserFeedback): Promise<void> {
    // Find patterns that used this tool
    const relevantPatterns = this.patterns.filter(p => 
      p.selectedTools.includes(toolName)
    )
    
    // Update pattern success based on feedback
    for (const pattern of relevantPatterns) {
      if (feedback.rating >= 4) {
        pattern.success = true
      } else if (feedback.rating <= 2) {
        pattern.success = false
      }
    }
    
    // Re-analyze patterns with updated data
    await this.analyzePatterns()
  }

  async generateInsights(): Promise<ToolSelectionInsight[]> {
    return this.insights
  }

  private groupPatternsByTaskPattern(patterns: ToolSelectionPattern[]): Record<string, ToolSelectionPattern[]> {
    const groups: Record<string, ToolSelectionPattern[]> = {}
    
    for (const pattern of patterns) {
      if (!groups[pattern.taskPattern]) {
        groups[pattern.taskPattern] = []
      }
      groups[pattern.taskPattern].push(pattern)
    }
    
    return groups
  }

  private async analyzePatternGroup(
    taskPattern: string,
    patterns: ToolSelectionPattern[]
  ): Promise<ToolSelectionInsight | null> {
    const successfulPatterns = patterns.filter(p => p.success)
    const failedPatterns = patterns.filter(p => !p.success)
    
    if (successfulPatterns.length === 0) {
      return null
    }
    
    const successRate = successfulPatterns.length / patterns.length
    
    if (successRate < 0.7) {
      return null // Only return insights for high-success patterns
    }
    
    // Find most common successful tool combination
    const toolCombos: Record<string, number> = {}
    
    for (const pattern of successfulPatterns) {
      const combo = pattern.selectedTools.sort().join("+")
      toolCombos[combo] = (toolCombos[combo] || 0) + 1
    }
    
    const bestCombo = Object.entries(toolCombos)
      .sort(([, a], [, b]) => b - a)[0]
    
    if (!bestCombo) {
      return null
    }
    
    const [tools, frequency] = bestCombo
    
    return {
      pattern: taskPattern,
      recommendation: `Use ${tools.replace(/\+/g, ", ")} for ${taskPattern} tasks`,
      confidence: successRate,
      supportingEvidence: successfulPatterns
    }
  }

  private async findSimilarPatterns(taskContext: TaskContext): Promise<ToolSelectionPattern[]> {
    const similarPatterns: ToolSelectionPattern[] = []
    
    for (const pattern of this.patterns) {
      const similarity = await this.calculateContextSimilarity(taskContext, pattern.context)
      if (similarity > 0.5) { // Threshold for similarity
        similarPatterns.push(pattern)
      }
    }
    
    // Sort by similarity and return most similar
    return similarPatterns
      .sort((a, b) => b.createdAt - a.createdAt) // Prefer recent patterns
      .slice(0, 10) // Limit to top 10 similar patterns
  }

  private async calculateContextSimilarity(
    context1: TaskContext,
    context2: TaskContext
  ): Promise<number> {
    let similarity = 0
    let factors = 0
    
    // Compare project types
    if (context1.projectType === context2.projectType) {
      similarity += 1
    }
    factors++
    
    // Compare technologies
    const techOverlap = context1.technologies.filter(t => 
      context2.technologies.includes(t)
    ).length
    const techUnion = [...new Set([...context1.technologies, ...context2.technologies])]
    similarity += techUnion.length > 0 ? techOverlap / techUnion.length : 0
    factors++
    
    // Compare user request similarity
    const words1 = context1.userRequest.toLowerCase().split(/\s+/)
    const words2 = context2.userRequest.toLowerCase().split(/\s+/)
    const wordOverlap = words1.filter(w => words2.includes(w)).length
    const wordUnion = [...new Set([...words1, ...words2])]
    similarity += wordUnion.length > 0 ? wordOverlap / wordUnion.length : 0
    factors++
    
    return factors > 0 ? similarity / factors : 0
  }
}
