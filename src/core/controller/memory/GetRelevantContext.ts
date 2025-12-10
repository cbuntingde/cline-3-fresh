/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Get Relevant Context Implementation
 * License: MIT
 */

import { Controller } from "../index"
import { StringValue } from "../../../shared/proto/common"
import { GetRelevantContextRequest } from "../../../shared/proto/memory"

/**
 * Get relevant context for a query
 * @param controller The controller instance
 * @param request The request containing the query
 * @returns Promise resolving to relevant context
 */
export async function GetRelevantContext(controller: Controller, request: GetRelevantContextRequest): Promise<StringValue> {
	try {
		// Get the memory manager from the controller
		const memoryManager = controller.memoryManager
		if (!memoryManager) {
			throw new Error("Memory manager not initialized")
		}

		// Get relevant context using the real memory manager
		const relevantContext = await memoryManager.getRelevantContext(request.query)

		// Create comprehensive context response
		const contextResponse = {
			query: request.query,
			context: relevantContext,
			timestamp: new Date().toISOString(),
			status: "success",
		}

		return StringValue.create({ value: JSON.stringify(contextResponse, null, 2) })
	} catch (error) {
		console.error("Error getting relevant context:", error)

		const errorResponse = {
			query: request.query,
			context: [],
			timestamp: new Date().toISOString(),
			status: "error",
			error: error instanceof Error ? error.message : String(error),
		}

		return StringValue.create({ value: JSON.stringify(errorResponse, null, 2) })
	}
}
