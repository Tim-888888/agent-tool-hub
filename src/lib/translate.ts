const GLM_API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
const DEFAULT_MODEL = "glm-4-flash"

interface TranslationResult {
  descriptionZh: string | null
  featuresZh: string[]
}

export interface CollectionContentResult {
  featuresEn: string[]
  featuresZh: string[]
  installGuideEn: string
  installGuideZh: string
}

/**
 * Generate descriptive features and install guide for collection/awesome-list tools.
 * Called when extractFeatures returns empty (e.g. awesome-list repos).
 * Uses GLM to read the README and generate language-separated content.
 */
export async function generateCollectionContent(
  repoName: string,
  description: string,
  repoUrl: string,
  readmeContent: string | null,
): Promise<CollectionContentResult> {
  const apiKey = process.env.GLM_API_KEY
  if (!apiKey) {
    return fallbackCollectionContent(repoName, description, repoUrl)
  }

  const readmeSnippet = readmeContent
    ? readmeContent.slice(0, 3000)
    : ""

  const systemPrompt = `You are an expert at writing concise, user-friendly tool descriptions for a developer tools directory (similar to Product Hunt or npms.io).

You will be given a GitHub repository that is a curated collection / awesome-list of developer tools. Your job is to generate structured content for the tool's detail page.

OUTPUT FORMAT — return a single JSON object with these fields:
{
  "featuresEn": ["short feature 1", "short feature 2", ...],
  "featuresZh": ["中文特性 1", "中文特性 2", ...],
  "installGuideEn": "markdown string for English users",
  "installGuideZh": "markdown string for Chinese users"
}

RULES:
1. featuresEn: 4-5 items. Each item should be SHORT (under 15 words), punchy, and specific. NOT generic filler. Mention actual categories or tool types from the README. The LAST item should guide users to the GitHub repo.
2. featuresZh: Chinese translations of the same items. Keep technical terms (MCP, API, GitHub, CLI, etc.) in English.
3. installGuideEn: 3-6 lines of markdown explaining: this is a curated collection, browse the repo to find individual tools, each has its own install instructions. Include the repo URL as a markdown link.
4. installGuideZh: Same content in Chinese. Same repo URL.
5. Do NOT mix languages — installGuideEn must be purely English, installGuideZh must be purely Chinese.
6. Do NOT include any text outside the JSON object.
7. Use markdown headers (##, ###), bold (**text**), and links ([text](url)) for formatting.

QUALITY EXAMPLE — features should look like this:
- "Structured chain-of-thought reasoning"
- "Dynamic adjustment of reasoning steps"
- "Branching and backtracking"
- "Hypothesis verification"
NOT like this:
- "A very useful tool that helps with many things"`

  const userContent = `Repository: ${repoName}
GitHub URL: ${repoUrl}
Description: ${description}
${readmeSnippet ? `README excerpt:\n${readmeSnippet}` : "No README available."}`

  try {
    const response = await fetch(GLM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0.4,
      }),
    })

    if (!response.ok) {
      return fallbackCollectionContent(repoName, description, repoUrl)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content as string | undefined
    if (!content) {
      return fallbackCollectionContent(repoName, description, repoUrl)
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return fallbackCollectionContent(repoName, description, repoUrl)
    }

    const parsed = JSON.parse(jsonMatch[0])
    return {
      featuresEn: Array.isArray(parsed.featuresEn) ? parsed.featuresEn : [],
      featuresZh: Array.isArray(parsed.featuresZh) ? parsed.featuresZh : [],
      installGuideEn:
        typeof parsed.installGuideEn === "string"
          ? parsed.installGuideEn
          : `Browse the [GitHub repository](${repoUrl}) for the full list of tools and their individual installation instructions.`,
      installGuideZh:
        typeof parsed.installGuideZh === "string"
          ? parsed.installGuideZh
          : `浏览 [GitHub 仓库](${repoUrl}) 查看完整工具列表和各工具的安装说明。`,
    }
  } catch {
    return fallbackCollectionContent(repoName, description, repoUrl)
  }
}

function fallbackCollectionContent(
  repoName: string,
  description: string,
  repoUrl: string,
): CollectionContentResult {
  const shortDesc = description || repoName
  return {
    featuresEn: [
      `Curated collection of ${shortDesc.toLowerCase()} resources`,
      "Covers a wide range of tools across multiple categories",
      "Community-maintained and regularly updated",
      `Browse the [GitHub repository](${repoUrl}) for the complete list`,
    ],
    featuresZh: [
      `${shortDesc} 精选资源合集`,
      "涵盖多个类别的丰富工具和资源",
      "社区维护，定期更新",
      `浏览 [GitHub 仓库](${repoUrl}) 查看完整列表`,
    ],
    installGuideEn: `## Browse the Collection\n\nThis is a **curated collection** of tools, not a single package.\n\n### How to Use\n\n1. Visit the [GitHub repository](${repoUrl}) for the full list\n2. Choose a tool that fits your needs\n3. Follow each tool's individual installation instructions`,
    installGuideZh: `## 浏览合集\n\n这是一个 **精选合集**，收录了各类工具和资源。\n\n### 如何使用\n\n1. 访问 [GitHub 仓库](${repoUrl}) 查看完整列表\n2. 根据需求选择合适的工具\n3. 参考各工具的独立安装说明进行安装`,
  }
}

/**
 * Call the 智谱 GLM API to translate English text to Chinese.
 * Translates a tool description and feature list in a single call.
 */
export async function translateToolToChinese(
  description: string,
  features: string[],
): Promise<TranslationResult> {
  const apiKey = process.env.GLM_API_KEY
  if (!apiKey) {
    return { descriptionZh: null, featuresZh: [] }
  }

  if (!description && features.length === 0) {
    return { descriptionZh: null, featuresZh: [] }
  }

  const featureBlock =
    features.length > 0
      ? `Features:\n${features.map((f, i) => `${i + 1}. ${f}`).join("\n")}`
      : ""

  const userContent = [description ? `Description: ${description}` : "", featureBlock]
    .filter(Boolean)
    .join("\n\n")

  const systemPrompt = `You are a professional technical translator for developer tools. Translate the following English text to simplified Chinese.

Rules:
- Keep technical terms, API names, programming languages, and tool names in their original English form
- Translate descriptions and feature explanations into natural, fluent Chinese
- For features, return a JSON array of translated strings
- Return your response as a valid JSON object with exactly these fields:
  - "descriptionZh": the translated description (string, or null if no description provided)
  - "featuresZh": array of translated feature strings (empty array if no features provided)
- Do NOT include any text outside the JSON object`

  try {
    const response = await fetch(GLM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`GLM API error: ${response.status} ${errorText}`)
      return { descriptionZh: null, featuresZh: [] }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content as string | undefined
    if (!content) {
      return { descriptionZh: null, featuresZh: [] }
    }

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { descriptionZh: null, featuresZh: [] }
    }

    const parsed: TranslationResult = JSON.parse(jsonMatch[0])
    return {
      descriptionZh: typeof parsed.descriptionZh === "string" ? parsed.descriptionZh : null,
      featuresZh: Array.isArray(parsed.featuresZh) ? parsed.featuresZh : [],
    }
  } catch (error) {
    console.error("Translation failed:", error)
    return { descriptionZh: null, featuresZh: [] }
  }
}

/**
 * Translate an install guide markdown from English to Chinese.
 * Preserves code blocks, JSON configs, and CLI commands unchanged.
 * Returns the translated markdown string, or null on failure.
 */
export async function translateInstallGuide(
  markdownEn: string,
): Promise<string | null> {
  const apiKey = process.env.GLM_API_KEY
  if (!apiKey || !markdownEn) return null

  const systemPrompt = `You are a professional technical translator for developer tool installation guides.

Translate the following English markdown install guide to simplified Chinese.

Rules:
- Keep ALL code blocks (\`\`\`...\`\`\`) EXACTLY as they are — do not translate or modify any code
- Keep ALL JSON keys and values inside code blocks unchanged
- Keep ALL CLI commands unchanged
- Keep ALL URLs and links unchanged
- Keep markdown formatting (headers, code fences, bold, links, lists) intact
- Translate only the prose text: descriptions, notes, warnings, instructions
- Keep technical terms (MCP, CLI, npx, npm, API, etc.) in English
- Keep inline code (\`code\`) content unchanged
- Return ONLY the translated markdown text, no JSON wrapper, no extra commentary`

  try {
    const response = await fetch(GLM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: markdownEn },
        ],
        temperature: 0.3,
      }),
    })

    if (!response.ok) return null

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content as string | undefined
    if (!content) return null

    // Strip markdown code block wrapper if present
    const stripped = content.replace(/^```(?:markdown|md)?\s*\n?/i, "").replace(/\n?```\s*$/i, "")
    return stripped.trim()
  } catch (error) {
    console.error("Install guide translation failed:", error)
    return null
  }
}

/**
 * Classify a tool into one or more existing categories based on its name and description.
 * Returns an array of category slugs.
 */
export async function classifyToolCategories(
  name: string,
  description: string,
  readmeContent: string | null,
): Promise<string[]> {
  const apiKey = process.env.GLM_API_KEY
  if (!apiKey) return []

  const readmeSnippet = readmeContent ? readmeContent.slice(0, 1500) : ""

  const systemPrompt = `You are a tool classification expert. Given a developer tool, classify it into the most relevant categories from this list:

- database: Database tools, SQL, data storage, ORM
- development: Developer tools, coding utilities, IDE extensions, build tools
- api: API integration, webhooks, REST/GraphQL clients
- filesystem: File system operations, file management
- search: Search engines, information retrieval
- communication: Chat, messaging, email, notifications
- data-analysis: Data analysis, visualization, reporting
- security: Security, authentication, encryption, compliance
- media: Images, video, audio, design, Figma
- productivity: Productivity, automation, workflow, task management
- cloud: Cloud services, deployment, infrastructure, CI/CD
- ai-ml: AI, machine learning, LLM, reasoning, agents

Rules:
- Return 1-2 categories as a JSON array of slug strings
- Pick the PRIMARY category first
- If the tool is a general-purpose collection/awesome-list, use ["development"]
- Return ONLY the JSON array, no other text`

  const userContent = `Tool name: ${name}
Description: ${description}
${readmeSnippet ? `README excerpt: ${readmeSnippet}` : ""}`

  try {
    const response = await fetch(GLM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0.1,
      }),
    })

    if (!response.ok) return []

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content as string | undefined
    if (!content) return []

    const match = content.match(/\[[\s\S]*\]/)
    if (!match) return []

    const parsed = JSON.parse(match[0])
    return Array.isArray(parsed) ? parsed.slice(0, 2).filter((s: unknown) => typeof s === "string") : []
  } catch {
    return []
  }
}
