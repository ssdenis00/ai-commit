import * as path from "path";
import * as vscode from "vscode";

export async function getGitAPI() {
  const gitExtension = vscode.extensions.getExtension("vscode.git");
  if (!gitExtension) {
    throw new Error("Git extension not found");
  }

  if (!gitExtension.isActive) {
    await gitExtension.activate();
  }

  const api = gitExtension.exports.getAPI(1);
  if (!api) {
    throw new Error("Failed to get Git API");
  }

  return api;
}

export async function getGitDiff(): Promise<string> {
  try {
    const api = await getGitAPI();

    // Добавляем проверки
    if (!api.repositories || api.repositories.length === 0) {
      throw new Error("No Git repositories found in workspace");
    }

    const repo = api.repositories[0];
    return (await repo.diff(true)) || "";
  } catch (error) {
    console.error("Error getting Git diff:", error);
    throw new Error("Failed to get Git diff");
  }
}

export function analyzeCodeChanges(diff: string): string {
  const patterns = {
    auth: /auth|login|register|password|oauth|jwt|session/i,
    ui: /component|ui|layout|style|css|scss|jsx|tsx|vue|theme/i,
    api: /api|controller|route|endpoint|rest|graphql|axios|fetch/i,
    db: /migration|schema|repository|query|database|sql|prisma/i,
    test: /spec|test|cypress|jest|mocha|chai/i,
    config: /config|env|settings|dotenv|yaml|json/i,
  };

  const found = new Set<string>();

  // Анализ по именам файлов
  diff.split("\n").forEach((line) => {
    if (line.startsWith("+++") || line.startsWith("---")) {
      for (const [category, regex] of Object.entries(patterns)) {
        if (regex.test(line)) {
          found.add(category);
        }
      }
    }
  });

  // Анализ по содержимому
  diff.split("\n").forEach((line) => {
    if (line.startsWith("+") || line.startsWith("-")) {
      for (const [category, regex] of Object.entries(patterns)) {
        if (regex.test(line)) {
          found.add(category);
        }
      }
    }
  });

  return Array.from(found).slice(0, 2).join("-");
}

export async function getWorkflowFromBranch(): Promise<string> {
  try {
    const branch = await getCurrentBranchName();
    if (!branch) {
      return "";
    }

    const patterns = [
      /(?:feature|fix|hotfix|release)\/([\w-]+)/i,
      /(\d+_[\w-]+)/,
      /([a-z-]+)\/\d+/i,
    ];

    for (const pattern of patterns) {
      const match = branch.match(pattern);
      if (match && match[1]) {
        return match[1].toLowerCase().replace(/_/g, "-");
      }
    }

    return branch.split("/")[0]?.replace(/[^\w-]/g, "") || "";
  } catch {
    return "";
  }
}

export async function getCurrentBranchName(): Promise<string> {
  try {
    const api = await getGitAPI();

    // Добавляем проверки
    if (!api.repositories || api.repositories.length === 0) {
      return "";
    }

    const repo = api.repositories[0];
    return repo.state.HEAD?.name || "";
  } catch (error) {
    console.error("Error getting branch name:", error);
    return "";
  }
}

export async function getWorkflowFromChanges(diff: string): Promise<string> {
  try {
    // 1. Пытаемся определить workflow из измененных файлов
    const flowFromFiles = detectFlowFromFilePaths(diff);
    if (flowFromFiles) {
      return flowFromFiles;
    }

    // 2. Если не нашли - используем комбинацию ветки и анализа кода
    return await getFallbackWorkflow(diff);
  } catch (error) {
    console.error("Workflow detection error:", error);
    return "";
  }
}

function detectFlowFromFilePaths(diff: string): string | null {
  const FLOWS_DIR = "src/flows";
  const changedFiles = getChangedFiles(diff);

  const flowPaths = changedFiles
    .map((file) => {
      const normalized = path.normalize(file);
      const parts = normalized.split(path.sep);
      const flowsIndex = parts.indexOf("flows");

      if (flowsIndex > -1 && parts.length > flowsIndex + 1) {
        return parts[flowsIndex + 1];
      }
      return null;
    })
    .filter(Boolean);

  if (flowPaths.length > 0) {
    // Берем самый частый flow из изменений
    const counts: Record<string, number> = {};
    flowPaths.forEach((flow) => (counts[flow!] = (counts[flow!] || 0) + 1));
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }

  return null;
}

function getChangedFiles(diff: string): string[] {
  const fileRegex = /^(?:\+\+\+|\-\-\-)\s(?:a|b)\/(.+)/;
  const files = new Set<string>();

  diff.split("\n").forEach((line) => {
    const match = line.match(fileRegex);
    if (match && match[1]) {
      files.add(match[1]);
    }
  });

  return Array.from(files);
}

async function getFallbackWorkflow(diff: string): Promise<string> {
  const branchWorkflow = await getWorkflowFromBranch();
  const codeWorkflow = analyzeCodeChanges(diff);
  return [branchWorkflow, codeWorkflow].filter(Boolean).join("-") || "";
}
