/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Intelligent Tool Selection System - Task Analyzer
 * MIT License
 */

import {
  TaskContext,
  ProjectContext,
  FileStructureMemory,
  UserPreferences,
  ActivityRecord,
  SessionRecord
} from "./types"

export class TaskAnalyzer {
  /**
   * Analyze user request to extract task context
   */
  async analyzeTask(
    userRequest: string,
    projectContext: ProjectContext,
    fileStructure: FileStructureMemory,
    userPreferences: UserPreferences,
    recentActivity: ActivityRecord[],
    sessionHistory: SessionRecord[]
  ): Promise<TaskContext> {
    return {
      userRequest,
      projectType: this.inferProjectType(projectContext),
      technologies: projectContext.technologies,
      fileStructure,
      recentActivity,
      userPreferences,
      sessionHistory
    }
  }

  /**
   * Infer project type from project context
   */
  private inferProjectType(projectContext: ProjectContext): string {
    const { technologies, frameworks, dependencies } = projectContext

    // Web development
    if (frameworks.includes("React") || frameworks.includes("Vue") || frameworks.includes("Angular")) {
      return "web-frontend"
    }
    if (frameworks.includes("Express") || frameworks.includes("Next.js")) {
      return "web-backend"
    }
    if (technologies.includes("JavaScript") || technologies.includes("TypeScript")) {
      return "web-development"
    }

    // Mobile development
    if (frameworks.includes("React Native") || frameworks.includes("Flutter")) {
      return "mobile-development"
    }

    // Data science
    if (technologies.includes("Python") && 
        (Object.keys(dependencies).some(dep => dep.includes("pandas") || dep.includes("numpy") || dep.includes("scikit-learn")))) {
      return "data-science"
    }

    // Machine learning
    if (Object.keys(dependencies).some(dep => dep.includes("tensorflow") || dep.includes("pytorch") || dep.includes("keras"))) {
      return "machine-learning"
    }

    // Desktop applications
    if (technologies.includes("C#") || technologies.includes("Java") || technologies.includes("C++")) {
      return "desktop-application"
    }

    // Systems programming
    if (technologies.includes("Rust") || technologies.includes("Go") || technologies.includes("C")) {
      return "systems-programming"
    }

    // DevOps/Infrastructure
    if (Object.keys(dependencies).some(dep => dep.includes("docker") || dep.includes("kubernetes") || dep.includes("terraform"))) {
      return "devops"
    }

    return "general-software"
  }

  /**
   * Extract key entities from user request
   */
  extractEntities(userRequest: string): {
    fileTypes: string[]
    technologies: string[]
    actions: string[]
    concepts: string[]
  } {
    const requestLower = userRequest.toLowerCase()
    
    const fileTypes = this.extractFileTypes(requestLower)
    const technologies = this.extractTechnologies(requestLower)
    const actions = this.extractActions(requestLower)
    const concepts = this.extractConcepts(requestLower)

    return { fileTypes, technologies, actions, concepts }
  }

  private extractFileTypes(request: string): string[] {
    const filePatterns = [
      { pattern: /\b\.js\b/, type: "javascript" },
      { pattern: /\b\.ts\b/, type: "typescript" },
      { pattern: /\b\.py\b/, type: "python" },
      { pattern: /\b\.java\b/, type: "java" },
      { pattern: /\b\.cpp\b|\b\.c\+\+\b/, type: "cpp" },
      { pattern: /\b\.c\b/, type: "c" },
      { pattern: /\b\.cs\b/, type: "csharp" },
      { pattern: /\b\.go\b/, type: "go" },
      { pattern: /\b\.rs\b/, type: "rust" },
      { pattern: /\b\.html\b/, type: "html" },
      { pattern: /\b\.css\b/, type: "css" },
      { pattern: /\b\.json\b/, type: "json" },
      { pattern: /\b\.xml\b/, type: "xml" },
      { pattern: /\b\.yaml\b|\b\.yml\b/, type: "yaml" },
      { pattern: /\b\.md\b/, type: "markdown" },
      { pattern: /\b\.sql\b/, type: "sql" },
      { pattern: /\b\.sh\b|\b\.bash\b/, type: "shell" },
      { pattern: /\b\.dockerfile\b/i, type: "docker" },
      { pattern: /\bpackage\.json\b/, type: "npm-package" },
      { pattern: /\brequirements\.txt\b/, type: "python-requirements" },
      { pattern: /\btsconfig\.json\b/, type: "typescript-config" },
      { pattern: /\bwebpack\.config\b/, type: "webpack-config" },
      { pattern: /\bvite\.config\b/, type: "vite-config" }
    ]

    const fileTypes: string[] = []
    for (const { pattern, type } of filePatterns) {
      if (pattern.test(request)) {
        fileTypes.push(type)
      }
    }

    return [...new Set(fileTypes)]
  }

  private extractTechnologies(request: string): string[] {
    const techKeywords = [
      { keywords: ["react", "reactjs"], tech: "React" },
      { keywords: ["vue", "vuejs"], tech: "Vue" },
      { keywords: ["angular"], tech: "Angular" },
      { keywords: ["express", "expressjs"], tech: "Express" },
      { keywords: ["next", "nextjs"], tech: "Next.js" },
      { keywords: ["node", "nodejs"], tech: "Node.js" },
      { keywords: ["typescript", "ts"], tech: "TypeScript" },
      { keywords: ["javascript", "js"], tech: "JavaScript" },
      { keywords: ["python", "py"], tech: "Python" },
      { keywords: ["java"], tech: "Java" },
      { keywords: ["cpp", "c++"], tech: "C++" },
      { keywords: ["csharp", "c#"], tech: "C#" },
      { keywords: ["go", "golang"], tech: "Go" },
      { keywords: ["rust", "rs"], tech: "Rust" },
      { keywords: ["docker"], tech: "Docker" },
      { keywords: ["kubernetes", "k8s"], tech: "Kubernetes" },
      { keywords: ["terraform"], tech: "Terraform" },
      { keywords: ["aws"], tech: "AWS" },
      { keywords: ["azure"], tech: "Azure" },
      { keywords: ["gcp", "google cloud"], tech: "GCP" },
      { keywords: ["mongodb", "mongo"], tech: "MongoDB" },
      { keywords: ["postgresql", "postgres"], tech: "PostgreSQL" },
      { keywords: ["mysql"], tech: "MySQL" },
      { keywords: ["redis"], tech: "Redis" },
      { keywords: ["tensorflow", "tf"], tech: "TensorFlow" },
      { keywords: ["pytorch"], tech: "PyTorch" },
      { keywords: ["pandas"], tech: "Pandas" },
      { keywords: ["numpy"], tech: "NumPy" },
      { keywords: ["scikit-learn", "sklearn"], tech: "Scikit-learn" }
    ]

    const technologies: string[] = []
    for (const { keywords, tech } of techKeywords) {
      if (keywords.some(keyword => request.includes(keyword))) {
        technologies.push(tech)
      }
    }

    return [...new Set(technologies)]
  }

  private extractActions(request: string): string[] {
    const actionKeywords = [
      { keywords: ["create", "make", "generate", "build", "add"], action: "create" },
      { keywords: ["read", "get", "fetch", "load", "retrieve"], action: "read" },
      { keywords: ["update", "modify", "change", "edit", "alter"], action: "update" },
      { keywords: ["delete", "remove", "destroy", "eliminate"], action: "delete" },
      { keywords: ["search", "find", "lookup", "locate"], action: "search" },
      { keywords: ["test", "verify", "validate", "check"], action: "test" },
      { keywords: ["deploy", "publish", "release", "ship"], action: "deploy" },
      { keywords: ["run", "execute", "start", "launch"], action: "execute" },
      { keywords: ["stop", "kill", "terminate", "shutdown"], action: "stop" },
      { keywords: ["install", "setup", "configure"], action: "install" },
      { keywords: ["analyze", "examine", "inspect", "review"], action: "analyze" },
      { keywords: ["debug", "fix", "repair", "resolve"], action: "debug" },
      { keywords: ["refactor", "improve", "optimize"], action: "refactor" },
      { keywords: ["document", "explain", "describe"], action: "document" },
      { keywords: ["monitor", "watch", "observe"], action: "monitor" },
      { keywords: ["backup", "save", "archive"], action: "backup" },
      { keywords: ["restore", "recover", "unarchive"], action: "restore" },
      { keywords: ["migrate", "move", "transfer"], action: "migrate" },
      { keywords: ["clone", "copy", "duplicate"], action: "clone" },
      { keywords: ["merge", "combine", "join"], action: "merge" }
    ]

    const actions: string[] = []
    for (const { keywords, action } of actionKeywords) {
      if (keywords.some(keyword => request.includes(keyword))) {
        actions.push(action)
      }
    }

    return [...new Set(actions)]
  }

  private extractConcepts(request: string): string[] {
    const conceptKeywords = [
      { keywords: ["api", "rest", "graphql"], concept: "api" },
      { keywords: ["database", "db", "sql", "nosql"], concept: "database" },
      { keywords: ["authentication", "auth", "login", "security"], concept: "authentication" },
      { keywords: ["ui", "user interface", "frontend", "client"], concept: "ui" },
      { keywords: ["backend", "server", "service"], concept: "backend" },
      { keywords: ["component", "module", "widget"], concept: "component" },
      { keywords: ["function", "method", "procedure"], concept: "function" },
      { keywords: ["class", "object", "instance"], concept: "class" },
      { keywords: ["config", "configuration", "settings"], concept: "configuration" },
      { keywords: ["test", "testing", "unit test", "integration test"], concept: "testing" },
      { keywords: ["build", "compile", "bundle"], concept: "build" },
      { keywords: ["deploy", "deployment", "production"], concept: "deployment" },
      { keywords: ["log", "logging", "monitoring"], concept: "logging" },
      { keywords: ["cache", "caching", "performance"], concept: "caching" },
      { keywords: ["error", "exception", "handling"], concept: "error-handling" },
      { keywords: ["validation", "verification", "checking"], concept: "validation" },
      { keywords: ["migration", "seeding", "database"], concept: "database-migration" },
      { keywords: ["documentation", "docs", "readme"], concept: "documentation" },
      { keywords: ["version", "vcs", "git", "svn"], concept: "version-control" },
      { keywords: ["package", "dependency", "library"], concept: "packaging" }
    ]

    const concepts: string[] = []
    for (const { keywords, concept } of conceptKeywords) {
      if (keywords.some(keyword => request.includes(keyword))) {
        concepts.push(concept)
      }
    }

    return [...new Set(concepts)]
  }

  /**
   * Determine task complexity based on request analysis
   */
  assessTaskComplexity(userRequest: string, entities: ReturnType<typeof this.extractEntities>): "low" | "medium" | "high" {
    let complexityScore = 0

    // Length-based complexity
    if (userRequest.length > 200) {complexityScore += 1}
    if (userRequest.length > 500) {complexityScore += 1}

    // Entity-based complexity
    complexityScore += Math.min(entities.technologies.length, 2)
    complexityScore += Math.min(entities.concepts.length, 2)
    complexityScore += Math.min(entities.actions.length, 1)

    // Complex action indicators
    const complexActions = ["deploy", "migrate", "refactor", "optimize", "integrate"]
    if (complexActions.some(action => entities.actions.includes(action))) {
      complexityScore += 2
    }

    // Multi-step indicators
    const multiStepIndicators = ["and then", "after that", "followed by", "next", "finally"]
    if (multiStepIndicators.some(indicator => userRequest.toLowerCase().includes(indicator))) {
      complexityScore += 1
    }

    // Complex concept indicators
    const complexConcepts = ["api", "database", "authentication", "deployment", "migration"]
    if (complexConcepts.some(concept => entities.concepts.includes(concept))) {
      complexityScore += 1
    }

    if (complexityScore <= 2) {return "low"}
    if (complexityScore <= 5) {return "medium"}
    return "high"
  }

  /**
   * Estimate task duration based on complexity and entities
   */
  estimateTaskDuration(
    complexity: "low" | "medium" | "high",
    entities: ReturnType<typeof this.extractEntities>
  ): number {
    const baseDurations = {
      low: 5 * 60 * 1000,      // 5 minutes
      medium: 15 * 60 * 1000,   // 15 minutes
      high: 45 * 60 * 1000      // 45 minutes
    }

    let duration = baseDurations[complexity]

    // Adjust based on number of technologies
    duration *= (1 + entities.technologies.length * 0.2)

    // Adjust based on number of actions
    duration *= (1 + entities.actions.length * 0.15)

    // Adjust based on complex concepts
    const complexConcepts = ["api", "database", "authentication", "deployment", "migration"]
    const complexConceptCount = entities.concepts.filter(c => complexConcepts.includes(c)).length
    duration *= (1 + complexConceptCount * 0.3)

    return Math.min(duration, 2 * 60 * 60 * 1000) // Cap at 2 hours
  }

  /**
   * Extract task patterns for learning
   */
  extractTaskPattern(userRequest: string, entities: ReturnType<typeof this.extractEntities>): string {
    const actions = entities.actions.slice(0, 3).join("+") || "unknown"
    const concepts = entities.concepts.slice(0, 2).join("+") || "general"
    const technologies = entities.technologies.slice(0, 2).join("+") || "any"

    return `${actions}:${concepts}:${technologies}`
  }

  /**
   * Determine if task requires specific tools
   */
  getRequiredToolTypes(entities: ReturnType<typeof this.extractEntities>): string[] {
    const requiredTools: string[] = []

    // File operations
    if (entities.fileTypes.length > 0 || entities.actions.includes("read") || entities.actions.includes("create")) {
      requiredTools.push("file-operations")
    }

    // Code analysis
    if (entities.technologies.length > 0 || entities.concepts.includes("component")) {
      requiredTools.push("code-analysis")
    }

    // System operations
    if (entities.actions.includes("execute") || entities.actions.includes("install")) {
      requiredTools.push("system-operations")
    }

    // Web operations
    if (entities.concepts.includes("api") || entities.technologies.includes("React") || entities.technologies.includes("Vue")) {
      requiredTools.push("web-services")
    }

    // Data operations
    if (entities.concepts.includes("database") || entities.technologies.includes("SQL")) {
      requiredTools.push("data-analysis")
    }

    return requiredTools
  }
}
