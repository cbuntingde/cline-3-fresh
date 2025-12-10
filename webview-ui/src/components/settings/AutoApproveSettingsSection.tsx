import React, { useRef, useState, useEffect } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useAutoApproveActions } from "@/hooks/useAutoApproveActions"
import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import HeroTooltip from "@/components/common/HeroTooltip"
import AutoApproveMenuItem from "@/components/chat/auto-approve-menu/AutoApproveMenuItem"
import { ACTION_METADATA, NOTIFICATIONS_SETTING } from "@/components/chat/auto-approve-menu/constants"

const breakpoint = 500

const AutoApproveSettingsSection: React.FC = () => {
	const { autoApprovalSettings } = useExtensionState()
	const { isChecked, isFavorited, toggleFavorite, updateAction, updateMaxRequests } = useAutoApproveActions()

	const itemsContainerRef = useRef<HTMLDivElement>(null)
	const [containerWidth, setContainerWidth] = useState(0)

	// Track container width for responsive layout
	useEffect(() => {
		const updateWidth = () => {
			if (itemsContainerRef.current) {
				setContainerWidth(itemsContainerRef.current.offsetWidth)
			}
		}

		// Initial measurement
		updateWidth()

		// Set up resize observer
		const resizeObserver = new ResizeObserver(updateWidth)
		if (itemsContainerRef.current) {
			resizeObserver.observe(itemsContainerRef.current)
		}

		// Clean up
		return () => {
			resizeObserver.disconnect()
		}
	}, [])

	return (
		<div>
			<div className="mb-4">
				<HeroTooltip
					content="Auto-approve allows Cline to perform the following actions without asking for permission. Please use with caution and only enable if you understand the risks."
					placement="top">
					<div className="text-base font-semibold mb-2">Auto-approve Settings</div>
				</HeroTooltip>
				<p className="text-sm text-[var(--vscode-descriptionForeground)] mb-4">
					Configure which actions Cline can perform without requiring explicit approval. Use with caution as these settings allow Cline to perform actions automatically.
				</p>
			</div>

			<div className="mb-4">
				<span className="text-[color:var(--vscode-foreground)] font-medium">Actions:</span>
			</div>

			<div
				ref={itemsContainerRef}
				className="relative mb-6"
				style={{
					columnCount: containerWidth > breakpoint ? 2 : 1,
					columnGap: "4px",
				}}>
				{/* Vertical separator line - only visible in two-column mode */}
				{containerWidth > breakpoint && (
					<div
						className="absolute left-1/2 top-0 bottom-0 w-[0.5px] opacity-20"
						style={{
							background: "color-mix(in srgb, var(--vscode-foreground) 20%, transparent)",
							transform: "translateX(-50%)", // Center the line
						}}
					/>
				)}

				{/* All items in a single list - CSS Grid will handle the column distribution */}
				{ACTION_METADATA.map((action) => (
					<AutoApproveMenuItem
						key={action.id}
						action={action}
						isChecked={isChecked}
						isFavorited={isFavorited}
						onToggle={updateAction}
						onToggleFavorite={toggleFavorite}
					/>
				))}
			</div>

			<div className="mb-4">
				<span className="text-[color:var(--vscode-foreground)] font-medium">Quick Settings:</span>
			</div>

			<AutoApproveMenuItem
				key={NOTIFICATIONS_SETTING.id}
				action={NOTIFICATIONS_SETTING}
				isChecked={isChecked}
				isFavorited={isFavorited}
				onToggle={updateAction}
				onToggleFavorite={toggleFavorite}
			/>

			<HeroTooltip
				content="Cline will automatically make this many API requests before asking for approval to proceed with the task."
				placement="top">
				<div className="flex items-center pl-1.5 my-4">
					<span className="codicon codicon-settings text-[#CCCCCC] text-[14px]" />
					<span className="text-[#CCCCCC] text-sm font-medium ml-2">Max Requests:</span>
					<VSCodeTextField
						className="flex-1 w-full pr-[35px] ml-4"
						value={autoApprovalSettings.maxRequests.toString()}
						onInput={async (e) => {
							const input = e.target as HTMLInputElement
							// Remove any non-numeric characters
							input.value = input.value.replace(/[^0-9]/g, "")
							const value = parseInt(input.value)
							if (!isNaN(value) && value > 0) {
								await updateMaxRequests(value)
							}
						}}
						onKeyDown={(e) => {
							// Prevent non-numeric keys (except for backspace, delete, arrows)
							if (!/^\d$/.test(e.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight"].includes(e.key)) {
								e.preventDefault()
							}
						}}
					/>
				</div>
			</HeroTooltip>

			<div className="mt-6 p-3 rounded-md bg-[var(--vscode-textBlockQuote-background)] border-l-4 border-[var(--vscode-textBlockQuote-border)]">
				<div className="flex items-start gap-2">
					<span className="codicon codicon-warning text-[var(--vscode-textBlockQuote-foreground)] mt-0.5"></span>
					<div className="text-sm text-[var(--vscode-textBlockQuote-foreground)]">
						<strong>Security Notice:</strong> Auto-approve settings allow Cline to perform actions without explicit confirmation. Only enable actions you trust Cline to handle safely. Review your settings carefully and consider the security implications of each enabled action.
					</div>
				</div>
			</div>
		</div>
	)
}

export default AutoApproveSettingsSection
