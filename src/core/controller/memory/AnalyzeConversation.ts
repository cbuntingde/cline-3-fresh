/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Analyze Conversation Implementation
 * License: MIT
 */

import { Controller } from "../index"
import { StringValue } from "../../../shared/proto/common"
import { AnalyzeConversationRequest } from "../../../shared/proto/memory"
import { ClineMessage } from "../../../shared/ExtensionMessage"

/**
 * Analyze conversation for patterns and insights
 * @param controller The controller instance
 * @param request The request containing messages to analyze
 * @returns Promise resolving to analysis results
 */
export async function AnalyzeConversation(controller: Controller, request: AnalyzeConversationRequest): Promise<StringValue> {
	try {
		// Get the memory manager from the controller
		const memoryManager = controller.memoryManager
		if (!memoryManager) {
			throw new Error("Memory manager not initialized")
		}

		// The messages are already strings in the protobuf request
		// Convert them to ClineMessage format for the memory manager
		const messages: ClineMessage[] = request.messages.map((msg, index) => ({
			type: "say" as any,
			text: msg,
			images: [],
			fileMentions: [],
			ts: Date.now() + index, // Add timestamp to make it valid ClineMessage
		}))

		// Analyze and learn from the conversation using the real memory manager
		await memoryManager.analyzeAndLearnFromConversation(messages)

		// Get relevant context based on the conversation
		const conversationText = request.messages.join(" ")
		const relevantContext = await memoryManager.getRelevantContext(conversationText)

		// Get memory stats
		const memoryStats = await memoryManager.getMemoryStats()

		// Create comprehensive analysis response
		const analysis = {
			analysisDate: new Date().toISOString(),
			messagesProcessed: messages.length,
			patternsLearned: memoryStats.totalMemories,
			conversationCount: memoryStats.conversationCount,
			projectCount: memoryStats.projectCount,
			relevantContext,
			memoryStats: {
				totalMemories: memoryStats.totalMemories,
				patternsByType: memoryStats.patternsByType,
				conversationCount: memoryStats.conversationCount,
				projectCount: memoryStats.projectCount,
				lastUpdated: memoryStats.lastUpdated,
				memoryUsage: memoryStats.memoryUsage,
			},
			status: "success",
			message: "Conversation analyzed and patterns learned successfully",
		}

		return StringValue.create({ value: JSON.stringify(analysis, null, 2) })
	} catch (error) {
		console.error("Error analyzing conversation:", error)

		const errorAnalysis = {
			analysisDate: new Date().toISOString(),
			messagesProcessed: request.messages.length,
			status: "error",
			error: error instanceof Error ? error.message : String(error),
			message: "Failed to analyze conversation",
		}

		return StringValue.create({ value: JSON.stringify(errorAnalysis, null, 2) })
	}
}
