/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Memory service initialization for AI learning system
 * MIT License
 */

import { Controller } from "../controller"

/**
 * Initialize memory service for the controller
 * This function sets up the memory manager and integrates it with the controller
 */
export async function initializeMemoryService(controller: Controller): Promise<void> {
	try {
		console.log("Initializing memory service...")
		
		// The memory manager is already initialized in the controller constructor
		// This function can be used for additional setup or verification
		if (controller.memoryManager) {
			console.log("Memory manager successfully initialized")
			
			// Load project memory for current workspace
			// Note: We'll use the current working directory since controller.cwd may not be available
			const workspacePath = process.cwd()
			await controller.memoryManager.loadProjectMemory(workspacePath)
			
			console.log("Memory service initialization complete")
		} else {
			console.warn("Memory manager not available in controller")
		}
	} catch (error) {
		console.error("Failed to initialize memory service:", error)
		// Don't throw - memory service failure shouldn't break the extension
	}
}
