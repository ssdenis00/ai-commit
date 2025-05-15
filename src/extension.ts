import * as vscode from "vscode";
import { generateCommitMessage } from "./ai";
import { registerConfigCommands } from "./commands";
import { getGitDiff, getRepo } from "./git";

export function activate(context: vscode.ExtensionContext) {
  let isLoading = false;

  registerConfigCommands(context);

  const disposable = vscode.commands.registerCommand(
    "aiCommit.generateCommit",
    async () => {
      if (isLoading) {
        return;
      }
      isLoading = true;

      let repo = null;

      try {
        repo = await getRepo();
        repo.inputBox.value = "Generating commit message...";

        // Проверяем наличие изменений
        if (repo.state.indexChanges.length === 0) {
          vscode.window.showWarningMessage("No staged changes to commit");
          return;
        }

        const diff = await getGitDiff();

        if (!diff.trim()) {
          vscode.window.showInformationMessage("No changes to commit.");
          return;
        }

        const message = await generateCommitMessage({ context, diff });

        if (message?.trim()) {
          repo.inputBox.value = message;

          vscode.window.showInformationMessage("Commit created successfully!");
        }
      } catch (error) {
        repo.inputBox.value = "";

        const msg =
          error instanceof Error ? error.message : JSON.stringify(error);
        console.error("Commit Error:", JSON.stringify(error));

        vscode.window.showErrorMessage(`Commit failed: ${msg}`);
      } finally {
        isLoading = false;
      }
    }
  );

  context.subscriptions.push(disposable);
}
