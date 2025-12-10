/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Memory settings component for AI learning system
 * MIT License
 */

import { VSCodeButton, VSCodeCheckbox, VSCodeTextArea } from "@vscode/webview-ui-toolkit/react"
import { Brain, Database, Trash2, Download, BarChart3, Upload } from "lucide-react"
import { memo, useCallback, useEffect, useState } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { MemoryServiceClient } from "@/services/grpc-client.ts"
import { GetMemoryStatsRequest, GetCurrentProjectMemoryRequest, ClearProjectMemoryRequest, ExportMemoryRequest, ImportMemoryRequest } from "@shared/proto/memory"
import Section from "./Section"
import SectionHeader from "./SectionHeader"

interface MemoryStats {
	totalMemories: number
	patternsByType: Record<string, number>
	conversationCount: number
	projectCount: number
	lastUpdated: number
	memoryUsage: number
}

interface ProjectMemory {
	projectId: string
	projectName: string
	projectPath: string
	lastUpdated: number
	context: {
		technologies: string[]
		frameworks: string[]
		languages: string[]
	}
	learnedPatterns: Array<{
		id: string
		type: string
		description: string
		confidence: number
		usageCount: number
	}>
	conversationSummary: {
		totalConversations: number
		topics: string[]
	}
}

const MemorySettingsSection = () => {
	const [memoryEnabled, setMemoryEnabled] = useState(true)
	const [autoLearn, setAutoLearn] = useState(true)
	const [contextInjection, setContextInjection] = useState(true)
	const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null)
	const [currentProjectMemory, setCurrentProjectMemory] = useState<ProjectMemory | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [memoryError, setMemoryError] = useState<string | null>(null)
	const [isInitializing, setIsInitializing] = useState(true)
	const [customMemoryInstructions, setCustomMemoryInstructions] = useState("")

	const { apiConfiguration } = useExtensionState()

	// Load memory stats on mount
	useEffect(() => {
		const initializeMemory = async () => {
			setIsInitializing(true)
			setMemoryError(null)
			try {
				await Promise.all([
					loadMemoryStats(),
					loadCurrentProjectMemory()
				])
			} catch (error) {
				console.error("Failed to initialize memory:", error)
				setMemoryError("Failed to initialize memory system. Please check the output channel for details.")
			} finally {
				setIsInitializing(false)
			}
		}
		
		initializeMemory()
	}, [])

	const loadMemoryStats = useCallback(async () => {
		try {
			setIsLoading(true)
			// Use the proper gRPC client with protobuf request
			const request = GetMemoryStatsRequest.create({})
			const response = await MemoryServiceClient.getMemoryStats(request)
			setMemoryStats(response)
			setMemoryError(null)
		} catch (error) {
			console.error("Failed to load memory stats:", error)
			setMemoryError(`Failed to load memory stats: ${error instanceof Error ? error.message : 'Unknown error'}`)
		} finally {
			setIsLoading(false)
		}
	}, [])

	const loadCurrentProjectMemory = useCallback(async () => {
		try {
			setIsLoading(true)
			// Use the proper gRPC client with protobuf request
			const request = GetCurrentProjectMemoryRequest.create({})
			const response = await MemoryServiceClient.getCurrentProjectMemory(request)
			setCurrentProjectMemory(response)
			setMemoryError(null)
		} catch (error) {
			console.error("Failed to load current project memory:", error)
			setMemoryError(`Failed to load project memory: ${error instanceof Error ? error.message : 'Unknown error'}`)
			setCurrentProjectMemory(null)
		} finally {
			setIsLoading(false)
		}
	}, [])

	const clearProjectMemory = useCallback(async () => {
		if (!currentProjectMemory) return

		const confirmed = window.confirm(
			`Are you sure you want to clear all memory for project "${currentProjectMemory.projectName}"? This action cannot be undone.`
		)

		if (!confirmed) return

		try {
			setIsLoading(true)
			// Use the proper gRPC client with protobuf request
			const request = ClearProjectMemoryRequest.create({
				projectId: currentProjectMemory.projectId
			})
			await MemoryServiceClient.clearProjectMemory(request)

			// Reload stats after clearing
			setTimeout(() => {
				loadMemoryStats()
				setCurrentProjectMemory(null)
			}, 1000)
		} catch (error) {
			console.error("Failed to clear project memory:", error)
			setMemoryError(`Failed to clear project memory: ${error instanceof Error ? error.message : 'Unknown error'}`)
		} finally {
			setIsLoading(false)
		}
	}, [currentProjectMemory, loadMemoryStats])

	const exportMemory = useCallback(async () => {
		if (!currentProjectMemory) return

		try {
			setIsLoading(true)
			// Use the proper gRPC client with protobuf request
			const request = ExportMemoryRequest.create({
				projectId: currentProjectMemory.projectId
			})
			const response = await MemoryServiceClient.exportMemory(request)
			
			// Download the exported memory as JSON file
			const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' })
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = `${currentProjectMemory.projectName || 'project'}_memory.json`
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
			URL.revokeObjectURL(url)
		} catch (error) {
			console.error("Failed to export memory:", error)
			setMemoryError(`Failed to export memory: ${error instanceof Error ? error.message : 'Unknown error'}`)
		} finally {
			setIsLoading(false)
		}
	}, [currentProjectMemory])

	const importMemory = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file || !currentProjectMemory) return

		const reader = new FileReader()
		reader.onload = async (e) => {
			const content = e.target?.result as string
			if (!content) return

			try {
				setIsLoading(true)
				// Use the proper gRPC client with protobuf request
				const request = ImportMemoryRequest.create({
					projectId: currentProjectMemory.projectId,
					memoryJson: content
				})
				await MemoryServiceClient.importMemory(request)

				// Refresh after import
				setTimeout(() => {
					loadMemoryStats()
					loadCurrentProjectMemory()
				}, 1000)

				// Clear input
				event.target.value = ''
			} catch (error) {
				console.error("Failed to import memory:", error)
				setMemoryError(`Failed to import memory: ${error instanceof Error ? error.message : 'Unknown error'}`)
			} finally {
				setIsLoading(false)
			}
		}
		reader.readAsText(file)
	}, [currentProjectMemory, loadMemoryStats, loadCurrentProjectMemory])

	const formatBytes = (bytes: number): string => {
		if (bytes === 0) return '0 Bytes'
		const k = 1024
		const sizes = ['Bytes', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
	}

	const formatDate = (timestamp: number): string => {
		return new Date(timestamp).toLocaleString()
	}

	const getConfidenceColor = (confidence: number): string => {
		if (confidence >= 0.8) return 'var(--vscode-testing-iconPassed)'
		if (confidence >= 0.6) return 'var(--vscode-testing-iconQueued)'
		return 'var(--vscode-testing-iconFailed)'
	}


	return (
		<Section>
			{/* Memory Settings */}
			<div className="mb-[5px]">
				<VSCodeCheckbox
					className="mb-[5px]"
					checked={memoryEnabled}
					onChange={(e: any) => setMemoryEnabled(e.target.checked === true)}>
					Enable AI Memory System
				</VSCodeCheckbox>
				<p className="text-xs mt-[5px] text-[var(--vscode-descriptionForeground)]">
					Allow the AI to learn and remember information about your projects to provide better context-aware assistance.
				</p>
			</div>

			<div className="mb-[5px]">
				<VSCodeCheckbox
					className="mb-[5px]"
					checked={autoLearn}
					onChange={(e: any) => setAutoLearn(e.target.checked === true)}>
					Automatic Learning
				</VSCodeCheckbox>
				<p className="text-xs mt-[5px] text-[var(--vscode-descriptionForeground)]">
					Automatically analyze conversations and learn patterns, preferences, and project context.
				</p>
			</div>

			<div className="mb-[5px]">
				<VSCodeCheckbox
					className="mb-[5px]"
					checked={contextInjection}
					onChange={(e: any) => setContextInjection(e.target.checked === true)}>
					Context Injection
				</VSCodeCheckbox>
				<p className="text-xs mt-[5px] text-[var(--vscode-descriptionForeground)]">
					Automatically inject relevant project context and learned patterns into new conversations.
				</p>
			</div>

			{/* Custom Memory Instructions */}
			<div className="mb-[5px]">
				<VSCodeTextArea
					value={customMemoryInstructions}
					className="w-full"
					resize="vertical"
					rows={3}
					placeholder="Enter custom instructions for memory learning and context extraction..."
					onInput={(e: any) => setCustomMemoryInstructions(e.target?.value ?? "")}>
					<span className="font-medium">Custom Memory Instructions</span>
				</VSCodeTextArea>
				<p className="text-xs mt-[5px] text-[var(--vscode-descriptionForeground)]">
					Specific instructions for how the AI should learn and remember information about your projects.
				</p>
			</div>

			{/* Memory Statistics */}
			{memoryStats && (
				<div className="mb-[20px] p-[15px] rounded-md bg-[var(--vscode-editor-background)] border border-[var(--vscode-panel-border)]">
					<div className="flex items-center gap-2 mb-[10px]">
						<BarChart3 className="w-4" />
						<h4 className="font-medium">Memory Statistics</h4>
					</div>

					<div className="grid grid-cols-2 gap-[15px] text-sm">
						<div>
							<span className="text-[var(--vscode-descriptionForeground)]">Total Projects:</span>
							<span className="ml-2 font-medium">{memoryStats.projectCount}</span>
						</div>
						<div>
							<span className="text-[var(--vscode-descriptionForeground)]">Memory Usage:</span>
							<span className="ml-2 font-medium">{formatBytes(memoryStats.memoryUsage)}</span>
						</div>
						<div>
							<span className="text-[var(--vscode-descriptionForeground)]">Total Patterns:</span>
							<span className="ml-2 font-medium">{memoryStats.totalMemories}</span>
						</div>
						<div>
							<span className="text-[var(--vscode-descriptionForeground)]">Last Updated:</span>
							<span className="ml-2 font-medium">{formatDate(memoryStats.lastUpdated)}</span>
						</div>
					</div>

					{Object.keys(memoryStats.patternsByType).length > 0 && (
						<div className="mt-[10px]">
							<span className="text-[var(--vscode-descriptionForeground)] text-sm">Patterns by Type:</span>
							<div className="mt-[5px] flex flex-wrap gap-[8px]">
								{Object.entries(memoryStats.patternsByType).map(([type, count]) => (
									<span
										key={type}
										className="px-[8px] py-[4px] rounded-md text-xs bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)]">
										{type}: {count}
									</span>
								))}
							</div>
						</div>
					)}
				</div>
			)}

			{/* Memory Management Section - Always show Import/Export buttons */}
			<div className="mb-[20px] p-[15px] rounded-md bg-[var(--vscode-editor-background)] border border-[var(--vscode-panel-border)]">
				<div className="flex items-center justify-between mb-[10px]">
					<div className="flex items-center gap-2">
						<Database className="w-4" />
						<h4 className="font-medium">
							{currentProjectMemory 
								? `Current Project: ${currentProjectMemory.projectName}` 
								: isInitializing 
									? "Initializing Memory..." 
									: "Project Memory"}
						</h4>
					</div>
					<div className="flex gap-2">
						<VSCodeButton
							appearance="icon"
							onClick={exportMemory}
							disabled={isLoading || !currentProjectMemory}
							title={currentProjectMemory ? "Export Memory" : "No project memory to export"}>
							<Download className="w-4" />
						</VSCodeButton>
						<div className="relative">
							<input
								type="file"
								accept=".json"
								onChange={importMemory}
								className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
								title={currentProjectMemory ? "Import Memory" : "Load project memory first"}
								disabled={isLoading || !currentProjectMemory}
							/>
							<VSCodeButton
								appearance="icon"
								disabled={isLoading || !currentProjectMemory}
								title={currentProjectMemory ? "Import Memory" : "Load project memory first"}>
								<Upload className="w-4" />
							</VSCodeButton>
						</div>
						<VSCodeButton
							appearance="icon"
							onClick={clearProjectMemory}
							disabled={isLoading || !currentProjectMemory}
							title={currentProjectMemory ? "Clear Memory" : "No project memory to clear"}>
							<Trash2 className="w-4" />
						</VSCodeButton>
					</div>
				</div>

				{/* Error Display */}
				{memoryError && (
					<div className="mb-[10px] p-[8px] rounded-md bg-[var(--vscode-errorBackground)] border border-[var(--vscode-errorBorder)]">
						<p className="text-xs text-[var(--vscode-errorForeground)]">{memoryError}</p>
					</div>
				)}

				{/* Loading State */}
				{isInitializing && (
					<div className="mb-[10px] text-sm text-[var(--vscode-descriptionForeground)]">
						Initializing memory system...
					</div>
				)}

				{/* No Project Memory State */}
				{!currentProjectMemory && !isInitializing && !memoryError && (
					<div className="mb-[10px] text-sm text-[var(--vscode-descriptionForeground)]">
						No project memory loaded. Click "Reload Project Memory" to initialize.
					</div>
				)}

				{/* Project Memory Details */}
				{currentProjectMemory && (
					<>
						<div className="grid grid-cols-2 gap-[15px] text-sm mb-[10px]">
							<div>
								<span className="text-[var(--vscode-descriptionForeground)]">Conversations:</span>
								<span className="ml-2 font-medium">{currentProjectMemory.conversationSummary.totalConversations}</span>
							</div>
							<div>
								<span className="text-[var(--vscode-descriptionForeground)]">Last Updated:</span>
								<span className="ml-2 font-medium">{formatDate(currentProjectMemory.lastUpdated)}</span>
							</div>
						</div>

						{/* Technologies */}
						{currentProjectMemory.context.technologies.length > 0 && (
							<div className="mb-[10px]">
								<span className="text-[var(--vscode-descriptionForeground)] text-sm">Technologies:</span>
								<div className="mt-[5px] flex flex-wrap gap-[8px]">
									{currentProjectMemory.context.technologies.map((tech, index) => (
										<span
											key={index}
											className="px-[8px] py-[4px] rounded-md text-xs bg-[var(--vscode-button-secondaryBackground)]">
											{tech}
										</span>
									))}
								</div>
							</div>
						)}

						{/* Frameworks */}
						{currentProjectMemory.context.frameworks.length > 0 && (
							<div className="mb-[10px]">
								<span className="text-[var(--vscode-descriptionForeground)] text-sm">Frameworks:</span>
								<div className="mt-[5px] flex flex-wrap gap-[8px]">
									{currentProjectMemory.context.frameworks.map((framework, index) => (
										<span
											key={index}
											className="px-[8px] py-[4px] rounded-md text-xs bg-[var(--vscode-button-secondaryBackground)]">
											{framework}
										</span>
									))}
								</div>
							</div>
						)}

						{/* Recent Patterns */}
						{currentProjectMemory.learnedPatterns.length > 0 && (
							<div>
								<span className="text-[var(--vscode-descriptionForeground)] text-sm">Recent Patterns:</span>
								<div className="mt-[5px] space-y-[8px] max-h-[200px] overflow-y-auto">
									{currentProjectMemory.learnedPatterns.slice(0, 5).map((pattern) => (
										<div
											key={pattern.id}
											className="p-[8px] rounded-md border border-[var(--vscode-panel-border)] text-sm">
											<div className="flex items-center justify-between mb-[4px]">
												<span className="font-medium text-xs">{pattern.type.replace('_', ' ')}</span>
												<div className="flex items-center gap-2">
													<span
														className="text-xs"
														style={{ color: getConfidenceColor(pattern.confidence) }}>
														{Math.round(pattern.confidence * 100)}%
													</span>
													<span className="text-xs text-[var(--vscode-descriptionForeground)]">
														{pattern.usageCount} uses
													</span>
												</div>
											</div>
											<p className="text-[var(--vscode-foreground)] text-xs">
												{pattern.description}
											</p>
										</div>
									))}
								</div>
							</div>
						)}
					</>
				)}
			</div>

			{/* Action Buttons */}
			<div className="flex gap-2 mt-[15px]">
				<VSCodeButton
					onClick={loadMemoryStats}
					disabled={isLoading}>
					Refresh Stats
				</VSCodeButton>
				<VSCodeButton
					onClick={loadCurrentProjectMemory}
					disabled={isLoading}
					appearance="secondary">
					Reload Project Memory
				</VSCodeButton>
			</div>
		</Section>
	)
}

export default memo(MemorySettingsSection)
