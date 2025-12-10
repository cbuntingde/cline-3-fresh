/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Memory Service Initialization
 * License: MIT
 */

import { Controller } from "../index"

/**
 * Initialize the memory service
 * @param controller The controller instance
 */
export async function initializeMemoryService(controller: Controller): Promise<void> {
	try {
		// The memory manager is already initialized in the controller constructor
		// This function can be used for any additional setup if needed
		console.log("Memory service initialized successfully")

		// Load memory for the current workspace
		const workspacePath = controller.getWorkspacePath()
		if (workspacePath) {
			console.log(`Workspace path: ${workspacePath}`)

			// Initialize project memory for the current workspace
			if (controller.memoryManager) {
				await controller.memoryManager.loadProjectMemory(workspacePath)
				console.log("Project memory loaded successfully")
			} else {
				throw new Error("Memory manager not initialized")
			}
		} else {
			console.warn("No workspace path available for memory initialization")
		}
	} catch (error) {
		console.error("Failed to initialize memory service:", error)
		// Don't throw here - allow the extension to continue even if memory fails to initialize
		// The UI will show the error and allow users to retry
	}
}
