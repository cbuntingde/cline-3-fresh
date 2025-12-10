/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Intelligent Tool Selection System - Predictive Tool Pre-loader
 * MIT License
 */

import {
  ToolIntelligenceMetadata,
  TaskContext,
  ToolPerformanceRecord,
  ProcessingTask
} from "./types"
import { ToolIntelligenceRegistry } from "./ToolIntelligenceRegistry"
import { TaskPatternMatcher } from "./TaskPatternMatcher"

export interface PreloadPrediction {
  toolName: string
  probability: number
  confidence: number
  reasoning: string[]
  estimatedTimeToUse: number // milliseconds from now
  preloadPriority: "low" | "medium" | "high" | "critical"
}

export interface PreloadStrategy {
  name: string
  description: string
  predictTools: (context: TaskContext, history: TaskContext[]) => Promise<PreloadPrediction[]>
  shouldPreload: (prediction: PreloadPrediction, systemLoad: SystemLoad) => boolean
}

export interface SystemLoad {
  cpuUsage: number
  memoryUsage: number
  activePreloads: number
  maxPreloads: number
  networkLatency: number
}

export interface PreloadCache {
  toolName: string
  preloadedAt: number
  expiresAt: number
  size: number
  accessCount: number
  lastAccessed: number
}

export class PredictiveToolPreloader {
  private preloadStrategies: Map<string, PreloadStrategy> = new Map()
  private preloadCache: Map<string, PreloadCache> = new Map()
  private systemLoad: SystemLoad = {
    cpuUsage: 0,
    memoryUsage: 0,
    activePreloads: 0,
    maxPreloads: 10,
    networkLatency: 0
  }
  private predictionHistory: PreloadPrediction[] = []
  private preloadQueue: ProcessingTask[] = []

  constructor(
    private toolRegistry: ToolIntelligenceRegistry,
    private patternMatcher: TaskPatternMatcher
  ) {
    this.initializePreloadStrategies()
    this.startSystemMonitoring()
  }

  /**
   * Predict and preload tools based on current context and patterns
   */
  async predictAndPreloadTools(
    currentContext: TaskContext,
    sessionHistory: TaskContext[] = []
  ): Promise<{
    predictions: PreloadPrediction[]
    preloadedTools: string[]
    skippedTools: string[]
    systemLoad: SystemLoad
  }> {
    try {
      // Update system load metrics
      await this.updateSystemLoad()

      // Generate predictions using all strategies
      const allPredictions: PreloadPrediction[] = []
      
      for (const strategy of this.preloadStrategies.values()) {
        try {
          const predictions = await strategy.predictTools(currentContext, sessionHistory)
          allPredictions.push(...predictions)
        } catch (error) {
          console.warn(`Failed to generate predictions with strategy ${strategy.name}:`, error)
        }
      }

      // Deduplicate and rank predictions
      const rankedPredictions = this.rankAndDeduplicatePredictions(allPredictions)

      // Filter predictions based on system load and preload criteria
      const eligiblePredictions = rankedPredictions.filter(prediction => {
        const strategy = Array.from(this.preloadStrategies.values()).find(s => 
          prediction.reasoning.some(r => r.includes(s.name))
        )
        return strategy ? strategy.shouldPreload(prediction, this.systemLoad) : false
      })

      // Execute preloading
      const preloadedTools: string[] = []
      const skippedTools: string[] = []

      for (const prediction of eligiblePredictions) {
        if (this.systemLoad.activePreloads >= this.systemLoad.maxPreloads) {
          skippedTools.push(prediction.toolName)
          continue
        }

        try {
          const success = await this.preloadTool(prediction)
          if (success) {
            preloadedTools.push(prediction.toolName)
          } else {
            skippedTools.push(prediction.toolName)
          }
        } catch (error) {
          console.error(`Failed to preload tool ${prediction.toolName}:`, error)
          skippedTools.push(prediction.toolName)
        }
      }

      // Store predictions for learning
      this.predictionHistory.push(...rankedPredictions)
      if (this.predictionHistory.length > 1000) {
        this.predictionHistory = this.predictionHistory.slice(-500) // Keep last 500
      }

      return {
        predictions: rankedPredictions,
        preloadedTools,
        skippedTools,
        systemLoad: this.systemLoad
      }
    } catch (error) {
      console.error("Failed to predict and preload tools:", error)
      return {
        predictions: [],
        preloadedTools: [],
        skippedTools: [],
        systemLoad: this.systemLoad
      }
    }
  }

  /**
   * Check if a tool is preloaded and return cache info
   */
  isToolPreloaded(toolName: string): PreloadCache | null {
    const cache = this.preloadCache.get(toolName)
    if (!cache) {return null}

    // Check if cache has expired
    if (Date.now() > cache.expiresAt) {
      this.preloadCache.delete(toolName)
      return null
    }

    // Update access statistics
    cache.accessCount++
    cache.lastAccessed = Date.now()
    this.preloadCache.set(toolName, cache)

    return cache
  }

  /**
   * Get preloaded tool data
   */
  async getPreloadedTool(toolName: string): Promise<any> {
    const cache = this.isToolPreloaded(toolName)
    if (!cache) {
      throw new Error(`Tool ${toolName} is not preloaded`)
    }

    // This would integrate with the actual tool loading system
    // For now, return mock data
    return {
      toolName,
      preloadedAt: cache.preloadedAt,
      data: `Preloaded data for ${toolName}`,
      loadTime: 0 // Should be instant since preloaded
    }
  }

  /**
   * Clear expired preloads
   */
  clearExpiredPreloads(): number {
    const now = Date.now()
    let clearedCount = 0

    for (const [toolName, cache] of this.preloadCache.entries()) {
      if (now > cache.expiresAt) {
        this.preloadCache.delete(toolName)
        clearedCount++
      }
    }

    this.systemLoad.activePreloads = this.preloadCache.size
    return clearedCount
  }

  /**
   * Analyze preload effectiveness and generate insights
   */
  analyzePreloadEffectiveness(): {
    hitRate: number
    averageLoadTime: number
    cacheEfficiency: number
    predictionAccuracy: number
    recommendations: string[]
  } {
    const totalPreloads = this.preloadCache.size
    const accessedPreloads = Array.from(this.preloadCache.values())
      .filter(cache => cache.accessCount > 0).length

    const hitRate = totalPreloads > 0 ? accessedPreloads / totalPreloads : 0

    // Calculate average cache age
    const now = Date.now()
    const avgCacheAge = totalPreloads > 0 ? 
      Array.from(this.preloadCache.values())
        .reduce((sum, cache) => sum + (now - cache.preloadedAt), 0) / totalPreloads : 0

    // Analyze prediction accuracy
    const recentPredictions = this.predictionHistory.slice(-100)
    const accuratePredictions = recentPredictions.filter(prediction => {
      const cache = this.preloadCache.get(prediction.toolName)
      return cache && cache.accessCount > 0
    }).length

    const predictionAccuracy = recentPredictions.length > 0 ? 
      accuratePredictions / recentPredictions.length : 0

    // Generate recommendations
    const recommendations: string[] = []

    if (hitRate < 0.3) {
      recommendations.push("Preload hit rate is low. Consider adjusting prediction strategies.")
    }

    if (avgCacheAge > 30 * 60 * 1000) { // 30 minutes
      recommendations.push("Cache items are aging. Consider reducing preload TTL.")
    }

    if (predictionAccuracy < 0.5) {
      recommendations.push("Prediction accuracy is low. Retrain prediction models with more data.")
    }

    if (this.systemLoad.activePreloads >= this.systemLoad.maxPreloads * 0.8) {
      recommendations.push("Preload cache is near capacity. Consider increasing max preloads or improving cleanup.")
    }

    return {
      hitRate,
      averageLoadTime: 0, // Would be calculated from actual load times
      cacheEfficiency: hitRate,
      predictionAccuracy,
      recommendations
    }
  }

  /**
   * Update system load metrics
   */
  private async updateSystemLoad(): Promise<void> {
    // This would integrate with actual system monitoring
    // For now, simulate system load
    this.systemLoad = {
      cpuUsage: Math.random() * 0.8, // 0-80%
      memoryUsage: Math.random() * 0.7, // 0-70%
      activePreloads: this.preloadCache.size,
      maxPreloads: 10,
      networkLatency: Math.random() * 100 // 0-100ms
    }
  }

  /**
   * Initialize preload strategies
   */
  private initializePreloadStrategies(): void {
    // Pattern-based strategy
    this.preloadStrategies.set("pattern-based", {
      name: "pattern-based",
      description: "Predict tools based on historical usage patterns",
      predictTools: async (context, history) => {
        const predictions: PreloadPrediction[] = []
        
        // Analyze recent patterns
        const recentContexts = history.slice(-10)
        const commonPatterns = await this.findCommonPatterns(recentContexts)
        
        for (const pattern of commonPatterns) {
          const tools = await this.getToolsForPattern(pattern)
          for (const toolName of tools) {
            predictions.push({
              toolName,
              probability: pattern.frequency,
              confidence: 0.7,
              reasoning: [`Pattern-based prediction: ${pattern.description}`],
              estimatedTimeToUse: pattern.avgTimeToNext,
              preloadPriority: this.calculatePreloadPriority(pattern.frequency, 0.7)
            })
          }
        }
        
        return predictions
      },
      shouldPreload: (prediction, systemLoad) => {
        return prediction.probability > 0.3 && 
               systemLoad.memoryUsage < 0.8 &&
               prediction.preloadPriority !== "low"
      }
    })

    // Context-aware strategy
    this.preloadStrategies.set("context-aware", {
      name: "context-aware",
      description: "Predict tools based on current task context",
      predictTools: async (context, history) => {
        const predictions: PreloadPrediction[] = []
        
        // Extract entities from current context
        const entities = await this.patternMatcher.extractEntities(context.userRequest)
        
        // Get relevant tools for current context
        const relevantTools = await this.toolRegistry.getRelevantTools(context)
        
        for (const tool of relevantTools) {
          const relevance = this.calculateContextRelevance(tool, entities)
          if (relevance > 0.5) {
            predictions.push({
              toolName: tool.name,
              probability: relevance,
              confidence: 0.8,
              reasoning: [`Context-aware: ${tool.domains.join(", ")} match current task`],
              estimatedTimeToUse: 5000, // 5 seconds
              preloadPriority: this.calculatePreloadPriority(relevance, 0.8)
            })
          }
        }
        
        return predictions
      },
      shouldPreload: (prediction, systemLoad) => {
        return prediction.probability > 0.6 && 
               systemLoad.cpuUsage < 0.7 &&
               prediction.preloadPriority !== "low"
      }
    })

    // Sequential workflow strategy
    this.preloadStrategies.set("sequential-workflow", {
      name: "sequential-workflow",
      description: "Predict next tools in common workflows",
      predictTools: async (context, history) => {
        const predictions: PreloadPrediction[] = []
        
        // Analyze recent tool usage sequences
        const recentSequences = this.extractToolSequences(history.slice(-5))
        
        for (const sequence of recentSequences) {
          if (sequence.length > 0) {
            const lastTool = sequence[sequence.length - 1]
            const nextTools = await this.getNextToolsInWorkflow(lastTool)
            
            for (const nextTool of nextTools) {
              predictions.push({
                toolName: nextTool.toolName,
                probability: nextTool.probability,
                confidence: 0.6,
                reasoning: [`Sequential workflow: ${lastTool} → ${nextTool.toolName}`],
                estimatedTimeToUse: nextTool.avgTimeToNext,
                preloadPriority: this.calculatePreloadPriority(nextTool.probability, 0.6)
              })
            }
          }
        }
        
        return predictions
      },
      shouldPreload: (prediction, systemLoad) => {
        return prediction.probability > 0.4 && 
               systemLoad.activePreloads < systemLoad.maxPreloads * 0.8
      }
    })

    // Time-based strategy
    this.preloadStrategies.set("time-based", {
      name: "time-based",
      description: "Predict tools based on time of day and usage patterns",
      predictTools: async (context, history) => {
        const predictions: PreloadPrediction[] = []
        
        const hourOfDay = new Date().getHours()
        const dayOfWeek = new Date().getDay()
        
        // Analyze time-based patterns
        const timePatterns = this.analyzeTimePatterns(history, hourOfDay, dayOfWeek)
        
        for (const pattern of timePatterns) {
          predictions.push({
            toolName: pattern.toolName,
            probability: pattern.frequency,
            confidence: 0.5,
            reasoning: [`Time-based: Frequently used at ${hourOfDay}:00 on day ${dayOfWeek}`],
            estimatedTimeToUse: pattern.avgTimeToNext,
            preloadPriority: this.calculatePreloadPriority(pattern.frequency, 0.5)
          })
        }
        
        return predictions
      },
      shouldPreload: (prediction, systemLoad) => {
        return prediction.probability > 0.2 && 
               systemLoad.memoryUsage < 0.6
      }
    })
  }

  /**
   * Rank and deduplicate predictions
   */
  private rankAndDeduplicatePredictions(predictions: PreloadPrediction[]): PreloadPrediction[] {
    // Group by tool name
    const toolGroups = new Map<string, PreloadPrediction[]>()
    
    for (const prediction of predictions) {
      const group = toolGroups.get(prediction.toolName) || []
      group.push(prediction)
      toolGroups.set(prediction.toolName, group)
    }

    // Combine predictions for each tool
    const combinedPredictions: PreloadPrediction[] = []
    
    for (const [toolName, group] of toolGroups.entries()) {
      const combined: PreloadPrediction = {
        toolName,
        probability: Math.max(...group.map(p => p.probability)),
        confidence: Math.max(...group.map(p => p.confidence)),
        reasoning: [...new Set(group.flatMap(p => p.reasoning))],
        estimatedTimeToUse: Math.min(...group.map(p => p.estimatedTimeToUse)),
        preloadPriority: this.getHighestPriority(group.map(p => p.preloadPriority))
      }
      
      combinedPredictions.push(combined)
    }

    // Sort by priority and probability
    return combinedPredictions.sort((a, b) => {
      const priorityScore = { critical: 4, high: 3, medium: 2, low: 1 }
      const scoreA = priorityScore[a.preloadPriority] * a.probability
      const scoreB = priorityScore[b.preloadPriority] * b.probability
      return scoreB - scoreA
    })
  }

  /**
   * Preload a specific tool
   */
  private async preloadTool(prediction: PreloadPrediction): Promise<boolean> {
    try {
      // Check if already preloaded
      if (this.preloadCache.has(prediction.toolName)) {
        return true
      }

      // This would integrate with the actual tool preloading system
      // For now, simulate preloading
      const preloadTime = Math.random() * 1000 // 0-1 second
      await new Promise(resolve => setTimeout(resolve, preloadTime))

      // Add to cache
      const cache: PreloadCache = {
        toolName: prediction.toolName,
        preloadedAt: Date.now(),
        expiresAt: Date.now() + (30 * 60 * 1000), // 30 minutes
        size: Math.random() * 1024 * 1024, // 0-1MB
        accessCount: 0,
        lastAccessed: Date.now()
      }

      this.preloadCache.set(prediction.toolName, cache)
      this.systemLoad.activePreloads = this.preloadCache.size

      return true
    } catch (error) {
      console.error(`Failed to preload tool ${prediction.toolName}:`, error)
      return false
    }
  }

  /**
   * Start system monitoring
   */
  private startSystemMonitoring(): void {
    // Monitor system load every 30 seconds
    setInterval(async () => {
      await this.updateSystemLoad()
      this.clearExpiredPreloads()
    }, 30000)
  }

  // Helper methods (simplified implementations)
  private async findCommonPatterns(contexts: TaskContext[]): Promise<any[]> {
    // Simplified pattern detection
    return [
      { description: "File operations followed by code analysis", frequency: 0.7, avgTimeToNext: 10000 },
      { description: "Web scraping followed by data processing", frequency: 0.5, avgTimeToNext: 15000 }
    ]
  }

  private async getToolsForPattern(pattern: any): Promise<string[]> {
    // Simplified tool mapping
    if (pattern.description.includes("File operations")) {
      return ["read_file", "write_to_file", "list_files"]
    }
    if (pattern.description.includes("Web scraping")) {
      return ["tavily-search", "tavily-extract"]
    }
    return []
  }

  private calculateContextRelevance(tool: ToolIntelligenceMetadata, entities: any): number {
    // Simplified relevance calculation
    let relevance = 0.1
    
    for (const domain of tool.domains) {
      if (entities.concepts.includes(domain)) {
        relevance += 0.3
      }
    }
    
    for (const tech of tool.contextualRelevance.technologies) {
      if (entities.technologies.includes(tech)) {
        relevance += 0.2
      }
    }
    
    return Math.min(relevance, 1.0)
  }

  private calculatePreloadPriority(probability: number, confidence: number): "low" | "medium" | "high" | "critical" {
    const score = probability * confidence
    
    if (score > 0.8) {return "critical"}
    if (score > 0.6) {return "high"}
    if (score > 0.4) {return "medium"}
    return "low"
  }

  private getHighestPriority(priorities: ("low" | "medium" | "high" | "critical")[]): "low" | "medium" | "high" | "critical" {
    const priorityOrder = ["critical", "high", "medium", "low"]
    for (const priority of priorityOrder) {
      if (priorities.includes(priority as any)) {
        return priority as any
      }
    }
    return "low"
  }

  private extractToolSequences(contexts: TaskContext[]): string[][] {
    // Simplified sequence extraction
    return [["read_file", "analyze_code"], ["search_web", "extract_data"]]
  }

  private async getNextToolsInWorkflow(lastTool: string): Promise<any[]> {
    // Simplified workflow prediction
    const workflows: Record<string, any[]> = {
      "read_file": [{ toolName: "analyze_code", probability: 0.8, avgTimeToNext: 5000 }],
      "search_web": [{ toolName: "extract_data", probability: 0.7, avgTimeToNext: 8000 }]
    }
    return workflows[lastTool] || []
  }

  private analyzeTimePatterns(history: TaskContext[], hourOfDay: number, dayOfWeek: number): any[] {
    // Simplified time pattern analysis
    return [
      { toolName: "read_file", frequency: 0.6, avgTimeToNext: 10000 },
      { toolName: "execute_command", frequency: 0.4, avgTimeToNext: 15000 }
    ]
  }
}
