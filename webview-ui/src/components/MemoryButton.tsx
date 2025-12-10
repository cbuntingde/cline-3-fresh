/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Memory button component for AI learning system
 * MIT License
 */

import React, { useState, useEffect } from 'react'
import { Brain, Settings, BarChart3 } from 'lucide-react'
import { MemoryStats } from './MemoryStats'

interface MemoryButtonProps {
	className?: string
}

export const MemoryButton: React.FC<MemoryButtonProps> = ({ className = '' }) => {
	const [showStats, setShowStats] = useState(false)
	const [memoryStats, setMemoryStats] = useState<any>(null)
	const [loading, setLoading] = useState(false)

	const fetchMemoryStats = async () => {
		try {
			setLoading(true)
			// This would make a gRPC call to get memory stats
			// For now, we'll simulate with mock data
			const mockStats = {
				total_memories: 42,
				patterns_by_type: {
					code_pattern: 15,
					user_preference: 8,
					error_solution: 12,
					project_convention: 7
				},
				conversation_count: 25,
				project_count: 3,
				last_updated: Date.now(),
				memory_usage: 1024 * 512 // 512KB
			}
			setMemoryStats(mockStats)
		} catch (error) {
			console.error('Failed to fetch memory stats:', error)
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		if (showStats) {
			fetchMemoryStats()
		}
	}, [showStats])

	return (
		<div className={`relative ${className}`}>
			<button
				onClick={() => setShowStats(!showStats)}
				className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
				title="AI Memory & Learning"
			>
				<Brain size={16} />
				<span>Memory</span>
				<BarChart3 size={14} />
			</button>

			{showStats && (
				<div className="absolute top-full right-0 mt-2 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
					<div className="p-4">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
								AI Memory & Learning
							</h3>
							<button
								onClick={() => setShowStats(false)}
								className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
							>
								×
							</button>
						</div>

						{loading ? (
							<div className="flex items-center justify-center py-8">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
							</div>
						) : memoryStats ? (
							<MemoryStats stats={memoryStats} />
						) : (
							<div className="text-center py-8 text-gray-500 dark:text-gray-400">
								No memory data available
							</div>
						)}

						<div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
							<button className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300">
								<Settings size={14} />
								<span>Memory Settings</span>
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
