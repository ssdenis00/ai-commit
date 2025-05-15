import * as vscode from "vscode";
import { ConfigManager } from "./configuration";

export function registerConfigCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("aiCommit.setApiKey", async () => {
      const key = await vscode.window.showInputBox({
        prompt: "Enter AI API Key",
        password: true,
        ignoreFocusOut: true,
      });

      if (key) {
        await ConfigManager.setApiKey(context, key);
        vscode.window.showInformationMessage("API key saved successfully!");
      }
    }),

    vscode.commands.registerCommand("aiCommit.configure", async () => {
      const currentConfig = ConfigManager.getConfig();

      const baseURL = await vscode.window.showInputBox({
        prompt: "Enter API Base URL",
        value: currentConfig.baseURL,
      });

      const model = await vscode.window.showInputBox({
        prompt: "Enter Model Name",
        value: currentConfig.model,
      });

      const temperature = await vscode.window.showInputBox({
        prompt: "Enter Model Temperature",
        value: currentConfig.temperature.toString(),
      });

      const maxTokens = await vscode.window.showInputBox({
        prompt: "Enter Model Temperature",
        value: currentConfig.maxTokens.toString(),
      });

      if (baseURL && model) {
        await ConfigManager.updateConfig({
          baseURL,
          model,
          temperature: temperature
            ? parseInt(temperature)
            : currentConfig.temperature,
          maxTokens: maxTokens ? parseInt(maxTokens) : currentConfig.maxTokens,
        });
        vscode.window.showInformationMessage("Configuration updated!");
      }
    })
  );
}
