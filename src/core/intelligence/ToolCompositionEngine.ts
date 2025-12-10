/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Intelligent Tool Selection System - Tool Composition Engine
 * MIT License
 */

import {
  ToolRecommendation,
  TaskContext,
  WorkflowPlan,
  WorkflowStep,
  ToolIntelligenceMetadata
} from "./types"

export interface ToolCompositionRequest {
  taskDescription: string
  context: TaskContext
  availableTools: ToolIntelligenceMetadata[]
  constraints?: {
    maxSteps?: number
    maxComplexity?: "low" | "medium" | "high"
    timeLimit?: number
    preferredTools?: string[]
    excludeTools?: string[]
  }
}

export interface CompositionResult {
  workflows: WorkflowPlan[]
  confidence: number
  reasoning: string[]
  alternatives: WorkflowPlan[]
}

export interface ToolDependency {
  toolName: string
  dependsOn: string[]
  outputs: string[]
  inputs: string[]
}

export class ToolCompositionEngine {
  private toolDependencies: Map<string, ToolDependency> = new Map()
  private compositionPatterns: Map<string, WorkflowPlan[]> = new Map()

  constructor() {
    this.initializeCommonPatterns()
    this.initializeToolDependencies()
  }

  /**
   * Compose multiple tools into workflows for complex tasks
   */
  async composeTools(request: ToolCompositionRequest): Promise<CompositionResult> {
    const { taskDescription, context, availableTools, constraints } = request

    // Analyze task complexity and requirements
    const taskAnalysis = await this.analyzeTask(taskDescription, context)
    
    // Generate potential workflows
    const workflows = await this.generateWorkflows(taskAnalysis, availableTools, constraints)
    
    // Score and rank workflows
    const scoredWorkflows = await this.scoreWorkflows(workflows, context)
    
    // Generate alternatives
    const alternatives = await this.generateAlternatives(scoredWorkflows, availableTools, context)

    return {
      workflows: scoredWorkflows,
      confidence: this.calculateOverallConfidence(scoredWorkflows),
      reasoning: this.generateCompositionReasoning(scoredWorkflows, taskAnalysis),
      alternatives
    }
  }

  /**
   * Analyze task to understand complexity and requirements
   */
  private async analyzeTask(taskDescription: string, context: TaskContext): Promise<{
    complexity: "low" | "medium" | "high"
    requiredCapabilities: string[]
    estimatedSteps: number
    domains: string[]
    patterns: string[]
  }> {
    // Simple heuristic-based analysis
    const description = taskDescription.toLowerCase()
    
    // Determine complexity
    let complexity: "low" | "medium" | "high" = "low"
    if (description.includes("complex") || description.includes("advanced") || description.includes("multiple")) {
      complexity = "high"
    } else if (description.includes("create") || description.includes("build") || description.includes("implement")) {
      complexity = "medium"
    }

    // Extract required capabilities
    const requiredCapabilities = this.extractCapabilities(description)
    
    // Estimate steps based on task description
    const stepIndicators = ["and", "then", "after", "followed by", "next"]
    const estimatedSteps = Math.max(1, stepIndicators.reduce((count, indicator) => 
      count + (description.split(indicator).length - 1), 1))

    // Identify domains
    const domains = this.identifyDomains(description, context)
    
    // Recognize patterns
    const patterns = this.recognizePatterns(description, context)

    return {
      complexity,
      requiredCapabilities,
      estimatedSteps,
      domains,
      patterns
    }
  }

  /**
   * Generate workflow plans based on task analysis
   */
  private async generateWorkflows(
    taskAnalysis: any,
    availableTools: ToolIntelligenceMetadata[],
    constraints?: any
  ): Promise<WorkflowPlan[]> {
    const workflows: WorkflowPlan[] = []

    // Check for known patterns first
    for (const pattern of taskAnalysis.patterns) {
      const patternWorkflows = this.compositionPatterns.get(pattern) || []
      workflows.push(...patternWorkflows.filter(wf => 
        this.isWorkflowCompatible(wf, availableTools, constraints)
      ))
    }

    // Generate workflows based on capabilities
    const capabilityBasedWorkflows = await this.generateCapabilityBasedWorkflows(
      taskAnalysis.requiredCapabilities,
      availableTools,
      constraints
    )
    workflows.push(...capabilityBasedWorkflows)

    // Generate domain-specific workflows
    for (const domain of taskAnalysis.domains) {
      const domainWorkflows = await this.generateDomainWorkflows(
        domain,
        taskAnalysis,
        availableTools,
        constraints
      )
      workflows.push(...domainWorkflows)
    }

    // Remove duplicates and sort by confidence
    const uniqueWorkflows = this.deduplicateWorkflows(workflows)
    return uniqueWorkflows.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Generate workflows based on required capabilities
   */
  private async generateCapabilityBasedWorkflows(
    requiredCapabilities: string[],
    availableTools: ToolIntelligenceMetadata[],
    constraints?: any
  ): Promise<WorkflowPlan[]> {
    const workflows: WorkflowPlan[] = []
    
    // Group tools by capabilities
    const toolsByCapability = new Map<string, ToolIntelligenceMetadata[]>()
    for (const tool of availableTools) {
      for (const capability of tool.capabilities) {
        if (!toolsByCapability.has(capability)) {
          toolsByCapability.set(capability, [])
        }
        toolsByCapability.get(capability)!.push(tool)
      }
    }

    // Generate linear workflow
    const linearWorkflow = this.generateLinearWorkflow(
      requiredCapabilities,
      toolsByCapability,
      constraints
    )
    if (linearWorkflow) {
      workflows.push(linearWorkflow)
    }

    // Generate parallel workflow if possible
    const parallelWorkflow = this.generateParallelWorkflow(
      requiredCapabilities,
      toolsByCapability,
      constraints
    )
    if (parallelWorkflow) {
      workflows.push(parallelWorkflow)
    }

    return workflows
  }

  /**
   * Generate linear workflow (sequential execution)
   */
  private generateLinearWorkflow(
    requiredCapabilities: string[],
    toolsByCapability: Map<string, ToolIntelligenceMetadata[]>,
    constraints?: any
  ): WorkflowPlan | null {
    const steps: WorkflowStep[] = []
    let totalTime = 0

    for (const capability of requiredCapabilities) {
      const tools = toolsByCapability.get(capability) || []
      if (tools.length === 0) {return null}

      // Select best tool for this capability
      const bestTool = this.selectBestTool(tools, capability)
      
      const step: WorkflowStep = {
        id: `step-${steps.length + 1}`,
        toolName: bestTool.name,
        description: `Execute ${bestTool.name} for ${capability}`,
        inputRequirements: this.getStepInputs(bestTool, steps),
        outputExpectations: this.getStepOutputs(bestTool),
        dependencies: steps.length > 0 ? [steps[steps.length - 1].id] : [],
        estimatedTime: bestTool.performanceMetrics.avgExecutionTime,
        confidence: 0.8,
        riskLevel: this.assessStepRisk(bestTool, capability),
        rollbackStrategy: this.generateRollbackStrategy(bestTool)
      }

      steps.push(step)
      totalTime += step.estimatedTime
    }

    return {
      id: `linear-workflow-${Date.now()}`,
      description: `Linear workflow for capabilities: ${requiredCapabilities.join(", ")}`,
      steps,
      estimatedTotalTime: totalTime,
      confidence: this.calculateWorkflowConfidence(steps),
      riskAssessment: this.assessWorkflowRisk(steps),
      alternativePlans: []
    }
  }

  /**
   * Generate parallel workflow where possible
   */
  private generateParallelWorkflow(
    requiredCapabilities: string[],
    toolsByCapability: Map<string, ToolIntelligenceMetadata[]>,
    constraints?: any
  ): WorkflowPlan | null {
    // Group capabilities that can be executed in parallel
    const parallelGroups = this.identifyParallelGroups(requiredCapabilities, toolsByCapability)
    const steps: WorkflowStep[] = []
    let totalTime = 0

    for (const group of parallelGroups) {
      const groupSteps: WorkflowStep[] = []
      
      for (const capability of group) {
        const tools = toolsByCapability.get(capability) || []
        if (tools.length === 0) {continue}

        const bestTool = this.selectBestTool(tools, capability)
        
        const step: WorkflowStep = {
          id: `step-${steps.length + 1}`,
          toolName: bestTool.name,
          description: `Execute ${bestTool.name} for ${capability}`,
          inputRequirements: this.getStepInputs(bestTool, steps),
          outputExpectations: this.getStepOutputs(bestTool),
          dependencies: [], // Parallel steps don't depend on each other
          estimatedTime: bestTool.performanceMetrics.avgExecutionTime,
          confidence: 0.8,
          riskLevel: this.assessStepRisk(bestTool, capability),
          rollbackStrategy: this.generateRollbackStrategy(bestTool)
        }

        groupSteps.push(step)
      }

      // Add group steps (can be executed in parallel)
      steps.push(...groupSteps)
      
      // Time for this group is the maximum of all steps in the group
      const groupTime = Math.max(...groupSteps.map(s => s.estimatedTime))
      totalTime += groupTime
    }

    if (steps.length === 0) {return null}

    return {
      id: `parallel-workflow-${Date.now()}`,
      description: `Parallel workflow for capabilities: ${requiredCapabilities.join(", ")}`,
      steps,
      estimatedTotalTime: totalTime,
      confidence: this.calculateWorkflowConfidence(steps) * 0.9, // Slightly lower confidence for parallel
      riskAssessment: this.assessWorkflowRisk(steps),
      alternativePlans: []
    }
  }

  /**
   * Score workflows based on various factors
   */
  private async scoreWorkflows(
    workflows: WorkflowPlan[],
    context: TaskContext
  ): Promise<WorkflowPlan[]> {
    return workflows.map(workflow => {
      let score = workflow.confidence

      // Adjust score based on context fit
      score *= this.calculateContextFit(workflow, context)

      // Adjust score based on performance history
      score *= this.calculatePerformanceScore(workflow)

      // Adjust score based on user preferences
      score *= this.calculatePreferenceScore(workflow, context.userPreferences)

      // Adjust score based on complexity
      score *= this.calculateComplexityScore(workflow, context)

      return {
        ...workflow,
        confidence: Math.min(1.0, Math.max(0.0, score))
      }
    })
  }

  /**
   * Generate alternative workflows
   */
  private async generateAlternatives(
    primaryWorkflows: WorkflowPlan[],
    availableTools: ToolIntelligenceMetadata[],
    context: TaskContext
  ): Promise<WorkflowPlan[]> {
    const alternatives: WorkflowPlan[] = []

    for (const workflow of primaryWorkflows) {
      // Generate alternative by swapping tools
      const toolSwapAlternatives = await this.generateToolSwapAlternatives(
        workflow,
        availableTools
      )
      alternatives.push(...toolSwapAlternatives)

      // Generate alternative by changing execution order
      const orderAlternatives = await this.generateOrderAlternatives(workflow)
      alternatives.push(...orderAlternatives)
    }

    return alternatives
      .filter(alt => alt.confidence > 0.3) // Keep only reasonable alternatives
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5) // Limit to top 5 alternatives
  }

  /**
   * Initialize common composition patterns
   */
  private initializeCommonPatterns(): void {
    // File operations pattern
    this.compositionPatterns.set("file-operations", [
      {
        id: "file-read-analyze-write",
        description: "Read file, analyze content, write results",
        steps: [
          {
            id: "step-1",
            toolName: "read_file",
            description: "Read source file",
            inputRequirements: ["file_path"],
            outputExpectations: ["file_content"],
            dependencies: [],
            estimatedTime: 500,
            confidence: 0.9,
            riskLevel: "low",
            rollbackStrategy: "No changes made"
          },
          {
            id: "step-2",
            toolName: "analyze_content",
            description: "Analyze file content",
            inputRequirements: ["file_content"],
            outputExpectations: ["analysis_results"],
            dependencies: ["step-1"],
            estimatedTime: 1000,
            confidence: 0.8,
            riskLevel: "low",
            rollbackStrategy: "Analysis results can be discarded"
          },
          {
            id: "step-3",
            toolName: "write_to_file",
            description: "Write analysis results",
            inputRequirements: ["file_path", "analysis_results"],
            outputExpectations: ["written_file"],
            dependencies: ["step-2"],
            estimatedTime: 300,
            confidence: 0.85,
            riskLevel: "medium",
            rollbackStrategy: "Restore original file from backup"
          }
        ],
        estimatedTotalTime: 1800,
        confidence: 0.85,
        riskAssessment: "low",
        alternativePlans: []
      }
    ])

    // Web scraping pattern
    this.compositionPatterns.set("web-scraping", [
      {
        id: "scrape-analyze-store",
        description: "Scrape web data, analyze, and store results",
        steps: [
          {
            id: "step-1",
            toolName: "tavily-search",
            description: "Search for web content",
            inputRequirements: ["search_query"],
            outputExpectations: ["search_results"],
            dependencies: [],
            estimatedTime: 2000,
            confidence: 0.9,
            riskLevel: "low",
            rollbackStrategy: "No changes made"
          },
          {
            id: "step-2",
            toolName: "tavily-extract",
            description: "Extract detailed content",
            inputRequirements: ["urls"],
            outputExpectations: ["extracted_content"],
            dependencies: ["step-1"],
            estimatedTime: 1500,
            confidence: 0.85,
            riskLevel: "low",
            rollbackStrategy: "Extracted content can be discarded"
          },
          {
            id: "step-3",
            toolName: "write_to_file",
            description: "Store extracted data",
            inputRequirements: ["file_path", "extracted_content"],
            outputExpectations: ["stored_data"],
            dependencies: ["step-2"],
            estimatedTime: 300,
            confidence: 0.8,
            riskLevel: "medium",
            rollbackStrategy: "Delete created file"
          }
        ],
        estimatedTotalTime: 3800,
        confidence: 0.80,
        riskAssessment: "medium",
        alternativePlans: []
      }
    ])
  }

  /**
   * Initialize tool dependencies
   */
  private initializeToolDependencies(): void {
    // Define common tool dependencies
    this.toolDependencies.set("write_to_file", {
      toolName: "write_to_file",
      dependsOn: ["read_file"],
      outputs: ["file_content"],
      inputs: ["file_path", "content"]
    })

    this.toolDependencies.set("tavily-extract", {
      toolName: "tavily-extract",
      dependsOn: ["tavily-search"],
      outputs: ["extracted_content"],
      inputs: ["urls"]
    })
  }

  // Helper methods
  private extractCapabilities(description: string): string[] {
    const capabilityMap: { [key: string]: string[] } = {
      "read": ["file-reading", "content-analysis"],
      "write": ["file-writing", "content-creation"],
      "search": ["web-search", "data-discovery"],
      "scrape": ["web-scraping", "data-extraction"],
      "analyze": ["data-analysis", "content-analysis"],
      "create": ["content-creation", "file-creation"],
      "build": ["build-tools", "compilation"],
      "test": ["testing", "validation"],
      "deploy": ["deployment", "publishing"]
    }

    const capabilities: string[] = []
    for (const [keyword, caps] of Object.entries(capabilityMap)) {
      if (description.includes(keyword)) {
        capabilities.push(...caps)
      }
    }

    return [...new Set(capabilities)]
  }

  private identifyDomains(description: string, context: TaskContext): string[] {
    const domains = new Set<string>()

    // Add domains from context
    context.technologies.forEach(tech => domains.add(tech))

    // Infer domains from description
    if (description.includes("web") || description.includes("http")) {
      domains.add("web-development")
    }
    if (description.includes("file") || description.includes("directory")) {
      domains.add("file-operations")
    }
    if (description.includes("data") || description.includes("analyze")) {
      domains.add("data-analysis")
    }

    return Array.from(domains)
  }

  private recognizePatterns(description: string, context: TaskContext): string[] {
    const patterns: string[] = []

    // Recognize common patterns
    if (description.includes("read") && description.includes("write")) {
      patterns.push("file-operations")
    }
    if (description.includes("scrape") || description.includes("extract")) {
      patterns.push("web-scraping")
    }
    if (description.includes("search") && description.includes("analyze")) {
      patterns.push("research-analysis")
    }

    return patterns
  }

  private selectBestTool(tools: ToolIntelligenceMetadata[], capability: string): ToolIntelligenceMetadata {
    return tools.reduce((best, tool) => {
      const bestScore = this.calculateToolScore(best, capability)
      const toolScore = this.calculateToolScore(tool, capability)
      return toolScore > bestScore ? tool : best
    })
  }

  private calculateToolScore(tool: ToolIntelligenceMetadata, capability: string): number {
    let score = 0

    // Capability match
    if (tool.capabilities.includes(capability)) {
      score += 0.4
    }

    // Reliability
    score += tool.reliability * 0.3

    // Performance
    const performanceScore = 1 - (tool.performanceMetrics.avgExecutionTime / 10000) // Normalize to 0-1
    score += performanceScore * 0.2

    // Success rate
    score += tool.performanceMetrics.successRate * 0.1

    return score
  }

  private assessStepRisk(tool: ToolIntelligenceMetadata, capability: string): "low" | "medium" | "high" {
    if (tool.reliability > 0.9 && tool.performanceMetrics.successRate > 0.95) {
      return "low"
    } else if (tool.reliability > 0.7 && tool.performanceMetrics.successRate > 0.8) {
      return "medium"
    } else {
      return "high"
    }
  }

  private getStepInputs(tool: ToolIntelligenceMetadata, previousSteps: WorkflowStep[]): string[] {
    const inputs: string[] = [...tool.prerequisites]
    
    // Add outputs from previous steps as inputs
    for (const step of previousSteps) {
      inputs.push(...step.outputExpectations)
    }

    return [...new Set(inputs)]
  }

  private getStepOutputs(tool: ToolIntelligenceMetadata): string[] {
    // Infer outputs based on tool capabilities
    if (tool.capabilities.includes("file-reading")) {
      return ["file_content", "file_metadata"]
    } else if (tool.capabilities.includes("file-writing")) {
      return ["written_file", "write_confirmation"]
    } else if (tool.capabilities.includes("web-search")) {
      return ["search_results", "relevant_urls"]
    } else if (tool.capabilities.includes("data-extraction")) {
      return ["extracted_data", "structured_content"]
    }

    return ["tool_output"]
  }

  private generateRollbackStrategy(tool: ToolIntelligenceMetadata): string {
    if (tool.capabilities.includes("file-writing")) {
      return "Restore from backup or delete created file"
    } else if (tool.capabilities.includes("web-scraping")) {
      return "Discard scraped data and clear cache"
    } else {
      return "Discard tool output and reset state"
    }
  }

  private calculateWorkflowConfidence(steps: WorkflowStep[]): number {
    if (steps.length === 0) {return 0}

    const avgStepConfidence = steps.reduce((sum, step) => {
      let stepConfidence = 0.8 // Base confidence
      
      // Adjust based on risk
      if (step.riskLevel === "low") {stepConfidence += 0.1}
      else if (step.riskLevel === "high") {stepConfidence -= 0.2}

      return sum + stepConfidence
    }, 0) / steps.length

    // Reduce confidence for longer workflows
    const lengthPenalty = Math.min(0.2, steps.length * 0.05)

    return Math.max(0.1, avgStepConfidence - lengthPenalty)
  }

  private assessWorkflowRisk(steps: WorkflowStep[]): "low" | "medium" | "high" {
    const highRiskSteps = steps.filter(s => s.riskLevel === "high").length
    const mediumRiskSteps = steps.filter(s => s.riskLevel === "medium").length

    if (highRiskSteps > 0) {return "high"}
    if (mediumRiskSteps > steps.length / 2) {return "medium"}
    return "low"
  }

  private identifyParallelGroups(
    requiredCapabilities: string[],
    toolsByCapability: Map<string, ToolIntelligenceMetadata[]>
  ): string[][] {
    // Simple implementation: group capabilities that don't depend on each other
    const groups: string[][] = []
    const remaining = [...requiredCapabilities]

    while (remaining.length > 0) {
      const currentGroup: string[] = []
      
      for (const capability of remaining) {
        const tools = toolsByCapability.get(capability) || []
        const canRunInParallel = tools.every(tool => 
          !tool.prerequisites.some(prereq => remaining.includes(prereq))
        )
        
        if (canRunInParallel) {
          currentGroup.push(capability)
        }
      }

      if (currentGroup.length === 0) {
        // No parallel execution possible, add one capability
        currentGroup.push(remaining.shift()!)
      } else {
        // Remove grouped capabilities from remaining
        currentGroup.forEach(cap => {
          const index = remaining.indexOf(cap)
          if (index > -1) {remaining.splice(index, 1)}
        })
      }

      groups.push(currentGroup)
    }

    return groups
  }

  private isWorkflowCompatible(
    workflow: WorkflowPlan,
    availableTools: ToolIntelligenceMetadata[],
    constraints?: any
  ): boolean {
    const availableToolNames = new Set(availableTools.map(t => t.name))
    
    // Check if all required tools are available
    for (const step of workflow.steps) {
      if (!availableToolNames.has(step.toolName)) {
        return false
      }
    }

    // Check constraints
    if (constraints) {
      if (constraints.maxSteps && workflow.steps.length > constraints.maxSteps) {
        return false
      }
      if (constraints.timeLimit && workflow.estimatedTotalTime > constraints.timeLimit) {
        return false
      }
      if (constraints.excludeTools) {
        for (const step of workflow.steps) {
          if (constraints.excludeTools.includes(step.toolName)) {
            return false
          }
        }
      }
    }

    return true
  }

  private deduplicateWorkflows(workflows: WorkflowPlan[]): WorkflowPlan[] {
    const seen = new Set<string>()
    return workflows.filter(workflow => {
      const signature = this.generateWorkflowSignature(workflow)
      if (seen.has(signature)) {
        return false
      }
      seen.add(signature)
      return true
    })
  }

  private generateWorkflowSignature(workflow: WorkflowPlan): string {
    const toolSequence = workflow.steps.map(s => s.toolName).join("->")
    return `${toolSequence}|${workflow.steps.length}`
  }

  private async generateDomainWorkflows(
    domain: string,
    taskAnalysis: any,
    availableTools: ToolIntelligenceMetadata[],
    constraints?: any
  ): Promise<WorkflowPlan[]> {
    // Domain-specific workflow generation
    // This would contain specialized logic for different domains
    return []
  }

  private calculateContextFit(workflow: WorkflowPlan, context: TaskContext): number {
    // Calculate how well the workflow fits the current context
    let fit = 1.0

    // Check if workflow tools match project technologies
    const workflowTools = workflow.steps.map(s => s.toolName)
    const techMatch = workflowTools.some(tool => 
      context.technologies.some(tech => tool.toLowerCase().includes(tech.toLowerCase()))
    )
    if (techMatch) {fit += 0.1}

    return Math.min(1.0, fit)
  }

  private calculatePerformanceScore(workflow: WorkflowPlan): number {
    // Calculate performance score based on historical data
    const avgSuccessRate = workflow.steps.reduce((sum, step) => {
      // This would use actual performance data
      return sum + 0.85 // Placeholder
    }, 0) / workflow.steps.length

    return avgSuccessRate
  }

  private calculatePreferenceScore(workflow: WorkflowPlan, userPreferences: any): number {
    // Calculate score based on user preferences
    let score = 1.0

    // Check if workflow uses preferred tools
    if (userPreferences.preferredLibraries) {
      const usesPreferred = workflow.steps.some(step =>
        userPreferences.preferredLibraries.some((pref: string) =>
          step.toolName.toLowerCase().includes(pref.toLowerCase())
        )
      )
      if (usesPreferred) {score += 0.1}
    }

    return Math.min(1.0, score)
  }

  private calculateComplexityScore(workflow: WorkflowPlan, context: TaskContext): number {
    // Adjust score based on complexity preferences
    const complexity = workflow.riskAssessment
    
    // Default complexity scoring - can be extended based on user preferences
    if (complexity === "low") {
      return 1.05 // Slightly prefer low complexity workflows
    } else if (complexity === "high") {
      return 0.95 // Slightly penalize high complexity workflows
    }

    return 1.0
  }

  private calculateOverallConfidence(workflows: WorkflowPlan[]): number {
    if (workflows.length === 0) {return 0}

    const totalConfidence = workflows.reduce((sum, wf) => sum + wf.confidence, 0)
    return totalConfidence / workflows.length
  }

  private generateCompositionReasoning(workflows: WorkflowPlan[], taskAnalysis: any): string[] {
    const reasoning: string[] = []

    reasoning.push(`Generated ${workflows.length} workflow(s) for task complexity: ${taskAnalysis.complexity}`)
    reasoning.push(`Required capabilities: ${taskAnalysis.requiredCapabilities.join(", ")}`)
    
    if (workflows.length > 0) {
      const bestWorkflow = workflows[0]
      reasoning.push(`Best workflow: ${bestWorkflow.description} (${(bestWorkflow.confidence * 100).toFixed(1)}% confidence)`)
      reasoning.push(`Estimated execution time: ${(bestWorkflow.estimatedTotalTime / 1000).toFixed(1)}s`)
    }

    return reasoning
  }

  private async generateToolSwapAlternatives(
    workflow: WorkflowPlan,
    availableTools: ToolIntelligenceMetadata[]
  ): Promise<WorkflowPlan[]> {
    // Generate alternatives by swapping tools with similar capabilities
    const alternatives: WorkflowPlan[] = []

    for (const step of workflow.steps) {
      const currentTool = availableTools.find(t => t.name === step.toolName)
      if (!currentTool) {continue}

      // Find alternative tools with similar capabilities
      const alternativesForStep = availableTools.filter(tool =>
        tool.name !== step.toolName &&
        tool.capabilities.some(cap => currentTool.capabilities.includes(cap))
      )

      for (const altTool of alternativesForStep.slice(0, 2)) { // Limit to 2 alternatives per step
        const altWorkflow = {
          ...workflow,
          id: `${workflow.id}-alt-${altTool.name}`,
          steps: workflow.steps.map(s =>
            s.id === step.id
              ? { ...s, toolName: altTool.name, description: `Execute ${altTool.name} for ${s.description}` }
              : s
          ),
          confidence: workflow.confidence * 0.9 // Slightly lower confidence for alternatives
        }
        alternatives.push(altWorkflow)
      }
    }

    return alternatives
  }

  private async generateOrderAlternatives(workflow: WorkflowPlan): Promise<WorkflowPlan[]> {
    // Generate alternatives by changing execution order where possible
    // This is a simplified implementation
    return []
  }
}
