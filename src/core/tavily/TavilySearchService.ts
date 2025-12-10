export interface TavilySearchResult {
	title: string
	url: string
	content: string
	score?: number
	raw_content?: string
	published_date?: string
}

export interface TavilySearchOptions {
	query: string
	searchDepth?: "basic" | "advanced"
	includeAnswer?: boolean
	includeRawContent?: boolean
	maxResults?: number
	includeDomains?: string[]
	excludeDomains?: string[]
}

export interface TavilySearchResponse {
	results: TavilySearchResult[]
	answer?: string
	responseTime: number
}

export class TavilySearchService {
	private apiKey: string | undefined
	private baseUrl = "https://api.tavily.com"

	constructor(apiKey?: string) {
		this.apiKey = apiKey
	}

	setApiKey(apiKey: string) {
		this.apiKey = apiKey
	}

	hasValidApiKey(): boolean {
		return !!this.apiKey && this.apiKey.length > 0
	}

	async search(options: TavilySearchOptions): Promise<TavilySearchResponse> {
		if (!this.hasValidApiKey()) {
			throw new Error("Tavily API key is not configured")
		}

		const startTime = Date.now()

		try {
			const response = await fetch(`${this.baseUrl}/search`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					api_key: this.apiKey,
					query: options.query,
					search_depth: options.searchDepth || "basic",
					include_answer: options.includeAnswer || false,
					include_raw_content: options.includeRawContent || false,
					max_results: options.maxResults || 10,
					include_domains: options.includeDomains || [],
					exclude_domains: options.excludeDomains || [],
				}),
			})

			if (!response.ok) {
				throw new Error(`Tavily API error: ${response.status} ${response.statusText}`)
			}

			const data = await response.json()
			const responseTime = Date.now() - startTime

			return {
				results: data.results || [],
				answer: data.answer,
				responseTime,
			}
		} catch (error) {
			throw new Error(`Tavily search failed: ${error instanceof Error ? error.message : "Unknown error"}`)
		}
	}

	async searchForCodeContext(projectDescription: string, technologies: string[]): Promise<TavilySearchResponse> {
		const query = `${projectDescription} ${technologies.join(" ")} best practices examples tutorial`
		
		return this.search({
			query,
			searchDepth: "advanced",
			includeAnswer: true,
			includeRawContent: true,
			maxResults: 5,
			includeDomains: [
				"github.com",
				"stackoverflow.com",
				"dev.to",
				"medium.com",
				"docs.google.com",
			],
		})
	}

	async searchForSecurityGuidelines(technologies: string[]): Promise<TavilySearchResponse> {
		const query = `${technologies.join(" ")} security best practices OWASP vulnerabilities`
		
		return this.search({
			query,
			searchDepth: "advanced",
			includeAnswer: true,
			maxResults: 5,
			includeDomains: [
				"owasp.org",
				"cwe.mitre.org",
				"nist.gov",
				"sans.org",
				"github.com",
			],
		})
	}

	async searchGoogleCodeWiki(topic: string): Promise<TavilySearchResponse> {
		const query = `site:developers.google.com ${topic} code examples documentation`
		
		return this.search({
			query,
			searchDepth: "basic",
			includeAnswer: false,
			maxResults: 3,
		})
	}

	async searchOWASPTop10(): Promise<TavilySearchResponse> {
		const query = "OWASP Top 10 2021 security vulnerabilities prevention"
		
		return this.search({
			query,
			searchDepth: "advanced",
			includeAnswer: true,
			maxResults: 3,
			includeDomains: ["owasp.org"],
		})
	}
}

// Singleton instance
export const tavilySearchService = new TavilySearchService()
