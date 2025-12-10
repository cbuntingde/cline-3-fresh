import React, { memo, useEffect, useState } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { vscode } from "@/utils/vscode.ts"

interface DiagnosticsStatusProps {
	onRefresh?: () => void
}

const DiagnosticsStatus: React.FC<DiagnosticsStatusProps> = ({ onRefresh }) => {
	const { diagnosticsSummary, diagnosticsEnabled } = useExtensionState()
	const [isRefreshing, setIsRefreshing] = useState(false)

	const handleRefresh = async () => {
		setIsRefreshing(true)
		try {
			// Request diagnostics refresh from extension
			vscode.postMessage({ type: "refreshDiagnostics" })
			onRefresh?.()
		} finally {
			// Reset after a short delay to show feedback
			setTimeout(() => setIsRefreshing(false), 1000)
		}
	}

	const handleOpenProblems = () => {
		// Open VSCode Problems panel
		vscode.postMessage({ type: "openProblemsPanel" })
	}

	if (!diagnosticsEnabled || !diagnosticsSummary) {
		return null
	}

	const { errors, warnings, infos, hints, lastUpdated } = diagnosticsSummary
	const totalIssues = errors + warnings + infos + hints

	// Don't show if no issues
	if (totalIssues === 0) {
		return null
	}

	const getTimeSinceUpdate = () => {
		const now = Date.now()
		const diff = now - lastUpdated
		const seconds = Math.floor(diff / 1000)
		
		if (seconds < 60) return `${seconds}s ago`
		const minutes = Math.floor(seconds / 60)
		if (minutes < 60) return `${minutes}m ago`
		const hours = Math.floor(minutes / 60)
		return `${hours}h ago`
	}

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: "8px",
				padding: "6px 10px",
				backgroundColor: "var(--vscode-editor-background)",
				border: "1px solid var(--vscode-panel-border)",
				borderRadius: "4px",
				marginTop: "8px",
				fontSize: "12px",
			}}>
			<div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1 }}>
				{/* Error indicator */}
				{errors > 0 && (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "4px",
							color: "var(--vscode-errorForeground)",
						}}>
						<i className="codicon codicon-error" style={{ fontSize: "14px" }} />
						<span style={{ fontWeight: "500" }}>{errors}</span>
					</div>
				)}

				{/* Warning indicator */}
				{warnings > 0 && (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "4px",
							color: "var(--vscode-warningForeground)",
						}}>
						<i className="codicon codicon-warning" style={{ fontSize: "14px" }} />
						<span style={{ fontWeight: "500" }}>{warnings}</span>
					</div>
				)}

				{/* Info indicator */}
				{infos > 0 && (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "4px",
							color: "var(--vscode-infoForeground)",
						}}>
						<i className="codicon codicon-info" style={{ fontSize: "14px" }} />
						<span style={{ fontWeight: "500" }}>{infos}</span>
					</div>
				)}

				{/* Hint indicator */}
				{hints > 0 && (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "4px",
							color: "var(--vscode-descriptionForeground)",
						}}>
						<i className="codicon codicon-lightbulb" style={{ fontSize: "14px" }} />
						<span style={{ fontWeight: "500" }}>{hints}</span>
					</div>
				)}

				{/* Last updated time */}
				<span
					style={{
						color: "var(--vscode-descriptionForeground)",
						fontSize: "11px",
						marginLeft: "4px",
					}}>
					{getTimeSinceUpdate()}
				</span>
			</div>

			{/* Action buttons */}
			<div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
				<VSCodeButton
					appearance="icon"
					onClick={handleRefresh}
					disabled={isRefreshing}
					style={{ 
						minWidth: "auto", 
						padding: "2px",
						opacity: isRefreshing ? 0.6 : 1,
					}}
					title="Refresh diagnostics">
					<i 
						className={`codicon codicon-refresh${isRefreshing ? ' spinning' : ''}`} 
						style={{ fontSize: "14px" }}
					/>
				</VSCodeButton>
				
				<VSCodeButton
					appearance="icon"
					onClick={handleOpenProblems}
					style={{ minWidth: "auto", padding: "2px" }}
					title="Open Problems panel">
					<i className="codicon codicon-list-tree" style={{ fontSize: "14px" }} />
				</VSCodeButton>
			</div>

			<style>{`
				.spinning {
					animation: spin 1s linear infinite;
				}
				@keyframes spin {
					from { transform: rotate(0deg); }
					to { transform: rotate(360deg); }
				}
			`}</style>
		</div>
	)
}

export default memo(DiagnosticsStatus)
