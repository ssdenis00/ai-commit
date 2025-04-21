import * as vscode from "vscode";
import { getGitAPI } from "./git";

export function createStatusBarItem(): vscode.StatusBarItem {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );

  statusBarItem.text = "$(rocket) Generate Commit";
  statusBarItem.tooltip = "Generate AI-powered commit message";
  statusBarItem.command = "generateCommit";

  return statusBarItem;
}

const updateStatusBar = async (statusBarItem: vscode.StatusBarItem) => {
  const gitApi = await getGitAPI();
  const hasRepo = gitApi?.repositories?.length > 0;

  hasRepo ? statusBarItem.show() : statusBarItem.hide();
};

export function setupStatusBar(
  context: vscode.ExtensionContext,
  statusBarItem: vscode.StatusBarItem
) {
  // Обновить сразу
  updateStatusBar(statusBarItem);

  // Также обновлять при этих событиях
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(
      () => void updateStatusBar(statusBarItem)
    ),
    vscode.workspace.onDidChangeWorkspaceFolders(
      () => void updateStatusBar(statusBarItem)
    ),
    vscode.workspace.onDidChangeConfiguration(
      () => void updateStatusBar(statusBarItem)
    )
  );

  // fallback: повторная проверка через 5 сек
  setTimeout(() => void updateStatusBar(statusBarItem), 5000);
}
