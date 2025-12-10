/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Intelligent Tool Selection System - Extension Integration
 * MIT License
 */

import * as vscode from "vscode"
import { IntelligentToolSelectionSystem } from "./IntelligentToolSelectionSystem"
import { MemoryManager } from "../memory/MemoryManager"
import { ProjectContextProvider } from "./ProjectContextProvider"
import { ToolIntelligenceRegistry } from "./ToolIntelligenceRegistry"
import {
  ToolRecommendation,
  RecommendationRequest,
  TaskContext,
  UserFeedback,
  WorkflowPlan
} from "./types"

export interface ExtensionIntegrationConfig {
  enableIntelligentSelection: boolean
  enableWorkflowOptimization: boolean
  enableUserFeedback: boolean
  enablePredictivePreloading: boolean
  autoAnalyzeProject: boolean
  showRecommendationsInStatusBar: boolean
  logLevel: "debug" | "info" | "warn" | "error"
}

export class ExtensionIntegration {
  private readonly context: vscode.ExtensionContext
  private readonly outputChannel: vscode.OutputChannel
  private readonly config: ExtensionIntegrationConfig
  
  private intelligentSystem: IntelligentToolSelectionSystem | null = null
  private memoryManager: MemoryManager | null = null
  private projectContextProvider: ProjectContextProvider | null = null
  private toolRegistry: ToolIntelligenceRegistry | null = null
  
  private statusBarItem: vscode.StatusBarItem | null = null
  private disposables: vscode.Disposable[] = []

  constructor(
    context: vscode.ExtensionContext,
    config: Partial<ExtensionIntegrationConfig> = {}
  ) {
    this.context = context
    this.outputChannel = vscode.window.createOutputChannel("Cline Intelligence")
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

    this.initialize()
  }

  /**
   * Initialize the intelligent tool selection system
   */
  private async initialize(): Promise<void> {
    try {
      this.log("Initializing Cline Intelligent Tool Selection System...")

      // Initialize core components
      this.memoryManager = new MemoryManager(this.context, this.outputChannel)
      this.projectContextProvider = new ProjectContextProvider(this.context, this.outputChannel)
      this.toolRegistry = new ToolIntelligenceRegistry(this.context, this.outputChannel, this.memoryManager)
      
      // Initialize the main intelligent system
      this.intelligentSystem = new IntelligentToolSelectionSystem({
        enableCaching: true,
        enablePredictivePreloading: this.config.enablePredictivePreloading,
        enableUserFeedback: this.config.enableUserFeedback,
        enableWorkflowComposition: this.config.enableWorkflowOptimization,
        cacheSize: 1000,
        preloadThreshold: 0.7,
        learningRate: 0.1,
        adaptationFrequency: 24
      })

      // Initialize the system
      await this.intelligentSystem.initialize()

      // Initialize project context if workspace is available
      if (vscode.workspace.workspaceFolders?.[0]) {
        await this.initializeProjectContext()
      }

      // Register commands and event handlers
      this.registerCommands()
      this.registerEventHandlers()

      // Create status bar item if enabled
      if (this.config.showRecommendationsInStatusBar) {
        this.createStatusBarItem()
      }

      this.log("Cline Intelligent Tool Selection System initialized successfully")

    } catch (error) {
      this.logError("Failed to initialize intelligent system", error)
      vscode.window.showErrorMessage(`Failed to initialize Cline Intelligence: ${error}`)
    }
  }

  /**
   * Initialize project context for current workspace
   */
  private async initializeProjectContext(): Promise<void> {
    if (!this.projectContextProvider || !this.memoryManager) {return}

    try {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
      if (!workspaceRoot) {return}

      // Load project memory
      await this.memoryManager.loadProjectMemory(workspaceRoot)

      this.log(`Project context initialized for: ${workspaceRoot}`)

    } catch (error) {
      this.logError("Failed to initialize project context", error)
    }
  }

  /**
   * Get intelligent tool recommendations
   */
  async getToolRecommendations(taskDescription: string): Promise<{
    recommendations: ToolRecommendation[]
    workflowPlans?: WorkflowPlan[]
    confidence: number
    reasoning: string[]
  }> {
    if (!this.intelligentSystem || !this.config.enableIntelligentSelection) {
      return {
        recommendations: [],
        confidence: 0,
        reasoning: ["Intelligent selection is disabled"]
      }
    }

    try {
      // Get current project context
      const projectAnalysis = await this.projectContextProvider?.getProjectContext()
      if (!projectAnalysis) {
        throw new Error("No project context available")
      }

      // Create recommendation request
      const request: RecommendationRequest = {
        taskDescription,
        projectContext: projectAnalysis.projectContext,
        availableTools: await this.toolRegistry?.getAllToolNames() || []
      }

      // Get recommendations
      const result = await this.intelligentSystem.getRecommendations(request)

      // Record activity for learning
      this.projectContextProvider?.recordActivity({
        type: "tool_use",
        description: `Requested recommendations for: ${taskDescription}`,
        success: true
      })

      return {
        recommendations: result.recommendations,
        workflowPlans: result.workflowPlans,
        confidence: result.confidence,
        reasoning: result.reasoning
      }

    } catch (error) {
      this.logError("Failed to get tool recommendations", error)
      return {
        recommendations: [],
        confidence: 0,
        reasoning: [`Error: ${error}`]
      }
    }
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
    if (!this.intelligentSystem || !this.config.enableWorkflowOptimization) {
      throw new Error("Workflow optimization is disabled")
    }

    try {
      // Get current task context
      const projectAnalysis = await this.projectContextProvider?.getProjectContext()
      if (!projectAnalysis) {
        throw new Error("No project context available")
      }

      const taskContext: TaskContext = {
        userRequest: plan.description,
        projectType: projectAnalysis.projectContext.projectType,
        technologies: projectAnalysis.projectContext.technologies,
        fileStructure: projectAnalysis.fileStructure,
        recentActivity: this.projectContextProvider?.getRecentActivities() || [],
        userPreferences: await this.projectContextProvider?.getUserPreferences() || {
          codingStyle: "functional",
          commentingStyle: "detailed",
          namingConventions: [],
          preferredLibraries: [],
          avoidancePatterns: [],
          communicationStyle: "professional"
        },
        sessionHistory: this.projectContextProvider?.getCurrentSession() ? [this.projectContextProvider.getCurrentSession()!] : []
      }

      // Execute workflow
      const result = await this.intelligentSystem.executeWorkflow(
        plan,
        taskContext,
        onStepComplete,
        onStepError
      )

      // Record activity
      this.projectContextProvider?.recordActivity({
        type: "tool_use",
        description: `Executed workflow: ${plan.description}`,
        success: result.success,
        duration: result.executionTime
      })

      return result

    } catch (error) {
      this.logError("Failed to execute workflow", error)
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
    comment?: string
  ): Promise<void> {
    if (!this.intelligentSystem || !this.config.enableUserFeedback) {return}

    try {
      // Get current task context
      const projectAnalysis = await this.projectContextProvider?.getProjectContext()
      
      const taskContext: TaskContext = {
        userRequest: taskId,
        projectType: projectAnalysis?.projectContext.projectType || "unknown",
        technologies: projectAnalysis?.projectContext.technologies || [],
        fileStructure: projectAnalysis?.fileStructure || {
          importantFiles: [],
          frequentlyModified: [],
          filePurposes: {},
          directories: [],
          entryPoints: []
        },
        recentActivity: this.projectContextProvider?.getRecentActivities() || [],
        userPreferences: await this.projectContextProvider?.getUserPreferences() || {
          codingStyle: "functional",
          commentingStyle: "detailed",
          namingConventions: [],
          preferredLibraries: [],
          avoidancePatterns: [],
          communicationStyle: "professional"
        },
        sessionHistory: this.projectContextProvider?.getCurrentSession() ? [this.projectContextProvider.getCurrentSession()!] : []
      }

      // Collect feedback
      await this.intelligentSystem.collectFeedback(toolName, taskId, rating, comment, taskContext)

      // Show feedback confirmation
      vscode.window.showInformationMessage(`Thank you for your feedback on ${toolName}!`)

    } catch (error) {
      this.logError("Failed to collect feedback", error)
    }
  }

  /**
   * Get system health and metrics
   */
  async getSystemHealth(): Promise<{
    health: any
    metrics: any
    recommendations: string[]
  }> {
    if (!this.intelligentSystem) {
      return {
        health: { overallStatus: "critical" as const },
        metrics: {},
        recommendations: ["Intelligent system not initialized"]
      }
    }

    try {
      const healthReport = await this.intelligentSystem.getSystemHealth()
      const metrics = this.intelligentSystem.getMetrics()

      return {
        health: healthReport.healthReport,
        metrics,
        recommendations: healthReport.recommendations
      }

    } catch (error) {
      this.logError("Failed to get system health", error)
      return {
        health: { overallStatus: "critical" as const },
        metrics: {},
        recommendations: [`Error: ${error}`]
      }
    }
  }

  /**
   * Register VSCode commands
   */
  private registerCommands(): void {
    // Get recommendations command
    const getRecommendationsCommand = vscode.commands.registerCommand(
      "cline.getIntelligentRecommendations",
      async () => {
        const taskDescription = await vscode.window.showInputBox({
          prompt: "Describe the task you want to accomplish",
          placeHolder: "e.g., Create a React component with TypeScript"
        })

        if (taskDescription) {
          const recommendations = await this.getToolRecommendations(taskDescription)
          this.showRecommendations(recommendations)
        }
      }
    )

    // Show system health command
    const showHealthCommand = vscode.commands.registerCommand(
      "cline.showSystemHealth",
      async () => {
        const health = await this.getSystemHealth()
        this.showSystemHealth(health)
      }
    )

    // Provide feedback command
    const provideFeedbackCommand = vscode.commands.registerCommand(
      "cline.provideFeedback",
      async () => {
        const toolName = await vscode.window.showInputBox({
          prompt: "Which tool do you want to provide feedback for?",
          placeHolder: "e.g., read_file, write_to_file"
        })

        if (!toolName) {return}

        const rating = await vscode.window.showQuickPick([
          { label: "⭐⭐⭐⭐⭐ (5)", value: 5 },
          { label: "⭐⭐⭐⭐ (4)", value: 4 },
          { label: "⭐⭐⭐ (3)", value: 3 },
          { label: "⭐⭐ (2)", value: 2 },
          { label: "⭐ (1)", value: 1 }
        ], { placeHolder: "Rate your experience" })

        if (rating) {
          const comment = await vscode.window.showInputBox({
            prompt: "Additional comments (optional)",
            placeHolder: "What went well or what could be improved?"
          })

          await this.collectFeedback(toolName, `manual_feedback_${Date.now()}`, rating.value, comment)
        }
      }
    )

    // Optimize system command
    const optimizeCommand = vscode.commands.registerCommand(
      "cline.optimizeSystem",
      async () => {
        if (!this.intelligentSystem) {return}

        const optimization = await this.intelligentSystem.optimizeSystem()
        vscode.window.showInformationMessage(
          `System optimized: ${optimization.optimizations.length} improvements applied`
        )
      }
    )

    this.disposables.push(
      getRecommendationsCommand,
      showHealthCommand,
      provideFeedbackCommand,
      optimizeCommand
    )
  }

  /**
   * Register event handlers
   */
  private registerEventHandlers(): void {
    // Workspace folder change
    const workspaceChangeHandler = vscode.workspace.onDidChangeWorkspaceFolders(async () => {
      if (this.config.autoAnalyzeProject) {
        await this.initializeProjectContext()
      }
    })

    // Document change for activity tracking
    const documentChangeHandler = vscode.workspace.onDidChangeTextDocument((event) => {
      if (this.projectContextProvider) {
        this.projectContextProvider.recordActivity({
          type: "file_edit",
          description: `Edited ${event.document.fileName}`,
          success: true
        })
      }
    })

    // Extension activation
    const activationHandler = vscode.workspace.onDidOpenTextDocument(async () => {
      if (this.config.autoAnalyzeProject && !this.projectContextProvider?.getCurrentSession()) {
        await this.projectContextProvider?.startNewSession()
      }
    })

    this.disposables.push(workspaceChangeHandler, documentChangeHandler, activationHandler)
  }

  /**
   * Create status bar item
   */
  private createStatusBarItem(): void {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    )

    this.statusBarItem.text = "$(lightbulb) Cline AI"
    this.statusBarItem.tooltip = "Cline Intelligent Tool Selection"
    this.statusBarItem.command = "cline.getIntelligentRecommendations"

    this.statusBarItem.show()
    this.disposables.push(this.statusBarItem)
  }

  /**
   * Show recommendations to user
   */
  private showRecommendations(recommendations: any): void {
    if (recommendations.recommendations.length === 0) {
      vscode.window.showInformationMessage("No recommendations available for this task.")
      return
    }

    const topRecommendation = recommendations.recommendations[0]
    const message = `Recommended: ${topRecommendation.tool.name} (${(topRecommendation.confidence * 100).toFixed(1)}% confidence)`

    vscode.window.showInformationMessage(
      message,
      "View Details",
      "Execute Workflow"
    ).then(async (selection) => {
      if (selection === "View Details") {
        this.showRecommendationDetails(recommendations)
      } else if (selection === "Execute Workflow" && recommendations.workflowPlans?.length) {
        const plan = recommendations.workflowPlans[0]
        try {
          await this.executeWorkflow(plan)
          vscode.window.showInformationMessage("Workflow executed successfully!")
        } catch (error) {
          vscode.window.showErrorMessage(`Workflow execution failed: ${error}`)
        }
      }
    })
  }

  /**
   * Show detailed recommendation information
   */
  private showRecommendationDetails(recommendations: any): void {
    const panel = vscode.window.createWebviewPanel(
      "clineRecommendations",
      "Cline Tool Recommendations",
      vscode.ViewColumn.One,
      { enableScripts: true }
    )

    const html = this.generateRecommendationsHtml(recommendations)
    panel.webview.html = html
  }

  /**
   * Generate HTML for recommendations display
   */
  private generateRecommendationsHtml(recommendations: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cline Tool Recommendations</title>
        <style>
          body { font-family: var(--vscode-font-family); padding: 20px; }
          .recommendation { border: 1px solid var(--vscode-panel-border); margin: 10px 0; padding: 15px; border-radius: 5px; }
          .tool-name { font-weight: bold; color: var(--vscode-textLink-foreground); }
          .confidence { color: var(--vscode-charts-green); }
          .reasoning { margin-top: 10px; color: var(--vscode-descriptionForeground); }
          .workflow { background: var(--vscode-textBlockQuote-background); padding: 10px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <h2>Intelligent Tool Recommendations</h2>
        <p><strong>Overall Confidence:</strong> ${(recommendations.confidence * 100).toFixed(1)}%</p>
        
        <h3>Recommended Tools</h3>
        ${recommendations.recommendations.map((rec: any) => `
          <div class="recommendation">
            <div class="tool-name">${rec.tool.name}</div>
            <div class="confidence">Confidence: ${(rec.confidence * 100).toFixed(1)}%</div>
            <div class="reasoning">${rec.reasoning}</div>
          </div>
        `).join('')}
        
        ${recommendations.workflowPlans?.length ? `
          <h3>Workflow Plans</h3>
          ${recommendations.workflowPlans.map((plan: any) => `
            <div class="workflow">
              <strong>${plan.description}</strong>
              <p>Steps: ${plan.steps.length}</p>
              <p>Estimated Time: ${(plan.estimatedTotalTime / 1000).toFixed(1)}s</p>
            </div>
          `).join('')}
        ` : ''}
        
        <h3>Reasoning</h3>
        <ul>
          ${recommendations.reasoning.map((reason: string) => `<li>${reason}</li>`).join('')}
        </ul>
      </body>
      </html>
    `
  }

  /**
   * Show system health information
   */
  private showSystemHealth(health: any): void {
    const panel = vscode.window.createWebviewPanel(
      "clineSystemHealth",
      "Cline System Health",
      vscode.ViewColumn.One,
      { enableScripts: true }
    )

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cline System Health</title>
        <style>
          body { font-family: var(--vscode-font-family); padding: 20px; }
          .health-status { padding: 10px; margin: 10px 0; border-radius: 5px; }
          .healthy { background: var(--vscode-testing-iconPassed); }
          .degraded { background: var(--vscode-testing-iconSkipped); }
          .critical { background: var(--vscode-testing-iconFailed); }
          .metric { margin: 5px 0; }
          .recommendation { background: var(--vscode-textBlockQuote-background); padding: 10px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <h2>Cline System Health</h2>
        
        <div class="health-status ${health.health.overallStatus}">
          <strong>Overall Status:</strong> ${health.health.overallStatus.toUpperCase()}
        </div>
        
        <h3>Metrics</h3>
        <div class="metric"><strong>Total Recommendations:</strong> ${health.metrics.totalRecommendations || 0}</div>
        <div class="metric"><strong>Average Confidence:</strong> ${((health.metrics.averageConfidence || 0) * 100).toFixed(1)}%</div>
        <div class="metric"><strong>Cache Hit Rate:</strong> ${((health.metrics.cacheHitRate || 0) * 100).toFixed(1)}%</div>
        <div class="metric"><strong>User Satisfaction:</strong> ${((health.metrics.userSatisfaction || 0) * 100).toFixed(1)}%</div>
        
        <h3>Recommendations</h3>
        ${health.recommendations.map((rec: string) => `
          <div class="recommendation">• ${rec}</div>
        `).join('')}
      </body>
      </html>
    `

    panel.webview.html = html
  }

  /**
   * Log message to output channel
   */
  private log(message: string): void {
    if (this.config.logLevel === "debug" || this.config.logLevel === "info") {
      this.outputChannel.appendLine(`[INFO] ${new Date().toISOString()}: ${message}`)
    }
  }

  /**
   * Log error to output channel
   */
  private logError(message: string, error: any): void {
    this.outputChannel.appendLine(`[ERROR] ${new Date().toISOString()}: ${message}`)
    this.outputChannel.appendLine(`[ERROR] ${error}`)
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.disposables.forEach(d => d.dispose())
    this.projectContextProvider?.dispose()
    this.outputChannel.dispose()
  }
}
