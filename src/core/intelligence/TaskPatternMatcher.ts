/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Intelligent Tool Selection System - Task Pattern Matcher
 * MIT License
 */

import { TaskAnalyzer } from "./TaskAnalyzer"
import { ToolSelectionPattern } from "./types"

export class TaskPatternMatcher {
  constructor(private taskAnalyzer: TaskAnalyzer) {}

  async extractEntities(userRequest: string) {
    return this.taskAnalyzer.extractEntities(userRequest)
  }

  async assessTaskComplexity(userRequest: string, entities: any): Promise<"low" | "medium" | "high"> {
    return this.taskAnalyzer.assessTaskComplexity(userRequest, entities)
  }

  async findMatchingPatterns(taskContext: any): Promise<ToolSelectionPattern[]> {
    // This would implement pattern matching logic
    // For now, return empty array as placeholder
    return []
  }

  async calculatePatternSimilarity(pattern1: string, pattern2: string): Promise<number> {
    // Simple string similarity calculation
    const words1 = pattern1.toLowerCase().split(/\s+/)
    const words2 = pattern2.toLowerCase().split(/\s+/)
    
    const intersection = words1.filter(word => words2.includes(word))
    const union = [...new Set([...words1, ...words2])]
    
    return intersection.length / union.length
  }

  async generateTaskSignature(taskContext: any): Promise<string> {
    const entities = await this.extractEntities(taskContext.userRequest)
    const complexity = await this.assessTaskComplexity(taskContext.userRequest, entities)
    
    return `${complexity}:${entities.actions.join("+")}:${entities.concepts.join("+")}:${entities.technologies.join("+")}`
  }
}
