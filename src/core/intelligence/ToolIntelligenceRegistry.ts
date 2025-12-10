/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Intelligent Tool Selection System - Tool Intelligence Registry
 * MIT License
 */

import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs/promises"
import * as crypto from "crypto"
import {
  ToolIntelligenceMetadata,
  ToolPerformanceRecord,
  PerformanceMetrics,
  ContextualRelevance,
  TaskContext,
  ProjectContext,
  FileStructureMemory,
  UserPreferences,
  ActivityRecord,
  SessionRecord,
  McpServerIntelligence,
  McpServerPerformanceMetrics,
  McpServerUsageResult,
  CapabilityMapping
} from "./types"
import { MemoryManager } from "../memory/MemoryManager"
import { McpServerScorer } from "./McpServerScorer"

export class ToolIntelligenceRegistry {
  private tools: Map<string, ToolIntelligenceMetadata> = new Map()
  private performanceHistory: Map<string, ToolPerformanceRecord[]> = new Map()
  private mcpServers: Map<string, McpServerIntelligence> = new Map()
  private mcpServerScorer: McpServerScorer
  private readonly context: vscode.ExtensionContext
  private readonly outputChannel: vscode.OutputChannel
  private readonly memoryManager: MemoryManager
  private storagePath: string = ""

  constructor(
    context: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel,
    memoryManager: MemoryManager
  ) {
    this.context = context
    this.outputChannel = outputChannel
    this.memoryManager = memoryManager
    this.mcpServerScorer = new McpServerScorer()
    this.initializeStorage()
    this.initializeBuiltinTools()
  }

  private async initializeStorage(): Promise<void> {
    try {
      const settingsDir = path.join(this.context.globalStorageUri.fsPath, "intelligence")
      await fs.mkdir(settingsDir, { recursive: true })
      this.storagePath = settingsDir
      await this.loadToolMetadata()
      await this.loadPerformanceHistory()
      await this.loadMcpServerMetadata()
      this.outputChannel.appendLine("Tool Intelligence Registry storage initialized")
    } catch (error) {
      this.outputChannel.appendLine(`Failed to initialize Tool Intelligence Registry storage: ${error}`)
    }
  }

  private initializeBuiltinTools(): void {
    // Register built-in Cline tools with intelligence metadata
    this.registerTool({
      name: "read_file",
      description: "Read file contents",
      capabilities: ["file-reading", "content-analysis", "text-extraction"],
      domains: ["file-operations", "data-extraction", "code-analysis"],
      complexity: "low",
      reliability: 0.95,
      typicalUseCases: ["code-review", "configuration-analysis", "documentation-reading", "debugging"],
      prerequisites: [],
      alternatives: ["list_files", "search_files"],
      performanceMetrics: {
        avgExecutionTime: 500,
        successRate: 0.98,
        errorPatterns: ["file-not-found", "permission-denied", "encoding-issues"],
        lastUsed: Date.now(),
        usageCount: 0
      },
      contextualRelevance: {
        projectTypes: ["all"],
        filePatterns: ["*"],
        dependencies: [],
        technologies: []
      }
    })

    this.registerTool({
      name: "write_to_file",
      description: "Write content to a file",
      capabilities: ["file-writing", "content-creation", "file-generation"],
      domains: ["file-operations", "content-creation", "code-generation"],
      complexity: "low",
      reliability: 0.92,
      typicalUseCases: ["code-generation", "configuration-creation", "documentation-writing", "file-setup"],
      prerequisites: ["directory-exists"],
      alternatives: ["replace_in_file"],
      performanceMetrics: {
        avgExecutionTime: 800,
        successRate: 0.96,
        errorPatterns: ["permission-denied", "disk-full", "invalid-path"],
        lastUsed: Date.now(),
        usageCount: 0
      },
      contextualRelevance: {
        projectTypes: ["all"],
        filePatterns: ["*"],
        dependencies: [],
        technologies: []
      }
    })

    this.registerTool({
      name: "replace_in_file",
      description: "Replace sections of content in an existing file",
      capabilities: ["file-editing", "content-modification", "targeted-changes"],
      domains: ["file-operations", "code-refactoring", "content-modification"],
      complexity: "medium",
      reliability: 0.88,
      typicalUseCases: ["code-refactoring", "bug-fixes", "configuration-updates", "targeted-edits"],
      prerequisites: ["file-exists"],
      alternatives: ["write_to_file"],
      performanceMetrics: {
        avgExecutionTime: 600,
        successRate: 0.94,
        errorPatterns: ["pattern-not-found", "permission-denied", "encoding-issues"],
        lastUsed: Date.now(),
        usageCount: 0
      },
      contextualRelevance: {
        projectTypes: ["all"],
        filePatterns: ["*"],
        dependencies: [],
        technologies: []
      }
    })

    this.registerTool({
      name: "execute_command",
      description: "Execute CLI commands",
      capabilities: ["command-execution", "system-operations", "process-management"],
      domains: ["system-operations", "build-tools", "development-workflow"],
      complexity: "high",
      reliability: 0.75,
      typicalUseCases: ["building-projects", "running-tests", "package-management", "system-operations"],
      prerequisites: ["shell-access", "working-directory"],
      alternatives: [],
      performanceMetrics: {
        avgExecutionTime: 5000,
        successRate: 0.85,
        errorPatterns: ["command-not-found", "permission-denied", "timeout", "syntax-error"],
        lastUsed: Date.now(),
        usageCount: 0
      },
      contextualRelevance: {
        projectTypes: ["all"],
        filePatterns: [],
        dependencies: ["shell"],
        technologies: []
      }
    })

    this.registerTool({
      name: "search_files",
      description: "Search for patterns across files",
      capabilities: ["pattern-searching", "content-discovery", "code-analysis"],
      domains: ["file-operations", "code-analysis", "data-discovery"],
      complexity: "medium",
      reliability: 0.90,
      typicalUseCases: ["code-search", "pattern-finding", "dependency-analysis", "debugging"],
      prerequisites: ["directory-exists"],
      alternatives: ["list_files", "read_file"],
      performanceMetrics: {
        avgExecutionTime: 2000,
        successRate: 0.92,
        errorPatterns: ["invalid-regex", "permission-denied", "directory-not-found"],
        lastUsed: Date.now(),
        usageCount: 0
      },
      contextualRelevance: {
        projectTypes: ["all"],
        filePatterns: ["*"],
        dependencies: [],
        technologies: []
      }
    })

    this.registerTool({
      name: "list_files",
      description: "List files and directories",
      capabilities: ["directory-listing", "file-discovery", "structure-analysis"],
      domains: ["file-operations", "project-analysis", "structure-discovery"],
      complexity: "low",
      reliability: 0.96,
      typicalUseCases: ["project-exploration", "file-discovery", "structure-analysis", "navigation"],
      prerequisites: ["directory-exists"],
      alternatives: ["search_files"],
      performanceMetrics: {
        avgExecutionTime: 300,
        successRate: 0.99,
        errorPatterns: ["directory-not-found", "permission-denied"],
        lastUsed: Date.now(),
        usageCount: 0
      },
      contextualRelevance: {
        projectTypes: ["all"],
        filePatterns: ["*"],
        dependencies: [],
        technologies: []
      }
    })

    this.registerTool({
      name: "list_code_definition_names",
      description: "List code definition names in source files",
      capabilities: ["code-analysis", "structure-discovery", "definition-extraction"],
      domains: ["code-analysis", "project-understanding", "architecture-analysis"],
      complexity: "medium",
      reliability: 0.85,
      typicalUseCases: ["code-exploration", "architecture-understanding", "dependency-analysis", "refactoring"],
      prerequisites: ["source-files-exist"],
      alternatives: ["search_files", "read_file"],
      performanceMetrics: {
        avgExecutionTime: 1500,
        successRate: 0.88,
        errorPatterns: ["no-source-files", "parsing-errors", "permission-denied"],
        lastUsed: Date.now(),
        usageCount: 0
      },
      contextualRelevance: {
        projectTypes: ["software-project"],
        filePatterns: ["*.js", "*.ts", "*.py", "*.java", "*.cpp", "*.cs", "*.go", "*.rs"],
        dependencies: [],
        technologies: ["javascript", "typescript", "python", "java", "cpp", "csharp", "go", "rust"]
      }
    })

    this.registerTool({
      name: "use_mcp_tool",
      description: "Use tools provided by MCP servers",
      capabilities: ["external-tool-execution", "mcp-integration", "extended-functionality"],
      domains: ["mcp-integration", "external-services", "extended-capabilities"],
      complexity: "variable",
      reliability: 0.80,
      typicalUseCases: ["external-api-calls", "specialized-operations", "third-party-integrations"],
      prerequisites: ["mcp-server-connected"],
      alternatives: [],
      performanceMetrics: {
        avgExecutionTime: 3000,
        successRate: 0.85,
        errorPatterns: ["server-not-connected", "tool-not-found", "invalid-arguments"],
        lastUsed: Date.now(),
        usageCount: 0
      },
      contextualRelevance: {
        projectTypes: ["all"],
        filePatterns: [],
        dependencies: ["mcp-server"],
        technologies: []
      }
    })

    this.registerTool({
      name: "ask_followup_question",
      description: "Ask user for clarification or additional information",
      capabilities: ["user-interaction", "clarification", "information-gathering"],
      domains: ["user-interaction", "communication", "clarification"],
      complexity: "low",
      reliability: 0.98,
      typicalUseCases: ["requirement-clarification", "ambiguity-resolution", "user-guidance"],
      prerequisites: [],
      alternatives: [],
      performanceMetrics: {
        avgExecutionTime: 100,
        successRate: 0.99,
        errorPatterns: [],
        lastUsed: Date.now(),
        usageCount: 0
      },
      contextualRelevance: {
        projectTypes: ["all"],
        filePatterns: [],
        dependencies: [],
        technologies: []
      }
    })

    this.registerTool({
      name: "attempt_completion",
      description: "Present task completion results",
      capabilities: ["task-completion", "result-presentation", "workflow-termination"],
      domains: ["task-management", "workflow", "completion"],
      complexity: "low",
      reliability: 0.99,
      typicalUseCases: ["task-completion", "result-presentation", "workflow-finalization"],
      prerequisites: ["task-completed"],
      alternatives: [],
      performanceMetrics: {
        avgExecutionTime: 100,
        successRate: 0.99,
        errorPatterns: [],
        lastUsed: Date.now(),
        usageCount: 0
      },
      contextualRelevance: {
        projectTypes: ["all"],
        filePatterns: [],
        dependencies: [],
        technologies: []
      }
    })

    this.outputChannel.appendLine(`Initialized ${this.tools.size} built-in tools with intelligence metadata`)
  }

  async registerTool(metadata: ToolIntelligenceMetadata): Promise<void> {
    try {
      this.tools.set(metadata.name, metadata)
      await this.persistToolMetadata(metadata)
      this.outputChannel.appendLine(`Registered tool: ${metadata.name}`)
    } catch (error) {
      this.outputChannel.appendLine(`Failed to register tool ${metadata.name}: ${error}`)
    }
  }

  async registerMcpTool(serverName: string, toolName: string, description: string, inputSchema?: any): Promise<void> {
    const metadata: ToolIntelligenceMetadata = {
      name: `${serverName}.${toolName}`,
      description,
      capabilities: this.extractCapabilities(description, inputSchema),
      domains: this.inferDomains(description, inputSchema),
      complexity: this.assessComplexity(inputSchema),
      reliability: 0.75, // Default for MCP tools until we gather data
      typicalUseCases: this.extractUseCases(description),
      prerequisites: ["mcp-server-connected"],
      alternatives: [],
      performanceMetrics: {
        avgExecutionTime: 2000,
        successRate: 0.80,
        errorPatterns: ["server-error", "network-issues", "invalid-arguments"],
        lastUsed: Date.now(),
        usageCount: 0
      },
      contextualRelevance: {
        projectTypes: ["all"],
        filePatterns: [],
        dependencies: [serverName],
        technologies: []
      },
      mcpServer: serverName,
      inputSchema
    }

    await this.registerTool(metadata)
  }

  async getToolMetadata(toolName: string): Promise<ToolIntelligenceMetadata | null> {
    return this.tools.get(toolName) || null
  }

  async getToolsByDomain(domain: string): Promise<ToolIntelligenceMetadata[]> {
    return Array.from(this.tools.values()).filter(tool =>
      tool.domains.includes(domain)
    )
  }

  async getToolsByCapability(capability: string): Promise<ToolIntelligenceMetadata[]> {
    return Array.from(this.tools.values()).filter(tool =>
      tool.capabilities.includes(capability)
    )
  }

  async getAllToolNames(): Promise<string[]> {
    return Array.from(this.tools.keys())
  }

  async getToolAlternatives(toolName: string): Promise<ToolIntelligenceMetadata[]> {
    const tool = this.tools.get(toolName)
    if (!tool) { return [] }

    const alternatives: ToolIntelligenceMetadata[] = []
    for (const altName of tool.alternatives) {
      const altTool = this.tools.get(altName)
      if (altTool) {
        alternatives.push(altTool)
      }
    }
    return alternatives
  }

  async updateToolPerformance(toolName: string, record: ToolPerformanceRecord): Promise<void> {
    try {
      const history = this.performanceHistory.get(toolName) || []
      history.push(record)

      // Keep only last 100 records
      if (history.length > 100) {
        history.splice(0, history.length - 100)
      }

      this.performanceHistory.set(toolName, history)

      // Update tool metadata with new performance metrics
      const tool = this.tools.get(toolName)
      if (tool) {
        tool.performanceMetrics = this.calculatePerformanceMetrics(history)
        await this.persistToolMetadata(tool)
        await this.persistPerformanceHistory(toolName, history)
      }

      this.outputChannel.appendLine(`Updated performance for tool: ${toolName}`)
    } catch (error) {
      this.outputChannel.appendLine(`Failed to update performance for ${toolName}: ${error}`)
    }
  }

  async getRelevantTools(taskContext: TaskContext): Promise<ToolIntelligenceMetadata[]> {
    const relevantTools: ToolIntelligenceMetadata[] = []

    for (const tool of this.tools.values()) {
      const relevanceScore = this.calculateRelevanceScore(tool, taskContext)
      if (relevanceScore > 0.3) { // Minimum relevance threshold
        relevantTools.push(tool)
      }
    }

    // Sort by relevance score
    relevantTools.sort((a, b) => {
      const scoreA = this.calculateRelevanceScore(a, taskContext)
      const scoreB = this.calculateRelevanceScore(b, taskContext)
      return scoreB - scoreA
    })

    return relevantTools.slice(0, 10) // Return top 10 most relevant tools
  }

  private calculateRelevanceScore(tool: ToolIntelligenceMetadata, context: TaskContext): number {
    let score = 0

    // Project type relevance
    if (tool.contextualRelevance.projectTypes.includes("all") ||
      tool.contextualRelevance.projectTypes.includes(context.projectType)) {
      score += 0.3
    }

    // Technology relevance
    const techMatches = context.technologies.filter(tech =>
      tool.contextualRelevance.technologies.includes(tech)
    ).length
    if (techMatches > 0) {
      score += 0.2 * (techMatches / context.technologies.length)
    }

    // Capability relevance based on user request
    const requestLower = context.userRequest.toLowerCase()
    for (const capability of tool.capabilities) {
      if (requestLower.includes(capability.toLowerCase())) {
        score += 0.15
      }
    }

    // Domain relevance
    for (const domain of tool.domains) {
      if (requestLower.includes(domain.toLowerCase())) {
        score += 0.1
      }
    }

    // Performance boost
    score += tool.performanceMetrics.successRate * 0.1

    // Recent usage boost
    const daysSinceLastUsed = (Date.now() - tool.performanceMetrics.lastUsed) / (1000 * 60 * 60 * 24)
    if (daysSinceLastUsed < 7) {
      score += 0.05
    }

    return Math.min(score, 1.0)
  }

  private calculatePerformanceMetrics(history: ToolPerformanceRecord[]): PerformanceMetrics {
    if (history.length === 0) {
      return {
        avgExecutionTime: 0,
        successRate: 0,
        errorPatterns: [],
        lastUsed: Date.now(),
        usageCount: 0
      }
    }

    const successRate = history.filter(r => r.success).length / history.length
    const avgExecutionTime = history.reduce((sum, r) => sum + r.executionTime, 0) / history.length
    const errorPatterns = this.extractErrorPatterns(history)
    const lastUsed = Math.max(...history.map(r => r.timestamp))

    return {
      avgExecutionTime,
      successRate,
      errorPatterns,
      lastUsed,
      usageCount: history.length
    }
  }

  private extractErrorPatterns(history: ToolPerformanceRecord[]): string[] {
    const errorCounts: Record<string, number> = {}

    for (const record of history) {
      if (!record.success && record.error) {
        const pattern = this.categorizeError(record.error)
        errorCounts[pattern] = (errorCounts[pattern] || 0) + 1
      }
    }

    return Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([pattern]) => pattern)
  }

  private categorizeError(error: string): string {
    const lowerError = error.toLowerCase()

    if (lowerError.includes("permission") || lowerError.includes("access denied")) {
      return "permission-denied"
    }
    if (lowerError.includes("not found") || lowerError.includes("doesn't exist")) {
      return "not-found"
    }
    if (lowerError.includes("timeout") || lowerError.includes("timed out")) {
      return "timeout"
    }
    if (lowerError.includes("network") || lowerError.includes("connection")) {
      return "network-error"
    }
    if (lowerError.includes("syntax") || lowerError.includes("parse")) {
      return "syntax-error"
    }

    return "other-error"
  }

  private extractCapabilities(description: string, inputSchema?: any): string[] {
    const capabilities: string[] = []
    const descLower = description.toLowerCase()

    // Extract capabilities from description
    if (descLower.includes("search") || descLower.includes("find")) {
      capabilities.push("searching")
    }
    if (descLower.includes("read") || descLower.includes("get")) {
      capabilities.push("reading")
    }
    if (descLower.includes("write") || descLower.includes("create")) {
      capabilities.push("writing")
    }
    if (descLower.includes("execute") || descLower.includes("run")) {
      capabilities.push("execution")
    }
    if (descLower.includes("analyze") || descLower.includes("analysis")) {
      capabilities.push("analysis")
    }

    // Extract capabilities from input schema
    if (inputSchema && inputSchema.properties) {
      for (const [key, schema] of Object.entries(inputSchema.properties as any)) {
        if (key.includes("url") || key.includes("endpoint")) {
          capabilities.push("api-access")
        }
        if (key.includes("file") || key.includes("path")) {
          capabilities.push("file-operations")
        }
        if (key.includes("query") || key.includes("search")) {
          capabilities.push("searching")
        }
      }
    }

    return capabilities.length > 0 ? capabilities : ["general-purpose"]
  }

  private inferDomains(description: string, inputSchema?: any): string[] {
    const domains: string[] = []
    const descLower = description.toLowerCase()

    if (descLower.includes("web") || descLower.includes("http") || descLower.includes("api")) {
      domains.push("web-services")
    }
    if (descLower.includes("file") || descLower.includes("directory")) {
      domains.push("file-operations")
    }
    if (descLower.includes("data") || descLower.includes("analytics")) {
      domains.push("data-analysis")
    }
    if (descLower.includes("code") || descLower.includes("programming")) {
      domains.push("code-analysis")
    }
    if (descLower.includes("system") || descLower.includes("command")) {
      domains.push("system-operations")
    }

    return domains.length > 0 ? domains : ["general"]
  }

  private assessComplexity(inputSchema?: any): "low" | "medium" | "high" {
    if (!inputSchema || !inputSchema.properties) {
      return "low"
    }

    const propertyCount = Object.keys(inputSchema.properties).length
    const hasNestedObjects = Object.values(inputSchema.properties as any).some(
      (prop: any) => prop.type === "object" || prop.type === "array"
    )
    const hasRequired = inputSchema.required && inputSchema.required.length > 2

    if (propertyCount > 5 || hasNestedObjects || hasRequired) {
      return "high"
    } else if (propertyCount > 2) {
      return "medium"
    } else {
      return "low"
    }
  }

  private extractUseCases(description: string): string[] {
    const useCases: string[] = []
    const descLower = description.toLowerCase()

    if (descLower.includes("debug") || descLower.includes("troubleshoot")) {
      useCases.push("debugging")
    }
    if (descLower.includes("test") || descLower.includes("testing")) {
      useCases.push("testing")
    }
    if (descLower.includes("build") || descLower.includes("compile")) {
      useCases.push("building")
    }
    if (descLower.includes("deploy") || descLower.includes("deployment")) {
      useCases.push("deployment")
    }
    if (descLower.includes("monitor") || descLower.includes("observe")) {
      useCases.push("monitoring")
    }

    return useCases.length > 0 ? useCases : ["general-tasks"]
  }

  private async persistToolMetadata(metadata: ToolIntelligenceMetadata): Promise<void> {
    try {
      const filePath = path.join(this.storagePath, `${metadata.name}.json`)
      await fs.writeFile(filePath, JSON.stringify(metadata, null, 2))
    } catch (error) {
      this.outputChannel.appendLine(`Failed to persist tool metadata for ${metadata.name}: ${error}`)
    }
  }

  private async persistPerformanceHistory(toolName: string, history: ToolPerformanceRecord[]): Promise<void> {
    try {
      const filePath = path.join(this.storagePath, `${toolName}_performance.json`)
      await fs.writeFile(filePath, JSON.stringify(history, null, 2))
    } catch (error) {
      this.outputChannel.appendLine(`Failed to persist performance history for ${toolName}: ${error}`)
    }
  }

  private async loadToolMetadata(): Promise<void> {
    try {
      const files = await fs.readdir(this.storagePath)
      const metadataFiles = files.filter(file => !file.includes("_performance") && file.endsWith(".json"))

      for (const file of metadataFiles) {
        try {
          const filePath = path.join(this.storagePath, file)
          const data = await fs.readFile(filePath, 'utf-8')
          const metadata: ToolIntelligenceMetadata = JSON.parse(data)
          this.tools.set(metadata.name, metadata)
        } catch (fileError) {
          this.outputChannel.appendLine(`Failed to load tool metadata from ${file}: ${fileError}`)
        }
      }

      this.outputChannel.appendLine(`Loaded ${this.tools.size} tools from storage`)
    } catch (error) {
      this.outputChannel.appendLine(`Failed to load tool metadata: ${error}`)
    }
  }

  private async loadPerformanceHistory(): Promise<void> {
    try {
      const files = await fs.readdir(this.storagePath)
      const performanceFiles = files.filter(file => file.includes("_performance") && file.endsWith(".json"))

      for (const file of performanceFiles) {
        try {
          const filePath = path.join(this.storagePath, file)
          const data = await fs.readFile(filePath, 'utf-8')
          const history: ToolPerformanceRecord[] = JSON.parse(data)
          const toolName = file.replace("_performance.json", "")
          this.performanceHistory.set(toolName, history)
        } catch (fileError) {
          this.outputChannel.appendLine(`Failed to load performance history from ${file}: ${fileError}`)
        }
      }

      this.outputChannel.appendLine(`Loaded performance history for ${this.performanceHistory.size} tools`)
    } catch (error) {
      this.outputChannel.appendLine(`Failed to load performance history: ${error}`)
    }
  }

  async getRegistryStats(): Promise<{
    totalTools: number
    toolsWithPerformanceData: number
    averageReliability: number
    mostUsedTools: string[]
  }> {
    const toolsWithPerf = Array.from(this.performanceHistory.entries()).filter(([, history]) => history.length > 0)
    const avgReliability = Array.from(this.tools.values()).reduce((sum, tool) => sum + tool.reliability, 0) / this.tools.size
    const mostUsed = Array.from(this.tools.entries())
      .sort(([, a], [, b]) => b.performanceMetrics.usageCount - a.performanceMetrics.usageCount)
      .slice(0, 5)
      .map(([name]) => name)

    return {
      totalTools: this.tools.size,
      toolsWithPerformanceData: toolsWithPerf.length,
      averageReliability: avgReliability,
      mostUsedTools: mostUsed
    }
  }

  // ============================================================================
  // MCP Server Intelligence Methods
  // ============================================================================

  /**
   * Register an MCP server with intelligence metadata
   * Automatically infers capabilities from tools and resources
   */
  async registerMcpServer(
    serverName: string,
    description: string,
    tools: Array<{ name: string; description?: string; inputSchema?: any }>,
    resources: Array<{ name: string; description?: string }>,
    status: "connected" | "connecting" | "disconnected" = "connected"
  ): Promise<void> {
    try {
      // Infer capabilities from tools and resources
      const capabilities = this.inferServerCapabilities(tools, resources)
      const domains = this.inferServerDomains(tools, resources)
      const keywords = this.extractServerKeywords(serverName, description, tools, resources)
      const useCasePatterns = this.extractServerUseCases(tools, resources)

      const serverIntelligence: McpServerIntelligence = {
        serverName,
        description,
        capabilities,
        domains,
        confidence: this.calculateInferenceConfidence(tools, resources),
        toolCount: tools.length,
        resourceCount: resources.length,
        performanceMetrics: {
          avgResponseTime: 2000,  // Default, will be updated with actual data
          successRate: 1.0,
          errorRate: 0.0,
          timeoutRate: 0.0,
          totalRequests: 0,
          failedRequests: 0,
          consecutiveFailures: 0
        },
        useCasePatterns,
        keywords,
        status,
        lastUsed: Date.now()
      }

      this.mcpServers.set(serverName, serverIntelligence)
      await this.persistMcpServerMetadata(serverIntelligence)

      this.outputChannel.appendLine(
        `Registered MCP server: ${serverName} with ${capabilities.length} capabilities, ${tools.length} tools`
      )
    } catch (error) {
      this.outputChannel.appendLine(`Failed to register MCP server ${serverName}: ${error}`)
    }
  }

  /**
   * Update MCP server performance metrics based on usage
   */
  async updateMcpServerPerformance(result: McpServerUsageResult): Promise<void> {
    const server = this.mcpServers.get(result.serverName)
    if (!server) {
      return
    }

    const metrics = server.performanceMetrics

    // Update metrics
    metrics.totalRequests++
    if (!result.success) {
      metrics.failedRequests++
      metrics.consecutiveFailures++
    } else {
      metrics.consecutiveFailures = 0
    }

    // Update rates
    metrics.successRate = (metrics.totalRequests - metrics.failedRequests) / metrics.totalRequests
    metrics.errorRate = metrics.failedRequests / metrics.totalRequests

    // Update timeout rate
    if (result.errorType === "timeout") {
      metrics.timeoutRate = ((metrics.timeoutRate * (metrics.totalRequests - 1)) + 1) / metrics.totalRequests
    }

    // Update average response time (exponential moving average)
    if (result.success) {
      metrics.avgResponseTime = metrics.avgResponseTime * 0.9 + result.responseTime * 0.1
      metrics.lastSuccessTime = result.timestamp
      server.lastUsed = result.timestamp
    } else {
      metrics.lastFailureTime = result.timestamp
    }

    await this.persistMcpServerMetadata(server)
  }

  /**
   * Get MCP server intelligence metadata
   */
  getMcpServer(serverName: string): McpServerIntelligence | null {
    return this.mcpServers.get(serverName) || null
  }

  /**
   * Get all registered MCP servers
   */
  getAllMcpServers(): McpServerIntelligence[] {
    return Array.from(this.mcpServers.values())
  }

  /**
   * Get MCP servers by capability
   */
  getMcpServersByCapability(capability: string): McpServerIntelligence[] {
    return Array.from(this.mcpServers.values()).filter(server =>
      server.capabilities.some(cap => cap.toLowerCase().includes(capability.toLowerCase()))
    )
  }

  /**
   * Get the MCP server scorer for external use
   */
  getMcpServerScorer(): McpServerScorer {
    return this.mcpServerScorer
  }

  /**
   * Infer server capabilities from tools and resources
   */
  private inferServerCapabilities(
    tools: Array<{ name: string; description?: string; inputSchema?: any }>,
    resources: Array<{ name: string; description?: string }>
  ): string[] {
    const capabilities = new Set<string>()
    const mappings = this.mcpServerScorer.getCapabilityMappings()

    // Analyze tools
    for (const tool of tools) {
      const toolText = `${tool.name} ${tool.description || ""}`.toLowerCase()

      for (const mapping of mappings) {
        // Check keywords
        if (mapping.keywords.some(keyword => toolText.includes(keyword))) {
          capabilities.add(mapping.capability)
        }

        // Check tool name patterns
        for (const pattern of mapping.toolNamePatterns) {
          const regex = new RegExp(pattern, "i")
          if (regex.test(tool.name)) {
            capabilities.add(mapping.capability)
          }
        }

        // Check description patterns
        if (tool.description) {
          for (const pattern of mapping.descriptionPatterns) {
            const regex = new RegExp(pattern, "i")
            if (regex.test(tool.description)) {
              capabilities.add(mapping.capability)
            }
          }
        }
      }
    }

    // Analyze resources
    for (const resource of resources) {
      const resourceText = `${resource.name} ${resource.description || ""}`.toLowerCase()

      if (resourceText.includes("doc") || resourceText.includes("reference")) {
        capabilities.add("documentation")
      }
      if (resourceText.includes("file") || resourceText.includes("path")) {
        capabilities.add("file-operations")
      }
    }

    return Array.from(capabilities)
  }

  /**
   * Infer server domains from tools and resources
   */
  private inferServerDomains(
    tools: Array<{ name: string; description?: string }>,
    resources: Array<{ name: string; description?: string }>
  ): string[] {
    const domains = new Set<string>()
    const allText = [
      ...tools.map(t => `${t.name} ${t.description || ""}`),
      ...resources.map(r => `${r.name} ${r.description || ""}`)
    ].join(" ").toLowerCase()

    if (allText.includes("web") || allText.includes("http") || allText.includes("api")) {
      domains.add("web-services")
    }
    if (allText.includes("file") || allText.includes("directory") || allText.includes("filesystem")) {
      domains.add("file-operations")
    }
    if (allText.includes("data") || allText.includes("analytics") || allText.includes("query")) {
      domains.add("data-analysis")
    }
    if (allText.includes("code") || allText.includes("programming") || allText.includes("development")) {
      domains.add("development")
    }
    if (allText.includes("doc") || allText.includes("reference") || allText.includes("guide")) {
      domains.add("documentation")
    }
    if (allText.includes("search") || allText.includes("find") || allText.includes("lookup")) {
      domains.add("search")
    }

    return Array.from(domains)
  }

  /**
   * Extract keywords for server matching
   */
  private extractServerKeywords(
    serverName: string,
    description: string,
    tools: Array<{ name: string; description?: string }>,
    resources: Array<{ name: string; description?: string }>
  ): string[] {
    const keywords = new Set<string>()

    // Add server name parts
    const nameParts = serverName.toLowerCase().split(/[-_\s]/)
    nameParts.forEach(part => keywords.add(part))

    // Add description keywords
    const descWords = description.toLowerCase().split(/\s+/)
    descWords.forEach(word => {
      if (word.length > 3) {  // Only meaningful words
        keywords.add(word)
      }
    })

    // Add common tool/resource keywords
    const commonKeywords = ["search", "find", "get", "fetch", "read", "write", "create", "update", "delete", "list", "query"]
    const allText = [
      ...tools.map(t => `${t.name} ${t.description || ""}`),
      ...resources.map(r => `${r.name} ${r.description || ""}`)
    ].join(" ").toLowerCase()

    commonKeywords.forEach(keyword => {
      if (allText.includes(keyword)) {
        keywords.add(keyword)
      }
    })

    return Array.from(keywords).slice(0, 20)  // Limit to 20 keywords
  }

  /**
   * Extract use case patterns from tools and resources
   */
  private extractServerUseCases(
    tools: Array<{ name: string; description?: string }>,
    resources: Array<{ name: string; description?: string }>
  ): string[] {
    const useCases = new Set<string>()

    const allText = [
      ...tools.map(t => `${t.name} ${t.description || ""}`),
      ...resources.map(r => `${r.name} ${r.description || ""}`)
    ].join(" ").toLowerCase()

    if (allText.includes("documentation") || allText.includes("docs") || allText.includes("reference")) {
      useCases.add("Documentation lookup")
    }
    if (allText.includes("search") || allText.includes("find") || allText.includes("query")) {
      useCases.add("Information search")
    }
    if (allText.includes("file") || allText.includes("directory")) {
      useCases.add("File operations")
    }
    if (allText.includes("api") || allText.includes("endpoint") || allText.includes("request")) {
      useCases.add("API interactions")
    }
    if (allText.includes("code") || allText.includes("programming")) {
      useCases.add("Code analysis")
    }

    return Array.from(useCases)
  }

  /**
   * Calculate confidence in capability inference
   */
  private calculateInferenceConfidence(
    tools: Array<{ name: string; description?: string }>,
    resources: Array<{ name: string; description?: string }>
  ): number {
    let confidence = 0.5  // Base confidence

    // More tools/resources = higher confidence
    const totalItems = tools.length + resources.length
    if (totalItems > 10) {
      confidence += 0.2
    } else if (totalItems > 5) {
      confidence += 0.1
    }

    // Tools with descriptions = higher confidence
    const toolsWithDesc = tools.filter(t => t.description && t.description.length > 10).length
    confidence += (toolsWithDesc / tools.length) * 0.2

    // Resources with descriptions = higher confidence
    const resourcesWithDesc = resources.filter(r => r.description && r.description.length > 10).length
    if (resources.length > 0) {
      confidence += (resourcesWithDesc / resources.length) * 0.1
    }

    return Math.min(confidence, 1.0)
  }

  /**
   * Persist MCP server metadata to storage
   */
  private async persistMcpServerMetadata(server: McpServerIntelligence): Promise<void> {
    try {
      const filePath = path.join(this.storagePath, `mcp_server_${server.serverName}.json`)
      await fs.writeFile(filePath, JSON.stringify(server, null, 2))
    } catch (error) {
      this.outputChannel.appendLine(`Failed to persist MCP server metadata for ${server.serverName}: ${error}`)
    }
  }

  /**
   * Load MCP server metadata from storage
   */
  private async loadMcpServerMetadata(): Promise<void> {
    try {
      const files = await fs.readdir(this.storagePath)
      const mcpServerFiles = files.filter(file => file.startsWith("mcp_server_") && file.endsWith(".json"))

      for (const file of mcpServerFiles) {
        try {
          const filePath = path.join(this.storagePath, file)
          const data = await fs.readFile(filePath, 'utf-8')
          const server: McpServerIntelligence = JSON.parse(data)
          this.mcpServers.set(server.serverName, server)
        } catch (fileError) {
          this.outputChannel.appendLine(`Failed to load MCP server metadata from ${file}: ${fileError}`)
        }
      }

      this.outputChannel.appendLine(`Loaded ${this.mcpServers.size} MCP servers from storage`)
    } catch (error) {
      this.outputChannel.appendLine(`Failed to load MCP server metadata: ${error}`)
    }
  }
}
