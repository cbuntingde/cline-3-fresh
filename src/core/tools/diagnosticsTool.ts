import { ToolDefinition } from "@core/prompts/model_prompts/jsonToolToXml"
import * as vscode from "vscode"
import { formatResponse } from "@core/prompts/responses"

export const diagnosticsToolDefinition: ToolDefinition = {
	name: "get_diagnostics",
	descriptionForAgent: `- Read errors, warnings, and other diagnostics from the VSCode diagnostics API
- Provides access to linting errors, type checking errors, compilation warnings, etc.
- Returns diagnostics for all files in the workspace or specific files
- Includes severity levels, line numbers, and detailed error messages
- Use this when you need to identify and fix code issues, linting problems, or compilation errors`,
	inputSchema: {
		type: "object",
		properties: {
			file_path: {
				type: "string",
				description: "Optional: Specific file path to get diagnostics for (relative to current working directory). If not provided, returns diagnostics for all files in the workspace.",
			},
			severity: {
				type: "string",
				enum: ["error", "warning", "information", "hint"],
				description: "Optional: Filter diagnostics by severity level. If not provided, returns all diagnostics.",
			},
		},
		required: [],
	},
}

export async function executeDiagnosticsTool(
	cwd: string,
	filePath?: string,
	severity?: string
): Promise<string> {
	try {
		let result = ""

		if (filePath) {
			// Get diagnostics for specific file
			const absolutePath = require("path").resolve(cwd, filePath)
			const uri = vscode.Uri.file(absolutePath)
			const diagnostics = vscode.languages.getDiagnostics(uri)

			// Filter by severity if specified
			const filteredDiagnostics = severity 
				? diagnostics.filter(d => d.severity === getSeverityValue(severity))
				: diagnostics

			if (filteredDiagnostics.length === 0) {
				return `No diagnostics found for ${filePath}`
			}

			result += `# Diagnostics for ${filePath}\n\n`
			for (const diagnostic of filteredDiagnostics) {
				result += formatDiagnostic(diagnostic, filePath)
			}
		} else {
			// Get diagnostics for all files in workspace
			const diagnosticsMap = vscode.languages.getDiagnostics()
			let totalDiagnostics = 0

			result += `# Workspace Diagnostics\n\n`

			for (const [uri, fileDiagnostics] of diagnosticsMap) {
				// Skip empty diagnostic arrays
				if (fileDiagnostics.length === 0) {
					continue
				}

				// Filter by severity if specified
				const filteredDiagnostics = severity 
					? fileDiagnostics.filter(d => d.severity === getSeverityValue(severity))
					: fileDiagnostics

				if (filteredDiagnostics.length === 0) {
					continue
				}

				const relativePath = require("path").relative(cwd, uri.fsPath)
				result += `## ${relativePath}\n`
				
				for (const diagnostic of filteredDiagnostics) {
					result += formatDiagnostic(diagnostic, relativePath)
				}
				
				result += "\n"
				totalDiagnostics += filteredDiagnostics.length
			}

			if (totalDiagnostics === 0) {
				return "No diagnostics found in the workspace"
			}
		}

		return result.trim()
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		return `Error retrieving diagnostics: ${errorMessage}`
	}
}

function formatDiagnostic(diagnostic: vscode.Diagnostic, filePath: string): string {
	const severityLabel = getSeverityLabel(diagnostic.severity)
	const line = diagnostic.range.start.line + 1 // VSCode lines are 0-indexed
	const column = diagnostic.range.start.character + 1
	const source = diagnostic.source ? `[${diagnostic.source}] ` : ""
	
	let result = `- **${severityLabel}** ${source}Line ${line}, Column ${column}: ${diagnostic.message}`
	
	// Add related information if available
	if (diagnostic.relatedInformation && diagnostic.relatedInformation.length > 0) {
		result += "\n  Related information:"
		for (const related of diagnostic.relatedInformation) {
			const relatedPath = require("path").relative(require("path").dirname(filePath), related.location.uri.fsPath)
			const relatedLine = related.location.range.start.line + 1
			result += `\n    - ${related.message} (${relatedPath}:${relatedLine})`
		}
	}
	
	result += "\n"
	return result
}

function getSeverityValue(severity: string): vscode.DiagnosticSeverity {
	switch (severity) {
		case "error":
			return vscode.DiagnosticSeverity.Error
		case "warning":
			return vscode.DiagnosticSeverity.Warning
		case "information":
			return vscode.DiagnosticSeverity.Information
		case "hint":
			return vscode.DiagnosticSeverity.Hint
		default:
			return vscode.DiagnosticSeverity.Error
	}
}

function getSeverityLabel(severity: vscode.DiagnosticSeverity): string {
	switch (severity) {
		case vscode.DiagnosticSeverity.Error:
			return "Error"
		case vscode.DiagnosticSeverity.Warning:
			return "Warning"
		case vscode.DiagnosticSeverity.Information:
			return "Information"
		case vscode.DiagnosticSeverity.Hint:
			return "Hint"
		default:
			return "Diagnostic"
	}
}
