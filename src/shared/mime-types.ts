/**
 * Utility functions for MIME type detection and handling
 */

/**
 * Gets the MIME type for a given file path based on its extension
 * @param filePath The file path to get the MIME type for
 * @returns The MIME type string
 * @throws Error if the file type is unsupported
 */
export function getMimeType(filePath: string): string {
	const ext = require('path').extname(filePath).toLowerCase()
	switch (ext) {
		case ".png":
			return "image/png"
		case ".jpeg":
		case ".jpg":
			return "image/jpeg"
		case ".webp":
			return "image/webp"
		default:
			throw new Error(`Unsupported file type: ${ext}`)
	}
}

/**
 * Supported image extensions for the application
 */
export const SUPPORTED_IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp"]

/**
 * Supported document extensions for the application
 */
export const SUPPORTED_DOCUMENT_EXTENSIONS = ["xml", "json", "txt", "log", "md", "docx", "ipynb", "pdf", "xlsx", "csv"]

/**
 * Checks if a file extension is supported as an image
 * @param extension The file extension (without dot)
 * @returns True if the extension is supported as an image
 */
export function isImageExtension(extension: string): boolean {
	return SUPPORTED_IMAGE_EXTENSIONS.includes(extension.toLowerCase())
}

/**
 * Checks if a file extension is supported as a document
 * @param extension The file extension (without dot)
 * @returns True if the extension is supported as a document
 */
export function isDocumentExtension(extension: string): boolean {
	return SUPPORTED_DOCUMENT_EXTENSIONS.includes(extension.toLowerCase())
}
