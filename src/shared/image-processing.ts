/**
 * Shared utilities for image processing operations
 */

import * as vscode from "vscode"
import fs from "fs/promises"
import * as path from "path"
import sizeOf from "image-size"
import { getMimeType } from "./mime-types"

/**
 * Maximum allowed image dimensions (7500px)
 */
export const MAX_IMAGE_DIMENSION = 7500

/**
 * Processes an image file, validates dimensions, and converts to base64 data URL
 * @param imagePath Path to the image file
 * @returns Promise resolving to base64 data URL or null if processing fails
 */
export async function processImageFile(imagePath: string): Promise<string | null> {
	let buffer: Buffer
	try {
		// Read the file into a buffer first
		buffer = await fs.readFile(imagePath)
		// Convert Node.js Buffer to Uint8Array
		const uint8Array = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
		const dimensions = sizeOf(uint8Array) // Get dimensions from Uint8Array
		
		if (dimensions.width! > MAX_IMAGE_DIMENSION || dimensions.height! > MAX_IMAGE_DIMENSION) {
			console.warn(`Image dimensions exceed ${MAX_IMAGE_DIMENSION}px, skipping: ${imagePath}`)
			vscode.window.showErrorMessage(
				`Image too large: ${path.basename(imagePath)} was skipped (dimensions exceed ${MAX_IMAGE_DIMENSION}px).`,
			)
			return null
		}
	} catch (error) {
		console.error(`Error reading file or getting dimensions for ${imagePath}:`, error)
		vscode.window.showErrorMessage(`Could not read dimensions for ${path.basename(imagePath)}, skipping.`)
		return null
	}

	// If dimensions are valid, proceed to convert the existing buffer to base64
	const base64 = buffer.toString("base64")
	const mimeType = getMimeType(imagePath)
	return `data:${mimeType};base64,${base64}`
}

/**
 * Validates image file dimensions
 * @param imagePath Path to the image file
 * @returns Promise resolving to true if dimensions are valid, false otherwise
 */
export async function validateImageDimensions(imagePath: string): Promise<boolean> {
	try {
		const buffer = await fs.readFile(imagePath)
		const uint8Array = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
		const dimensions = sizeOf(uint8Array)
		
		return dimensions.width! <= MAX_IMAGE_DIMENSION && dimensions.height! <= MAX_IMAGE_DIMENSION
	} catch (error) {
		console.error(`Error validating image dimensions for ${imagePath}:`, error)
		return false
	}
}
