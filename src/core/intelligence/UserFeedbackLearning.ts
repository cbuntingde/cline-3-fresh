/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Intelligent Tool Selection System - User Feedback and Continuous Learning
 * MIT License
 */

import {
  ToolIntelligenceMetadata,
  TaskContext,
  ToolPerformanceRecord,
  UserFeedback,
  ToolSelectionPattern,
  ProcessingTask,
  ABTestConfig,
  ABTestResult,
  HealthReport
} from "./types"
import { ToolIntelligenceRegistry } from "./ToolIntelligenceRegistry"
import { ContextualToolScorer } from "./ContextualToolScorer"

export interface FeedbackAnalysis {
  overallSatisfaction: number
  toolSpecificScores: Map<string, number>
  commonIssues: string[]
  improvementAreas: string[]
  trendAnalysis: {
    improving: string[]
    declining: string[]
    stable: string[]
  }
}

export interface LearningInsight {
  type: "pattern_discovery" | "performance_optimization" | "user_preference" | "error_prevention"
  confidence: number
  description: string
  impact: "low" | "medium" | "high"
  actionableRecommendations: string[]
  supportingData: any
}

export interface AdaptiveLearningConfig {
  learningRate: number
  feedbackWeight: number
  patternThreshold: number
  adaptationFrequency: number // in hours
  minFeedbackCount: number
  confidenceThreshold: number
}

export class UserFeedbackLearning {
  private feedbackHistory: UserFeedback[] = []
  private learningInsights: LearningInsight[] = []
  private adaptationConfig: AdaptiveLearningConfig = {
    learningRate: 0.1,
    feedbackWeight: 0.3,
    patternThreshold: 0.7,
    adaptationFrequency: 24,
    minFeedbackCount: 5,
    confidenceThreshold: 0.8
  }
  private lastAdaptation = 0
  private abTests: Map<string, ABTestConfig> = new Map()
  private abTestResults: Map<string, ABTestResult> = new Map()

  constructor(
    private toolRegistry: ToolIntelligenceRegistry,
    private toolScorer: ContextualToolScorer
  ) {
    this.startContinuousLearning()
  }

  /**
   * Collect user feedback for tool execution
   */
  async collectFeedback(
    toolName: string,
    taskId: string,
    rating: number,
    comment?: string,
    context?: TaskContext
  ): Promise<void> {
    const feedback: UserFeedback = {
      toolName,
      taskId,
      rating,
      comment,
      timestamp: Date.now()
    }

    this.feedbackHistory.push(feedback)
    
    // Trigger immediate analysis for significant feedback
    if (rating <= 2 || rating >= 5) {
      await this.analyzeFeedbackImpact(feedback, context)
    }

    // Periodic adaptation
    if (this.shouldTriggerAdaptation()) {
      await this.performAdaptiveLearning()
    }
  }

  /**
   * Analyze collected feedback and generate insights
   */
  async analyzeFeedback(): Promise<FeedbackAnalysis> {
    if (this.feedbackHistory.length === 0) {
      return {
        overallSatisfaction: 0,
        toolSpecificScores: new Map(),
        commonIssues: [],
        improvementAreas: [],
        trendAnalysis: { improving: [], declining: [], stable: [] }
      }
    }

    const recentFeedback = this.getRecentFeedback(30) // Last 30 days
    const overallSatisfaction = this.calculateOverallSatisfaction(recentFeedback)
    const toolSpecificScores = this.calculateToolSpecificScores(recentFeedback)
    const commonIssues = this.extractCommonIssues(recentFeedback)
    const improvementAreas = this.identifyImprovementAreas(recentFeedback, toolSpecificScores)
    const trendAnalysis = this.analyzeTrends(recentFeedback)

    return {
      overallSatisfaction,
      toolSpecificScores,
      commonIssues,
      improvementAreas,
      trendAnalysis
    }
  }

  /**
   * Generate learning insights from feedback and performance data
   */
  async generateLearningInsights(): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = []

    // Pattern discovery insights
    const patternInsights = await this.discoverUsagePatterns()
    insights.push(...patternInsights)

    // Performance optimization insights
    const performanceInsights = await this.analyzePerformancePatterns()
    insights.push(...performanceInsights)

    // User preference insights
    const preferenceInsights = await this.analyzeUserPreferences()
    insights.push(...preferenceInsights)

    // Error prevention insights
    const errorInsights = await this.identifyErrorPatterns()
    insights.push(...errorInsights)

    // Sort by impact and confidence
    return insights.sort((a, b) => {
      const impactScore = { high: 3, medium: 2, low: 1 }
      const scoreA = impactScore[a.impact] * a.confidence
      const scoreB = impactScore[b.impact] * b.confidence
      return scoreB - scoreA
    })
  }

  /**
   * Create A/B test for tool selection improvements
   */
  async createABTest(config: ABTestConfig): Promise<string> {
    const testId = `ab_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.abTests.set(testId, config)
    
    console.log(`Created A/B test ${testId}: ${config.testName}`)
    return testId
  }

  /**
   * Record A/B test result
   */
  async recordABTestResult(
    testId: string,
    group: "control" | "variant",
    metrics: Record<string, number>
  ): Promise<void> {
    const config = this.abTests.get(testId)
    if (!config) {
      throw new Error(`A/B test ${testId} not found`)
    }

    // This would integrate with actual A/B test analysis
    // For now, store the result
    const existingResult = this.abTestResults.get(testId)
    if (existingResult) {
      // Update existing result
      // Implementation would depend on specific A/B test analysis
    } else {
      // Create new result
      const result: ABTestResult = {
        testName: config.testName,
        winner: "inconclusive",
        confidence: 0,
        metrics: {},
        recommendations: []
      }
      this.abTestResults.set(testId, result)
    }
  }

  /**
   * Get system health report based on feedback and learning
   */
  async getHealthReport(): Promise<HealthReport> {
    const feedbackAnalysis = await this.analyzeFeedback()
    const insights = await this.generateLearningInsights()
    
    const overallStatus = this.calculateOverallStatus(feedbackAnalysis, insights)
    const recommendationQuality = this.calculateRecommendationQuality(feedbackAnalysis)
    const systemPerformance = this.calculateSystemPerformance()
    const learningEffectiveness = this.calculateLearningEffectiveness(insights)
    const userSatisfaction = feedbackAnalysis.overallSatisfaction

    const issues = this.identifySystemIssues(feedbackAnalysis, insights)
    const recommendations = this.generateSystemRecommendations(feedbackAnalysis, insights)

    return {
      overallStatus,
      recommendationQuality,
      systemPerformance,
      learningEffectiveness,
      userSatisfaction,
      issues,
      recommendations,
      lastUpdated: Date.now()
    }
  }

  /**
   * Adapt tool selection based on learning
   */
  async adaptToolSelection(): Promise<{
    adaptedTools: string[]
    adaptations: string[]
    confidence: number
  }> {
    const insights = await this.generateLearningInsights()
    const highConfidenceInsights = insights.filter(insight => 
      insight.confidence >= this.adaptationConfig.confidenceThreshold
    )

    const adaptedTools: string[] = []
    const adaptations: string[] = []

    for (const insight of highConfidenceInsights) {
      try {
        const adaptation = await this.applyInsight(insight)
        if (adaptation) {
          adaptedTools.push(...adaptation.tools)
          adaptations.push(adaptation.description)
        }
      } catch (error) {
        console.error(`Failed to apply insight ${insight.type}:`, error)
      }
    }

    this.lastAdaptation = Date.now()

    return {
      adaptedTools: [...new Set(adaptedTools)],
      adaptations,
      confidence: highConfidenceInsights.length > 0 ? 
        highConfidenceInsights.reduce((sum, insight) => sum + insight.confidence, 0) / highConfidenceInsights.length : 0
    }
  }

  /**
   * Get feedback statistics for monitoring
   */
  getFeedbackStatistics(): {
    totalFeedback: number
    averageRating: number
    ratingDistribution: Record<number, number>
    mostRatedTools: string[]
    recentTrend: "improving" | "declining" | "stable"
  } {
    const totalFeedback = this.feedbackHistory.length
    const averageRating = totalFeedback > 0 ? 
      this.feedbackHistory.reduce((sum, feedback) => sum + feedback.rating, 0) / totalFeedback : 0

    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    const toolRatings = new Map<string, number[]>()

    for (const feedback of this.feedbackHistory) {
      ratingDistribution[feedback.rating]++
      
      const toolRatingsList = toolRatings.get(feedback.toolName) || []
      toolRatingsList.push(feedback.rating)
      toolRatings.set(feedback.toolName, toolRatingsList)
    }

    const mostRatedTools = Array.from(toolRatings.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5)
      .map(([toolName]) => toolName)

    const recentTrend = this.calculateRecentTrend()

    return {
      totalFeedback,
      averageRating,
      ratingDistribution,
      mostRatedTools,
      recentTrend
    }
  }

  // Private methods

  private startContinuousLearning(): void {
    // Run adaptive learning every 24 hours
    setInterval(async () => {
      if (this.shouldTriggerAdaptation()) {
        await this.performAdaptiveLearning()
      }
    }, this.adaptationConfig.adaptationFrequency * 60 * 60 * 1000)
  }

  private shouldTriggerAdaptation(): boolean {
    const timeSinceLastAdaptation = Date.now() - this.lastAdaptation
    const minFeedbackReached = this.feedbackHistory.length >= this.adaptationConfig.minFeedbackCount
    
    return timeSinceLastAdaptation >= this.adaptationConfig.adaptationFrequency * 60 * 60 * 1000 &&
           minFeedbackReached
  }

  private async performAdaptiveLearning(): Promise<void> {
    try {
      console.log("Starting adaptive learning cycle...")
      
      const adaptations = await this.adaptToolSelection()
      const insights = await this.generateLearningInsights()
      
      console.log(`Adaptive learning completed: ${adaptations.adaptedTools.length} tools adapted`)
      console.log(`Generated ${insights.length} learning insights`)
      
      this.lastAdaptation = Date.now()
    } catch (error) {
      console.error("Adaptive learning failed:", error)
    }
  }

  private async analyzeFeedbackImpact(feedback: UserFeedback, context?: TaskContext): Promise<void> {
    // Immediate analysis for significant feedback
    if (feedback.rating <= 2) {
      console.warn(`Negative feedback received for ${feedback.toolName}: ${feedback.comment}`)
      
      // Could trigger immediate investigation or alert
      await this.investigatePoorPerformance(feedback.toolName, context)
    } else if (feedback.rating >= 5) {
      console.log(`Excellent feedback for ${feedback.toolName}: ${feedback.comment}`)
      
      // Could reinforce positive patterns
      await this.reinforcePositivePatterns(feedback.toolName, context)
    }
  }

  private getRecentFeedback(days: number): UserFeedback[] {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000)
    return this.feedbackHistory.filter(feedback => feedback.timestamp >= cutoff)
  }

  private calculateOverallSatisfaction(feedback: UserFeedback[]): number {
    if (feedback.length === 0) {return 0}
    return feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
  }

  private calculateToolSpecificScores(feedback: UserFeedback[]): Map<string, number> {
    const toolScores = new Map<string, number[]>()
    
    for (const f of feedback) {
      const scores = toolScores.get(f.toolName) || []
      scores.push(f.rating)
      toolScores.set(f.toolName, scores)
    }
    
    const averageScores = new Map<string, number>()
    for (const [tool, scores] of toolScores.entries()) {
      averageScores.set(tool, scores.reduce((sum, score) => sum + score, 0) / scores.length)
    }
    
    return averageScores
  }

  private extractCommonIssues(feedback: UserFeedback[]): string[] {
    const issues: string[] = []
    
    for (const f of feedback) {
      if (f.rating <= 3 && f.comment) {
        // Simple keyword extraction for common issues
        const comment = f.comment.toLowerCase()
        
        if (comment.includes("slow") || comment.includes("timeout")) {
          issues.push("Performance issues")
        }
        if (comment.includes("error") || comment.includes("fail")) {
          issues.push("Reliability problems")
        }
        if (comment.includes("confusing") || comment.includes("unclear")) {
          issues.push("Usability concerns")
        }
        if (comment.includes("wrong") || comment.includes("incorrect")) {
          issues.push("Accuracy issues")
        }
      }
    }
    
    // Count and return most common issues
    const issueCounts = new Map<string, number>()
    for (const issue of issues) {
      issueCounts.set(issue, (issueCounts.get(issue) || 0) + 1)
    }
    
    return Array.from(issueCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([issue]) => issue)
  }

  private identifyImprovementAreas(
    feedback: UserFeedback[], 
    toolScores: Map<string, number>
  ): string[] {
    const improvements: string[] = []
    
    // Find tools with low ratings
    for (const [tool, score] of toolScores.entries()) {
      if (score < 3.0) {
        improvements.push(`Improve ${tool} performance and reliability`)
      }
    }
    
    // Find common themes in low-rated feedback
    const lowRatedFeedback = feedback.filter(f => f.rating <= 2)
    const commonThemes = this.extractCommonIssues(lowRatedFeedback)
    improvements.push(...commonThemes)
    
    return [...new Set(improvements)]
  }

  private analyzeTrends(feedback: UserFeedback[]): {
    improving: string[]
    declining: string[]
    stable: string[]
  } {
    const toolTrends = new Map<string, number[]>()
    
    // Group feedback by tool and sort by time
    for (const f of feedback) {
      const trends = toolTrends.get(f.toolName) || []
      trends.push(f.rating)
      toolTrends.set(f.toolName, trends)
    }
    
    const improving: string[] = []
    const declining: string[] = []
    const stable: string[] = []
    
    for (const [tool, ratings] of toolTrends.entries()) {
      if (ratings.length < 3) {
        stable.push(tool)
        continue
      }
      
      const recent = ratings.slice(-Math.ceil(ratings.length / 2))
      const older = ratings.slice(0, Math.floor(ratings.length / 2))
      
      const recentAvg = recent.reduce((sum, r) => sum + r, 0) / recent.length
      const olderAvg = older.reduce((sum, r) => sum + r, 0) / older.length
      
      const difference = recentAvg - olderAvg
      
      if (difference > 0.5) {
        improving.push(tool)
      } else if (difference < -0.5) {
        declining.push(tool)
      } else {
        stable.push(tool)
      }
    }
    
    return { improving, declining, stable }
  }

  private async discoverUsagePatterns(): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = []
    
    // Analyze successful tool combinations
    const successfulPatterns = this.analyzeSuccessfulPatterns()
    if (successfulPatterns.length > 0) {
      insights.push({
        type: "pattern_discovery",
        confidence: 0.8,
        description: `Discovered ${successfulPatterns.length} successful tool usage patterns`,
        impact: "medium",
        actionableRecommendations: [
          "Incorporate successful patterns into tool selection logic",
          "Prioritize tools that work well together"
        ],
        supportingData: { patterns: successfulPatterns }
      })
    }
    
    return insights
  }

  private async analyzePerformancePatterns(): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = []
    
    // Find tools with consistent performance issues
    const problematicTools = this.identifyProblematicTools()
    if (problematicTools.length > 0) {
      insights.push({
        type: "performance_optimization",
        confidence: 0.9,
        description: `Identified ${problematicTools.length} tools with performance issues`,
        impact: "high",
        actionableRecommendations: [
          "Review and optimize problematic tools",
          "Consider alternative tools for affected use cases"
        ],
        supportingData: { tools: problematicTools }
      })
    }
    
    return insights
  }

  private async analyzeUserPreferences(): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = []
    
    // Analyze user preference patterns
    const preferencePatterns = this.identifyPreferencePatterns()
    if (preferencePatterns.length > 0) {
      insights.push({
        type: "user_preference",
        confidence: 0.7,
        description: `Identified ${preferencePatterns.length} user preference patterns`,
        impact: "medium",
        actionableRecommendations: [
          "Personalize tool selection based on user preferences",
          "Adapt interface to match user behavior patterns"
        ],
        supportingData: { patterns: preferencePatterns }
      })
    }
    
    return insights
  }

  private async identifyErrorPatterns(): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = []
    
    // Find common error patterns
    const errorPatterns = this.identifyCommonErrors()
    if (errorPatterns.length > 0) {
      insights.push({
        type: "error_prevention",
        confidence: 0.8,
        description: `Identified ${errorPatterns.length} common error patterns`,
        impact: "high",
        actionableRecommendations: [
          "Implement preventive measures for common errors",
          "Add validation and guidance for error-prone scenarios"
        ],
        supportingData: { errors: errorPatterns }
      })
    }
    
    return insights
  }

  // Helper methods (simplified implementations)
  private async investigatePoorPerformance(toolName: string, context?: TaskContext): Promise<void> {
    console.log(`Investigating poor performance for ${toolName}`)
    // Implementation would analyze performance data and identify root causes
  }

  private async reinforcePositivePatterns(toolName: string, context?: TaskContext): Promise<void> {
    console.log(`Reinforcing positive patterns for ${toolName}`)
    // Implementation would strengthen successful patterns
  }

  private calculateRecentTrend(): "improving" | "declining" | "stable" {
    const recentFeedback = this.getRecentFeedback(7) // Last 7 days
    const olderFeedback = this.feedbackHistory.filter(f => 
      f.timestamp < Date.now() - 7 * 24 * 60 * 60 * 1000 &&
      f.timestamp >= Date.now() - 14 * 24 * 60 * 60 * 1000
    ) // 7-14 days ago
    
    if (recentFeedback.length === 0 || olderFeedback.length === 0) {
      return "stable"
    }
    
    const recentAvg = this.calculateOverallSatisfaction(recentFeedback)
    const olderAvg = this.calculateOverallSatisfaction(olderFeedback)
    
    const difference = recentAvg - olderAvg
    
    if (difference > 0.3) {return "improving"}
    if (difference < -0.3) {return "declining"}
    return "stable"
  }

  private calculateOverallStatus(feedbackAnalysis: FeedbackAnalysis, insights: LearningInsight[]): "healthy" | "degraded" | "critical" {
    const satisfactionScore = feedbackAnalysis.overallSatisfaction
    const highImpactIssues = insights.filter(i => i.impact === "high").length
    
    if (satisfactionScore >= 4.0 && highImpactIssues === 0) {return "healthy"}
    if (satisfactionScore >= 3.0 && highImpactIssues <= 2) {return "degraded"}
    return "critical"
  }

  private calculateRecommendationQuality(feedbackAnalysis: FeedbackAnalysis): number {
    // Simplified calculation based on feedback scores
    return Math.min(feedbackAnalysis.overallSatisfaction / 5, 1.0)
  }

  private calculateSystemPerformance(): number {
    // Simplified performance calculation
    const recentFeedback = this.getRecentFeedback(7)
    if (recentFeedback.length === 0) {return 0.5}
    
    const performanceRatings = recentFeedback.filter(f => 
      f.comment && f.comment.toLowerCase().includes("performance")
    )
    
    if (performanceRatings.length === 0) {return 0.7}
    
    return performanceRatings.reduce((sum, f) => sum + f.rating, 0) / performanceRatings.length / 5
  }

  private calculateLearningEffectiveness(insights: LearningInsight[]): number {
    if (insights.length === 0) {return 0.5}
    
    const highConfidenceInsights = insights.filter(i => i.confidence >= 0.8)
    return Math.min(highConfidenceInsights.length / insights.length, 1.0)
  }

  private identifySystemIssues(feedbackAnalysis: FeedbackAnalysis, insights: LearningInsight[]): string[] {
    const issues: string[] = []
    
    if (feedbackAnalysis.overallSatisfaction < 3.0) {
      issues.push("Low user satisfaction")
    }
    
    if (feedbackAnalysis.commonIssues.length > 3) {
      issues.push("Multiple recurring issues")
    }
    
    const highImpactInsights = insights.filter(i => i.impact === "high")
    if (highImpactInsights.length > 2) {
      issues.push("Multiple high-impact problems")
    }
    
    return issues
  }

  private generateSystemRecommendations(feedbackAnalysis: FeedbackAnalysis, insights: LearningInsight[]): string[] {
    const recommendations: string[] = []
    
    for (const insight of insights) {
      recommendations.push(...insight.actionableRecommendations)
    }
    
    if (feedbackAnalysis.overallSatisfaction < 3.5) {
      recommendations.push("Focus on improving user satisfaction")
    }
    
    return [...new Set(recommendations)].slice(0, 10) // Limit to top 10
  }

  private async applyInsight(insight: LearningInsight): Promise<{
    tools: string[]
    description: string
  } | null> {
    // Simplified insight application
    switch (insight.type) {
      case "performance_optimization":
        return {
          tools: insight.supportingData.tools || [],
          description: `Applied performance optimization: ${insight.description}`
        }
      case "pattern_discovery":
        return {
          tools: [],
          description: `Applied pattern discovery: ${insight.description}`
        }
      default:
        return null
    }
  }

  // Simplified helper methods
  private analyzeSuccessfulPatterns(): any[] {
    return [
      { pattern: "read_file -> analyze_code", success: 0.9 },
      { pattern: "search_web -> extract_data", success: 0.8 }
    ]
  }

  private identifyProblematicTools(): string[] {
    const toolScores = this.calculateToolSpecificScores(this.feedbackHistory)
    return Array.from(toolScores.entries())
      .filter(([, score]) => score < 3.0)
      .map(([tool]) => tool)
  }

  private identifyPreferencePatterns(): any[] {
    return [
      { pattern: "prefers_read_file_over_list_files", confidence: 0.7 },
      { pattern: "uses_web_search_frequently", confidence: 0.6 }
    ]
  }

  private identifyCommonErrors(): any[] {
    return [
      { error: "timeout_on_large_files", frequency: 0.4 },
      { error: "network_connection_failed", frequency: 0.3 }
    ]
  }
}
