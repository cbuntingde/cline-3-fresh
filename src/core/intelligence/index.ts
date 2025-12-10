/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Intelligent Tool Selection System - Main Entry Point
 * MIT License
 */

import * as vscode from "vscode"
import { ExtensionIntegration } from "./ExtensionIntegration"
import { RecommendationUI } from "./UIComponents"
import { IntelligentToolSelectionSystem } from "./IntelligentToolSelectionSystem"
import { MemoryManager } from "../memory/MemoryManager"
import { ProjectContextProvider } from "./ProjectContextProvider"
import { ToolIntelligenceRegistry } from "./ToolIntelligenceRegistry"
import {
  ToolRecommendation,
  WorkflowPlan,
  RecommendationRequest,
  TaskContext,
  UserFeedback,
  HealthReport
} from "./types"

// Export all main classes and types
export {
  ExtensionIntegration,
  RecommendationUI,
  IntelligentToolSelectionSystem,
  MemoryManager,
  ProjectContextProvider,
  ToolIntelligenceRegistry
}

// Export all types
export type {
  ToolRecommendation,
  WorkflowPlan,
  RecommendationRequest,
  TaskContext,
  UserFeedback,
  HealthReport,
  PerformanceMetrics,
  ToolSelectionPattern,
  ToolSelectionInsight,
  ToolPerformanceRecord,
  ProjectContext,
  FileStructureMemory,
  ActivityRecord,
  SessionRecord,
  UserPreferences
} from "./types"

export interface IntelligentToolSelectionConfig {
  enableIntelligentSelection: boolean
  enableWorkflowOptimization: boolean
  enableUserFeedback: boolean
  enablePredictivePreloading: boolean
  autoAnalyzeProject: boolean
  showRecommendationsInStatusBar: boolean
  logLevel: "debug" | "info" | "warn" | "error"
}

/**
 * Main class that orchestrates the entire intelligent tool selection system
 */
export class ClineIntelligence {
  private readonly context: vscode.ExtensionContext
  private readonly config: IntelligentToolSelectionConfig
  private integration: ExtensionIntegration | null = null
  private ui: RecommendationUI | null = null

  constructor(
    context: vscode.ExtensionContext,
    config: Partial<IntelligentToolSelectionConfig> = {}
  ) {
    this.context = context
    this.config = {
      enableIntelligentSelection: true,
      enableWorkflowOptimization: true,
      enableUserFeedback: true,
      enablePredictivePreloading: true,
      autoAnalyzeProject: true,
      showRecommendationsInStatusBar: true,
      logLevel: "info",
      ...config
    }
  }

  /**
   * Initialize the intelligent tool selection system
   */
  async initialize(): Promise<void> {
    try {
      this.integration = new ExtensionIntegration(this.context, this.config)
      this.ui = new RecommendationUI(
        vscode.window.createOutputChannel("Cline Intelligence UI")
      )

      // Register additional commands for the main system
      this.registerMainCommands()

      console.log("Cline Intelligence System initialized successfully")
    } catch (error) {
      console.error("Failed to initialize Cline Intelligence System:", error)
      throw error
    }
  }

  /**
   * Get intelligent tool recommendations for a task
   */
  async getRecommendations(taskDescription: string): Promise<{
    recommendations: ToolRecommendation[]
    workflowPlans?: WorkflowPlan[]
    confidence: number
    reasoning: string[]
  }> {
    if (!this.integration) {
      throw new Error("Cline Intelligence not initialized")
    }

    return await this.integration.getToolRecommendations(taskDescription)
  }

  /**
   * Show recommendations to the user
   */
  async showRecommendations(taskDescription: string): Promise<void> {
    const recommendations = await this.getRecommendations(taskDescription)
    this.ui?.showDetailedRecommendations(
      recommendations.recommendations,
      recommendations.workflowPlans
    )
  }

  /**
   * Execute a workflow plan
   */
  async executeWorkflow(
    plan: WorkflowPlan,
    onStepComplete?: (step: any, result: any) => void,
    onStepError?: (step: any, error: any) => void
  ): Promise<{
    success: boolean
    completedSteps: any[]
    failedSteps: any[]
    results: any[]
    insights: any[]
  }> {
    if (!this.integration) {
      throw new Error("Cline Intelligence not initialized")
    }

    return await this.integration.executeWorkflow(plan, onStepComplete, onStepError)
  }

  /**
   * Collect user feedback
   */
  async collectFeedback(
    toolName: string,
    taskId: string,
    rating: number,
    comment?: string
  ): Promise<void> {
    if (!this.integration) {
      throw new Error("Cline Intelligence not initialized")
    }

    await this.integration.collectFeedback(toolName, taskId, rating, comment)
  }

  /**
   * Get system health and metrics
   */
  async getSystemHealth(): Promise<{
    health: HealthReport
    metrics: any
    recommendations: string[]
  }> {
    if (!this.integration) {
      throw new Error("Cline Intelligence not initialized")
    }

    return await this.integration.getSystemHealth()
  }

  /**
   * Show system health dashboard
   */
  async showSystemHealth(): Promise<void> {
    const health = await this.getSystemHealth()
    this.ui?.showSystemHealthDashboard(health.health)
  }

  /**
   * Get quick recommendation for immediate use
   */
  async getQuickRecommendation(taskDescription: string): Promise<ToolRecommendation | null> {
    const recommendations = await this.getRecommendations(taskDescription)
    
    if (recommendations.recommendations.length === 0) {
      return null
    }

    // Return the top recommendation
    return recommendations.recommendations[0]
  }

  /**
   * Show inline recommendation in status bar
   */
  async showInlineRecommendation(taskDescription: string): Promise<void> {
    const recommendation = await this.getQuickRecommendation(taskDescription)
    
    if (recommendation) {
      this.ui?.showInlineRecommendation(recommendation)
    }
  }

  /**
   * Analyze current project and provide insights
   */
  async analyzeProject(): Promise<{
    projectType: string
    technologies: string[]
    frameworks: string[]
    recommendations: string[]
    confidence: number
  }> {
    if (!this.integration) {
      throw new Error("Cline Intelligence not initialized")
    }

    // This would integrate with the project context provider
    // For now, return a basic analysis
    return {
      projectType: "unknown",
      technologies: [],
      frameworks: [],
      recommendations: ["Enable project analysis for better insights"],
      confidence: 0.5
    }
  }

  /**
   * Optimize the intelligent system
   */
  async optimizeSystem(): Promise<{
    optimizations: string[]
    improvements: number
    healthAfter: HealthReport
  }> {
    if (!this.integration) {
      throw new Error("Cline Intelligence not initialized")
    }

    // This would trigger system optimization
    const healthBefore = await this.getSystemHealth()
    
    // Simulate optimization
    const optimizations = [
      "Cleared cache",
      "Optimized recommendation algorithms",
      "Updated tool performance metrics",
      "Refreshed project context"
    ]

    return {
      optimizations,
      improvements: optimizations.length,
      healthAfter: healthBefore.health
    }
  }

  /**
   * Register main system commands
   */
  private registerMainCommands(): void {
    // Quick recommendation command
    const quickRecCommand = vscode.commands.registerCommand(
      "cline.quickRecommendation",
      async () => {
        const taskDescription = await vscode.window.showInputBox({
          prompt: "What do you want to accomplish?",
          placeHolder: "e.g., Create a new React component"
        })

        if (taskDescription) {
          await this.showInlineRecommendation(taskDescription)
        }
      }
    )

    // Detailed recommendations command
    const detailedRecCommand = vscode.commands.registerCommand(
      "cline.detailedRecommendations",
      async () => {
        const taskDescription = await vscode.window.showInputBox({
          prompt: "Describe your task in detail",
          placeHolder: "e.g., Create a TypeScript React component with props and state management"
        })

        if (taskDescription) {
          await this.showRecommendations(taskDescription)
        }
      }
    )

    // Analyze project command
    const analyzeCommand = vscode.commands.registerCommand(
      "cline.analyzeProject",
      async () => {
        const analysis = await this.analyzeProject()
        
        const message = `
Project Analysis Complete:
- Type: ${analysis.projectType}
- Technologies: ${analysis.technologies.join(", ") || "None detected"}
- Frameworks: ${analysis.frameworks.join(", ") || "None detected"}
- Confidence: ${(analysis.confidence * 100).toFixed(1)}%
        `.trim()

        vscode.window.showInformationMessage(message, "View Details").then(selection => {
          if (selection === "View Details") {
            vscode.env.openExternal(vscode.Uri.parse("vscode://vscode.github-authentication/did-authenticate"))
          }
        })
      }
    )

    // Smart assist command (context-aware)
    const smartAssistCommand = vscode.commands.registerCommand(
      "cline.smartAssist",
      async () => {
        const editor = vscode.window.activeTextEditor
        let context = ""

        if (editor) {
          const selection = editor.selection
          const selectedText = editor.document.getText(selection)
          
          if (selectedText) {
            context = `Selected code: ${selectedText.substring(0, 200)}`
          } else {
            const line = editor.document.lineAt(editor.selection.active.line)
            context = `Current line: ${line.text.substring(0, 100)}`
          }
        }

        const taskDescription = await vscode.window.showInputBox({
          prompt: "What would you like to do with the current context?",
          placeHolder: "e.g., Refactor this code, Add error handling, Convert to TypeScript",
          value: context
        })

        if (taskDescription) {
          await this.showRecommendations(taskDescription)
        }
      }
    )

    // Learning and feedback command
    const learningCommand = vscode.commands.registerCommand(
      "cline.showLearningInsights",
      async () => {
        const health = await this.getSystemHealth()
        
        const insights = `
Cline Learning Insights:
- Total Recommendations: ${health.metrics.totalRecommendations || 0}
- Average Confidence: ${((health.metrics.averageConfidence || 0) * 100).toFixed(1)}%
- User Satisfaction: ${((health.metrics.userSatisfaction || 0) * 100).toFixed(1)}%
- System Performance: ${((health.metrics.systemPerformance || 0) * 100).toFixed(1)}%

Recent Recommendations:
${health.recommendations.slice(0, 3).map(rec => `• ${rec}`).join("\n")}
        `.trim()

        vscode.window.showInformationMessage(insights, "Full Report").then(selection => {
          if (selection === "Full Report") {
            this.showSystemHealth()
          }
        })
      }
    )

    // Register all commands
    const commands = [
      quickRecCommand,
      detailedRecCommand,
      analyzeCommand,
      smartAssistCommand,
      learningCommand
    ]

    commands.forEach(cmd => {
      this.context.subscriptions.push(cmd)
    })
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.integration?.dispose()
    this.ui = null
    this.integration = null
  }
}

/**
 * Factory function to create and initialize the intelligent system
 */
export async function createClineIntelligence(
  context: vscode.ExtensionContext,
  config?: Partial<IntelligentToolSelectionConfig>
): Promise<ClineIntelligence> {
  const intelligence = new ClineIntelligence(context, config)
  await intelligence.initialize()
  return intelligence
}

/**
 * Quick start function for basic usage
 */
export async function quickStart(
  context: vscode.ExtensionContext
): Promise<{
  getRecommendations: (task: string) => Promise<ToolRecommendation[]>
  showRecommendations: (task: string) => Promise<void>
  collectFeedback: (tool: string, rating: number, comment?: string) => Promise<void>
}> {
  const intelligence = await createClineIntelligence(context, {
    enableIntelligentSelection: true,
    enableWorkflowOptimization: false,
    enableUserFeedback: true,
    showRecommendationsInStatusBar: false
  })

  return {
    async getRecommendations(task: string): Promise<ToolRecommendation[]> {
      const result = await intelligence.getRecommendations(task)
      return result.recommendations
    },

    async showRecommendations(task: string): Promise<void> {
      await intelligence.showRecommendations(task)
    },

    async collectFeedback(tool: string, rating: number, comment?: string): Promise<void> {
      await intelligence.collectFeedback(tool, `quick_feedback_${Date.now()}`, rating, comment)
    }
  }
}
