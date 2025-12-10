/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Intelligent Tool Selection System - Project Context Provider
 * MIT License
 */

import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs/promises"
import {
  ProjectContext,
  FileStructureMemory,
  ActivityRecord,
  SessionRecord,
  UserPreferences
} from "./types"

export interface ProjectAnalysisResult {
  projectContext: ProjectContext
  fileStructure: FileStructureMemory
  confidence: number
  analysisTime: number
}

export class ProjectContextProvider {
  private readonly context: vscode.ExtensionContext
  private readonly outputChannel: vscode.OutputChannel
  private readonly workspaceRoot: string | undefined
  private fileChangeWatcher: vscode.FileSystemWatcher | null = null
  private activityBuffer: ActivityRecord[] = []
  private currentSession: SessionRecord | null = null

  constructor(
    context: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel
  ) {
    this.context = context
    this.outputChannel = outputChannel
    this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
    this.initializeFileWatcher()
    this.initializeSessionTracking()
  }

  /**
   * Analyze the current project and provide comprehensive context
   */
  async analyzeProject(): Promise<ProjectAnalysisResult> {
    const startTime = Date.now()

    try {
      if (!this.workspaceRoot) {
        throw new Error("No workspace folder found")
      }

      this.outputChannel.appendLine(`Starting project analysis for: ${this.workspaceRoot}`)

      // Analyze project structure and configuration
      const projectContext = await this.buildProjectContext()
      const fileStructure = await this.analyzeFileStructure()

      const analysisTime = Date.now() - startTime
      const confidence = this.calculateAnalysisConfidence(projectContext, fileStructure)

      this.outputChannel.appendLine(`Project analysis completed in ${analysisTime}ms (confidence: ${(confidence * 100).toFixed(1)}%)`)

      return {
        projectContext,
        fileStructure,
        confidence,
        analysisTime
      }

    } catch (error) {
      this.outputChannel.appendLine(`Project analysis failed: ${error}`)
      throw error
    }
  }

  /**
   * Get real-time project context with caching
   */
  async getProjectContext(forceRefresh: boolean = false): Promise<ProjectAnalysisResult> {
    const cacheKey = "project_context"
    const cachedData = this.context.globalState.get<ProjectAnalysisResult>(cacheKey)

    // Return cached data if not expired and not forcing refresh
    if (!forceRefresh && cachedData && (Date.now() - cachedData.analysisTime) < 5 * 60 * 1000) {
      return cachedData
    }

    // Perform fresh analysis
    const result = await this.analyzeProject()
    
    // Cache the result
    await this.context.globalState.update(cacheKey, result)

    return result
  }

  /**
   * Update project context based on file changes
   */
  async updateProjectContext(filePath: string, changeType: "create" | "modify" | "delete"): Promise<void> {
    try {
      const currentContext = await this.getProjectContext()
      
      // Update file structure based on change
      if (changeType === "delete") {
        currentContext.fileStructure.importantFiles = currentContext.fileStructure.importantFiles.filter(
          f => f !== filePath
        )
        currentContext.fileStructure.frequentlyModified = currentContext.fileStructure.frequentlyModified.filter(
          f => f !== filePath
        )
      } else {
        // Add or update file in structure
        if (!currentContext.fileStructure.importantFiles.includes(filePath)) {
          currentContext.fileStructure.importantFiles.push(filePath)
        }
        
        // Update frequently modified list
        const freqIndex = currentContext.fileStructure.frequentlyModified.indexOf(filePath)
        if (freqIndex > 0) {
          // Move to front (most recent)
          currentContext.fileStructure.frequentlyModified.splice(freqIndex, 1)
          currentContext.fileStructure.frequentlyModified.unshift(filePath)
        } else if (freqIndex === -1) {
          currentContext.fileStructure.frequentlyModified.unshift(filePath)
          // Keep only top 20
          if (currentContext.fileStructure.frequentlyModified.length > 20) {
            currentContext.fileStructure.frequentlyModified = currentContext.fileStructure.frequentlyModified.slice(0, 20)
          }
        }
      }

      // Update cache
      await this.context.globalState.update("project_context", currentContext)

      this.outputChannel.appendLine(`Project context updated for ${changeType}: ${filePath}`)

    } catch (error) {
      this.outputChannel.appendLine(`Failed to update project context: ${error}`)
    }
  }

  /**
   * Record user activity for context learning
   */
  recordActivity(activity: Omit<ActivityRecord, "timestamp">): void {
    const fullActivity: ActivityRecord = {
      ...activity,
      timestamp: Date.now()
    }

    this.activityBuffer.push(fullActivity)

    // Keep only recent activities (last 100)
    if (this.activityBuffer.length > 100) {
      this.activityBuffer = this.activityBuffer.slice(-100)
    }

    // Update current session
    if (this.currentSession) {
      if (activity.type === "tool_use") {
        this.currentSession.toolsUsed.push(activity.description.split(" ")[0] || "unknown")
      }
      this.currentSession.tasks.push(activity.description)
    }
  }

  /**
   * Get recent user activities
   */
  getRecentActivities(limit: number = 20): ActivityRecord[] {
    return this.activityBuffer.slice(-limit)
  }

  /**
   * Get current session information
   */
  getCurrentSession(): SessionRecord | null {
    return this.currentSession
  }

  /**
   * End current session and start a new one
   */
  async startNewSession(): Promise<void> {
    if (this.currentSession) {
      this.currentSession.endTime = Date.now()
      // Store session in context for learning
      const sessions = this.context.globalState.get<SessionRecord[]>("session_history") || []
      sessions.push(this.currentSession)
      
      // Keep only last 50 sessions
      if (sessions.length > 50) {
        sessions.splice(0, sessions.length - 50)
      }
      
      await this.context.globalState.update("session_history", sessions)
    }

    // Start new session
    this.currentSession = {
      id: this.generateSessionId(),
      startTime: Date.now(),
      tasks: [],
      toolsUsed: [],
      success: true
    }

    this.outputChannel.appendLine(`Started new session: ${this.currentSession.id}`)
  }

  /**
   * Get user preferences from VSCode settings
   */
  async getUserPreferences(): Promise<UserPreferences> {
    const config = vscode.workspace.getConfiguration('cline')
    
    return {
      codingStyle: config.get<string>('codingStyle') || "functional",
      commentingStyle: config.get<string>('commentingStyle') || "detailed",
      namingConventions: config.get<string[]>('namingConventions') || ["camelCase", "PascalCase"],
      preferredLibraries: config.get<string[]>('preferredLibraries') || [],
      avoidancePatterns: config.get<string[]>('avoidancePatterns') || [],
      communicationStyle: config.get<string>('communicationStyle') || "professional"
    }
  }

  /**
   * Detect project type based on files and configuration
   */
  private async detectProjectType(projectPath: string): Promise<string> {
    const indicators = {
      "web-frontend": ["package.json", "webpack.config.js", "vite.config.ts", "next.config.js", "angular.json"],
      "web-backend": ["package.json", "server.js", "app.js", "main.py", "Dockerfile"],
      "mobile-development": ["package.json", "ionic.config.json", "pubspec.yaml", "android/", "ios/"],
      "desktop-application": ["CMakeLists.txt", "Cargo.toml", "pom.xml", ".csproj", "setup.py"],
      "data-science": ["requirements.txt", "environment.yml", "Jupyterfile", "notebooks/", "data/"],
      "machine-learning": ["requirements.txt", "model.py", "train.py", "checkpoints/", "mlflow.yml"],
      "devops": ["Dockerfile", "docker-compose.yml", "k8s/", "terraform/", ".github/workflows/"],
      "game-development": ["UnityProject/", "Assets/", "ProjectSettings/", "main.cpp", "CMakeLists.txt"]
    }

    try {
      const files = await fs.readdir(projectPath, { withFileTypes: true })
      const fileNames = files.map(f => f.name)

      for (const [projectType, indicatorFiles] of Object.entries(indicators)) {
        const matchCount = indicatorFiles.filter(indicator => 
          fileNames.some(file => file.includes(indicator))
        ).length

        if (matchCount >= 2) {
          return projectType
        }
      }

      return "general-software"
    } catch (error) {
      return "unknown"
    }
  }

  /**
   * Extract technologies from project files
   */
  private async extractTechnologies(projectPath: string): Promise<string[]> {
    const technologies: string[] = []

    try {
      // Check package.json for Node.js projects
      const packageJsonPath = path.join(projectPath, "package.json")
      try {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'))
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
        
        if (deps.react) {technologies.push("React")}
        if (deps.vue) {technologies.push("Vue")}
        if (deps.angular) {technologies.push("Angular")}
        if (deps.next) {technologies.push("Next.js")}
        if (deps.express) {technologies.push("Express")}
        if (deps.typescript) {technologies.push("TypeScript")}
        if (deps["@types/node"]) {technologies.push("Node.js")}
      } catch {
        // package.json doesn't exist or is invalid
      }

      // Check for Python files
      try {
        const pythonFiles = await this.findFilesByExtension(projectPath, ".py")
        if (pythonFiles.length > 0) {
          technologies.push("Python")
          
          // Check for specific Python frameworks
          const requirementsPath = path.join(projectPath, "requirements.txt")
          try {
            const requirements = await fs.readFile(requirementsPath, 'utf-8')
            if (requirements.includes("django")) {technologies.push("Django")}
            if (requirements.includes("flask")) {technologies.push("Flask")}
            if (requirements.includes("fastapi")) {technologies.push("FastAPI")}
            if (requirements.includes("tensorflow")) {technologies.push("TensorFlow")}
            if (requirements.includes("pytorch")) {technologies.push("PyTorch")}
          } catch {
            // requirements.txt doesn't exist
          }
        }
      } catch {
        // Error finding Python files
      }

      // Check for other language files
      const extensions = {
        ".java": "Java",
        ".cpp": "C++",
        ".c": "C",
        ".cs": "C#",
        ".go": "Go",
        ".rs": "Rust",
        ".php": "PHP",
        ".rb": "Ruby"
      }

      for (const [ext, lang] of Object.entries(extensions)) {
        try {
          const files = await this.findFilesByExtension(projectPath, ext)
          if (files.length > 0) {
            technologies.push(lang)
          }
        } catch {
          // Error finding files for this extension
        }
      }

    } catch (error) {
      this.outputChannel.appendLine(`Error extracting technologies: ${error}`)
    }

    return [...new Set(technologies)]
  }

  /**
   * Extract frameworks from project configuration
   */
  private async extractFrameworks(projectPath: string): Promise<string[]> {
    const frameworks: string[] = []

    try {
      // Check for various framework indicators
      const frameworkFiles = [
        { file: "next.config.js", framework: "Next.js" },
        { file: "nuxt.config.js", framework: "Nuxt.js" },
        { file: "angular.json", framework: "Angular" },
        { file: "vue.config.js", framework: "Vue.js" },
        { file: "gatsby-config.js", framework: "Gatsby" },
        { file: "svelte.config.js", framework: "Svelte" },
        { file: "tailwind.config.js", framework: "Tailwind CSS" },
        { file: "webpack.config.js", framework: "Webpack" },
        { file: "vite.config.ts", framework: "Vite" },
        { file: "rollup.config.js", framework: "Rollup" },
        { file: "jest.config.js", framework: "Jest" },
        { file: "cypress.config.js", framework: "Cypress" },
        { file: "docker-compose.yml", framework: "Docker Compose" },
        { file: "terraform.tf", framework: "Terraform" }
      ]

      for (const { file, framework } of frameworkFiles) {
        try {
          await fs.access(path.join(projectPath, file))
          frameworks.push(framework)
        } catch {
          // File doesn't exist
        }
      }

    } catch (error) {
      this.outputChannel.appendLine(`Error extracting frameworks: ${error}`)
    }

    return frameworks
  }

  /**
   * Extract dependencies from package managers
   */
  private async extractDependencies(projectPath: string): Promise<Record<string, string>> {
    const dependencies: Record<string, string> = {}

    try {
      // Node.js dependencies
      const packageJsonPath = path.join(projectPath, "package.json")
      try {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'))
        Object.assign(dependencies, packageJson.dependencies || {})
        Object.assign(dependencies, packageJson.devDependencies || {})
      } catch {
        // package.json doesn't exist
      }

      // Python dependencies
      const requirementsPath = path.join(projectPath, "requirements.txt")
      try {
        const requirements = await fs.readFile(requirementsPath, 'utf-8')
        requirements.split('\n').forEach(line => {
          const match = line.match(/^([a-zA-Z0-9\-_]+)[=<>!]*([0-9.]*)/)
          if (match) {
            dependencies[match[1]] = match[2] || "latest"
          }
        })
      } catch {
        // requirements.txt doesn't exist
      }

    } catch (error) {
      this.outputChannel.appendLine(`Error extracting dependencies: ${error}`)
    }

    return dependencies
  }

  /**
   * Analyze file structure for important files and patterns
   */
  private async analyzeFileStructure(): Promise<FileStructureMemory> {
    if (!this.workspaceRoot) {
      return {
        importantFiles: [],
        frequentlyModified: [],
        filePurposes: {},
        directories: [],
        entryPoints: []
      }
    }

    try {
      const importantFiles: string[] = []
      const filePurposes: Record<string, string> = {}
      const directories: string[] = []
      const entryPoints: string[] = []

      // Walk through project directory
      await this.walkDirectory(this.workspaceRoot, "", (filePath, relativePath, isDirectory) => {
        if (isDirectory) {
          directories.push(relativePath)
          return
        }

        const fileName = path.basename(filePath)
        const relativeFileName = path.relative(this.workspaceRoot!, filePath)

        // Identify important files
        const importantPatterns = [
          "package.json", "tsconfig.json", "webpack.config.js", "vite.config.ts",
          "README.md", "CHANGELOG.md", "LICENSE", ".gitignore", ".env.example",
          "Dockerfile", "docker-compose.yml", "requirements.txt", "Pipfile",
          "Cargo.toml", "pom.xml", "build.gradle", "CMakeLists.txt",
          "main.js", "index.js", "app.js", "server.js", "main.py", "app.py",
          "index.html", "App.vue", "App.tsx", "main.tsx"
        ]

        if (importantPatterns.some(pattern => fileName.includes(pattern))) {
          importantFiles.push(relativeFileName)
        }

        // Identify file purposes
        if (fileName.includes("config")) {
          filePurposes[relativeFileName] = "configuration"
        } else if (fileName.includes("test") || fileName.includes("spec")) {
          filePurposes[relativeFileName] = "testing"
        } else if (fileName.includes("readme") || fileName.includes("doc")) {
          filePurposes[relativeFileName] = "documentation"
        } else if (fileName === "package.json" || fileName === "requirements.txt") {
          filePurposes[relativeFileName] = "dependencies"
        } else if (fileName === "main" || fileName === "index" || fileName === "app") {
          filePurposes[relativeFileName] = "entry point"
          entryPoints.push(relativeFileName)
        }

        // Limit depth to avoid scanning too deep
        return relativePath.split('/').length < 5
      })

      // Get frequently modified files from recent activity
      const frequentlyModified = this.getRecentActivities()
        .filter(activity => activity.type === "file_edit")
        .slice(0, 10)
        .map(activity => activity.description.replace("Edited ", ""))

      return {
        importantFiles,
        frequentlyModified,
        filePurposes,
        directories,
        entryPoints
      }

    } catch (error) {
      this.outputChannel.appendLine(`Error analyzing file structure: ${error}`)
      return {
        importantFiles: [],
        frequentlyModified: [],
        filePurposes: {},
        directories: [],
        entryPoints: []
      }
    }
  }

  /**
   * Build comprehensive project context
   */
  private async buildProjectContext(): Promise<ProjectContext> {
    if (!this.workspaceRoot) {
      throw new Error("No workspace folder available")
    }

    const projectType = await this.detectProjectType(this.workspaceRoot)
    const technologies = await this.extractTechnologies(this.workspaceRoot)
    const frameworks = await this.extractFrameworks(this.workspaceRoot)
    const dependencies = await this.extractDependencies(this.workspaceRoot)

    // Extract build tools from dependencies and frameworks
    const buildTools = frameworks.filter(f => 
      ["Webpack", "Vite", "Rollup", "Parcel", "esbuild"].includes(f)
    )

    // Extract testing frameworks
    const testingFrameworks = frameworks.filter(f => 
      ["Jest", "Mocha", "Cypress", "Playwright", "Vitest"].includes(f)
    )

    // Extract coding standards from configuration files
    const codingStandards = await this.extractCodingStandards()

    // Extract architecture patterns
    const architecture = await this.extractArchitecturePatterns()

    return {
      projectPath: this.workspaceRoot,
      projectType,
      technologies,
      frameworks,
      dependencies,
      buildTools,
      testingFrameworks,
      codingStandards,
      architecture
    }
  }

  /**
   * Extract coding standards from configuration files
   */
  private async extractCodingStandards(): Promise<string[]> {
    const standards: string[] = []

    if (!this.workspaceRoot) {return standards}

    try {
      // Check for ESLint configuration
      const eslintFiles = [".eslintrc.js", ".eslintrc.json", "eslint.config.js"]
      for (const file of eslintFiles) {
        try {
          await fs.access(path.join(this.workspaceRoot, file))
          standards.push("eslint")
          break
        } catch {
          // File doesn't exist
        }
      }

      // Check for Prettier configuration
      const prettierFiles = [".prettierrc", ".prettierrc.json", "prettier.config.js"]
      for (const file of prettierFiles) {
        try {
          await fs.access(path.join(this.workspaceRoot, file))
          standards.push("prettier")
          break
        } catch {
          // File doesn't exist
        }
      }

      // Check for TypeScript configuration
      try {
        await fs.access(path.join(this.workspaceRoot, "tsconfig.json"))
        standards.push("typescript")
      } catch {
        // tsconfig.json doesn't exist
      }

    } catch (error) {
      this.outputChannel.appendLine(`Error extracting coding standards: ${error}`)
    }

    return standards
  }

  /**
   * Extract architecture patterns from project structure
   */
  private async extractArchitecturePatterns(): Promise<string[]> {
    const patterns: string[] = []

    if (!this.workspaceRoot) {return patterns}

    try {
      const directories = await fs.readdir(this.workspaceRoot, { withFileTypes: true })
      const dirNames = directories.filter(d => d.isDirectory()).map(d => d.name)

      // Detect common architecture patterns
      if (dirNames.includes("src") && dirNames.includes("components")) {
        patterns.push("component-based")
      }

      if (dirNames.includes("controllers") && dirNames.includes("models") && dirNames.includes("views")) {
        patterns.push("mvc")
      }

      if (dirNames.includes("services") && dirNames.includes("repositories")) {
        patterns.push("layered-architecture")
      }

      if (dirNames.includes("store") || dirNames.includes("redux")) {
        patterns.push("state-management")
      }

      if (dirNames.includes("hooks") || dirNames.includes("composables")) {
        patterns.push("composable-architecture")
      }

    } catch (error) {
      this.outputChannel.appendLine(`Error extracting architecture patterns: ${error}`)
    }

    return patterns
  }

  /**
   * Calculate confidence score for analysis results
   */
  private calculateAnalysisConfidence(
    projectContext: ProjectContext,
    fileStructure: FileStructureMemory
  ): number {
    let confidence = 0.5 // Base confidence

    // Boost confidence based on data completeness
    if (projectContext.technologies.length > 0) {confidence += 0.1}
    if (projectContext.frameworks.length > 0) {confidence += 0.1}
    if (Object.keys(projectContext.dependencies).length > 0) {confidence += 0.1}
    if (fileStructure.importantFiles.length > 5) {confidence += 0.1}
    if (fileStructure.entryPoints.length > 0) {confidence += 0.1}

    return Math.min(confidence, 1.0)
  }

  /**
   * Initialize file system watcher for real-time updates
   */
  private initializeFileWatcher(): void {
    if (!this.workspaceRoot) {return}

    this.fileChangeWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(this.workspaceRoot, "**/*")
    )

    this.fileChangeWatcher.onDidChange(async (uri) => {
      await this.updateProjectContext(uri.fsPath, "modify")
    })

    this.fileChangeWatcher.onDidCreate(async (uri) => {
      await this.updateProjectContext(uri.fsPath, "create")
    })

    this.fileChangeWatcher.onDidDelete(async (uri) => {
      await this.updateProjectContext(uri.fsPath, "delete")
    })

    this.outputChannel.appendLine("File system watcher initialized")
  }

  /**
   * Initialize session tracking
   */
  private initializeSessionTracking(): void {
    this.startNewSession()

    // Auto-end session after inactivity
    vscode.workspace.onDidChangeTextDocument(() => {
      if (this.currentSession && typeof this.currentSession.startTime === 'number' && 
          (Date.now() - this.currentSession.startTime) > 2 * 60 * 60 * 1000) {
        this.startNewSession()
      }
    })
  }

  /**
   * Walk directory recursively
   */
  private async walkDirectory(
    rootPath: string,
    relativePath: string,
    callback: (filePath: string, relativePath: string, isDirectory: boolean) => boolean | void
  ): Promise<void> {
    try {
      const fullPath = path.join(rootPath, relativePath)
      const entries = await fs.readdir(fullPath, { withFileTypes: true })

      for (const entry of entries) {
        const entryRelativePath = path.join(relativePath, entry.name)
        const entryFullPath = path.join(fullPath, entry.name)

        if (entry.isDirectory()) {
          // Skip common ignore directories
          if (["node_modules", ".git", "dist", "build", "target", "__pycache__"].includes(entry.name)) {
            continue
          }

          const shouldContinue = callback(entryFullPath, entryRelativePath, true)
          if (shouldContinue === false) {continue}

          await this.walkDirectory(rootPath, entryRelativePath, callback)
        } else {
          callback(entryFullPath, entryRelativePath, false)
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  /**
   * Find files by extension
   */
  private async findFilesByExtension(rootPath: string, extension: string): Promise<string[]> {
    const files: string[] = []

    await this.walkDirectory(rootPath, "", (filePath, relativePath, isDirectory) => {
      if (!isDirectory && filePath.endsWith(extension)) {
        files.push(relativePath)
      }
    })

    return files
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.fileChangeWatcher) {
      this.fileChangeWatcher.dispose()
    }
  }
}
