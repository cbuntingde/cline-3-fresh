/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Intelligent Tool Selection System - MCP Server Scorer
 * MIT License
 */

import {
    McpServerIntelligence,
    McpServerRecommendation,
    McpServerScoringContext,
    McpServerUsagePattern,
    CapabilityMapping
} from "./types"

/**
 * Scores and ranks MCP servers based on task context
 * Implements intelligent server selection with fallback strategies
 */
export class McpServerScorer {
    private usagePatterns: Map<string, McpServerUsagePattern> = new Map()
    private capabilityMappings: CapabilityMapping[] = []

    constructor() {
        this.initializeCapabilityMappings()
    }

    /**
     * Score all available MCP servers for a given context
     * Returns ranked list of recommendations
     */
    async scoreServers(
        servers: McpServerIntelligence[],
        context: McpServerScoringContext
    ): Promise<McpServerRecommendation[]> {
        const recommendations: McpServerRecommendation[] = []

        for (const server of servers) {
            // Skip disconnected servers
            if (server.status !== "connected") {
                continue
            }

            // Skip servers that recently failed
            if (context.previousFailures.includes(server.serverName)) {
                continue
            }

            const score = await this.calculateServerScore(server, context)
            const confidence = this.calculateConfidence(server, context)
            const reasoning = this.generateReasoning(server, context, score)

            recommendations.push({
                server,
                score,
                confidence,
                reasoning,
                suggestedTools: this.suggestTools(server, context),
                alternatives: [],  // Will be populated after all servers are scored
                riskAssessment: this.assessRisk(server, score),
                estimatedResponseTime: server.performanceMetrics.avgResponseTime
            })
        }

        // Sort by score * confidence
        recommendations.sort((a, b) => {
            const scoreA = a.score * a.confidence
            const scoreB = b.score * b.confidence
            return scoreB - scoreA
        })

        // Populate alternatives (next 2 best options)
        for (let i = 0; i < recommendations.length; i++) {
            recommendations[i].alternatives = recommendations
                .slice(i + 1, i + 3)
                .map(rec => ({ ...rec, alternatives: [] }))
        }

        return recommendations
    }

    /**
     * Calculate relevance score for a server given the context
     */
    private async calculateServerScore(
        server: McpServerIntelligence,
        context: McpServerScoringContext
    ): Promise<number> {
        let score = 0
        let maxScore = 0

        // 1. Capability matching (40% weight)
        const capabilityScore = this.scoreCapabilityMatch(server, context)
        score += capabilityScore * 0.4
        maxScore += 0.4

        // 2. Keyword matching (30% weight)
        const keywordScore = this.scoreKeywordMatch(server, context)
        score += keywordScore * 0.3
        maxScore += 0.3

        // 3. Historical performance (20% weight)
        const performanceScore = this.scorePerformance(server)
        score += performanceScore * 0.2
        maxScore += 0.2

        // 4. Usage pattern matching (10% weight)
        const patternScore = this.scoreUsagePattern(server, context)
        score += patternScore * 0.1
        maxScore += 0.1

        return maxScore > 0 ? score / maxScore : 0
    }

    /**
     * Score based on capability matching
     */
    private scoreCapabilityMatch(
        server: McpServerIntelligence,
        context: McpServerScoringContext
    ): number {
        const taskTypeMapping: Record<string, string[]> = {
            "documentation_lookup": ["documentation", "search", "reference", "api-docs"],
            "file_operation": ["file-operations", "filesystem", "storage"],
            "web_scraping": ["web-scraping", "fetch", "http", "web"],
            "code_search": ["search", "code-analysis", "grep"],
            "database": ["database", "sql", "query"],
            "api_call": ["api", "http", "rest", "graphql"]
        }

        const expectedCapabilities = taskTypeMapping[context.taskType] || []
        if (expectedCapabilities.length === 0) {
            return 0.5  // Neutral score if task type unknown
        }

        const matches = server.capabilities.filter(cap =>
            expectedCapabilities.some(expected =>
                cap.toLowerCase().includes(expected.toLowerCase())
            )
        )

        return matches.length / expectedCapabilities.length
    }

    /**
     * Score based on keyword matching
     */
    private scoreKeywordMatch(
        server: McpServerIntelligence,
        context: McpServerScoringContext
    ): number {
        if (context.keywords.length === 0) {
            return 0.5  // Neutral score if no keywords
        }

        const matches = context.keywords.filter(keyword =>
            server.keywords.some(serverKeyword =>
                serverKeyword.toLowerCase().includes(keyword.toLowerCase()) ||
                keyword.toLowerCase().includes(serverKeyword.toLowerCase())
            )
        )

        return matches.length / context.keywords.length
    }

    /**
     * Score based on historical performance
     */
    private scorePerformance(server: McpServerIntelligence): number {
        const metrics = server.performanceMetrics

        // If no requests yet, return neutral score
        if (metrics.totalRequests === 0) {
            return 0.5
        }

        let score = 0

        // Success rate (50% weight)
        score += metrics.successRate * 0.5

        // Low error rate (25% weight)
        score += (1 - metrics.errorRate) * 0.25

        // Low timeout rate (25% weight)
        score += (1 - metrics.timeoutRate) * 0.25

        // Penalty for consecutive failures
        if (metrics.consecutiveFailures > 0) {
            score *= Math.max(0.5, 1 - (metrics.consecutiveFailures * 0.1))
        }

        return score
    }

    /**
     * Score based on learned usage patterns
     */
    private scoreUsagePattern(
        server: McpServerIntelligence,
        context: McpServerScoringContext
    ): number {
        // Find matching patterns
        const matchingPatterns = Array.from(this.usagePatterns.values()).filter(
            pattern => pattern.preferredServer === server.serverName
        )

        if (matchingPatterns.length === 0) {
            return 0.5  // Neutral if no patterns
        }

        // Calculate average success rate from patterns
        const avgSuccessRate = matchingPatterns.reduce(
            (sum, pattern) => sum + pattern.successRate,
            0
        ) / matchingPatterns.length

        return avgSuccessRate
    }

    /**
     * Calculate confidence in the recommendation
     */
    private calculateConfidence(
        server: McpServerIntelligence,
        context: McpServerScoringContext
    ): number {
        let confidence = server.confidence  // Base confidence from capability inference

        // Increase confidence if server has been used successfully
        if (server.performanceMetrics.totalRequests > 10) {
            confidence *= 1 + (server.performanceMetrics.successRate * 0.2)
        }

        // Decrease confidence if server has recent failures
        if (server.performanceMetrics.consecutiveFailures > 0) {
            confidence *= Math.max(0.3, 1 - (server.performanceMetrics.consecutiveFailures * 0.15))
        }

        return Math.min(1, Math.max(0, confidence))
    }

    /**
     * Generate human-readable reasoning for the recommendation
     */
    private generateReasoning(
        server: McpServerIntelligence,
        context: McpServerScoringContext,
        score: number
    ): string[] {
        const reasoning: string[] = []

        // Capability match reasoning
        const matchingCaps = server.capabilities.filter(cap =>
            context.keywords.some(kw => cap.toLowerCase().includes(kw.toLowerCase()))
        )
        if (matchingCaps.length > 0) {
            reasoning.push(`Provides capabilities: ${matchingCaps.join(", ")}`)
        }

        // Performance reasoning
        if (server.performanceMetrics.successRate > 0.9) {
            reasoning.push(`High success rate (${(server.performanceMetrics.successRate * 100).toFixed(0)}%)`)
        }

        // Usage pattern reasoning
        const pattern = Array.from(this.usagePatterns.values()).find(
            p => p.preferredServer === server.serverName
        )
        if (pattern && pattern.successRate > 0.8) {
            reasoning.push(`Proven effective for similar tasks`)
        }

        // Tool count reasoning
        if (server.toolCount > 5) {
            reasoning.push(`Offers ${server.toolCount} specialized tools`)
        }

        if (reasoning.length === 0) {
            reasoning.push(`General-purpose server with ${server.toolCount} tools`)
        }

        return reasoning
    }

    /**
     * Suggest specific tools from the server to use
     */
    private suggestTools(
        server: McpServerIntelligence,
        context: McpServerScoringContext
    ): string[] {
        // This would ideally analyze the server's tools and match them to the context
        // For now, return empty array - will be populated by the registry
        return []
    }

    /**
     * Assess risk of using this server
     */
    private assessRisk(
        server: McpServerIntelligence,
        score: number
    ): "low" | "medium" | "high" {
        let riskScore = 0

        // Low score = higher risk
        if (score < 0.3) {
            riskScore += 2
        } else if (score < 0.6) {
            riskScore += 1
        }

        // Low success rate = higher risk
        if (server.performanceMetrics.successRate < 0.7) {
            riskScore += 2
        } else if (server.performanceMetrics.successRate < 0.9) {
            riskScore += 1
        }

        // Recent failures = higher risk
        if (server.performanceMetrics.consecutiveFailures > 2) {
            riskScore += 2
        } else if (server.performanceMetrics.consecutiveFailures > 0) {
            riskScore += 1
        }

        if (riskScore >= 4) {
            return "high"
        }
        if (riskScore >= 2) {
            return "medium"
        }
        return "low"
    }

    /**
     * Record usage pattern for learning
     */
    recordUsagePattern(pattern: McpServerUsagePattern): void {
        this.usagePatterns.set(pattern.id, pattern)
    }

    /**
     * Initialize default capability mappings
     */
    private initializeCapabilityMappings(): void {
        this.capabilityMappings = [
            {
                capability: "documentation",
                keywords: ["docs", "documentation", "reference", "api", "guide"],
                toolNamePatterns: [".*doc.*", ".*search.*", ".*lookup.*"],
                descriptionPatterns: ["documentation", "reference", "api.*docs"],
                confidence: 0.9
            },
            {
                capability: "web-scraping",
                keywords: ["fetch", "scrape", "web", "http", "url", "download"],
                toolNamePatterns: [".*fetch.*", ".*scrape.*", ".*web.*"],
                descriptionPatterns: ["fetch.*content", "scrape.*web", "download.*page"],
                confidence: 0.85
            },
            {
                capability: "file-operations",
                keywords: ["file", "directory", "folder", "path", "filesystem"],
                toolNamePatterns: [".*file.*", ".*dir.*", ".*path.*"],
                descriptionPatterns: ["file.*operation", "filesystem", "directory"],
                confidence: 0.9
            },
            {
                capability: "search",
                keywords: ["search", "find", "query", "lookup", "grep"],
                toolNamePatterns: [".*search.*", ".*find.*", ".*query.*"],
                descriptionPatterns: ["search.*for", "find.*in", "query"],
                confidence: 0.85
            },
            {
                capability: "api-call",
                keywords: ["api", "rest", "graphql", "endpoint", "request"],
                toolNamePatterns: [".*api.*", ".*request.*", ".*call.*"],
                descriptionPatterns: ["api.*call", "rest.*request", "graphql"],
                confidence: 0.8
            }
        ]
    }

    /**
     * Get capability mappings for external use
     */
    getCapabilityMappings(): CapabilityMapping[] {
        return this.capabilityMappings
    }
}
