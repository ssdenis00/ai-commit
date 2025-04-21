import * as vscode from "vscode";

export async function getGitAPI() {
  const gitExtension = vscode.extensions.getExtension("vscode.git");
  if (!gitExtension) {
    throw new Error("Git extension not found");
  }

  if (!gitExtension.isActive) {
    await gitExtension.activate(); // 👈 важно!
  }

  return gitExtension.exports.getAPI(1);
}

export async function getGitDiff(): Promise<string> {
  const api = await getGitAPI();
  if (!api || !api.repositories?.length) {
    throw new Error("No Git repositories found");
  }

  return await api.repositories[0].diff();
}

export async function getCurrentBranchWorkflow(): Promise<string> {
  try {
    const api = await getGitAPI();
    const repo = api?.repositories?.[0];
    const branch = repo?.state.HEAD?.name?.toLowerCase() || "";

    const taskPatterns = [
      /([A-Z]+-\d+)/,
      /(feature|fix)\/(\w+)/,
      /(\d+_[\w-]+)/,
    ];

    for (const pattern of taskPatterns) {
      const match = branch.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }

    return branch.split("/")[0] || "";
  } catch {
    return "";
  }
}
