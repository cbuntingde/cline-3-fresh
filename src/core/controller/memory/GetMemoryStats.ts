/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Get Memory Stats Implementation
 * License: MIT
 */

import { Controller } from "../index"
import { GetMemoryStatsRequest, MemoryStatsResponse } from "../../../shared/proto/memory"

/**
 * Get memory statistics
 * @param controller The controller instance
 * @param request The request (empty)
 * @returns Promise resolving to memory statistics response
 */
export async function GetMemoryStats(controller: Controller, request: GetMemoryStatsRequest): Promise<MemoryStatsResponse> {
	try {
		// Get the memory manager from the controller
		const memoryManager = controller.memoryManager
		if (!memoryManager) {
			throw new Error("Memory manager not initialized")
		}

		// Get memory stats from the real memory manager
		const memoryStats = await memoryManager.getMemoryStats()

		// Convert the internal stats to protobuf format
		const response = MemoryStatsResponse.create({
			totalMemories: memoryStats.totalMemories,
			patternsByType: memoryStats.patternsByType,
			conversationCount: memoryStats.conversationCount,
			projectCount: memoryStats.projectCount,
			lastUpdated: memoryStats.lastUpdated,
			memoryUsage: memoryStats.memoryUsage,
		})

		return response
	} catch (error) {
		console.error("Error getting memory stats:", error)

		// Return empty stats on error
		return MemoryStatsResponse.create({
			totalMemories: 0,
			patternsByType: {},
			conversationCount: 0,
			projectCount: 0,
			lastUpdated: Date.now(),
			memoryUsage: 0,
		})
	}
}
