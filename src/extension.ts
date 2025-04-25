import * as dotenv from "dotenv";
import * as path from "path";
import * as vscode from "vscode";
import { generateCommitMessage } from "./ai";
import { getGitAPI, getGitDiff } from "./git";
import { createStatusBarItem, setupStatusBar } from "./ui";

export function activate(context: vscode.ExtensionContext) {
  const envPath = path.join(context.extensionPath, ".env");
  dotenv.config({ path: envPath });

  const statusBarItem = createStatusBarItem();
  setupStatusBar(context, statusBarItem);
  context.subscriptions.push(statusBarItem);

  const disposable = vscode.commands.registerCommand(
    "generateCommit",
    async (retryMessage?: string) => {
      let message: string | undefined;
      let edited: string | undefined;

      try {
        const gitApi = await getGitAPI();

        // Проверяем наличие репозиториев
        if (!gitApi.repositories || gitApi.repositories.length === 0) {
          vscode.window.showErrorMessage("No Git repositories found");
          return;
        }

        const repo = gitApi.repositories[0];

        // Проверяем наличие изменений
        if (repo.state.indexChanges.length === 0) {
          vscode.window.showWarningMessage("No staged changes to commit");
          return;
        }

        statusBarItem.text = "$(loading~spin) Generating...";
        const diff = await getGitDiff();

        if (!diff.trim()) {
          vscode.window.showInformationMessage("No changes to commit.");
          return;
        }

        message = retryMessage || (await generateCommitMessage(diff));

        edited = await vscode.window.showInputBox({
          value: message,
          prompt: "Edit commit message",
          validateInput: (text) =>
            text.trim() ? null : "Message cannot be empty",
        });

        if (edited?.trim()) {
          await repo?.commit(edited.trim());

          vscode.window.showInformationMessage("Commit created successfully!");
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("Commit Error:", error);

        // Автоматический ретрай с сохраненным сообщением
        if (edited) {
          vscode.window.showErrorMessage(`Commit failed: ${msg}`);
          vscode.commands.executeCommand("generateCommit", edited); // Повторный вызов
        } else {
          vscode.window.showErrorMessage(`Commit failed: ${msg}`);
        }
      } finally {
        statusBarItem.text = "$(check) Commit Ready!";
        setTimeout(
          () => (statusBarItem.text = "$(rocket) Generate Commit"),
          300
        );
      }
    }
  );

  context.subscriptions.push(disposable);
}
