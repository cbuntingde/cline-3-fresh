# Context System and Settings Implementation Guide

This document provides a complete guide for implementing the context system and settings page that was added to the Cline extension. The context system manages conversation context to stay within model token limits while preserving important information.

## Overview

The context system consists of:
1. **ContextManager** - Core logic for managing conversation context
2. **Context Settings UI** - Settings page for configuring context behavior
3. **Context Optimization** - Intelligent truncation and optimization algorithms
4. **State Management** - Integration with extension state and persistence

## File Structure

### Core Context Management
```
src/core/context/
├── context-management/
│   ├── ContextManager.ts              # Main context management class
│   ├── ContextManager-legacy.ts       # Legacy context manager (deprecated)
│   ├── ContextMemoryOptimizer.ts      # Memory optimization utilities
│   ├── ContextWindowOptimizer.ts      # Window optimization logic
│   ├── context-window-utils.ts        # Context window utilities
│   ├── context-error-handling.ts      # Error handling for context operations
│   └── __tests__/
│       └── ContextManager.test.ts     # Unit tests
├── context-tracking/
│   ├── FileContextTracker.ts          # File context tracking
│   ├── ModelContextTracker.ts         # Model context tracking
│   └── ContextTrackerTypes.ts         # Type definitions
└── instructions/
    └── user-instructions/             # User instruction handling
```

### UI Components
```
webview-ui/src/components/settings/
└── ContextSettingsSection.tsx         # Context settings UI component
```

### State Management
```
src/core/storage/
├── state.ts                           # State management with context settings
└── state-keys.ts                      # State key definitions

webview-ui/src/context/
└── ExtensionStateContext.tsx          # React context with context settings
```

## Core Components

### 1. ContextManager Class

**Location**: `src/core/context/context-management/ContextManager.ts`

**Key Features**:
- Manages conversation context within token limits
- Implements intelligent truncation algorithms
- Provides context optimization (duplicate file read removal)
- Maintains context history for checkpointing
- Supports dynamic settings updates

**Key Methods**:
```typescript
class ContextManager {
  constructor(settings?: ContextSettings)
  
  // Main entry point for context management
  async getNewContextMessagesAndMetadata(
    apiConversationHistory: Anthropic.Messages.MessageParam[],
    clineMessages: ClineMessage[],
    api: ApiHandler,
    conversationHistoryDeletedRange: [number, number] | undefined,
    previousApiReqIndex: number,
    taskDirectory: string,
  )
  
  // Settings management
  updateSettings(newSettings: Partial<ContextSettings>): void
  getSettings(): Required<ContextSettings>
  
  // Truncation utilities
  getNextTruncationRange(
    apiMessages: Anthropic.Messages.MessageParam[],
    currentDeletedRange: [number, number] | undefined,
    keep: "none" | "lastTwo" | "half" | "quarter",
  ): [number, number]
  
  // Context optimization
  private applyContextOptimizations(
    apiMessages: Anthropic.Messages.MessageParam[],
    startFromIndex: number,
    timestamp: number,
  ): [boolean, Set<number>]
}
```

### 2. Context Settings Interface

**Location**: `src/core/context/context-management/ContextManager.ts`

```typescript
export interface ContextSettings {
  maxTokens?: number          // Total token budget for context window
  reserveTokens?: number      // Tokens reserved for model response generation
  recentMessagesPriority?: number  // Number of recent messages to always keep as high priority
  enableOptimization?: boolean     // Enable smart context optimization
  slidingWindowSize?: number       // Maximum number of messages to keep in sliding window mode
}

// Default values
const DEFAULT_CONTEXT_SETTINGS = {
  maxTokens: 200000,         // Claude 3.5 Sonnet default
  reserveTokens: 8000,       // Reserve for response
  recentMessagesPriority: 10, // Last 10 messages are high priority
  enableOptimization: true,   // Enable optimization by default
  slidingWindowSize: 50,      // 50 messages in sliding window
}
```

### 3. Context Settings UI Component

**Location**: `webview-ui/src/components/settings/ContextSettingsSection.tsx`

**Features**:
- Token limit configuration
- Optimization settings
- Real-time utilization display
- Priority level explanations
- Interactive tooltips

**Key UI Sections**:
1. **Token Limits**
   - Maximum Tokens (default: 200,000)
   - Reserve Tokens (default: 8,000)
   - Available for Context display

2. **Context Optimization**
   - Enable smart context optimization toggle
   - Recent Messages Priority Count
   - Sliding Window Size

3. **Priority Levels**
   - Critical (Priority: 4) - System prompts, first/last messages
   - High (Priority: 3) - Recent messages, tool use/results
   - Medium (Priority: 2) - Mid-conversation context
   - Low (Priority: 1) - Old messages, redundant info

## Integration Points

### 1. Extension State Integration

**State Keys** (`src/core/storage/state-keys.ts`):
```typescript
export type StateKey =
  | // ... other keys
  | "contextSettings"
  | // ... other keys
```

**State Management** (`src/core/storage/state.ts`):
```typescript
// In getAllExtensionState function
const [
  // ... other state
  contextSettings,
] = await Promise.all([
  // ... other state
  getGlobalState(context, "contextSettings") as Promise<
    | {
        maxTokens?: number
        reserveTokens?: number
        recentMessagesPriority?: number
        enableOptimization?: boolean
        slidingWindowSize?: number
      }
    | undefined
  >,
  // ... other state
])

// Default initialization
contextSettings: contextSettings || {
  maxTokens: 200000,
  reserveTokens: 8000,
  recentMessagesPriority: 10,
  enableOptimization: true,
  slidingWindowSize: 50,
},
```

### 2. React Context Integration

**Location**: `webview-ui/src/context/ExtensionStateContext.tsx`

```typescript
// Add to ExtensionState interface
contextSettings?: {
  maxTokens?: number
  reserveTokens?: number
  recentMessagesPriority?: number
  enableOptimization?: boolean
  slidingWindowSize?: number
}

// Add setter
setContextSettings: (value: ExtensionState["contextSettings"]) => void

// Implementation
setContextSettings: (value) =>
  setState((prevState) => ({
    ...prevState,
    contextSettings: value,
  })),
```

### 3. Settings View Integration

**Location**: `webview-ui/src/components/settings/SettingsView.tsx`

```typescript
// Import the component
import ContextSettingsSection from "./ContextSettingsSection"

// Add to SETTINGS_TABS
{
  id: "context",
  name: "Context",
  tooltipText: "Context Settings",
  headerText: "Context Settings",
  icon: Layers,
},

// Add state management
const [contextSettings, setContextSettings] = useState(
  contextSettingsFromState || {
    maxTokens: 200000,
    reserveTokens: 8000,
    recentMessagesPriority: 10,
    enableOptimization: true,
    slidingWindowSize: 50,
  },
)

// Add to tab content
{activeTab === "context" && (
  <div>
    {renderSectionHeader("context")}
    <Section>
      <ContextSettingsSection
        contextSettings={contextSettings}
        onContextSettingsChange={setContextSettings}
        clineMessages={clineMessages}
      />
    </Section>
  </div>
)}

// Include in settings submission
vscode.postMessage({
  type: "updateSettings",
  // ... other settings
  contextSettings,
  // ... other settings
})
```

### 4. Task Integration

**Location**: `src/core/task/index.ts`

```typescript
// Initialize ContextManager in Task constructor
this.contextManager = new ContextManager(contextSettings)

// Use in getNewContextMessagesAndMetadata
const {
  conversationHistoryDeletedRange,
  updatedConversationHistoryDeletedRange,
  truncatedConversationHistory,
} = await this.contextManager.getNewContextMessagesAndMetadata(
  apiConversationHistory,
  this.clineMessages,
  this.api,
  this.conversationHistoryDeletedRange,
  previousApiReqIndex,
  this.taskDir,
)
```

### 5. Message Handling

**Location**: `src/core/controller/index.ts`

```typescript
// Handle context settings updates
if (message.contextSettings) {
  await updateGlobalState(this.context, "contextSettings", message.contextSettings)
  // Update ContextManager if it exists
  if (this.task?.contextManager) {
    this.task.contextManager.updateSettings(message.contextSettings)
  }
}
```

## Context Optimization Algorithm

The context system implements several optimization strategies:

### 1. Duplicate File Read Removal
- Identifies multiple reads of the same file
- Replaces duplicate content with notices
- Preserves the most recent file read
- Handles both tool calls and file mentions

### 2. Priority-Based Truncation
- **Critical**: System prompts, first/last messages (Priority: 4)
- **High**: Recent messages, tool use/results (Priority: 3)
- **Medium**: Mid-conversation context (Priority: 2)
- **Low**: Old messages, redundant info (Priority: 1)

### 3. Sliding Window
- Maintains configurable window of recent messages
- Ensures conversation continuity
- Prevents complete context loss

### 4. Token-Aware Truncation
- Monitors token usage in real-time
- Truncates before hitting limits
- Considers model-specific context windows

## Context Window Utilities

**Location**: `src/core/context/context-management/context-window-utils.ts`

```typescript
export function getContextWindowInfo(api: ApiHandler) {
  let contextWindow = api.getModel().info.contextWindow || 128_000
  
  // Handle special cases like DeepSeek
  if (api instanceof OpenAiHandler && api.getModel().id.toLowerCase().includes("deepseek")) {
    contextWindow = 64_000
  }

  let maxAllowedSize: number
  switch (contextWindow) {
    case 64_000:   // deepseek models
      maxAllowedSize = contextWindow - 27_000
      break
    case 128_000:  // most models
      maxAllowedSize = contextWindow - 30_000
      break
    case 200_000:  // claude models
      maxAllowedSize = contextWindow - 40_000
      break
    default:
      maxAllowedSize = Math.max(contextWindow - 40_000, contextWindow * 0.8)
  }

  return { contextWindow, maxAllowedSize }
}
```

## Implementation Steps

### Step 1: Copy Core Files
1. Copy the entire `src/core/context/` directory
2. Copy `src/core/context/context-management/context-window-utils.ts`
3. Copy context-related state management files

### Step 2: Update State Management
1. Add `contextSettings` to state keys
2. Update state initialization with defaults
3. Add context settings to ExtensionState interface

### Step 3: Add UI Components
1. Copy `ContextSettingsSection.tsx` to settings components
2. Update `SettingsView.tsx` to include context tab
3. Add context settings to React context

### Step 4: Integrate with Task System
1. Initialize ContextManager in Task constructor
2. Update message processing to use context manager
3. Handle context settings updates in controller

### Step 5: Update Message Types
1. Add context settings to ExtensionMessage and WebviewMessage
2. Update proto definitions if using gRPC
3. Add context settings to API update messages

### Step 6: Add Tests
1. Copy ContextManager tests
2. Add integration tests for settings
3. Test context optimization scenarios

## Configuration

### Environment Variables
No specific environment variables required for the context system.

### Default Settings
```typescript
const DEFAULT_CONTEXT_SETTINGS = {
  maxTokens: 200000,         // Suitable for Claude 3.5 Sonnet
  reserveTokens: 8000,       // Adequate for most responses
  recentMessagesPriority: 10, // Balances context and recency
  enableOptimization: true,   // Recommended for all users
  slidingWindowSize: 50,      // Good balance for most conversations
}
```

### Model-Specific Adjustments
The system automatically adjusts for different models:
- **Claude models**: 200K context, 40K buffer
- **Most models**: 128K context, 30K buffer
- **DeepSeek**: 64K context, 27K buffer

## Best Practices

### 1. Token Management
- Monitor token usage regularly
- Adjust reserve tokens based on model response patterns
- Consider model-specific context windows

### 2. Optimization Settings
- Enable optimization for better performance
- Adjust priority count based on conversation patterns
- Use sliding window for long conversations

### 3. Error Handling
- Implement proper error handling for context operations
- Provide user feedback for context limit issues
- Graceful degradation when optimization fails

### 4. Performance
- Cache processed messages when possible
- Use efficient algorithms for large conversations
- Monitor memory usage in long-running sessions

## Troubleshooting

### Common Issues

1. **Context Window Errors**
   - Check maxTokens setting for model compatibility
   - Verify reserveTokens is adequate for response size
   - Ensure optimization is enabled

2. **Performance Issues**
   - Reduce slidingWindowSize for very long conversations
   - Check for memory leaks in context history
   - Monitor cache hit rates

3. **Settings Not Persisting**
   - Verify state key is properly registered
   - Check global state storage permissions
   - Ensure settings are included in update messages

### Debug Information

Enable debug logging to monitor context operations:
```typescript
console.log("Context settings updated:", newSettings)
console.log("Context optimization applied:", optimizationResults)
console.log("Token utilization:", utilizationMetrics)
```

## Future Enhancements

### Potential Improvements
1. **Semantic Context Analysis**: Use embeddings to identify important context
2. **Dynamic Priority Adjustment**: Adjust priorities based on conversation content
3. **Multi-Model Context**: Different strategies for different model types
4. **Context Compression**: Summarization-based context reduction
5. **User Feedback Integration**: Learn from user truncation preferences

### Extension Points
- Custom optimization strategies
- Additional priority levels
- Model-specific context handlers
- Advanced token counting methods

---

This document provides a comprehensive foundation for implementing the context system in a new extension. The system is designed to be modular, configurable, and extensible to support various use cases and model types.
