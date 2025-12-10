/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Long-term memory and context management system for AI learning
 * MIT License
 */

import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs/promises"
import { ExtensionMessage } from "@shared/ExtensionMessage"
import { ClineMessage } from "@shared/ExtensionMessage"
import { ensureSettingsDirectoryExists } from "../storage/disk"
import {
	ToolSelectionPattern,
	ToolSelectionInsight,
	ToolPerformanceRecord
} from "../intelligence/types"

// Memory Type Enumeration
export enum MemoryType {
	EPISODIC = "episodic",
	PROCEDURAL = "procedural",
	SHORT_TERM = "short_term",
	LONG_TERM = "long_term",
	LIMITED_MEMORY_AI = "limited_memory_ai",
	SEMANTIC = "semantic",
	WORKING_MEMORY = "working_memory"
}

// Memory Type Configuration
export interface MemoryTypeConfig {
	enabled: boolean
	maxEntries: number
	retentionDays: number
	priority: number // Higher number = higher priority
}

// Enhanced Memory Entry with Type Classification
export interface MemoryEntry {
	id: string
	type: MemoryType
	title: string
	content: string
	context: string
	confidence: number
	createdAt: number
	lastAccessed: number
	accessCount: number
	tags: string[]
	metadata: Record<string, any>
	importance: number // 1-10 scale
	relatedMemories: string[] // IDs of related memories
}

export interface ProjectMemory {
	projectId: string
	projectName: string
	projectPath: string
	lastUpdated: number
	context: ProjectContext
	learnedPatterns: LearnedPattern[]
	conversationSummary: ConversationSummary
	fileStructure: FileStructureMemory
	userPreferences: UserPreferences
}

export interface ProjectContext {
	technologies: string[]
	frameworks: string[]
	languages: string[]
	dependencies: Record<string, string>
	buildTools: string[]
	testingFrameworks: string[]
	codingStandards: string[]
	architecture: string[]
}

export interface LearnedPattern {
	id: string
	type: "code_pattern" | "user_preference" | "project_convention" | "error_solution"
	description: string
	pattern: string
	context: string
	confidence: number
	createdAt: number
	lastUsed: number
	usageCount: number
	tags: string[]
}

/**
 * Enhanced error tracking record
 */
export interface ErrorRecord {
	id: string
	errorType: "syntax" | "runtime" | "logical" | "dependency" | "configuration" | "other"
	errorMessage: string
	filePath?: string
	lineNumber?: number
	toolUsed?: string
	resolution?: string
	resolvedAt?: number
	success: boolean
	createdAt: number
	occurrenceCount: number
	lastOccurrence: number
	tags: string[]
}

export interface ConversationSummary {
	totalConversations: number
	topics: string[]
	frequentQuestions: string[]
	commonIssues: string[]
	successfulSolutions: string[]
	lastConversationTopics: string[]
}

export interface FileStructureMemory {
	importantFiles: string[]
	frequentlyModified: string[]
	filePurposes: Record<string, string>
	directories: string[]
	entryPoints: string[]
}

export interface UserPreferences {
	codingStyle: string
	commentingStyle: string
	namingConventions: string[]
	preferredLibraries: string[]
	avoidancePatterns: string[]
	communicationStyle: string
}

export interface MemoryStats {
	totalMemories: number
	patternsByType: Record<string, number>
	conversationCount: number
	projectCount: number
	lastUpdated: number
	memoryUsage: number
	errorCount?: number
	resolvedErrorCount?: number
	errorsByType?: Record<string, number>
}

export class MemoryManager {
	private readonly context: vscode.ExtensionContext
	private readonly outputChannel: vscode.OutputChannel
	private memoryStoragePath: string = ""
	private currentProjectMemory: ProjectMemory | null = null
	private memoryStats: MemoryStats
	private memoryCache: Map<string, any> = new Map()
	private errorRecords: ErrorRecord[] = []
	private memoryEntries: MemoryEntry[] = [] // Enhanced memory entries with types
	private memoryTypeConfigs: Map<MemoryType, MemoryTypeConfig> = new Map()

	constructor(
		context: vscode.ExtensionContext,
		outputChannel: vscode.OutputChannel
	) {
		this.context = context
		this.outputChannel = outputChannel
		this.memoryStats = {
			totalMemories: 0,
			patternsByType: {},
			conversationCount: 0,
			projectCount: 0,
			lastUpdated: Date.now(),
			memoryUsage: 0
		}
		this.initializeMemoryStorage()
		this.initializeMemoryTypeConfigs()
	}

	/**
	 * Initialize default memory type configurations
	 */
	private initializeMemoryTypeConfigs(): void {
		const defaultConfigs: Record<MemoryType, MemoryTypeConfig> = {
			[MemoryType.EPISODIC]: {
				enabled: true,
				maxEntries: 1000,
				retentionDays: 365,
				priority: 8
			},
			[MemoryType.PROCEDURAL]: {
				enabled: true,
				maxEntries: 500,
				retentionDays: 180,
				priority: 9
			},
			[MemoryType.SHORT_TERM]: {
				enabled: true,
				maxEntries: 100,
				retentionDays: 7,
				priority: 6
			},
			[MemoryType.LONG_TERM]: {
				enabled: true,
				maxEntries: 2000,
				retentionDays: 730,
				priority: 10
			},
			[MemoryType.LIMITED_MEMORY_AI]: {
				enabled: true,
				maxEntries: 200,
				retentionDays: 30,
				priority: 5
			},
			[MemoryType.SEMANTIC]: {
				enabled: true,
				maxEntries: 800,
				retentionDays: 365,
				priority: 7
			},
			[MemoryType.WORKING_MEMORY]: {
				enabled: true,
				maxEntries: 50,
				retentionDays: 1,
				priority: 4
			}
		}

		for (const [type, config] of Object.entries(defaultConfigs)) {
			this.memoryTypeConfigs.set(type as MemoryType, config)
		}
	}

	/**
	 * Add a memory entry with specific type classification
	 */
	async addMemoryEntry(entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'lastAccessed' | 'accessCount'>): Promise<string> {
		try {
			// Check if memory type is enabled
			const typeConfig = this.memoryTypeConfigs.get(entry.type)
			if (!typeConfig || !typeConfig.enabled) {
				this.outputChannel.appendLine(`Memory type ${entry.type} is disabled, skipping entry`)
				return ''
			}

			// Create full memory entry
			const fullEntry: MemoryEntry = {
				...entry,
				id: this.generateId(),
				createdAt: Date.now(),
				lastAccessed: Date.now(),
				accessCount: 1
			}

			// Add to memory entries
			this.memoryEntries.push(fullEntry)

			// Enforce memory limits for this type
			await this.enforceMemoryLimits(entry.type)

			// Save to storage
			await this.saveMemoryEntries()

			this.outputChannel.appendLine(`Added ${entry.type} memory entry: ${entry.title}`)
			return fullEntry.id
		} catch (error) {
			this.outputChannel.appendLine(`Failed to add memory entry: ${error}`)
			return ''
		}
	}

	/**
	 * Get relevant memories by type and context
	 */
	async getRelevantMemories(
		query: string,
		memoryTypes?: MemoryType[],
		limit: number = 10
	): Promise<MemoryEntry[]> {
		try {
			let filteredEntries = this.memoryEntries

			// Filter by memory types if specified
			if (memoryTypes && memoryTypes.length > 0) {
				filteredEntries = filteredEntries.filter(entry => memoryTypes.includes(entry.type))
			}

			// Calculate relevance scores
			const scoredEntries = filteredEntries.map(entry => ({
				entry,
				score: this.calculateMemoryRelevanceScore(entry, query)
			}))

			// Filter by minimum relevance and sort
			const relevantEntries = scoredEntries
				.filter(item => item.score > 0.1)
				.sort((a, b) => b.score - a.score)
				.slice(0, limit)
				.map(item => {
					// Update access statistics
					item.entry.lastAccessed = Date.now()
					item.entry.accessCount++
					return item.entry
				})

			// Save updated access statistics
			await this.saveMemoryEntries()

			return relevantEntries
		} catch (error) {
			this.outputChannel.appendLine(`Failed to get relevant memories: ${error}`)
			return []
		}
	}

	/**
	 * Calculate relevance score for memory entry
	 */
	private calculateMemoryRelevanceScore(entry: MemoryEntry, query: string): number {
		const queryLower = query.toLowerCase()
		const titleLower = entry.title.toLowerCase()
		const contentLower = entry.content.toLowerCase()
		const contextLower = entry.context.toLowerCase()
		const tagsLower = entry.tags.map(t => t.toLowerCase())

		let score = 0

		// Title match (highest weight)
		if (titleLower.includes(queryLower)) {
			score += 10
		}

		// Content match (high weight)
		if (contentLower.includes(queryLower)) {
			score += 7
		}

		// Context match (medium weight)
		if (contextLower.includes(queryLower)) {
			score += 5
		}

		// Tag matches (medium weight)
		for (const tag of tagsLower) {
			if (tag.includes(queryLower)) {
				score += 3
			}
		}

		// Boost by importance and confidence
		score *= (1 + entry.importance * 0.1)
		score *= (1 + entry.confidence * 0.2)

		// Boost by access frequency (recency and frequency)
		const daysSinceAccess = (Date.now() - entry.lastAccessed) / (1000 * 60 * 60 * 24)
		const recencyBoost = Math.max(0, 1 - daysSinceAccess / 30) // Decay over 30 days
		const frequencyBoost = Math.log10(entry.accessCount + 1) / Math.log10(100) // Normalize to 0-1

		score *= (1 + recencyBoost * 0.3 + frequencyBoost * 0.2)

		// Apply memory type priority
		const typeConfig = this.memoryTypeConfigs.get(entry.type)
		if (typeConfig) {
			score *= (1 + typeConfig.priority * 0.1)
		}

		return score
	}

	/**
	 * Enforce memory limits for a specific type
	 */
	private async enforceMemoryLimits(memoryType: MemoryType): Promise<void> {
		const typeConfig = this.memoryTypeConfigs.get(memoryType)
		if (!typeConfig) {
			return
		}

		// Filter entries by type
		const typeEntries = this.memoryEntries.filter(entry => entry.type === memoryType)

		// If over limit, remove oldest/least important entries
		if (typeEntries.length > typeConfig.maxEntries) {
			// Sort by importance and last accessed time
			typeEntries.sort((a, b) => {
				const scoreA = a.importance * 1000 + a.lastAccessed
				const scoreB = b.importance * 1000 + b.lastAccessed
				return scoreA - scoreB
			})

			// Remove excess entries
			const entriesToRemove = typeEntries.slice(0, typeEntries.length - typeConfig.maxEntries)
			const idsToRemove = new Set(entriesToRemove.map(e => e.id))

			this.memoryEntries = this.memoryEntries.filter(entry => !idsToRemove.has(entry.id))

			this.outputChannel.appendLine(`Removed ${entriesToRemove.length} excess ${memoryType} memory entries`)
		}

		// Clean up old entries based on retention period
		const cutoffTime = Date.now() - (typeConfig.retentionDays * 24 * 60 * 60 * 1000)
		const oldEntries = this.memoryEntries.filter(entry => 
			entry.type === memoryType && entry.createdAt < cutoffTime
		)

		if (oldEntries.length > 0) {
			const idsToRemove = new Set(oldEntries.map(e => e.id))
			this.memoryEntries = this.memoryEntries.filter(entry => !idsToRemove.has(entry.id))

			this.outputChannel.appendLine(`Removed ${oldEntries.length} old ${memoryType} memory entries`)
		}
	}

	/**
	 * Save memory entries to storage
	 */
	private async saveMemoryEntries(): Promise<void> {
		try {
			if (!this.memoryStoragePath) {
				await this.initializeMemoryStorage()
			}

			const entriesPath = path.join(this.memoryStoragePath, "memory_entries.json")
			await fs.writeFile(entriesPath, JSON.stringify(this.memoryEntries, null, 2))
		} catch (error) {
			this.outputChannel.appendLine(`Failed to save memory entries: ${error}`)
		}
	}

	/**
	 * Load memory entries from storage
	 */
	private async loadMemoryEntries(): Promise<void> {
		try {
			if (!this.memoryStoragePath) {
				await this.initializeMemoryStorage()
			}

			const entriesPath = path.join(this.memoryStoragePath, "memory_entries.json")
			const exists = await this.fileExists(entriesPath)
			if (exists) {
				const data = await fs.readFile(entriesPath, 'utf-8')
				this.memoryEntries = JSON.parse(data)
			}
		} catch (error) {
			this.outputChannel.appendLine(`Failed to load memory entries: ${error}`)
		}
	}

	/**
	 * Update memory type configuration
	 */
	async updateMemoryTypeConfig(memoryType: MemoryType, config: Partial<MemoryTypeConfig>): Promise<void> {
		try {
			const currentConfig = this.memoryTypeConfigs.get(memoryType)
			if (currentConfig) {
				const updatedConfig = { ...currentConfig, ...config }
				this.memoryTypeConfigs.set(memoryType, updatedConfig)

				// Save configuration
				await this.saveMemoryTypeConfigs()

				// Enforce new limits if needed
				await this.enforceMemoryLimits(memoryType)

				this.outputChannel.appendLine(`Updated configuration for ${memoryType} memory type`)
			}
		} catch (error) {
			this.outputChannel.appendLine(`Failed to update memory type config: ${error}`)
		}
	}

	/**
	 * Save memory type configurations
	 */
	private async saveMemoryTypeConfigs(): Promise<void> {
		try {
			if (!this.memoryStoragePath) {
				await this.initializeMemoryStorage()
			}

			const configsPath = path.join(this.memoryStoragePath, "memory_type_configs.json")
			const configsObject = Object.fromEntries(this.memoryTypeConfigs)
			await fs.writeFile(configsPath, JSON.stringify(configsObject, null, 2))
		} catch (error) {
			this.outputChannel.appendLine(`Failed to save memory type configs: ${error}`)
		}
	}

	/**
	 * Load memory type configurations
	 */
	private async loadMemoryTypeConfigs(): Promise<void> {
		try {
			if (!this.memoryStoragePath) {
				await this.initializeMemoryStorage()
			}

			const configsPath = path.join(this.memoryStoragePath, "memory_type_configs.json")
			const exists = await this.fileExists(configsPath)
			if (exists) {
				const data = await fs.readFile(configsPath, 'utf-8')
				const configsObject = JSON.parse(data)
				
				for (const [type, config] of Object.entries(configsObject)) {
					this.memoryTypeConfigs.set(type as MemoryType, config as MemoryTypeConfig)
				}
			}
		} catch (error) {
			this.outputChannel.appendLine(`Failed to load memory type configs: ${error}`)
		}
	}

	/**
	 * Get memory statistics by type
	 */
	async getMemoryTypeStats(): Promise<Record<MemoryType, { count: number; enabled: boolean; totalAccess: number }>> {
		const stats: Record<MemoryType, { count: number; enabled: boolean; totalAccess: number }> = {} as any

		for (const memoryType of Object.values(MemoryType)) {
			const entries = this.memoryEntries.filter(entry => entry.type === memoryType)
			const config = this.memoryTypeConfigs.get(memoryType)

			stats[memoryType] = {
				count: entries.length,
				enabled: config?.enabled || false,
				totalAccess: entries.reduce((sum, entry) => sum + entry.accessCount, 0)
			}
		}

		return stats
	}

	/**
	 * Classify and add memories from conversation analysis
	 */
	async classifyAndAddMemoriesFromConversation(messages: ClineMessage[]): Promise<void> {
		try {
			for (const message of messages) {
				if (message.type === "say" && message.text) {
					// Classify different types of memories from the message
					await this.extractEpisodicMemory(message)
					await this.extractProceduralMemory(message)
					await this.extractSemanticMemory(message)
					await this.extractWorkingMemory(message)
				}
			}

			// Process short-term memories (convert some to long-term)
			await this.processShortTermMemories()

			this.outputChannel.appendLine("Processed conversation for memory classification")
		} catch (error) {
			this.outputChannel.appendLine(`Failed to classify memories from conversation: ${error}`)
		}
	}

	/**
	 * Extract episodic memories (specific events and experiences)
	 */
	private async extractEpisodicMemory(message: ClineMessage): Promise<void> {
		// Look for specific events, user interactions, or notable occurrences
		if (!message.text) {
			return
		}
		
		const episodicKeywords = ["completed", "finished", "started", "created", "deleted", "modified", "error", "success", "failed"]
		const text = message.text.toLowerCase()

		if (episodicKeywords.some(keyword => text.includes(keyword))) {
			await this.addMemoryEntry({
				type: MemoryType.EPISODIC,
				title: `Task Event: ${message.text.substring(0, 50)}...`,
				content: message.text,
				context: "conversation",
				confidence: 0.7,
				tags: ["conversation", "event"],
				metadata: { messageType: message.type, timestamp: message.ts },
				importance: 6,
				relatedMemories: []
			})
		}
	}

	/**
	 * Extract procedural memories (how-to knowledge and processes)
	 */
	private async extractProceduralMemory(message: ClineMessage): Promise<void> {
		// Look for step-by-step processes, commands, or procedures
		if (!message.text) {
			return
		}
		
		const proceduralKeywords = ["step", "process", "command", "execute", "run", "build", "install", "configure"]
		const text = message.text.toLowerCase()

		if (proceduralKeywords.some(keyword => text.includes(keyword))) {
			await this.addMemoryEntry({
				type: MemoryType.PROCEDURAL,
				title: `Procedure: ${message.text.substring(0, 50)}...`,
				content: message.text,
				context: "conversation",
				confidence: 0.8,
				tags: ["procedure", "how-to"],
				metadata: { messageType: message.type, timestamp: message.ts },
				importance: 8,
				relatedMemories: []
			})
		}
	}

	/**
	 * Extract semantic memories (concepts, facts, and knowledge)
	 */
	private async extractSemanticMemory(message: ClineMessage): Promise<void> {
		// Look for definitions, explanations, or conceptual information
		if (!message.text) {
			return
		}
		
		const semanticKeywords = ["definition", "concept", "means", "refers to", "is defined as", "explains"]
		const text = message.text.toLowerCase()

		if (semanticKeywords.some(keyword => text.includes(keyword))) {
			await this.addMemoryEntry({
				type: MemoryType.SEMANTIC,
				title: `Concept: ${message.text.substring(0, 50)}...`,
				content: message.text,
				context: "conversation",
				confidence: 0.6,
				tags: ["concept", "knowledge"],
				metadata: { messageType: message.type, timestamp: message.ts },
				importance: 5,
				relatedMemories: []
			})
		}
	}

	/**
	 * Extract working memories (temporary, task-specific information)
	 */
	private async extractWorkingMemory(message: ClineMessage): Promise<void> {
		// Current task context, variables, or temporary state
		if (!message.text) {
			return
		}
		
		await this.addMemoryEntry({
			type: MemoryType.WORKING_MEMORY,
			title: `Working Context: ${message.text.substring(0, 50)}...`,
			content: message.text,
			context: "current_task",
			confidence: 0.9,
			tags: ["working", "current"],
			metadata: { messageType: message.type, timestamp: message.ts },
			importance: 4,
			relatedMemories: []
		})
	}

	/**
	 * Process short-term memories and potentially promote to long-term
	 */
	private async processShortTermMemories(): Promise<void> {
		const shortTermEntries = this.memoryEntries.filter(entry => entry.type === MemoryType.SHORT_TERM)
		const now = Date.now()

		for (const entry of shortTermEntries) {
			const ageInHours = (now - entry.createdAt) / (1000 * 60 * 60)

			// If accessed multiple times, promote to long-term
			if (entry.accessCount >= 3 && ageInHours > 24) {
				// Create long-term version
				await this.addMemoryEntry({
					type: MemoryType.LONG_TERM,
					title: `Long-term: ${entry.title}`,
					content: entry.content,
					context: entry.context,
					confidence: entry.confidence,
					tags: [...entry.tags, "promoted"],
					metadata: { ...entry.metadata, promotedFrom: "short_term" },
					importance: Math.min(10, entry.importance + 2),
					relatedMemories: entry.relatedMemories
				})

				// Remove short-term version
				this.memoryEntries = this.memoryEntries.filter(e => e.id !== entry.id)
			}
		}
	}

	private async initializeMemoryStorage(): Promise<void> {
		try {
			const settingsDir = await ensureSettingsDirectoryExists(this.context)
			this.memoryStoragePath = path.join(settingsDir, "memory")
			await fs.mkdir(this.memoryStoragePath, { recursive: true })

			// Load memory stats
			await this.loadMemoryStats()

			// Load memory entries
			await this.loadMemoryEntries()

			// Load memory type configurations
			await this.loadMemoryTypeConfigs()

			this.outputChannel.appendLine("Memory storage initialized")
		} catch (error) {
			this.outputChannel.appendLine(`Failed to initialize memory storage: ${error}`)
		}
	}

	async loadProjectMemory(workspacePath: string): Promise<ProjectMemory | null> {
		try {
			// Validate workspace path
			if (!workspacePath) {
				throw new Error("Workspace path is required")
			}

			// Ensure memory storage is initialized
			if (!this.memoryStoragePath) {
				await this.initializeMemoryStorage()
			}

			const projectId = this.generateProjectId(workspacePath)
			const memoryPath = path.join(this.memoryStoragePath, `${projectId}.json`)

			this.outputChannel.appendLine(`Loading project memory from: ${memoryPath}`)

			const exists = await this.fileExists(memoryPath)
			if (!exists) {
				this.outputChannel.appendLine(`No existing memory found, creating new project memory for: ${workspacePath}`)
				// Create new project memory
				const newMemory = await this.createProjectMemory(workspacePath)
				await this.saveProjectMemory(newMemory)
				this.currentProjectMemory = newMemory
				return newMemory
			}

			const data = await fs.readFile(memoryPath, 'utf-8')
			const memory: ProjectMemory = JSON.parse(data)
			this.currentProjectMemory = memory

			this.outputChannel.appendLine(`Successfully loaded project memory for: ${memory.projectName}`)
			return memory
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			this.outputChannel.appendLine(`Failed to load project memory: ${errorMessage}`)
			this.outputChannel.appendLine(`Workspace path: ${workspacePath}`)
			this.outputChannel.appendLine(`Storage path: ${this.memoryStoragePath}`)

			// Re-throw with more context for better error handling upstream
			throw new Error(`Failed to load project memory: ${errorMessage}`)
		}
	}

	async saveProjectMemory(memory: ProjectMemory): Promise<void> {
		try {
			const memoryPath = path.join(this.memoryStoragePath, `${memory.projectId}.json`)
			await fs.writeFile(memoryPath, JSON.stringify(memory, null, 2))

			// Update stats
			await this.updateMemoryStats()

			this.outputChannel.appendLine(`Saved project memory for: ${memory.projectName}`)
		} catch (error) {
			this.outputChannel.appendLine(`Failed to save project memory: ${error}`)
		}
	}

	async analyzeAndLearnFromConversation(messages: ClineMessage[]): Promise<void> {
		if (!this.currentProjectMemory) { return }

		try {
			// Extract patterns from conversation
			const patterns = await this.extractPatterns(messages)

			// Update project context
			await this.updateProjectContext(messages)

			// Update conversation summary
			await this.updateConversationSummary(messages)

			// Add new learned patterns
			for (const pattern of patterns) {
				await this.addLearnedPattern(pattern)
			}

			// Classify and add memories by type (NEW FUNCTIONALITY)
			await this.classifyAndAddMemoriesFromConversation(messages)

			// Save updated memory
			this.currentProjectMemory.lastUpdated = Date.now()
			await this.saveProjectMemory(this.currentProjectMemory)

			this.outputChannel.appendLine(`Learned ${patterns.length} new patterns from conversation`)
			this.outputChannel.appendLine(`Processed conversation for memory type classification`)
		} catch (error) {
			this.outputChannel.appendLine(`Failed to analyze conversation: ${error}`)
		}
	}

	async addLearnedPattern(pattern: LearnedPattern): Promise<void> {
		if (!this.currentProjectMemory) { return }

		// Check if pattern already exists
		const existingIndex = this.currentProjectMemory.learnedPatterns.findIndex(
			p => p.description === pattern.description && p.type === pattern.type
		)

		if (existingIndex >= 0) {
			// Update existing pattern
			const existing = this.currentProjectMemory.learnedPatterns[existingIndex]
			existing.usageCount++
			existing.lastUsed = Date.now()
			existing.confidence = Math.min(1, existing.confidence + 0.1)
		} else {
			// Add new pattern
			this.currentProjectMemory.learnedPatterns.push(pattern)
		}

		// Keep only the most relevant patterns (limit by confidence and usage)
		this.currentProjectMemory.learnedPatterns.sort((a, b) => {
			const scoreA = a.confidence * a.usageCount
			const scoreB = b.confidence * b.usageCount
			return scoreB - scoreA
		})

		// Keep top 100 patterns
		this.currentProjectMemory.learnedPatterns = this.currentProjectMemory.learnedPatterns.slice(0, 100)
	}

	async getRelevantContext(query: string): Promise<string> {
		if (!this.currentProjectMemory) { return "" }

		try {
			const scoredPatterns = this.currentProjectMemory.learnedPatterns.map(pattern => ({
				pattern,
				score: this.calculateRelevanceScore(pattern, query)
			}))

			const relevantPatterns = scoredPatterns
				.filter(item => item.score > 2.0) // Minimum relevance threshold
				.sort((a, b) => b.score - a.score)
				.slice(0, 5)
				.map(item => item.pattern)

			const context = [
				`Project: ${this.currentProjectMemory.projectName}`,
				`Technologies: ${this.currentProjectMemory.context.technologies.join(", ")}`,
				`Frameworks: ${this.currentProjectMemory.context.frameworks.join(", ")}`,
				"",
				"Relevant Patterns:",
				...relevantPatterns.map(p => `- ${p.description}: ${p.pattern}`)
			].join("\n")

			return context
		} catch (error) {
			this.outputChannel.appendLine(`Failed to get relevant context: ${error}`)
			return ""
		}
	}

	async getMemoryStats(): Promise<MemoryStats> {
		await this.updateMemoryStats()

		// Add error statistics
		const errorCount = this.errorRecords.length
		const resolvedErrorCount = this.errorRecords.filter(e => e.success).length
		const errorsByType: Record<string, number> = {}

		for (const error of this.errorRecords) {
			errorsByType[error.errorType] = (errorsByType[error.errorType] || 0) + 1
		}

		return {
			...this.memoryStats,
			errorCount,
			resolvedErrorCount,
			errorsByType
		}
	}

	async clearProjectMemory(projectId: string): Promise<void> {
		try {
			const memoryPath = path.join(this.memoryStoragePath, `${projectId}.json`)
			const exists = await this.fileExists(memoryPath)
			if (exists) {
				await fs.unlink(memoryPath)
				this.outputChannel.appendLine(`Cleared memory for project: ${projectId}`)
			}
		} catch (error) {
			this.outputChannel.appendLine(`Failed to clear project memory: ${error}`)
		}
	}

	async exportMemory(projectId: string): Promise<string | null> {
		try {
			const memoryPath = path.join(this.memoryStoragePath, `${projectId}.json`)
			const exists = await this.fileExists(memoryPath)
			if (!exists) { return null }

			return await fs.readFile(memoryPath, 'utf-8')
		} catch (error) {
			this.outputChannel.appendLine(`Failed to export memory: ${error}`)
			return null
		}
	}

	async importMemory(projectId: string, memoryJson: string): Promise<void> {
		try {
			// Validate JSON
			const memory = JSON.parse(memoryJson)
			if (!memory.projectId || !memory.projectName) {
				throw new Error("Invalid memory file format")
			}

			// Ensure project ID matches (or update it if importing to a new project)
			// For now, we'll trust the ID passed in the argument as the target
			memory.projectId = projectId
			memory.lastUpdated = Date.now()

			const memoryPath = path.join(this.memoryStoragePath, `${projectId}.json`)
			await fs.writeFile(memoryPath, JSON.stringify(memory, null, 2))

			// Update current memory if it matches
			if (this.currentProjectMemory && this.currentProjectMemory.projectId === projectId) {
				this.currentProjectMemory = memory
			}

			// Update stats
			await this.updateMemoryStats()

			this.outputChannel.appendLine(`Imported memory for project: ${projectId}`)
		} catch (error) {
			this.outputChannel.appendLine(`Failed to import memory: ${error}`)
			throw error
		}
	}

	private async createProjectMemory(workspacePath: string): Promise<ProjectMemory> {
		const projectName = path.basename(workspacePath)
		const projectId = this.generateProjectId(workspacePath)

		// Analyze project structure
		const context = await this.analyzeProjectContext(workspacePath)
		const fileStructure = await this.analyzeFileStructure(workspacePath)

		return {
			projectId,
			projectName,
			projectPath: workspacePath,
			lastUpdated: Date.now(),
			context,
			learnedPatterns: [],
			conversationSummary: {
				totalConversations: 0,
				topics: [],
				frequentQuestions: [],
				commonIssues: [],
				successfulSolutions: [],
				lastConversationTopics: []
			},
			fileStructure,
			userPreferences: {
				codingStyle: "unknown",
				commentingStyle: "unknown",
				namingConventions: [],
				preferredLibraries: [],
				avoidancePatterns: [],
				communicationStyle: "professional"
			}
		}
	}

	private async analyzeProjectContext(workspacePath: string): Promise<ProjectContext> {
		const context: ProjectContext = {
			technologies: [],
			frameworks: [],
			languages: [],
			dependencies: {},
			buildTools: [],
			testingFrameworks: [],
			codingStandards: [],
			architecture: []
		}

		try {
			// Check for package.json
			const packageJsonPath = path.join(workspacePath, "package.json")
			if (await this.fileExists(packageJsonPath)) {
				const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'))

				// Extract dependencies
				if (packageJson.dependencies) {
					context.dependencies = { ...context.dependencies, ...packageJson.dependencies }
				}
				if (packageJson.devDependencies) {
					context.dependencies = { ...context.dependencies, ...packageJson.devDependencies }
				}

				// Identify frameworks and technologies
				const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies }
				for (const dep of Object.keys(allDeps)) {
					if (dep.includes("react")) { context.frameworks.push("React") }
					if (dep.includes("vue")) { context.frameworks.push("Vue") }
					if (dep.includes("angular")) { context.frameworks.push("Angular") }
					if (dep.includes("express")) { context.frameworks.push("Express") }
					if (dep.includes("next")) { context.frameworks.push("Next.js") }
					if (dep.includes("typescript")) { context.languages.push("TypeScript") }
					if (dep.includes("jest") || dep.includes("mocha") || dep.includes("vitest")) {
						context.testingFrameworks.push(dep)
					}
					if (dep.includes("webpack") || dep.includes("vite") || dep.includes("rollup")) {
						context.buildTools.push(dep)
					}
				}
			}

			// Check for other config files
			const configFiles = [
				{ file: "tsconfig.json", tech: "TypeScript" },
				{ file: "pyproject.toml", tech: "Python" },
				{ file: "requirements.txt", tech: "Python" },
				{ file: "Cargo.toml", tech: "Rust" },
				{ file: "go.mod", tech: "Go" },
				{ file: "pom.xml", tech: "Java/Maven" },
				{ file: "build.gradle", tech: "Java/Gradle" }
			]

			for (const { file, tech } of configFiles) {
				if (await this.fileExists(path.join(workspacePath, file))) {
					if (!context.languages.includes(tech)) {
						context.languages.push(tech)
					}
				}
			}

			// Remove duplicates
			context.frameworks = [...new Set(context.frameworks)]
			context.languages = [...new Set(context.languages)]
			context.testingFrameworks = [...new Set(context.testingFrameworks)]
			context.buildTools = [...new Set(context.buildTools)]

		} catch (error) {
			this.outputChannel.appendLine(`Failed to analyze project context: ${error}`)
		}

		return context
	}

	private async analyzeFileStructure(workspacePath: string): Promise<FileStructureMemory> {
		const structure: FileStructureMemory = {
			importantFiles: [],
			frequentlyModified: [],
			filePurposes: {},
			directories: [],
			entryPoints: []
		}

		try {
			// Scan top-level directories
			const entries = await fs.readdir(workspacePath, { withFileTypes: true })

			for (const entry of entries) {
				if (entry.isDirectory()) {
					structure.directories.push(entry.name)

					// Identify important directories
					if (["src", "lib", "components", "utils", "services", "api"].includes(entry.name)) {
						structure.importantFiles.push(entry.name)
					}
				} else if (entry.isFile()) {
					// Identify potential entry points
					if (["index.js", "main.js", "app.js", "index.ts", "main.ts", "app.ts"].includes(entry.name)) {
						structure.entryPoints.push(entry.name)
					}

					// Identify important config files
					if (["package.json", "tsconfig.json", "webpack.config.js", "vite.config.js"].includes(entry.name)) {
						structure.importantFiles.push(entry.name)
					}
				}
			}
		} catch (error) {
			this.outputChannel.appendLine(`Failed to analyze file structure: ${error}`)
		}

		return structure
	}

	private async extractPatterns(messages: ClineMessage[]): Promise<LearnedPattern[]> {
		const patterns: LearnedPattern[] = []

		for (const message of messages) {
			if (message.type === "say" && message.text) {
				// Extract code patterns
				const codePatterns = this.extractCodePatterns(message.text)
				patterns.push(...codePatterns)

				// Extract user preferences
				const userPrefs = this.extractUserPreferences(message.text)
				patterns.push(...userPrefs)

				// Extract error solutions
				const errorSolutions = this.extractErrorSolutions(message.text)
				patterns.push(...errorSolutions)
			}
		}

		return patterns
	}

	private extractCodePatterns(text: string): LearnedPattern[] {
		const patterns: LearnedPattern[] = []

		// Look for common code patterns
		const codePatternRegex = /```(\w+)?\n([\s\S]*?)```/g
		let match

		while ((match = codePatternRegex.exec(text)) !== null) {
			const language = match[1] || "unknown"
			const code = match[2]

			if (code.length > 20) { // Only meaningful code snippets
				patterns.push({
					id: this.generateId(),
					type: "code_pattern",
					description: `${language} code pattern`,
					pattern: code.substring(0, 200) + (code.length > 200 ? "..." : ""),
					context: text.substring(0, 100),
					confidence: 0.5,
					createdAt: Date.now(),
					lastUsed: Date.now(),
					usageCount: 1,
					tags: [language, "code"]
				})
			}
		}

		return patterns
	}

	private extractUserPreferences(text: string): LearnedPattern[] {
		const patterns: LearnedPattern[] = []

		// Look for preference indicators
		const preferenceKeywords = ["prefer", "like", "use", "avoid", "always", "never"]
		const sentences = text.split(/[.!?]+/)

		for (const sentence of sentences) {
			const lowerSentence = sentence.toLowerCase()
			if (preferenceKeywords.some(keyword => lowerSentence.includes(keyword))) {
				patterns.push({
					id: this.generateId(),
					type: "user_preference",
					description: "User coding preference",
					pattern: sentence.trim(),
					context: text.substring(0, 100),
					confidence: 0.6,
					createdAt: Date.now(),
					lastUsed: Date.now(),
					usageCount: 1,
					tags: ["preference", "user"]
				})
			}
		}

		return patterns
	}

	private extractErrorSolutions(text: string): LearnedPattern[] {
		const patterns: LearnedPattern[] = []

		// Look for error-solution patterns
		const errorKeywords = ["error", "issue", "problem", "bug", "fix", "solution"]
		const sentences = text.split(/[.!?]+/)

		for (const sentence of sentences) {
			const lowerSentence = sentence.toLowerCase()
			if (errorKeywords.some(keyword => lowerSentence.includes(keyword))) {
				patterns.push({
					id: this.generateId(),
					type: "error_solution",
					description: "Error solution pattern",
					pattern: sentence.trim(),
					context: text.substring(0, 100),
					confidence: 0.7,
					createdAt: Date.now(),
					lastUsed: Date.now(),
					usageCount: 1,
					tags: ["error", "solution"]
				})
			}
		}

		return patterns
	}

	private async updateProjectContext(messages: ClineMessage[]): Promise<void> {
		if (!this.currentProjectMemory) { return }

		// Extract technologies mentioned in conversation
		for (const message of messages) {
			if (message.text) {
				// Simple keyword extraction for technologies
				const techKeywords = ["react", "vue", "angular", "node", "python", "java", "typescript", "javascript"]
				const lowerText = message.text.toLowerCase()

				for (const tech of techKeywords) {
					if (lowerText.includes(tech) && !this.currentProjectMemory.context.technologies.includes(tech)) {
						this.currentProjectMemory.context.technologies.push(tech)
					}
				}
			}
		}
	}

	private async updateConversationSummary(messages: ClineMessage[]): Promise<void> {
		if (!this.currentProjectMemory) { return }

		const summary = this.currentProjectMemory.conversationSummary
		summary.totalConversations++

		// Extract topics from messages
		const topics: string[] = []
		for (const message of messages) {
			if (message.text && message.text.length > 50) {
				// Simple topic extraction (first sentence or key phrase)
				const firstSentence = message.text.split(/[.!?]/)[0]
				if (firstSentence.length > 10 && firstSentence.length < 100) {
					topics.push(firstSentence.trim())
				}
			}
		}

		// Update recent topics
		summary.lastConversationTopics = topics.slice(0, 5)

		// Update frequent topics (simple frequency counting)
		for (const topic of topics) {
			const existingIndex = summary.topics.indexOf(topic)
			if (existingIndex >= 0) {
				// Move to front (most recent)
				summary.topics.splice(existingIndex, 1)
				summary.topics.unshift(topic)
			} else {
				summary.topics.unshift(topic)
			}
		}

		// Keep only top 20 topics
		summary.topics = summary.topics.slice(0, 20)
	}

	private calculateRelevanceScore(pattern: LearnedPattern, query: string): number {
		const queryLower = query.toLowerCase()
		const descriptionLower = pattern.description.toLowerCase()
		const contentLower = pattern.pattern.toLowerCase()
		const tagsLower = pattern.tags.map(t => t.toLowerCase())

		const queryWords = queryLower.split(/\s+/).filter(w => w.length > 3) // Ignore short words
		if (queryWords.length === 0) { return 0 }

		let score = 0

		for (const word of queryWords) {
			// Description match (High weight)
			if (descriptionLower.includes(word)) { score += 5 }

			// Tag match (Medium weight)
			if (tagsLower.some(t => t.includes(word))) { score += 3 }

			// Content match (Low weight)
			if (contentLower.includes(word)) { score += 1 }
		}

		// Boost by confidence and usage
		score *= (1 + pattern.confidence)
		score *= (1 + Math.log10(pattern.usageCount + 1))

		return score
	}

	private generateProjectId(workspacePath: string): string {
		// Create a consistent ID based on workspace path
		return Buffer.from(workspacePath).toString('base64').replace(/[+/=]/g, '').substring(0, 16)
	}

	private generateId(): string {
		return Date.now().toString(36) + Math.random().toString(36).substr(2)
	}

	private async fileExists(filePath: string): Promise<boolean> {
		try {
			await fs.access(filePath)
			return true
		} catch {
			return false
		}
	}

	private async loadMemoryStats(): Promise<void> {
		try {
			const statsPath = path.join(this.memoryStoragePath, "stats.json")
			const exists = await this.fileExists(statsPath)
			if (exists) {
				const data = await fs.readFile(statsPath, 'utf-8')
				this.memoryStats = JSON.parse(data)
			}
		} catch (error) {
			this.outputChannel.appendLine(`Failed to load memory stats: ${error}`)
		}
	}

	private async updateMemoryStats(): Promise<void> {
		try {
			// Count projects
			const files = await fs.readdir(this.memoryStoragePath)
			const projectFiles = files.filter(file => file.endsWith('.json') && file !== 'stats.json')

			this.memoryStats.projectCount = projectFiles.length
			this.memoryStats.lastUpdated = Date.now()

			// Initialize counters
			let totalMemories = 0
			let totalConversations = 0
			const patternsByType: Record<string, number> = {}

			// Calculate memory usage and collect stats from all projects
			let totalSize = 0
			for (const file of projectFiles) {
				const filePath = path.join(this.memoryStoragePath, file)
				const stats = await fs.stat(filePath)
				totalSize += stats.size

				try {
					// Load project memory to extract detailed stats
					const projectData = await fs.readFile(filePath, 'utf-8')
					const projectMemory: ProjectMemory = JSON.parse(projectData)

					// Count patterns
					totalMemories += projectMemory.learnedPatterns.length

					// Count patterns by type
					for (const pattern of projectMemory.learnedPatterns) {
						patternsByType[pattern.type] = (patternsByType[pattern.type] || 0) + 1
					}

					// Count conversations
					totalConversations += projectMemory.conversationSummary.totalConversations
				} catch (projectError) {
					this.outputChannel.appendLine(`Failed to parse project memory file ${file}: ${projectError}`)
					// Continue with other files even if one fails
				}
			}

			// Update stats
			this.memoryStats.totalMemories = totalMemories
			this.memoryStats.patternsByType = patternsByType
			this.memoryStats.conversationCount = totalConversations
			this.memoryStats.memoryUsage = totalSize

			// Save stats
			const statsPath = path.join(this.memoryStoragePath, "stats.json")
			await fs.writeFile(statsPath, JSON.stringify(this.memoryStats, null, 2))

			this.outputChannel.appendLine(`Updated memory stats: ${totalMemories} patterns, ${totalConversations} conversations, ${projectFiles.length} projects`)
		} catch (error) {
			this.outputChannel.appendLine(`Failed to update memory stats: ${error}`)
		}
	}

	// Enhanced Error Tracking Methods

	/**
	 * Record an error occurrence
	 */
	async recordError(
		errorType: ErrorRecord['errorType'],
		errorMessage: string,
		options?: {
			filePath?: string
			lineNumber?: number
			toolUsed?: string
			tags?: string[]
		}
	): Promise<string> {
		try {
			// Check if similar error already exists
			const existingError = this.errorRecords.find(
				e => e.errorMessage === errorMessage && e.filePath === options?.filePath
			)

			if (existingError) {
				// Update existing error
				existingError.occurrenceCount++
				existingError.lastOccurrence = Date.now()
				this.outputChannel.appendLine(`Updated existing error record: ${existingError.id}`)
				return existingError.id
			}

			// Create new error record
			const errorRecord: ErrorRecord = {
				id: this.generateId(),
				errorType,
				errorMessage,
				filePath: options?.filePath,
				lineNumber: options?.lineNumber,
				toolUsed: options?.toolUsed,
				success: false,
				createdAt: Date.now(),
				occurrenceCount: 1,
				lastOccurrence: Date.now(),
				tags: options?.tags || []
			}

			this.errorRecords.push(errorRecord)

			// Keep only last 500 errors
			if (this.errorRecords.length > 500) {
				this.errorRecords = this.errorRecords.slice(-500)
			}

			this.outputChannel.appendLine(`Recorded new error: ${errorRecord.id} - ${errorMessage}`)
			return errorRecord.id
		} catch (error) {
			this.outputChannel.appendLine(`Failed to record error: ${error}`)
			return ''
		}
	}

	/**
	 * Mark an error as resolved
	 */
	async resolveError(errorId: string, resolution: string): Promise<void> {
		try {
			const error = this.errorRecords.find(e => e.id === errorId)
			if (error) {
				error.success = true
				error.resolution = resolution
				error.resolvedAt = Date.now()
				this.outputChannel.appendLine(`Resolved error: ${errorId}`)
			}
		} catch (error) {
			this.outputChannel.appendLine(`Failed to resolve error: ${error}`)
		}
	}

	/**
	 * Get error history for analysis
	 */
	getErrorHistory(options?: {
		errorType?: ErrorRecord['errorType']
		resolved?: boolean
		limit?: number
	}): ErrorRecord[] {
		let filtered = this.errorRecords

		if (options?.errorType) {
			filtered = filtered.filter(e => e.errorType === options.errorType)
		}

		if (options?.resolved !== undefined) {
			filtered = filtered.filter(e => e.success === options.resolved)
		}

		// Sort by most recent
		filtered.sort((a, b) => b.lastOccurrence - a.lastOccurrence)

		if (options?.limit) {
			filtered = filtered.slice(0, options.limit)
		}

		return filtered
	}

	// Intelligence Features (from secondary MemoryManager)

	/**
	 * Search memory with relevance scoring
	 */
	async searchMemory(query: string): Promise<Array<{ key: string; data: any; relevance: number }>> {
		try {
			const results: Array<{ key: string; data: any; relevance: number }> = []

			// Search in current project memory
			if (this.currentProjectMemory) {
				const patterns = this.currentProjectMemory.learnedPatterns
				for (const pattern of patterns) {
					const relevance = this.calculateSearchRelevance(query, pattern)
					if (relevance > 0.1) {
						results.push({
							key: pattern.id,
							data: pattern,
							relevance
						})
					}
				}
			}

			return results.sort((a, b) => b.relevance - a.relevance)
		} catch (error) {
			this.outputChannel.appendLine(`Failed to search memory: ${error}`)
			return []
		}
	}

	/**
	 * Calculate search relevance for a pattern
	 */
	private calculateSearchRelevance(query: string, pattern: LearnedPattern): number {
		const queryLower = query.toLowerCase()
		const descriptionLower = pattern.description.toLowerCase()
		const patternLower = pattern.pattern.toLowerCase()
		const tagsLower = pattern.tags.map(t => t.toLowerCase())

		let relevance = 0

		// Description match (high weight)
		if (descriptionLower.includes(queryLower)) {
			relevance += 0.5
		}

		// Pattern content match (medium weight)
		if (patternLower.includes(queryLower)) {
			relevance += 0.3
		}

		// Tag match (medium weight)
		if (tagsLower.some(t => t.includes(queryLower))) {
			relevance += 0.3
		}

		// Boost by confidence and usage
		relevance *= (1 + pattern.confidence * 0.2)
		relevance *= (1 + Math.log10(pattern.usageCount + 1) * 0.1)

		return Math.min(relevance, 1.0)
	}

	/**
	 * Clear memory cache
	 */
	clearCache(): void {
		this.memoryCache.clear()
		this.outputChannel.appendLine('Memory cache cleared')
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): { size: number; keys: string[] } {
		return {
			size: this.memoryCache.size,
			keys: Array.from(this.memoryCache.keys())
		}
	}

	// Tool Selection Intelligence Methods

	async recordToolSelection(pattern: ToolSelectionPattern): Promise<void> {
		if (!this.currentProjectMemory) {
			return
		}

		try {
			// Initialize tool selection patterns if not present
			if (!this.currentProjectMemory.toolSelectionPatterns) {
				this.currentProjectMemory.toolSelectionPatterns = []
			}

			// Add the new pattern
			this.currentProjectMemory.toolSelectionPatterns.push(pattern)

			// Keep only the most recent patterns (limit to 200)
			this.currentProjectMemory.toolSelectionPatterns.sort((a, b) => b.createdAt - a.createdAt)
			this.currentProjectMemory.toolSelectionPatterns = this.currentProjectMemory.toolSelectionPatterns.slice(0, 200)

			// Save updated memory
			await this.saveProjectMemory(this.currentProjectMemory)

			this.outputChannel.appendLine(`Recorded tool selection pattern: ${pattern.taskPattern}`)
		} catch (error) {
			this.outputChannel.appendLine(`Failed to record tool selection: ${error}`)
		}
	}

	async getToolSelectionInsights(taskContext: any): Promise<ToolSelectionInsight[]> {
		if (!this.currentProjectMemory || !this.currentProjectMemory.toolSelectionPatterns) {
			return []
		}

		try {
			const patterns = this.currentProjectMemory.toolSelectionPatterns
			const insights: ToolSelectionInsight[] = []

			// Analyze successful patterns
			const successfulPatterns = patterns.filter(p => p.success)
			const failedPatterns = patterns.filter(p => !p.success)

			// Find common successful patterns
			const patternGroups = this.groupPatternsByTaskPattern(successfulPatterns)

			for (const [taskPattern, groupPatterns] of Object.entries(patternGroups)) {
				if (groupPatterns.length >= 3) { // Only consider patterns with enough data
					const successRate = groupPatterns.length / (groupPatterns.length +
						(failedPatterns.filter(p => p.taskPattern === taskPattern).length))

					if (successRate > 0.7) { // High success rate
						insights.push({
							pattern: taskPattern,
							recommendation: `Use ${groupPatterns[0].selectedTools.join(", ")} for ${taskPattern} tasks`,
							confidence: successRate,
							supportingEvidence: groupPatterns
						})
					}
				}
			}

			// Sort by confidence
			insights.sort((a, b) => b.confidence - a.confidence)

			return insights.slice(0, 10) // Return top 10 insights
		} catch (error) {
			this.outputChannel.appendLine(`Failed to get tool selection insights: ${error}`)
			return []
		}
	}

	async updateToolPerformance(toolName: string, performance: ToolPerformanceRecord): Promise<void> {
		if (!this.currentProjectMemory) {
			return
		}

		try {
			// Initialize tool performance history if not present
			if (!this.currentProjectMemory.toolPerformanceHistory) {
				this.currentProjectMemory.toolPerformanceHistory = new Map()
			}

			// Get existing history for the tool
			const historyKey = toolName
			let history = this.currentProjectMemory.toolPerformanceHistory.get(historyKey) || []

			// Add new performance record
			history.push(performance)

			// Keep only the last 100 records per tool
			if (history.length > 100) {
				history = history.slice(-100)
			}

			// Update the history
			this.currentProjectMemory.toolPerformanceHistory.set(historyKey, history)

			// Save updated memory
			await this.saveProjectMemory(this.currentProjectMemory)

			this.outputChannel.appendLine(`Updated performance for tool: ${toolName}`)
		} catch (error) {
			this.outputChannel.appendLine(`Failed to update tool performance: ${error}`)
		}
	}

	async getToolRecommendationContext(taskContext: any): Promise<any> {
		if (!this.currentProjectMemory) {
			return {
				projectMemory: null,
				toolSelectionPatterns: [],
				toolPerformanceHistory: new Map(),
				toolInsights: []
			}
		}

		try {
			const insights = await this.getToolSelectionInsights(taskContext)

			return {
				projectMemory: this.currentProjectMemory,
				toolSelectionPatterns: this.currentProjectMemory.toolSelectionPatterns || [],
				toolPerformanceHistory: this.currentProjectMemory.toolPerformanceHistory || new Map(),
				toolInsights: insights
			}
		} catch (error) {
			this.outputChannel.appendLine(`Failed to get tool recommendation context: ${error}`)
			return {
				projectMemory: this.currentProjectMemory,
				toolSelectionPatterns: [],
				toolPerformanceHistory: new Map(),
				toolInsights: []
			}
		}
	}

	private groupPatternsByTaskPattern(patterns: ToolSelectionPattern[]): Record<string, ToolSelectionPattern[]> {
		const groups: Record<string, ToolSelectionPattern[]> = {}

		for (const pattern of patterns) {
			if (!groups[pattern.taskPattern]) {
				groups[pattern.taskPattern] = []
			}
			groups[pattern.taskPattern].push(pattern)
		}

		return groups
	}

	/**
	 * Dispose of memory manager resources
	 */
	dispose(): void {
		try {
			// Clear memory cache
			this.memoryCache.clear()

			// Clear error records
			this.errorRecords = []

			// Reset current project memory
			this.currentProjectMemory = null

			// Close output channel
			this.outputChannel.dispose()

			this.outputChannel.appendLine("Memory manager disposed")
		} catch (error) {
			console.error("Error disposing memory manager:", error)
		}
	}
}

// Extend ProjectMemory interface to include tool selection data
declare module "./MemoryManager" {
	interface ProjectMemory {
		toolSelectionPatterns?: ToolSelectionPattern[]
		toolPerformanceHistory?: Map<string, ToolPerformanceRecord[]>
		toolInsights?: ToolSelectionInsight[]
	}
}
