/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Import Memory Implementation
 * License: MIT
 */

import { Controller } from "../index"
import { StringValue } from "../../../shared/proto/common"
import { ImportMemoryRequest } from "../../../shared/proto/memory"

/**
 * Import memory data
 * @param controller The controller instance
 * @param request The request containing project ID and memory data
 * @returns Promise resolving to import result
 */
export async function ImportMemory(controller: Controller, request: ImportMemoryRequest): Promise<StringValue> {
	try {
		// Get the memory manager from the controller
		const memoryManager = controller.memoryManager
		if (!memoryManager) {
			throw new Error("Memory manager not initialized")
		}

		// Parse the memory JSON from the request
		const memoryData = JSON.parse(request.memoryJson)

		// Import memory using the real memory manager
		await memoryManager.importMemory(request.projectId, memoryData)

		const response = {
			projectId: request.projectId,
			status: "success",
			message: "Memory imported successfully",
			timestamp: new Date().toISOString(),
		}

		return StringValue.create({ value: JSON.stringify(response, null, 2) })
	} catch (error) {
		console.error("Error importing memory:", error)

		const errorResponse = {
			projectId: request.projectId,
			status: "error",
			message: "Failed to import memory",
			error: error instanceof Error ? error.message : String(error),
			timestamp: new Date().toISOString(),
		}

		return StringValue.create({ value: JSON.stringify(errorResponse, null, 2) })
	}
}
