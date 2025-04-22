import * as vscode from "vscode";

export async function getGitAPI() {
  const gitExtension = vscode.extensions.getExtension("vscode.git");
  if (!gitExtension) {
    throw new Error("Git extension not found");
  }

  if (!gitExtension.isActive) {
    await gitExtension.activate();
  }

  return gitExtension.exports.getAPI(1);
}

export async function getGitDiff(): Promise<string> {
  const api = await getGitAPI();
  if (!api || !api.repositories?.length) {
    throw new Error("No Git repositories found");
  }

  const repo = api.repositories[0];

  // Получаем diff между HEAD и индексом (staged changes)
  const diff = await repo.diff(true);

  if (!diff?.trim()) {
    throw new Error("No staged changes found");
  }

  return diff;
}

export async function hasStagedChanges(): Promise<boolean> {
  const api = await getGitAPI();
  const repo = api.repositories[0];

  // Просто проверяем наличие любых изменений в индексе
  return repo.state.indexChanges.length > 0;
}

export async function getCurrentBranchName(): Promise<string> {
  try {
    const api = await getGitAPI();
    const repo = api?.repositories?.[0];
    const branch = repo?.state.HEAD?.name?.toLowerCase() || "";

    return branch;
  } catch {
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
