/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Export Memory Implementation
 * License: MIT
 */

import { Controller } from "../index"
import { StringValue } from "../../../shared/proto/common"
import { ExportMemoryRequest } from "../../../shared/proto/memory"

/**
 * Export memory data
 * @param controller The controller instance
 * @param request The request containing project ID
 * @returns Promise resolving to exported memory data
 */
export async function ExportMemory(controller: Controller, request: ExportMemoryRequest): Promise<StringValue> {
	try {
		// Get the memory manager from the controller
		const memoryManager = controller.memoryManager
		if (!memoryManager) {
			throw new Error("Memory manager not initialized")
		}

		// Export memory using the real memory manager
		const exportedData = await memoryManager.exportMemory(request.projectId)

		const response = {
			projectId: request.projectId,
			exportedData,
			status: "success",
			message: "Memory exported successfully",
			timestamp: new Date().toISOString(),
		}

		return StringValue.create({ value: JSON.stringify(response, null, 2) })
	} catch (error) {
		console.error("Error exporting memory:", error)

		const errorResponse = {
			projectId: request.projectId,
			exportedData: null,
			status: "error",
			message: "Failed to export memory",
			error: error instanceof Error ? error.message : String(error),
			timestamp: new Date().toISOString(),
		}

		return StringValue.create({ value: JSON.stringify(errorResponse, null, 2) })
	}
}
