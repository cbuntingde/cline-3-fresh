import * as vscode from "vscode"
import { SUPPORTED_IMAGE_EXTENSIONS } from "../../shared/mime-types"
import { processImageFile } from "../../shared/image-processing"

export async function selectImages(): Promise<string[]> {
	const options: vscode.OpenDialogOptions = {
		canSelectMany: true,
		openLabel: "Select",
		filters: {
			Images: SUPPORTED_IMAGE_EXTENSIONS, // supported by anthropic and openrouter
		},
	}

	const fileUris = await vscode.window.showOpenDialog(options)

	if (!fileUris || fileUris.length === 0) {
		return []
	}

	const processedImagePromises = fileUris.map(async (uri) => {
		return processImageFile(uri.fsPath)
	})

	const dataUrlsWithNulls = await Promise.all(processedImagePromises)
	return dataUrlsWithNulls.filter((url) => url !== null) as string[] // Filter out skipped images
}
