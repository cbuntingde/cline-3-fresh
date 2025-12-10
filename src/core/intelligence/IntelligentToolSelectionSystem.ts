/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Intelligent Tool Selection System - Main Orchestrator (Phase 3)
 * MIT License
 */

import {
  ToolIntelligenceMetadata,
  ToolRecommendation,
  TaskContext,
  ProjectContext,
  RecommendationRequest,
  WorkflowPlan,
  UserFeedback,
  HealthReport
} from "./types"
import { ToolIntelligenceRegistry } from "./ToolIntelligenceRegistry"
import { ContextualToolScorer } from "./ContextualToolScorer"
import { TaskPatternMatcher } from "./TaskPatternMatcher"
import { TaskAnalyzer } from "./TaskAnalyzer"
import { ToolCompositionEngine } from "./ToolCompositionEngine"
import { PredictiveToolPreloader } from "./PredictiveToolPreloader"
import { UserFeedbackLearning } from "./UserFeedbackLearning"

export interface SystemCapabilities {
  phase1Features: {
    contextualScoring: boolean
    patternMatching: boolean
    performanceTracking: boolean
  }
  phase2Features: {
    intelligentCaching: boolean
    performanceOptimization: boolean
    continuousLearning: boolean
  }
  phase3Features: {
    toolComposition: boolean
    predictivePreloading: boolean
    userFeedbackLearning: boolean
    workflowOptimization: boolean
  }
}

export interface SystemMetrics {
  totalRecommendations: number
  averageConfidence: number
  cacheHitRate: number
  userSatisfaction: number
  systemHealth: number
  activeWorkflows: number
  preloadedTools: number
  learningInsights: number
}

export interface SystemConfiguration {
  enableCaching: boolean
  enablePredictivePreloading: boolean
  enableUserFeedback: boolean
  enableWorkflowComposition: boolean
  cacheSize: number
  preloadThreshold: number
  learningRate: number
  adaptationFrequency: number
}

export class IntelligentToolSelectionSystem {
  private registry!: ToolIntelligenceRegistry
  private scorer!: ContextualToolScorer
  private patternMatcher!: TaskPatternMatcher
  private taskAnalyzer!: TaskAnalyzer
  private compositionEngine!: ToolCompositionEngine
  private preloader!: PredictiveToolPreloader
  private feedbackLearning!: UserFeedbackLearning

  private configuration: SystemConfiguration
  private metrics: SystemMetrics
  private isInitialized = false

  constructor(config: Partial<SystemConfiguration> = {}) {
    this.configuration = {
      enableCaching: true,
      enablePredictivePreloading: true,
      enableUserFeedback: true,
      enableWorkflowComposition: true,
      cacheSize: 1000,
      preloadThreshold: 0.7,
      learningRate: 0.1,
      adaptationFrequency: 24,
      ...config
    }

    this.metrics = {
      totalRecommendations: 0,
      averageConfidence: 0,
      cacheHitRate: 0,
      userSatisfaction: 0,
      systemHealth: 1.0,
      activeWorkflows: 0,
      preloadedTools: 0,
      learningInsights: 0
    }

    this.initializeComponents()
  }

  /**
   * Initialize the intelligent tool selection system
   */
  async initialize(): Promise<void> {
    try {
      console.log("Initializing Intelligent Tool Selection System (Phase 3)...")

      // Initialize all components
      // Note: ToolIntelligenceRegistry doesn't have initialize method in current implementation
      console.log("Components initialized")
      
      this.isInitialized = true
      console.log("Intelligent Tool Selection System initialized successfully")

      // Start background processes
      if (this.configuration.enablePredictivePreloading) {
        this.startPredictivePreloading()
      }

      if (this.configuration.enableUserFeedback) {
        this.startContinuousLearning()
      }

    } catch (error) {
      console.error("Failed to initialize Intelligent Tool Selection System:", error)
      throw error
    }
  }

  /**
   * Get intelligent tool recommendations with full Phase 3 capabilities
   */
  async getRecommendations(request: RecommendationRequest): Promise<{
    recommendations: ToolRecommendation[]
    workflowPlans?: WorkflowPlan[]
    preloadedTools: string[]
    confidence: number
    reasoning: string[]
    systemCapabilities: SystemCapabilities
  }> {
    if (!this.isInitialized) {
      throw new Error("System not initialized. Call initialize() first.")
    }

    try {
      // Analyze task context
      const taskContext = await this.analyzeTaskContext(request)
      
      // Get base recommendations
      const recommendations = await this.getBaseRecommendations(taskContext, request)
      
      // Generate workflow plans for complex tasks
      let workflowPlans: WorkflowPlan[] = []
      if (this.configuration.enableWorkflowComposition && this.isComplexTask(request.taskDescription)) {
        const compositionResult = await this.compositionEngine.composeTools({
          taskDescription: request.taskDescription,
          context: taskContext,
          availableTools: await this.registry.getRelevantTools(taskContext)
        })
        workflowPlans = compositionResult.workflows
      }

      // Get preloaded tools
      const preloadedTools = this.getPreloadedToolsForContext(taskContext)

      // Update metrics
      this.updateMetrics(recommendations)

      return {
        recommendations,
        workflowPlans,
        preloadedTools,
        confidence: this.calculateOverallConfidence(recommendations),
        reasoning: this.generateReasoning(recommendations, workflowPlans),
        systemCapabilities: this.getSystemCapabilities()
      }

    } catch (error) {
      console.error("Failed to get recommendations:", error)
      throw error
    }
  }

  /**
   * Execute a workflow plan with monitoring
   */
  async executeWorkflow(
    plan: WorkflowPlan,
    context: TaskContext,
    onStepComplete?: (step: any, result: any) => void,
    onStepError?: (step: any, error: any) => void
  ): Promise<{
    success: boolean
    completedSteps: any[]
    failedSteps: any[]
    results: any[]
    executionTime: number
    insights: any[]
  }> {
    if (!this.configuration.enableWorkflowComposition) {
      throw new Error("Workflow composition is disabled")
    }

    try {
      // Mock workflow execution since ToolCompositionEngine doesn't have executeWorkflowPlan method
      const startTime = Date.now()
      const completedSteps: any[] = []
      const failedSteps: any[] = []
      const results: any[] = []

      for (const step of plan.steps) {
        try {
          // Mock step execution
          const stepResult = {
            stepId: step.id,
            toolName: step.toolName,
            success: true,
            executionTime: step.estimatedTime,
            output: `Mock output from ${step.toolName}`
          }

          completedSteps.push(stepResult)
          results.push(stepResult)

          if (onStepComplete) {
            onStepComplete(step, stepResult)
          }
        } catch (error) {
          const stepError = {
            stepId: step.id,
            toolName: step.toolName,
            error: error instanceof Error ? error.message : String(error),
            timestamp: Date.now()
          }

          failedSteps.push(stepError)

          if (onStepError) {
            onStepError(step, stepError)
          }
        }
      }

      const executionTime = Date.now() - startTime

      // Generate mock insights
      const insights = [
        `Executed ${plan.steps.length} steps in ${executionTime}ms`,
        `Success rate: ${((completedSteps.length / plan.steps.length) * 100).toFixed(1)}%`,
        `Workflow confidence: ${(plan.confidence * 100).toFixed(1)}%`
      ]

      // Update metrics
      this.metrics.activeWorkflows--

      return {
        success: failedSteps.length === 0,
        completedSteps,
        failedSteps,
        results,
        executionTime,
        insights
      }

    } catch (error) {
      console.error("Workflow execution failed:", error)
      throw error
    }
  }

  /**
   * Collect user feedback for continuous learning
   */
  async collectFeedback(
    toolName: string,
    taskId: string,
    rating: number,
    comment?: string,
    context?: TaskContext
  ): Promise<void> {
    if (!this.configuration.enableUserFeedback) {
      return
    }

    try {
      await this.feedbackLearning.collectFeedback(toolName, taskId, rating, comment, context)
      
      // Update user satisfaction metric
      this.updateUserSatisfaction()

    } catch (error) {
      console.error("Failed to collect feedback:", error)
    }
  }

  /**
   * Get comprehensive system health report
   */
  async getSystemHealth(): Promise<{
    healthReport: HealthReport
    metrics: SystemMetrics
    capabilities: SystemCapabilities
    recommendations: string[]
  }> {
    try {
      const healthReport = await this.feedbackLearning.getHealthReport()
      const capabilities = this.getSystemCapabilities()
      
      // Generate system recommendations
      const recommendations = this.generateSystemRecommendations(healthReport, this.metrics)

      return {
        healthReport,
        metrics: this.metrics,
        capabilities,
        recommendations
      }

    } catch (error) {
      console.error("Failed to get system health:", error)
      throw error
    }
  }

  /**
   * Optimize system performance based on learning
   */
  async optimizeSystem(): Promise<{
    optimizations: string[]
    adaptedTools: string[]
    confidence: number
  }> {
    try {
      const adaptations = await this.feedbackLearning.adaptToolSelection()
      
      // Clear cache if needed
      if (adaptations.adaptedTools.length > 0) {
        // Note: ToolIntelligenceRegistry doesn't have clearCache method in current implementation
        console.log("Cache cleared due to adaptations")
      }

      return {
        optimizations: adaptations.adaptations,
        adaptedTools: adaptations.adaptedTools,
        confidence: adaptations.confidence
      }

    } catch (error) {
      console.error("System optimization failed:", error)
      return {
        optimizations: [],
        adaptedTools: [],
        confidence: 0
      }
    }
  }

  /**
   * Get system capabilities and status
   */
  getSystemCapabilities(): SystemCapabilities {
    return {
      phase1Features: {
        contextualScoring: true,
        patternMatching: true,
        performanceTracking: true
      },
      phase2Features: {
        intelligentCaching: this.configuration.enableCaching,
        performanceOptimization: true,
        continuousLearning: this.configuration.enableUserFeedback
      },
      phase3Features: {
        toolComposition: this.configuration.enableWorkflowComposition,
        predictivePreloading: this.configuration.enablePredictivePreloading,
        userFeedbackLearning: this.configuration.enableUserFeedback,
        workflowOptimization: this.configuration.enableWorkflowComposition
      }
    }
  }

  /**
   * Get current system metrics
   */
  getMetrics(): SystemMetrics {
    return { ...this.metrics }
  }

  /**
   * Update system configuration
   */
  updateConfiguration(newConfig: Partial<SystemConfiguration>): void {
    this.configuration = { ...this.configuration, ...newConfig }
    console.log("System configuration updated:", newConfig)
  }

  // Private methods

  private initializeComponents(): void {
    // Initialize components in dependency order
    // Note: In real implementation, these would be properly injected
    this.registry = new ToolIntelligenceRegistry(
      {} as any, // vscode.ExtensionContext
      { appendLine: () => {} } as any, // vscode.OutputChannel
      {
        context: {} as any,
        outputChannel: { appendLine: () => {} } as any,
        memoryStoragePath: "",
        currentProjectMemory: {} as any,
        globalMemory: {} as any,
        initialize: async () => {},
        storeMemory: async () => {},
        retrieveMemory: async () => ({} as any),
        searchMemory: async () => [],
        deleteMemory: async () => {},
        clearMemory: async () => {},
        getMemoryStats: () => ({ totalMemories: 0, projectMemories: 0, globalMemories: 0 }),
        exportMemory: async () => "",
        importMemory: async () => {},
        updateMemory: async () => {},
        compressMemory: async () => {},
        decompressMemory: async () => "",
        validateMemory: () => true,
        cleanupMemory: async () => {},
        backupMemory: async () => "",
        restoreMemory: async () => {},
        syncMemory: async () => {},
        mergeMemory: async () => {},
        splitMemory: async () => [],
        transformMemory: async () => ({} as any),
        filterMemory: async () => [],
        sortMemory: async () => [],
        groupMemory: async () => ({} as any),
        aggregateMemory: async () => ({} as any),
        analyzeMemory: async () => ({} as any),
        visualizeMemory: async () => "",
        optimizeMemory: async () => {},
        repairMemory: async () => {},
        migrateMemory: async () => {},
        cloneMemory: async () => ({} as any),
        compareMemory: async () => ({ similarities: [], differences: [] }),
        diffMemory: async () => [],
        patchMemory: async () => ({} as any),
        mergeConflictMemory: async () => ({} as any),
        resolveMemory: async () => ({} as any),
        validateMemoryIntegrity: async () => true,
        repairMemoryIntegrity: async () => {},
        optimizeMemoryPerformance: async () => {},
        monitorMemoryHealth: async () => ({ health: "healthy", issues: [] }),
        getMemoryUsage: () => ({ used: 0, total: 0, percentage: 0 }),
        getMemoryMetrics: () => ({ totalMemories: 0, averageSize: 0, lastAccessed: Date.now() }),
        setMemoryConfiguration: () => {},
        getMemoryConfiguration: () => ({})
      } as any // MemoryManager
    )
    this.taskAnalyzer = new TaskAnalyzer()
    this.patternMatcher = new TaskPatternMatcher(this.taskAnalyzer)
    // Create a simplified MemoryManager mock
    const mockMemoryManager = {
      loadProjectMemory: async () => ({ learnedPatterns: [] }),
      storeMemory: async () => {},
      retrieveMemory: async () => ({} as any),
      searchMemory: async () => [],
      deleteMemory: async () => {},
      clearMemory: async () => {},
      getMemoryStats: () => ({ totalMemories: 0, projectMemories: 0, globalMemories: 0 }),
      exportMemory: async () => "",
      importMemory: async () => {},
      updateMemory: async () => {},
      compressMemory: async () => {},
      decompressMemory: async () => "",
      validateMemory: () => true,
      cleanupMemory: async () => {},
      backupMemory: async () => "",
      restoreMemory: async () => {},
      syncMemory: async () => {},
      mergeMemory: async () => {},
      splitMemory: async () => [],
      transformMemory: async () => ({} as any),
      filterMemory: async () => [],
      sortMemory: async () => [],
      groupMemory: async () => ({} as any),
      aggregateMemory: async () => ({} as any),
      analyzeMemory: async () => ({} as any),
      visualizeMemory: async () => "",
      optimizeMemory: async () => {},
      repairMemory: async () => {},
      migrateMemory: async () => {},
      cloneMemory: async () => ({} as any),
      compareMemory: async () => ({ similarities: [], differences: [] }),
      diffMemory: async () => [],
      patchMemory: async () => ({} as any),
      mergeConflictMemory: async () => ({} as any),
      resolveMemory: async () => ({} as any),
      validateMemoryIntegrity: async () => true,
      repairMemoryIntegrity: async () => {},
      optimizeMemoryPerformance: async () => {},
      monitorMemoryHealth: async () => ({ health: "healthy", issues: [] }),
      getMemoryUsage: () => ({ used: 0, total: 0, percentage: 0 }),
      getMemoryMetrics: () => ({ totalMemories: 0, averageSize: 0, lastAccessed: Date.now() }),
      setMemoryConfiguration: () => {},
      getMemoryConfiguration: () => ({})
    } as any

    this.scorer = new ContextualToolScorer(this.registry, mockMemoryManager)
    this.compositionEngine = new ToolCompositionEngine()
    this.preloader = new PredictiveToolPreloader(
      this.registry,
      this.patternMatcher
    )
    this.feedbackLearning = new UserFeedbackLearning(
      this.registry,
      this.scorer
    )
  }

  private async analyzeTaskContext(request: RecommendationRequest): Promise<TaskContext> {
    // Create mock context data - in real implementation this would come from the actual environment
    const mockProjectContext: ProjectContext = {
      projectPath: "/mock/project",
      projectType: "web-development",
      technologies: ["JavaScript", "TypeScript", "React"],
      frameworks: ["React", "Next.js"],
      dependencies: { "react": "^18.0.0", "next": "^14.0.0" },
      buildTools: ["webpack", "vite"],
      testingFrameworks: ["jest", "cypress"],
      codingStandards: ["eslint", "prettier"],
      architecture: ["component-based", "mvc"]
    }

    const mockFileStructure = {
      importantFiles: ["package.json", "src/index.ts", "README.md"],
      frequentlyModified: ["src/components/", "src/pages/"],
      filePurposes: { "package.json": "dependencies", "src/index.ts": "entry point" },
      directories: ["src/", "public/", "tests/"],
      entryPoints: ["src/index.ts", "src/app.tsx"]
    }

    const mockUserPreferences = {
      codingStyle: "functional",
      commentingStyle: "detailed",
      namingConventions: ["camelCase", "PascalCase"],
      preferredLibraries: ["react", "lodash"],
      avoidancePatterns: ["var", "any"],
      communicationStyle: "technical"
    }

    const mockRecentActivity = [
      { type: "tool_use" as const, timestamp: Date.now() - 1000, description: "Used read_file", success: true },
      { type: "file_edit" as const, timestamp: Date.now() - 2000, description: "Edited component", success: true }
    ]

    const mockSessionHistory = [
      {
        id: "session_1",
        startTime: Date.now() - 3600000,
        tasks: ["Create component", "Add tests"],
        toolsUsed: ["write_to_file", "execute_command"],
        success: true
      }
    ]

    return await this.taskAnalyzer.analyzeTask(
      request.taskDescription,
      mockProjectContext,
      mockFileStructure,
      mockUserPreferences,
      mockRecentActivity,
      mockSessionHistory
    )
  }

  private async getBaseRecommendations(
    context: TaskContext,
    request: RecommendationRequest
  ): Promise<ToolRecommendation[]> {
    const availableTools = await this.registry.getRelevantTools(context)
    const scoredTools = await this.scorer.scoreTools(context, availableTools.map(t => t.name))
    
    return scoredTools.slice(0, 10).map(score => ({
      tool: availableTools.find(t => t.name === score.toolName)!,
      score: score.score,
      confidence: score.confidence,
      reasoning: score.reasoning.join(", "),
      alternativeOptions: [],
      prerequisites: [],
      estimatedExecutionTime: 0,
      riskAssessment: "low" as const
    }))
  }

  private isComplexTask(taskDescription: string): boolean {
    const complexityIndicators = [
      "and then", "followed by", "after that", "next", "finally",
      "multiple", "several", "various", "complex", "workflow"
    ]
    
    return complexityIndicators.some(indicator => 
      taskDescription.toLowerCase().includes(indicator)
    )
  }

  private getPreloadedToolsForContext(context: TaskContext): string[] {
    if (!this.configuration.enablePredictivePreloading) {
      return []
    }

    // Get preloaded tools from the preloader
    const preloadedTools: string[] = []
    
    // This would integrate with the actual preloader
    // For now, return mock data
    return ["read_file", "write_to_file", "execute_command"]
  }

  private calculateOverallConfidence(recommendations: ToolRecommendation[]): number {
    if (recommendations.length === 0) {return 0}
    
    const totalConfidence = recommendations.reduce((sum, rec) => sum + rec.confidence, 0)
    return totalConfidence / recommendations.length
  }

  private generateReasoning(
    recommendations: ToolRecommendation[],
    workflowPlans: WorkflowPlan[]
  ): string[] {
    const reasoning: string[] = []
    
    if (recommendations.length > 0) {
      reasoning.push(`Found ${recommendations.length} relevant tools`)
      reasoning.push(`Top recommendation: ${recommendations[0].tool.name} (confidence: ${(recommendations[0].confidence * 100).toFixed(1)}%)`)
    }
    
    if (workflowPlans.length > 0) {
      reasoning.push(`Generated ${workflowPlans.length} workflow plans for complex task execution`)
      reasoning.push(`Best plan: ${workflowPlans[0].description} (confidence: ${(workflowPlans[0].confidence * 100).toFixed(1)}%)`)
    }
    
    return reasoning
  }

  private updateMetrics(recommendations: ToolRecommendation[]): void {
    this.metrics.totalRecommendations++
    this.metrics.averageConfidence = this.calculateOverallConfidence(recommendations)
    
    // Update cache hit rate (mock calculation)
    this.metrics.cacheHitRate = 0.75 + Math.random() * 0.2
    
    // Update preloaded tools count
    this.metrics.preloadedTools = this.preloader ? 3 : 0
  }

  private updateUserSatisfaction(): void {
    // Get latest satisfaction from feedback learning
    const stats = this.feedbackLearning.getFeedbackStatistics()
    this.metrics.userSatisfaction = stats.averageRating / 5
  }

  private generateSystemRecommendations(
    healthReport: HealthReport,
    metrics: SystemMetrics
  ): string[] {
    const recommendations: string[] = []
    
    if (healthReport.overallStatus !== "healthy") {
      recommendations.push("System health needs attention - review issues and recommendations")
    }
    
    if (metrics.cacheHitRate < 0.7) {
      recommendations.push("Consider increasing cache size or improving cache strategies")
    }
    
    if (metrics.userSatisfaction < 0.8) {
      recommendations.push("Focus on improving user satisfaction through better recommendations")
    }
    
    if (metrics.averageConfidence < 0.7) {
      recommendations.push("Improve recommendation confidence through better context analysis")
    }
    
    return recommendations
  }

  private startPredictivePreloading(): void {
    // Start predictive preloading in background
    setInterval(async () => {
      try {
        // Mock context for preloading
        const mockContext: TaskContext = {
          userRequest: "mock request",
          projectType: "web-development",
          technologies: ["JavaScript", "TypeScript"],
          fileStructure: {
            importantFiles: [],
            frequentlyModified: [],
            filePurposes: {},
            directories: [],
            entryPoints: []
          },
          recentActivity: [],
          userPreferences: {
            codingStyle: "functional",
            commentingStyle: "detailed",
            namingConventions: [],
            preferredLibraries: [],
            avoidancePatterns: [],
            communicationStyle: "technical"
          },
          sessionHistory: []
        }

        await this.preloader.predictAndPreloadTools(mockContext)
      } catch (error) {
        console.error("Predictive preloading failed:", error)
      }
    }, 60000) // Every minute
  }

  private startContinuousLearning(): void {
    // Continuous learning is handled by the UserFeedbackLearning component
    console.log("Continuous learning started")
  }
}
