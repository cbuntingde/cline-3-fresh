/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Clear Project Memory Implementation
 * License: MIT
 */

import { Controller } from "../index"
import { StringValue } from "../../../shared/proto/common"
import { ClearProjectMemoryRequest } from "../../../shared/proto/memory"

/**
 * Clear project memory
 * @param controller The controller instance
 * @param request The request containing project ID
 * @returns Promise resolving to operation result
 */
export async function ClearProjectMemory(controller: Controller, request: ClearProjectMemoryRequest): Promise<StringValue> {
	try {
		// Get the memory manager from the controller
		const memoryManager = controller.memoryManager
		if (!memoryManager) {
			throw new Error("Memory manager not initialized")
		}

		// Clear project memory using the real memory manager
		await memoryManager.clearProjectMemory(request.projectId)

		const response = {
			projectId: request.projectId,
			status: "success",
			message: "Project memory cleared successfully",
			timestamp: new Date().toISOString(),
		}

		return StringValue.create({ value: JSON.stringify(response, null, 2) })
	} catch (error) {
		console.error("Error clearing project memory:", error)

		const errorResponse = {
			projectId: request.projectId,
			status: "error",
			message: "Failed to clear project memory",
			error: error instanceof Error ? error.message : String(error),
			timestamp: new Date().toISOString(),
		}

		return StringValue.create({ value: JSON.stringify(errorResponse, null, 2) })
	}
}
