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

// В файле git.ts
export async function getWorkflowFromBranch(): Promise<string> {
  try {
    const branch = await getCurrentBranchName();
    if (!branch) {
      return "";
    }

    // Паттерны для извлечения workflow из названия ветки
    const patterns = [
      /^(?:feature|fix|hotfix|release)\/([A-Z]+-\d+)/i, // JIRA-стиль: feature/JIRA-123
      /^(?:[\w-]+)\/([a-z-]+)/i, // Название фичи: feature/auth-flow
      /([A-Z]{2,}-\d+)/, // Тикет в любом месте: PROJ-456
      /^(?:task|issue)\/([\w-]+)/i, // Явное указание задачи: task/update-ui
    ];

    for (const pattern of patterns) {
      const match = branch.match(pattern);
      if (match && match[1]) {
        return match[1].toLowerCase().replace(/\s+/g, "-");
      }
    }

    return ""; // Не найдено подходящего паттерна
  } catch {
    return "";
  }
}
