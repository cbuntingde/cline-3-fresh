/**
 * Utility functions for working with Protocol Buffers
 */

/**
 * Converts a protobuf int64 value to a JavaScript number
 * @param int64 The protobuf int64 value with toString method
 * @returns The converted number
 */
export function longToNumber(int64: { toString(): string }): number {
	const num = globalThis.Number(int64.toString())
	
	if (globalThis.isNaN(num)) {
		return 0
	}
	
	if (num > globalThis.Number.MAX_SAFE_INTEGER) {
		return globalThis.Number.MAX_SAFE_INTEGER
	}
	
	if (num < globalThis.Number.MIN_SAFE_INTEGER) {
		return globalThis.Number.MIN_SAFE_INTEGER
	}
	
	return num
}

/**
 * Converts a protobuf int64 value to a JavaScript string
 * This is safer for very large numbers that exceed Number.MAX_SAFE_INTEGER
 * @param int64 The protobuf int64 value with toString method
 * @returns The string representation
 */
export function longToString(int64: { toString(): string }): string {
	return int64.toString()
}

/**
 * Safely converts a protobuf int64 to either number or string based on size
 * @param int64 The protobuf int64 value with toString method
 * @returns Number if within safe range, otherwise string
 */
export function longToSafeNumber(int64: { toString(): string }): number | string {
	const num = globalThis.Number(int64.toString())
	
	if (globalThis.isNaN(num)) {
		return 0
	}
	
	if (num > globalThis.Number.MAX_SAFE_INTEGER || num < globalThis.Number.MIN_SAFE_INTEGER) {
		return int64.toString()
	}
	
	return num
}
