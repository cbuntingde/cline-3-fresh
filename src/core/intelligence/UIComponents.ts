/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Intelligent Tool Selection System - UI Components
 * MIT License
 */

import * as vscode from "vscode"
import {
  ToolRecommendation,
  WorkflowPlan,
  HealthReport
} from "./types"

export interface RecommendationDisplayOptions {
  showConfidence: boolean
  showReasoning: boolean
  showAlternatives: boolean
  showWorkflowPlans: boolean
  maxRecommendations: number
}

export class RecommendationUI {
  private readonly outputChannel: vscode.OutputChannel

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel
  }

  /**
   * Show quick pick for tool selection
   */
  async showToolSelectionQuickPick(
    recommendations: ToolRecommendation[],
    options: Partial<RecommendationDisplayOptions> = {}
  ): Promise<ToolRecommendation | undefined> {
    const opts: RecommendationDisplayOptions = {
      showConfidence: true,
      showReasoning: false,
      showAlternatives: false,
      showWorkflowPlans: false,
      maxRecommendations: 5,
      ...options
    }

    const items = recommendations
      .slice(0, opts.maxRecommendations)
      .map(rec => this.createQuickPickItem(rec, opts))

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: "Select a tool to use",
      matchOnDescription: true,
      matchOnDetail: true
    })

    return selected?.recommendation
  }

  /**
   * Show detailed recommendations in a webview panel
   */
  showDetailedRecommendations(
    recommendations: ToolRecommendation[],
    workflowPlans?: WorkflowPlan[],
    options: Partial<RecommendationDisplayOptions> = {}
  ): void {
    const panel = vscode.window.createWebviewPanel(
      "clineRecommendations",
      "Cline Tool Recommendations",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    )

    const html = this.generateDetailedRecommendationsHtml(
      recommendations,
      workflowPlans,
      options
    )

    panel.webview.html = html

    // Handle messages from webview
    panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "selectTool":
            const tool = recommendations.find(r => r.tool.name === message.toolName)
            if (tool) {
              await this.showToolDetails(tool)
            }
            break
          case "executeWorkflow":
            if (workflowPlans) {
              const plan = workflowPlans.find(p => p.id === message.planId)
              if (plan) {
                await this.showWorkflowExecution(plan)
              }
            }
            break
          case "provideFeedback":
            await this.showFeedbackDialog(message.toolName)
            break
        }
      },
      undefined
    )
  }

  /**
   * Show system health dashboard
   */
  showSystemHealthDashboard(healthReport: HealthReport): void {
    const panel = vscode.window.createWebviewPanel(
      "clineSystemHealth",
      "Cline System Health",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    )

    panel.webview.html = this.generateHealthDashboardHtml(healthReport)
  }

  /**
   * Show inline recommendation in status bar
   */
  showInlineRecommendation(recommendation: ToolRecommendation): void {
    const message = `💡 ${recommendation.tool.name} (${(recommendation.confidence * 100).toFixed(1)}% confidence)`

    vscode.window.showInformationMessage(
      message,
      "Use Tool",
      "View Details",
      "Alternatives"
    ).then(async (selection) => {
      switch (selection) {
        case "Use Tool":
          // Emit event or callback to use the tool
          vscode.commands.executeCommand("cline.useRecommendedTool", recommendation)
          break
        case "View Details":
          await this.showToolDetails(recommendation)
          break
        case "Alternatives":
          await this.showAlternatives(recommendation)
          break
      }
    })
  }

  /**
   * Show feedback dialog for a tool
   */
  async showFeedbackDialog(toolName: string): Promise<void> {
    const rating = await vscode.window.showQuickPick([
      { label: "⭐⭐⭐⭐⭐ Excellent", value: 5 },
      { label: "⭐⭐⭐⭐ Good", value: 4 },
      { label: "⭐⭐⭐ Average", value: 3 },
      { label: "⭐⭐ Poor", value: 2 },
      { label: "⭐ Very Poor", value: 1 }
    ], {
      placeHolder: `Rate your experience with ${toolName}`
    })

    if (!rating) {return}

    const comment = await vscode.window.showInputBox({
      prompt: "Additional feedback (optional)",
      placeHolder: "What went well or what could be improved?"
    })

    // Emit feedback event
    vscode.commands.executeCommand("cline.provideToolFeedback", {
      toolName,
      rating: rating.value,
      comment
    })

    vscode.window.showInformationMessage("Thank you for your feedback!")
  }

  /**
   * Show tool execution progress
   */
  async showToolExecutionProgress(toolName: string): Promise<{
    updateProgress: (message: string, increment?: number) => void
    isCancelled: () => boolean
  }> {
    return await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Executing ${toolName}`,
        cancellable: true
      },
      async (progress, token) => {
        progress.report({ increment: 0, message: "Initializing..." })

        // Return progress object that can be updated by the execution system
        return {
          updateProgress: (message: string, increment: number = 10) => {
            progress.report({ increment, message })
          },
          isCancelled: () => token.isCancellationRequested
        }
      }
    )
  }

  /**
   * Show workflow execution visualization
   */
  async showWorkflowExecution(workflow: WorkflowPlan): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      "clineWorkflowExecution",
      "Workflow Execution",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    )

    panel.webview.html = this.generateWorkflowExecutionHtml(workflow)

    // Handle execution commands
    panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "startWorkflow":
            vscode.commands.executeCommand("cline.executeWorkflow", workflow)
            break
          case "pauseWorkflow":
            vscode.commands.executeCommand("cline.pauseWorkflow", workflow.id)
            break
          case "stopWorkflow":
            vscode.commands.executeCommand("cline.stopWorkflow", workflow.id)
            break
        }
      },
      undefined
    )
  }

  /**
   * Create quick pick item for tool recommendation
   */
  private createQuickPickItem(
    recommendation: ToolRecommendation,
    options: RecommendationDisplayOptions
  ): vscode.QuickPickItem & { recommendation: ToolRecommendation } {
    const confidence = options.showConfidence 
      ? ` (${(recommendation.confidence * 100).toFixed(1)}% confidence)` 
      : ""

    const description = options.showReasoning 
      ? recommendation.reasoning.substring(0, 100) + (recommendation.reasoning.length > 100 ? "..." : "")
      : recommendation.tool.description

    const detail = recommendation.riskAssessment === "high" 
      ? "⚠️ High risk" 
      : recommendation.riskAssessment === "medium" 
      ? "⚡ Medium risk" 
      : "✅ Low risk"

    return {
      label: `${recommendation.tool.name}${confidence}`,
      description,
      detail,
      recommendation
    }
  }

  /**
   * Generate HTML for detailed recommendations
   */
  private generateDetailedRecommendationsHtml(
    recommendations: ToolRecommendation[],
    workflowPlans?: WorkflowPlan[],
    options: Partial<RecommendationDisplayOptions> = {}
  ): string {
    const opts: RecommendationDisplayOptions = {
      showConfidence: true,
      showReasoning: true,
      showAlternatives: true,
      showWorkflowPlans: true,
      maxRecommendations: 10,
      ...options
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cline Tool Recommendations</title>
        <style>
          body { 
            font-family: var(--vscode-font-family); 
            padding: 20px; 
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
          }
          .header { 
            border-bottom: 2px solid var(--vscode-panel-border); 
            margin-bottom: 20px; 
            padding-bottom: 10px; 
          }
          .recommendation { 
            border: 1px solid var(--vscode-panel-border); 
            margin: 15px 0; 
            padding: 20px; 
            border-radius: 8px;
            background: var(--vscode-editor-background);
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .tool-name { 
            font-weight: bold; 
            color: var(--vscode-textLink-foreground); 
            font-size: 1.2em;
            margin-bottom: 8px;
          }
          .confidence { 
            color: var(--vscode-charts-green); 
            font-weight: bold;
          }
          .risk-high { color: var(--vscode-errorForeground); }
          .risk-medium { color: var(--vscode-warningForeground); }
          .risk-low { color: var(--vscode-testing-iconPassed); }
          .reasoning { 
            margin: 10px 0; 
            color: var(--vscode-descriptionForeground); 
            line-height: 1.4;
          }
          .capabilities {
            margin: 10px 0;
          }
          .capability {
            display: inline-block;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            padding: 4px 8px;
            margin: 2px;
            border-radius: 4px;
            font-size: 0.9em;
          }
          .workflow { 
            background: var(--vscode-textBlockQuote-background); 
            padding: 15px; 
            margin: 15px 0; 
            border-radius: 8px;
            border-left: 4px solid var(--vscode-textLink-foreground);
          }
          .alternatives {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid var(--vscode-panel-border);
          }
          .button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            margin: 5px;
            border-radius: 4px;
            cursor: pointer;
          }
          .button:hover {
            background: var(--vscode-button-hoverBackground);
          }
          .button.primary {
            background: var(--vscode-textLink-foreground);
            color: white;
          }
          .execution-time {
            color: var(--vscode-descriptionForeground);
            font-size: 0.9em;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🤖 Intelligent Tool Recommendations</h1>
          <p>AI-powered tool selection based on your project context and task requirements</p>
        </div>
        
        <div class="recommendations">
          ${recommendations.slice(0, opts.maxRecommendations).map((rec, index) => `
            <div class="recommendation">
              <div class="tool-name">
                ${index + 1}. ${rec.tool.name}
                ${opts.showConfidence ? `<span class="confidence">(${(rec.confidence * 100).toFixed(1)}% confidence)</span>` : ''}
                <span class="risk-${rec.riskAssessment}">[${rec.riskAssessment.toUpperCase()} RISK]</span>
              </div>
              
              <div class="description">${rec.tool.description}</div>
              
              ${opts.showReasoning ? `<div class="reasoning"><strong>Reasoning:</strong> ${rec.reasoning}</div>` : ''}
              
              <div class="capabilities">
                <strong>Capabilities:</strong>
                ${rec.tool.capabilities.map(cap => `<span class="capability">${cap}</span>`).join('')}
              </div>
              
              <div class="execution-time">
                <strong>Estimated Time:</strong> ${(rec.estimatedExecutionTime / 1000).toFixed(1)}s
                ${rec.prerequisites.length > 0 ? `<br><strong>Prerequisites:</strong> ${rec.prerequisites.join(', ')}` : ''}
              </div>
              
              <div style="margin-top: 15px;">
                <button class="button primary" onclick="selectTool('${rec.tool.name}')">Use This Tool</button>
                <button class="button" onclick="showDetails('${rec.tool.name}')">View Details</button>
                <button class="button" onclick="provideFeedback('${rec.tool.name}')">Provide Feedback</button>
              </div>
              
              ${opts.showAlternatives && rec.alternativeOptions.length > 0 ? `
                <div class="alternatives">
                  <strong>Alternative Tools:</strong>
                  <ul>
                    ${rec.alternativeOptions.map(alt => `
                      <li>
                        ${alt.tool.name} (${(alt.confidence * 100).toFixed(1)}% confidence)
                        - ${alt.tool.description}
                      </li>
                    `).join('')}
                  </ul>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
        
        ${opts.showWorkflowPlans && workflowPlans && workflowPlans.length > 0 ? `
          <div class="workflows">
            <h2>🔄 Suggested Workflows</h2>
            ${workflowPlans.map(plan => `
              <div class="workflow">
                <h3>${plan.description}</h3>
                <p><strong>Steps:</strong> ${plan.steps.length}</p>
                <p><strong>Estimated Time:</strong> ${(plan.estimatedTotalTime / 1000).toFixed(1)}s</p>
                <p><strong>Confidence:</strong> ${(plan.confidence * 100).toFixed(1)}%</p>
                <p><strong>Risk Assessment:</strong> ${plan.riskAssessment.toUpperCase()}</p>
                
                <button class="button primary" onclick="executeWorkflow('${plan.id}')">Execute Workflow</button>
                <button class="button" onclick="viewWorkflowDetails('${plan.id}')">View Details</button>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        <script>
          const vscode = acquireVsCodeApi();
          
          function selectTool(toolName) {
            vscode.postMessage({ command: 'selectTool', toolName });
          }
          
          function showDetails(toolName) {
            vscode.postMessage({ command: 'showDetails', toolName });
          }
          
          function provideFeedback(toolName) {
            vscode.postMessage({ command: 'provideFeedback', toolName });
          }
          
          function executeWorkflow(planId) {
            vscode.postMessage({ command: 'executeWorkflow', planId });
          }
          
          function viewWorkflowDetails(planId) {
            vscode.postMessage({ command: 'viewWorkflowDetails', planId });
          }
        </script>
      </body>
      </html>
    `
  }

  /**
   * Generate HTML for system health dashboard
   */
  private generateHealthDashboardHtml(healthReport: HealthReport): string {
    const statusColor = healthReport.overallStatus === "healthy" ? "var(--vscode-testing-iconPassed)" :
                        healthReport.overallStatus === "degraded" ? "var(--vscode-warningForeground)" :
                        "var(--vscode-errorForeground)"

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cline System Health</title>
        <style>
          body { 
            font-family: var(--vscode-font-family); 
            padding: 20px; 
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
          }
          .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
          }
          .status-healthy { background: var(--vscode-testing-iconPassed); }
          .status-degraded { background: var(--vscode-warningForeground); }
          .status-critical { background: var(--vscode-errorForeground); }
          .metric-card {
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 15px;
            margin: 10px 0;
            background: var(--vscode-editor-background);
          }
          .metric-value {
            font-size: 1.5em;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
          }
          .metric-label {
            color: var(--vscode-descriptionForeground);
            font-size: 0.9em;
          }
          .recommendation {
            background: var(--vscode-textBlockQuote-background);
            padding: 10px;
            margin: 5px 0;
            border-radius: 4px;
            border-left: 3px solid var(--vscode-textLink-foreground);
          }
          .progress-bar {
            width: 100%;
            height: 8px;
            background: var(--vscode-progressBar-background);
            border-radius: 4px;
            overflow: hidden;
            margin: 5px 0;
          }
          .progress-fill {
            height: 100%;
            background: var(--vscode-progressBar-foreground);
            transition: width 0.3s ease;
          }
        </style>
      </head>
      <body>
        <h1>🏥 Cline System Health</h1>
        
        <div class="metric-card">
          <h2>
            <span class="status-indicator status-${healthReport.overallStatus}"></span>
            Overall Status: ${healthReport.overallStatus.toUpperCase()}
          </h2>
          <p>Last updated: ${new Date(healthReport.lastUpdated).toLocaleString()}</p>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
          <div class="metric-card">
            <div class="metric-value">${(healthReport.recommendationQuality * 100).toFixed(1)}%</div>
            <div class="metric-label">Recommendation Quality</div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${healthReport.recommendationQuality * 100}%"></div>
            </div>
          </div>
          
          <div class="metric-card">
            <div class="metric-value">${(healthReport.systemPerformance * 100).toFixed(1)}%</div>
            <div class="metric-label">System Performance</div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${healthReport.systemPerformance * 100}%"></div>
            </div>
          </div>
          
          <div class="metric-card">
            <div class="metric-value">${(healthReport.learningEffectiveness * 100).toFixed(1)}%</div>
            <div class="metric-label">Learning Effectiveness</div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${healthReport.learningEffectiveness * 100}%"></div>
            </div>
          </div>
          
          <div class="metric-card">
            <div class="metric-value">${(healthReport.userSatisfaction * 100).toFixed(1)}%</div>
            <div class="metric-label">User Satisfaction</div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${healthReport.userSatisfaction * 100}%"></div>
            </div>
          </div>
        </div>
        
        ${healthReport.issues.length > 0 ? `
          <div class="metric-card">
            <h3>⚠️ Issues Detected</h3>
            ${healthReport.issues.map(issue => `
              <div class="recommendation" style="border-left-color: var(--vscode-errorForeground);">
                ${issue}
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        <div class="metric-card">
          <h3>💡 Recommendations</h3>
          ${healthReport.recommendations.map(rec => `
            <div class="recommendation">
              ${rec}
            </div>
          `).join('')}
        </div>
        
        <div style="margin-top: 20px;">
          <button class="button" onclick="optimizeSystem()">Optimize System</button>
          <button class="button" onclick="refreshHealth()">Refresh Health</button>
          <button class="button" onclick="exportReport()">Export Report</button>
        </div>
        
        <script>
          const vscode = acquireVsCodeApi();
          
          function optimizeSystem() {
            vscode.postMessage({ command: 'optimizeSystem' });
          }
          
          function refreshHealth() {
            vscode.postMessage({ command: 'refreshHealth' });
          }
          
          function exportReport() {
            vscode.postMessage({ command: 'exportReport' });
          }
        </script>
      </body>
      </html>
    `
  }

  /**
   * Generate HTML for workflow execution
   */
  private generateWorkflowExecutionHtml(workflow: WorkflowPlan): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Workflow Execution - ${workflow.description}</title>
        <style>
          body { 
            font-family: var(--vscode-font-family); 
            padding: 20px; 
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
          }
          .workflow-header {
            border-bottom: 2px solid var(--vscode-panel-border);
            margin-bottom: 20px;
            padding-bottom: 15px;
          }
          .step {
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            margin: 15px 0;
            padding: 15px;
            background: var(--vscode-editor-background);
          }
          .step.pending { border-left: 4px solid var(--vscode-descriptionForeground); }
          .step.running { border-left: 4px solid var(--vscode-charts-blue); }
          .step.completed { border-left: 4px solid var(--vscode-testing-iconPassed); }
          .step.failed { border-left: 4px solid var(--vscode-errorForeground); }
          .step-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
          }
          .step-title {
            font-weight: bold;
            font-size: 1.1em;
          }
          .step-status {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.9em;
            font-weight: bold;
          }
          .status-pending { background: var(--vscode-descriptionForeground); }
          .status-running { background: var(--vscode-charts-blue); }
          .status-completed { background: var(--vscode-testing-iconPassed); }
          .status-failed { background: var(--vscode-errorForeground); }
          .controls {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--vscode-panel-background);
            padding: 15px;
            border-radius: 8px;
            border: 1px solid var(--vscode-panel-border);
          }
          .button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            margin: 2px;
            border-radius: 4px;
            cursor: pointer;
          }
          .button:hover {
            background: var(--vscode-button-hoverBackground);
          }
          .button.primary {
            background: var(--vscode-textLink-foreground);
            color: white;
          }
          .progress-bar {
            width: 100%;
            height: 6px;
            background: var(--vscode-progressBar-background);
            border-radius: 3px;
            overflow: hidden;
            margin: 10px 0;
          }
          .progress-fill {
            height: 100%;
            background: var(--vscode-progressBar-foreground);
            transition: width 0.3s ease;
          }
        </style>
      </head>
      <body>
        <div class="workflow-header">
          <h1>🔄 ${workflow.description}</h1>
          <p><strong>Steps:</strong> ${workflow.steps.length} | 
             <strong>Estimated Time:</strong> ${(workflow.estimatedTotalTime / 1000).toFixed(1)}s | 
             <strong>Confidence:</strong> ${(workflow.confidence * 100).toFixed(1)}%</p>
        </div>
        
        <div class="workflow-progress">
          <div class="progress-bar">
            <div class="progress-fill" id="overallProgress" style="width: 0%"></div>
          </div>
          <p id="progressText">Ready to start</p>
        </div>
        
        <div class="workflow-steps">
          ${workflow.steps.map((step, index) => `
            <div class="step pending" id="step-${index}">
              <div class="step-header">
                <div class="step-title">
                  ${index + 1}. ${step.description}
                </div>
                <div class="step-status status-pending" id="status-${index}">
                  PENDING
                </div>
              </div>
              <div><strong>Tool:</strong> ${step.toolName}</div>
              <div><strong>Estimated Time:</strong> ${(step.estimatedTime / 1000).toFixed(1)}s</div>
              <div><strong>Risk Level:</strong> ${step.riskLevel.toUpperCase()}</div>
              ${step.inputRequirements.length > 0 ? `
                <div><strong>Input Requirements:</strong> ${step.inputRequirements.join(', ')}</div>
              ` : ''}
              ${step.outputExpectations.length > 0 ? `
                <div><strong>Expected Output:</strong> ${step.outputExpectations.join(', ')}</div>
              ` : ''}
              ${step.rollbackStrategy ? `
                <div><strong>Rollback Strategy:</strong> ${step.rollbackStrategy}</div>
              ` : ''}
            </div>
          `).join('')}
        </div>
        
        <div class="controls">
          <button class="button primary" onclick="startWorkflow()">▶️ Start</button>
          <button class="button" onclick="pauseWorkflow()">⏸️ Pause</button>
          <button class="button" onclick="stopWorkflow()">⏹️ Stop</button>
          <button class="button" onclick="viewLogs()">📋 View Logs</button>
        </div>
        
        <script>
          const vscode = acquireVsCodeApi();
          let currentStep = 0;
          let isRunning = false;
          
          function startWorkflow() {
            vscode.postMessage({ command: 'startWorkflow' });
            isRunning = true;
            updateStepStatus(0, 'running');
          }
          
          function pauseWorkflow() {
            vscode.postMessage({ command: 'pauseWorkflow' });
            isRunning = false;
          }
          
          function stopWorkflow() {
            vscode.postMessage({ command: 'stopWorkflow' });
            isRunning = false;
            resetWorkflow();
          }
          
          function viewLogs() {
            vscode.postMessage({ command: 'viewLogs' });
          }
          
          function updateStepStatus(stepIndex, status) {
            const step = document.getElementById(\`step-\${stepIndex}\`);
            const statusEl = document.getElementById(\`status-\${stepIndex}\`);
            
            step.className = \`step \${status}\`;
            statusEl.className = \`step-status status-\${status}\`;
            statusEl.textContent = status.toUpperCase();
            
            if (status === 'completed') {
              currentStep++;
              updateProgress();
              if (currentStep < ${workflow.steps.length} && isRunning) {
                setTimeout(() => updateStepStatus(currentStep, 'running'), 500);
              }
            }
          }
          
          function updateProgress() {
            const progress = (currentStep / ${workflow.steps.length}) * 100;
            document.getElementById('overallProgress').style.width = progress + '%';
            document.getElementById('progressText').textContent = 
              \`Step \${currentStep} of \${${workflow.steps.length}} completed\`;
          }
          
          function resetWorkflow() {
            currentStep = 0;
            for (let i = 0; i < ${workflow.steps.length}; i++) {
              updateStepStatus(i, 'pending');
            }
            updateProgress();
            document.getElementById('progressText').textContent = 'Ready to start';
          }
          
          // Listen for updates from extension
          window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
              case 'stepUpdate':
                updateStepStatus(message.stepIndex, message.status);
                break;
              case 'workflowComplete':
                isRunning = false;
                document.getElementById('progressText').textContent = 'Workflow completed!';
                break;
              case 'workflowError':
                isRunning = false;
                updateStepStatus(message.stepIndex, 'failed');
                break;
            }
          });
        </script>
      </body>
      </html>
    `
  }

  /**
   * Show tool details modal
   */
  private async showToolDetails(recommendation: ToolRecommendation): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      "clineToolDetails",
      `${recommendation.tool.name} - Details`,
      vscode.ViewColumn.One,
      { enableScripts: true }
    )

    panel.webview.html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${recommendation.tool.name} - Details</title>
        <style>
          body { font-family: var(--vscode-font-family); padding: 20px; }
          .detail-section { margin: 15px 0; }
          .detail-label { font-weight: bold; color: var(--vscode-textLink-foreground); }
          .capability { display: inline-block; background: var(--vscode-button-background); padding: 4px 8px; margin: 2px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>${recommendation.tool.name}</h1>
        <p>${recommendation.tool.description}</p>
        
        <div class="detail-section">
          <span class="detail-label">Confidence:</span> ${(recommendation.confidence * 100).toFixed(1)}%
        </div>
        
        <div class="detail-section">
          <span class="detail-label">Risk Assessment:</span> ${recommendation.riskAssessment.toUpperCase()}
        </div>
        
        <div class="detail-section">
          <span class="detail-label">Estimated Execution Time:</span> ${(recommendation.estimatedExecutionTime / 1000).toFixed(1)}s
        </div>
        
        <div class="detail-section">
          <span class="detail-label">Capabilities:</span><br>
          ${recommendation.tool.capabilities.map(cap => `<span class="capability">${cap}</span>`).join('')}
        </div>
        
        <div class="detail-section">
          <span class="detail-label">Domains:</span><br>
          ${recommendation.tool.domains.map(domain => `<span class="capability">${domain}</span>`).join('')}
        </div>
        
        <div class="detail-section">
          <span class="detail-label">Typical Use Cases:</span><br>
          <ul>
            ${recommendation.tool.typicalUseCases.map(useCase => `<li>${useCase}</li>`).join('')}
          </ul>
        </div>
        
        <div class="detail-section">
          <span class="detail-label">Reasoning:</span><br>
          ${recommendation.reasoning}
        </div>
        
        ${recommendation.prerequisites.length > 0 ? `
          <div class="detail-section">
            <span class="detail-label">Prerequisites:</span><br>
            <ul>
              ${recommendation.prerequisites.map(prereq => `<li>${prereq}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </body>
      </html>
    `
  }

  /**
   * Show alternatives for a tool
   */
  private async showAlternatives(recommendation: ToolRecommendation): Promise<void> {
    if (recommendation.alternativeOptions.length === 0) {
      vscode.window.showInformationMessage("No alternative tools available.")
      return
    }

    const selected = await this.showToolSelectionQuickPick(recommendation.alternativeOptions, {
      showConfidence: true,
      showReasoning: true,
      maxRecommendations: 10
    })

    if (selected) {
      vscode.commands.executeCommand("cline.useRecommendedTool", selected)
    }
  }
}
