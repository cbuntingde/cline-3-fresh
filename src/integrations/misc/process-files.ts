import * as vscode from "vscode"
import fs from "fs/promises"
import * as path from "path"
import { SUPPORTED_IMAGE_EXTENSIONS, SUPPORTED_DOCUMENT_EXTENSIONS, isImageExtension } from "../../shared/mime-types"
import { processImageFile } from "../../shared/image-processing"

/**
 * Supports processing of images and other file types
 * For models which don't support images, will not allow them to be selected
 */
export async function selectFiles(imagesAllowed: boolean): Promise<{ images: string[]; files: string[] }> {
	const options: vscode.OpenDialogOptions = {
		canSelectMany: true,
		openLabel: "Select",
		filters: {
			Files: imagesAllowed ? [...SUPPORTED_IMAGE_EXTENSIONS, ...SUPPORTED_DOCUMENT_EXTENSIONS] : SUPPORTED_DOCUMENT_EXTENSIONS,
		},
	}

	const fileUris = await vscode.window.showOpenDialog(options)

	if (!fileUris || fileUris.length === 0) {
		return { images: [], files: [] }
	}

	const processFilesPromises = fileUris.map(async (uri) => {
		const filePath = uri.fsPath
		const fileExtension = path.extname(filePath).toLowerCase().substring(1)
		//const fileName = path.basename(filePath)

		const isImage = isImageExtension(fileExtension)

		if (isImage) {
			const dataUrl = await processImageFile(filePath)
			if (dataUrl) {
				return { type: "image", data: dataUrl }
			}
			return null
		} else {
			// for standard models we will check the size of the file to ensure its not too large
			try {
				const stats = await fs.stat(filePath)
				if (stats.size > 20 * 1000 * 1024) {
					console.warn(`File too large, skipping: ${filePath}`)
					vscode.window.showErrorMessage(`File too large: ${path.basename(filePath)} was skipped (size exceeds 20MB).`)
					return null
				}
			} catch (error) {
				console.error(`Error checking file size for ${filePath}:`, error)
				vscode.window.showErrorMessage(`Could not check file size for ${path.basename(filePath)}, skipping.`)
				return null
			}
			return { type: "file", data: filePath }
		}
	})

	const dataUrlsWithNulls = await Promise.all(processFilesPromises)
	const dataUrlsWithoutNulls = dataUrlsWithNulls.filter((item) => item !== null)

	const images: string[] = []
	const files: string[] = []

	for (const item of dataUrlsWithoutNulls) {
		if (item.type === "image") {
			images.push(item.data)
		} else {
			files.push(item.data)
		}
	}

	return { images, files }
}
