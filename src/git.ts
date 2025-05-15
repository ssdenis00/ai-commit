import * as path from "path";
import * as vscode from "vscode";

export async function getRepo() {
  try {
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

    // Добавляем проверки
    if (!api.repositories || api.repositories.length === 0) {
      throw new Error("No Git repositories found in workspace");
    }

    return api.repositories[0];
  } catch (error) {
    console.error("Error getting Git API:", error);
  }
}

export async function getGitDiff(): Promise<string> {
  try {
    const repo = await getRepo();

    return (await repo.diff(true)) || "";
  } catch (error) {
    console.error("Error getting Git diff:", error);
    throw new Error("Failed to get Git diff");
  }
}

export async function getChangedFlowFiles(diff: string): Promise<string[]> {
  const ROOT = "src/";
  const allFiles = getChangedFiles(diff);

  return allFiles.filter(
    (file) =>
      path.normalize(file).startsWith(ROOT) && file.split("/").length > 3 // Исключаем корневые файлы src
  );
}

export async function getRelevantOtherFiles(diff: string): Promise<string[]> {
  const allFiles = getChangedFiles(diff);
  return allFiles.filter((file) => !file.includes("src/flows/")).slice(0, 5); // Берем первые 5 файлов вне flows
}

function getChangedFiles(diff: string): string[] {
  const fileRegex = /^(?:\+\+\+|\-\-\-)\s(?:a|b)\/(.+)/;
  const files = new Set<string>();

  diff.split("\n").forEach((line) => {
    const match = line.match(fileRegex);
    if (match?.[1]) {
      files.add(path.normalize(match[1]));
    }
  });

  return Array.from(files);
}
