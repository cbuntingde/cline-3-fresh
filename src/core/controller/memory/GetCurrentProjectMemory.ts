/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Get Current Project Memory Implementation
 * License: MIT
 */

import { Controller } from "../index"
import { ProjectMemoryResponse, GetCurrentProjectMemoryRequest } from "../../../shared/proto/memory"
import { MemoryManager, ProjectMemory } from "../../../core/memory/MemoryManager"

/**
 * Get current project memory
 * @param controller The controller instance
 * @param request The request containing project ID
 * @returns Promise resolving to project memory response
 */
export async function GetCurrentProjectMemory(
	controller: Controller,
	request: GetCurrentProjectMemoryRequest,
): Promise<ProjectMemoryResponse> {
	try {
		// Get the memory manager from the controller
		const memoryManager = controller.memoryManager
		if (!memoryManager) {
			throw new Error("Memory manager not initialized")
		}

		// Get the current workspace path
		const workspacePath = controller.getWorkspacePath()
		if (!workspacePath) {
			throw new Error("No workspace path available")
		}

		// Load project memory from the real memory manager
		const projectMemory: ProjectMemory | null = await memoryManager.loadProjectMemory(workspacePath)
		if (!projectMemory) {
			throw new Error("Failed to load project memory")
		}

		// Convert the internal ProjectMemory to protobuf format
		const response = ProjectMemoryResponse.create({
			projectId: projectMemory.projectId,
			projectName: projectMemory.projectName,
			projectPath: projectMemory.projectPath,
			lastUpdated: projectMemory.lastUpdated,
			context: {
				technologies: projectMemory.context.technologies,
				frameworks: projectMemory.context.frameworks,
				languages: projectMemory.context.languages,
				dependencies: projectMemory.context.dependencies,
				buildTools: projectMemory.context.buildTools,
				testingFrameworks: projectMemory.context.testingFrameworks,
				codingStandards: projectMemory.context.codingStandards,
				architecture: projectMemory.context.architecture,
			},
			learnedPatterns: projectMemory.learnedPatterns.map((pattern) => ({
				id: pattern.id,
				type: pattern.type,
				description: pattern.description,
				pattern: pattern.pattern,
				context: pattern.context,
				confidence: pattern.confidence,
				createdAt: pattern.createdAt,
				lastUsed: pattern.lastUsed,
				usageCount: pattern.usageCount,
				tags: pattern.tags,
			})),
			conversationSummary: {
				totalConversations: projectMemory.conversationSummary.totalConversations,
				topics: projectMemory.conversationSummary.topics,
				frequentQuestions: projectMemory.conversationSummary.frequentQuestions,
				commonIssues: projectMemory.conversationSummary.commonIssues,
				successfulSolutions: projectMemory.conversationSummary.successfulSolutions,
				lastConversationTopics: projectMemory.conversationSummary.lastConversationTopics,
			},
			fileStructure: {
				importantFiles: projectMemory.fileStructure.importantFiles,
				frequentlyModified: projectMemory.fileStructure.frequentlyModified,
				filePurposes: projectMemory.fileStructure.filePurposes,
				directories: projectMemory.fileStructure.directories,
				entryPoints: projectMemory.fileStructure.entryPoints,
			},
			userPreferences: {
				codingStyle: projectMemory.userPreferences.codingStyle,
				commentingStyle: projectMemory.userPreferences.commentingStyle,
				namingConventions: projectMemory.userPreferences.namingConventions,
				preferredLibraries: projectMemory.userPreferences.preferredLibraries,
				avoidancePatterns: projectMemory.userPreferences.avoidancePatterns,
				communicationStyle: projectMemory.userPreferences.communicationStyle,
			},
		})

		return response
	} catch (error) {
		console.error("Error getting current project memory:", error)
		throw error
	}
}
