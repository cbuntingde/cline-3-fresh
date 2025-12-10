/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Memory statistics component for AI learning system
 * MIT License
 */

import React from 'react'
import { Brain, TrendingUp, Clock, HardDrive } from 'lucide-react'

interface MemoryStatsProps {
	stats: {
		total_memories: number
		patterns_by_type: Record<string, number>
		conversation_count: number
		project_count: number
		last_updated: number
		memory_usage: number
	}
}

export const MemoryStats: React.FC<MemoryStatsProps> = ({ stats }) => {
	const formatBytes = (bytes: number): string => {
		if (bytes === 0) return '0 Bytes'
		const k = 1024
		const sizes = ['Bytes', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
	}

	const formatDate = (timestamp: number): string => {
		return new Date(timestamp).toLocaleString()
	}

	const getPatternTypeLabel = (type: string): string => {
		switch (type) {
			case 'code_pattern':
				return 'Code Patterns'
			case 'user_preference':
				return 'User Preferences'
			case 'error_solution':
				return 'Error Solutions'
			case 'project_convention':
				return 'Project Conventions'
			default:
				return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
		}
	}

	const getTotalPatterns = (): number => {
		return Object.values(stats.patterns_by_type).reduce((sum, count) => sum + count, 0)
	}

	return (
		<div className="space-y-4">
			{/* Summary Cards */}
			<div className="grid grid-cols-2 gap-3">
				<div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
					<div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
						<Brain size={16} />
						<span className="text-sm font-medium">Total Memories</span>
					</div>
					<div className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
						{stats.total_memories}
					</div>
				</div>

				<div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
					<div className="flex items-center gap-2 text-green-600 dark:text-green-400">
						<TrendingUp size={16} />
						<span className="text-sm font-medium">Patterns</span>
					</div>
					<div className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">
						{getTotalPatterns()}
					</div>
				</div>

				<div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
					<div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
						<Brain size={16} />
						<span className="text-sm font-medium">Conversations</span>
					</div>
					<div className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">
						{stats.conversation_count}
					</div>
				</div>

				<div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
					<div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
						<HardDrive size={16} />
						<span className="text-sm font-medium">Storage</span>
					</div>
					<div className="text-2xl font-bold text-orange-900 dark:text-orange-100 mt-1">
						{formatBytes(stats.memory_usage)}
					</div>
				</div>
			</div>

			{/* Pattern Breakdown */}
			<div className="space-y-2">
				<h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
					Memory Types
				</h4>
				<div className="space-y-2">
					{Object.entries(stats.patterns_by_type).map(([type, count]) => (
						<div key={type} className="flex items-center justify-between">
							<span className="text-sm text-gray-600 dark:text-gray-400">
								{getPatternTypeLabel(type)}
							</span>
							<div className="flex items-center gap-2">
								<div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
									<div
										className="bg-blue-500 h-2 rounded-full"
										style={{
											width: `${getTotalPatterns() > 0 ? (count / getTotalPatterns()) * 100 : 0}%`
										}}
									></div>
								</div>
								<span className="text-sm font-medium text-gray-900 dark:text-gray-100 w-8 text-right">
									{count}
								</span>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Additional Info */}
			<div className="pt-3 border-t border-gray-200 dark:border-gray-700">
				<div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
					<div className="flex items-center gap-1">
						<Clock size={12} />
						<span>Last updated</span>
					</div>
					<span>{formatDate(stats.last_updated)}</span>
				</div>
				<div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mt-1">
					<span>Projects</span>
					<span>{stats.project_count}</span>
				</div>
			</div>
		</div>
	)
}
