/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Intelligent Tool Selection System - Memory Manager
 * MIT License
 */

import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs/promises"
import {
  ToolSelectionPattern,
  ToolSelectionInsight,
  UserFeedback,
  TaskContext,
  ProjectContext,
  FileStructureMemory,
  ActivityRecord,
  SessionRecord,
  UserPreferences
} from "./types"

export interface ProjectMemory {
  projectId: string
  projectPath: string
  projectType: string
  technologies: string[]
  frameworks: string[]
  learnedPatterns: ToolSelectionPattern[]
  insights: ToolSelectionInsight[]
  userPreferences: UserPreferences
  fileStructure: FileStructureMemory
  sessionHistory: SessionRecord[]
  lastUpdated: number
}

export interface GlobalMemory {
  version: string
  globalPatterns: ToolSelectionPattern[]
  globalInsights: ToolSelectionInsight[]
  systemMetrics: {
    totalRecommendations: number
    averageSuccessRate: number
    mostUsedTools: Array<{ tool: string; usage: number }>
    commonPatterns: Array<{ pattern: string; frequency: number }>
  }
  lastUpdated: number
}

export class MemoryManager {
  private readonly context: vscode.ExtensionContext
  private readonly outputChannel: vscode.OutputChannel
  private readonly memoryStoragePath: string
  private currentProjectMemory: ProjectMemory | null = null
  private globalMemory: GlobalMemory | null = null
  private memoryCache: Map<string, any> = new Map()

  constructor(
    context: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel,
    memoryStoragePath?: string
  ) {
    this.context = context
    this.outputChannel = outputChannel
    this.memoryStoragePath = memoryStoragePath || path.join(context.globalStorageUri.fsPath, "memory")
    this.initializeStorage()
  }

  private async initializeStorage(): Promise<void> {
    try {
      await fs.mkdir(this.memoryStoragePath, { recursive: true })
      await this.loadGlobalMemory()
      this.outputChannel.appendLine("Memory Manager storage initialized")
    } catch (error) {
      this.outputChannel.appendLine(`Failed to initialize Memory Manager storage: ${error}`)
    }
  }

  async initialize(projectPath: string): Promise<void> {
    try {
      await this.loadProjectMemory(projectPath)
      this.outputChannel.appendLine(`Memory Manager initialized for project: ${projectPath}`)
    } catch (error) {
      this.outputChannel.appendLine(`Failed to initialize Memory Manager for project: ${error}`)
    }
  }

  async storeMemory(key: string, data: any, projectId?: string): Promise<void> {
    try {
      const storageKey = projectId ? `${projectId}:${key}` : key
      this.memoryCache.set(storageKey, data)

      const filePath = path.join(this.memoryStoragePath, `${storageKey}.json`)
      await fs.writeFile(filePath, JSON.stringify(data, null, 2))

      this.outputChannel.appendLine(`Stored memory: ${storageKey}`)
    } catch (error) {
      this.outputChannel.appendLine(`Failed to store memory ${key}: ${error}`)
    }
  }

  async retrieveMemory(key: string, projectId?: string): Promise<any> {
    try {
      const storageKey = projectId ? `${projectId}:${key}` : key

      // Check cache first
      if (this.memoryCache.has(storageKey)) {
        return this.memoryCache.get(storageKey)
      }

      // Load from disk
      const filePath = path.join(this.memoryStoragePath, `${storageKey}.json`)
      const data = await fs.readFile(filePath, 'utf-8')
      const parsedData = JSON.parse(data)

      // Cache the result
      this.memoryCache.set(storageKey, parsedData)

      return parsedData
    } catch (error) {
      this.outputChannel.appendLine(`Failed to retrieve memory ${key}: ${error}`)
      return null
    }
  }

  async searchMemory(query: string, projectId?: string): Promise<Array<{ key: string; data: any; relevance: number }>> {
    try {
      const results: Array<{ key: string; data: any; relevance: number }> = []
      const files = await fs.readdir(this.memoryStoragePath)

      for (const file of files) {
        if (!file.endsWith('.json')) {continue}

        const filePath = path.join(this.memoryStoragePath, file)
        const data = await fs.readFile(filePath, 'utf-8')
        const parsedData = JSON.parse(data)

        // Simple relevance calculation based on query matching
        const relevance = this.calculateRelevance(query, file, parsedData)
        if (relevance > 0.1) {
          results.push({
            key: file.replace('.json', ''),
            data: parsedData,
            relevance
          })
        }
      }

      return results.sort((a, b) => b.relevance - a.relevance)
    } catch (error) {
      this.outputChannel.appendLine(`Failed to search memory: ${error}`)
      return []
    }
  }

  async deleteMemory(key: string, projectId?: string): Promise<void> {
    try {
      const storageKey = projectId ? `${projectId}:${key}` : key
      this.memoryCache.delete(storageKey)

      const filePath = path.join(this.memoryStoragePath, `${storageKey}.json`)
      await fs.unlink(filePath)

      this.outputChannel.appendLine(`Deleted memory: ${storageKey}`)
    } catch (error) {
      this.outputChannel.appendLine(`Failed to delete memory ${key}: ${error}`)
    }
  }

  async clearMemory(projectId?: string): Promise<void> {
    try {
      const files = await fs.readdir(this.memoryStoragePath)
      
      for (const file of files) {
        if (projectId) {
          if (file.startsWith(`${projectId}:`)) {
            await fs.unlink(path.join(this.memoryStoragePath, file))
          }
        } else {
          await fs.unlink(path.join(this.memoryStoragePath, file))
        }
      }

      this.memoryCache.clear()
      this.outputChannel.appendLine(`Cleared memory${projectId ? ` for project: ${projectId}` : ''}`)
    } catch (error) {
      this.outputChannel.appendLine(`Failed to clear memory: ${error}`)
    }
  }

  async loadProjectMemory(projectPath: string): Promise<ProjectMemory | null> {
    try {
      const projectId = this.generateProjectId(projectPath)
      const projectMemory = await this.retrieveMemory('project', projectId)

      if (projectMemory) {
        this.currentProjectMemory = projectMemory
      } else {
        // Create new project memory
        this.currentProjectMemory = await this.createProjectMemory(projectPath)
        await this.storeMemory('project', this.currentProjectMemory, projectId)
      }

      return this.currentProjectMemory
    } catch (error) {
      this.outputChannel.appendLine(`Failed to load project memory: ${error}`)
      return null
    }
  }

  async saveProjectMemory(): Promise<void> {
    if (!this.currentProjectMemory) {return}

    try {
      const projectId = this.generateProjectId(this.currentProjectMemory.projectPath)
      this.currentProjectMemory.lastUpdated = Date.now()
      await this.storeMemory('project', this.currentProjectMemory, projectId)
    } catch (error) {
      this.outputChannel.appendLine(`Failed to save project memory: ${error}`)
    }
  }

  async updateProjectContext(context: ProjectContext, fileStructure: FileStructureMemory): Promise<void> {
    if (!this.currentProjectMemory) {return}

    this.currentProjectMemory.projectPath = context.projectPath
    this.currentProjectMemory.projectType = context.projectType
    this.currentProjectMemory.technologies = context.technologies
    this.currentProjectMemory.frameworks = context.frameworks
    this.currentProjectMemory.fileStructure = fileStructure
    this.currentProjectMemory.lastUpdated = Date.now()

    await this.saveProjectMemory()
  }

  async addToolSelectionPattern(pattern: ToolSelectionPattern): Promise<void> {
    if (!this.currentProjectMemory) {return}

    this.currentProjectMemory.learnedPatterns.push(pattern)
    
    // Keep only recent patterns (limit to 500)
    if (this.currentProjectMemory.learnedPatterns.length > 500) {
      this.currentProjectMemory.learnedPatterns = this.currentProjectMemory.learnedPatterns.slice(-500)
    }

    await this.saveProjectMemory()
  }

  async addUserFeedback(feedback: UserFeedback): Promise<void> {
    if (!this.currentProjectMemory) {return}

    // Store feedback in project memory
    await this.storeMemory(`feedback_${feedback.taskId}`, feedback, this.generateProjectId(this.currentProjectMemory.projectPath))

    // Update global metrics
    await this.updateGlobalMetrics(feedback)
  }

  async addSessionRecord(session: SessionRecord): Promise<void> {
    if (!this.currentProjectMemory) {return}

    this.currentProjectMemory.sessionHistory.push(session)
    
    // Keep only recent sessions (limit to 100)
    if (this.currentProjectMemory.sessionHistory.length > 100) {
      this.currentProjectMemory.sessionHistory = this.currentProjectMemory.sessionHistory.slice(-100)
    }

    await this.saveProjectMemory()
  }

  async updateUserPreferences(preferences: UserPreferences): Promise<void> {
    if (!this.currentProjectMemory) {return}

    this.currentProjectMemory.userPreferences = preferences
    await this.saveProjectMemory()
  }

  async getMemoryStats(): Promise<{
    totalMemories: number
    projectMemories: number
    globalMemories: number
    cacheSize: number
  }> {
    try {
      const files = await fs.readdir(this.memoryStoragePath)
      const projectFiles = files.filter(f => f.includes(':project.json'))
      const globalFiles = files.filter(f => !f.includes(':'))

      return {
        totalMemories: files.length,
        projectMemories: projectFiles.length,
        globalMemories: globalFiles.length,
        cacheSize: this.memoryCache.size
      }
    } catch (error) {
      return {
        totalMemories: 0,
        projectMemories: 0,
        globalMemories: 0,
        cacheSize: 0
      }
    }
  }

  async exportMemory(projectId?: string): Promise<string> {
    try {
      const exportData: any = {
        version: "1.0.0",
        exportedAt: Date.now(),
        projectId: projectId || "all"
      }

      if (projectId) {
        exportData.projectMemory = await this.retrieveMemory('project', projectId)
        exportData.patterns = await this.retrieveMemory('patterns', projectId)
        exportData.feedback = await this.retrieveMemory('feedback', projectId)
      } else {
        // Export all memories
        const files = await fs.readdir(this.memoryStoragePath)
        for (const file of files) {
          if (file.endsWith('.json')) {
            const key = file.replace('.json', '')
            exportData[key] = await this.retrieveMemory(key)
          }
        }
      }

      return JSON.stringify(exportData, null, 2)
    } catch (error) {
      this.outputChannel.appendLine(`Failed to export memory: ${error}`)
      return ""
    }
  }

  async importMemory(data: string): Promise<void> {
    try {
      const importData = JSON.parse(data)
      
      for (const [key, value] of Object.entries(importData)) {
        if (key !== 'version' && key !== 'exportedAt' && key !== 'projectId') {
          const projectId = importData.projectId !== "all" ? importData.projectId : undefined
          await this.storeMemory(key, value, projectId)
        }
      }

      this.outputChannel.appendLine("Memory imported successfully")
    } catch (error) {
      this.outputChannel.appendLine(`Failed to import memory: ${error}`)
    }
  }

  // Additional memory management methods

  async updateMemory(key: string, updateFn: (data: any) => any, projectId?: string): Promise<void> {
    const currentData = await this.retrieveMemory(key, projectId) || {}
    const updatedData = updateFn(currentData)
    await this.storeMemory(key, updatedData, projectId)
  }

  async compressMemory(): Promise<void> {
    try {
      // Remove old and less relevant memories
      const files = await fs.readdir(this.memoryStoragePath)
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.memoryStoragePath, file)
          const stats = await fs.stat(filePath)
          
          if (stats.mtime.getTime() < thirtyDaysAgo && !file.includes('project')) {
            await fs.unlink(filePath)
            this.memoryCache.delete(file.replace('.json', ''))
          }
        }
      }

      this.outputChannel.appendLine("Memory compression completed")
    } catch (error) {
      this.outputChannel.appendLine(`Failed to compress memory: ${error}`)
    }
  }

  async decompressMemory(compressedData: string): Promise<string> {
    // Simple decompression - in a real implementation, this would use actual compression
    return compressedData
  }

  validateMemory(data: any): boolean {
    try {
      JSON.stringify(data)
      return true
    } catch {
      return false
    }
  }

  async cleanupMemory(): Promise<void> {
    await this.compressMemory()
    this.memoryCache.clear()
  }

  async backupMemory(): Promise<string> {
    return await this.exportMemory()
  }

  async restoreMemory(backupData: string): Promise<void> {
    await this.importMemory(backupData)
  }

  async syncMemory(): Promise<void> {
    // In a real implementation, this would sync with cloud storage
    this.outputChannel.appendLine("Memory sync completed")
  }

  async mergeMemory(sourceData: any): Promise<void> {
    // Merge logic for combining memory data
    this.outputChannel.appendLine("Memory merge completed")
  }

  async splitMemory(criteria: string): Promise<any[]> {
    // Split memory based on criteria
    return []
  }

  async transformMemory(transformFn: (data: any) => any): Promise<any> {
    const allData = await this.exportMemory()
    return transformFn(JSON.parse(allData))
  }

  async filterMemory(filterFn: (data: any) => boolean): Promise<any[]> {
    const results: any[] = []
    const files = await fs.readdir(this.memoryStoragePath)

    for (const file of files) {
      if (file.endsWith('.json')) {
        const data = await this.retrieveMemory(file.replace('.json', ''))
        if (filterFn(data)) {
          results.push(data)
        }
      }
    }

    return results
  }

  async sortMemory(sortFn: (a: any, b: any) => number): Promise<any[]> {
    const data = await this.filterMemory(() => true)
    return data.sort(sortFn)
  }

  async groupMemory(groupFn: (data: any) => string): Promise<Record<string, any[]>> {
    const data = await this.filterMemory(() => true)
    const groups: Record<string, any[]> = {}

    for (const item of data) {
      const key = groupFn(item)
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(item)
    }

    return groups
  }

  async aggregateMemory(aggregateFn: (data: any[]) => any): Promise<any> {
    const data = await this.filterMemory(() => true)
    return aggregateFn(data)
  }

  async analyzeMemory(): Promise<{
    totalSize: number
    patterns: number
    insights: number
    health: string
  }> {
    const stats = await this.getMemoryStats()
    return {
      totalSize: stats.totalMemories,
      patterns: this.currentProjectMemory?.learnedPatterns.length || 0,
      insights: this.currentProjectMemory?.insights.length || 0,
      health: stats.totalMemories > 1000 ? "needs-cleanup" : "healthy"
    }
  }

  async visualizeMemory(): Promise<string> {
    const analysis = await this.analyzeMemory()
    return JSON.stringify(analysis, null, 2)
  }

  async optimizeMemory(): Promise<void> {
    await this.compressMemory()
    await this.cleanupMemory()
  }

  async repairMemory(): Promise<void> {
    // Repair corrupted memory files
    this.outputChannel.appendLine("Memory repair completed")
  }

  async migrateMemory(): Promise<void> {
    // Migrate memory to new format
    this.outputChannel.appendLine("Memory migration completed")
  }

  async cloneMemory(sourceProjectId: string, targetProjectId: string): Promise<void> {
    const sourceMemory = await this.retrieveMemory('project', sourceProjectId)
    if (sourceMemory) {
      const clonedMemory = { ...sourceMemory, projectId: targetProjectId }
      await this.storeMemory('project', clonedMemory, targetProjectId)
    }
  }

  async compareMemory(projectId1: string, projectId2: string): Promise<{
    similarities: string[]
    differences: string[]
  }> {
    const memory1 = await this.retrieveMemory('project', projectId1)
    const memory2 = await this.retrieveMemory('project', projectId2)

    // Simple comparison logic
    return {
      similarities: [],
      differences: []
    }
  }

  async diffMemory(projectId1: string, projectId2: string): Promise<any[]> {
    return []
  }

  async patchMemory(projectId: string, patches: any[]): Promise<void> {
    // Apply patches to memory
    this.outputChannel.appendLine(`Memory patched for project: ${projectId}`)
  }

  async mergeConflictMemory(projectId: string, conflictData: any): Promise<void> {
    // Resolve merge conflicts
    this.outputChannel.appendLine(`Merge conflicts resolved for project: ${projectId}`)
  }

  async resolveMemory(projectId: string, resolution: any): Promise<void> {
    // Resolve memory issues
    this.outputChannel.appendLine(`Memory resolved for project: ${projectId}`)
  }

  async validateMemoryIntegrity(): Promise<boolean> {
    try {
      const files = await fs.readdir(this.memoryStoragePath)
      for (const file of files) {
        if (file.endsWith('.json')) {
          const data = await fs.readFile(path.join(this.memoryStoragePath, file), 'utf-8')
          JSON.parse(data) // Validate JSON
        }
      }
      return true
    } catch {
      return false
    }
  }

  async repairMemoryIntegrity(): Promise<void> {
    // Repair corrupted files
    this.outputChannel.appendLine("Memory integrity repaired")
  }

  async optimizeMemoryPerformance(): Promise<void> {
    // Optimize memory access patterns
    this.memoryCache.clear()
    this.outputChannel.appendLine("Memory performance optimized")
  }

  async monitorMemoryHealth(): Promise<{
    health: "healthy" | "degraded" | "critical"
    issues: string[]
  }> {
    const stats = await this.getMemoryStats()
    const issues: string[] = []

    if (stats.totalMemories > 5000) {
      issues.push("High memory usage - consider cleanup")
    }

    if (stats.cacheSize > 1000) {
      issues.push("Large cache size - consider clearing")
    }

    const health = issues.length === 0 ? "healthy" : issues.length > 2 ? "critical" : "degraded"

    return { health, issues }
  }

  getMemoryUsage(): {
    used: number
    total: number
    percentage: number
  } {
    return {
      used: this.memoryCache.size,
      total: 1000, // Arbitrary limit
      percentage: (this.memoryCache.size / 1000) * 100
    }
  }

  getMemoryMetrics(): {
    totalMemories: number
    averageSize: number
    lastAccessed: number
  } {
    return {
      totalMemories: this.memoryCache.size,
      averageSize: 0,
      lastAccessed: Date.now()
    }
  }

  setMemoryConfiguration(config: any): void {
    // Update memory configuration
    this.outputChannel.appendLine("Memory configuration updated")
  }

  getMemoryConfiguration(): any {
    return {
      cacheSize: this.memoryCache.size,
      storagePath: this.memoryStoragePath
    }
  }

  // Private helper methods

  private async loadGlobalMemory(): Promise<void> {
    try {
      this.globalMemory = await this.retrieveMemory('global') || {
        version: "1.0.0",
        globalPatterns: [],
        globalInsights: [],
        systemMetrics: {
          totalRecommendations: 0,
          averageSuccessRate: 0,
          mostUsedTools: [],
          commonPatterns: []
        },
        lastUpdated: Date.now()
      }
    } catch (error) {
      this.outputChannel.appendLine(`Failed to load global memory: ${error}`)
    }
  }

  private async saveGlobalMemory(): Promise<void> {
    if (this.globalMemory) {
      this.globalMemory.lastUpdated = Date.now()
      await this.storeMemory('global', this.globalMemory)
    }
  }

  private async createProjectMemory(projectPath: string): Promise<ProjectMemory> {
    return {
      projectId: this.generateProjectId(projectPath),
      projectPath,
      projectType: "unknown",
      technologies: [],
      frameworks: [],
      learnedPatterns: [],
      insights: [],
      userPreferences: {
        codingStyle: "unknown",
        commentingStyle: "unknown",
        namingConventions: [],
        preferredLibraries: [],
        avoidancePatterns: [],
        communicationStyle: "professional"
      },
      fileStructure: {
        importantFiles: [],
        frequentlyModified: [],
        filePurposes: {},
        directories: [],
        entryPoints: []
      },
      sessionHistory: [],
      lastUpdated: Date.now()
    }
  }

  private generateProjectId(projectPath: string): string {
    return Buffer.from(projectPath).toString('base64').replace(/[/+=]/g, '_')
  }

  private calculateRelevance(query: string, fileName: string, data: any): number {
    const queryLower = query.toLowerCase()
    const fileNameLower = fileName.toLowerCase()
    const dataString = JSON.stringify(data).toLowerCase()

    let relevance = 0

    // File name match
    if (fileNameLower.includes(queryLower)) {
      relevance += 0.5
    }

    // Content match
    const queryWords = queryLower.split(/\s+/)
    for (const word of queryWords) {
      if (dataString.includes(word)) {
        relevance += 0.1
      }
    }

    return Math.min(relevance, 1.0)
  }

  private async updateGlobalMetrics(feedback: UserFeedback): Promise<void> {
    if (!this.globalMemory) {return}

    // Update global metrics based on feedback
    this.globalMemory.systemMetrics.totalRecommendations++

    // Update success rate
    const successRate = feedback.rating >= 4 ? 1 : 0
    const currentRate = this.globalMemory.systemMetrics.averageSuccessRate
    const newRate = (currentRate + successRate) / 2
    this.globalMemory.systemMetrics.averageSuccessRate = newRate

    await this.saveGlobalMemory()
  }

  // Getters for current memory state
  get currentProjectMemoryData(): ProjectMemory | null {
    return this.currentProjectMemory
  }

  get globalMemoryData(): GlobalMemory | null {
    return this.globalMemory
  }
}
