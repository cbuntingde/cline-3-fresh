import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { Search } from "lucide-react"

const TavilySettingsSection = () => {
	const { tavilyApiKey, setTavilyApiKey } = useExtensionState()

	const handleApiKeyChange = (value: string) => {
		setTavilyApiKey(value || undefined)
	}

	return (
		<div className="mb-[5px]">
			<div className="flex items-center gap-2 mb-[5px]">
				<Search className="w-4 h-4" />
				<span className="font-medium">Tavily Search API</span>
			</div>
			
			<VSCodeTextField
				value={tavilyApiKey || ""}
				className="w-full"
				type="password"
				placeholder="Enter your Tavily API key..."
				onInput={(e: any) => handleApiKeyChange(e.target?.value || "")}>
				<span className="font-medium">API Key</span>
			</VSCodeTextField>
			
			<p className="text-xs mt-[5px] text-[var(--vscode-descriptionForeground)]">
				Enable AI-powered web search capabilities for enhanced research and code discovery. 
				Get your API key from{" "}
				<a 
					href="https://tavily.com" 
					target="_blank" 
					rel="noopener noreferrer"
					className="text-[var(--vscode-textLink-foreground)] hover:underline"
				>
					Tavily
				</a>
				. When creating new projects, Cline will search for related information, code examples, 
				and security guidelines from sources like Google CodeWiki and OWASP Top 10.
			</p>
		</div>
	)
}

export default TavilySettingsSection
