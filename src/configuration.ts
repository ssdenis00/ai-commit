import * as vscode from "vscode";

interface AIConfig {
  baseURL: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export class ConfigManager {
  private static readonly SECTION = "aiCommit";

  static async getApiKey(context: vscode.ExtensionContext): Promise<string> {
    return (await context.secrets.get(`${this.SECTION}.apiKey`)) || "";
  }

  static async setApiKey(
    context: vscode.ExtensionContext,
    key: string
  ): Promise<void> {
    await context.secrets.store(`${this.SECTION}.apiKey`, key);
  }

  static getConfig(): AIConfig {
    const config = vscode.workspace.getConfiguration(this.SECTION);
    return {
      baseURL: config.get("baseURL") || "https://openrouter.ai/api/v1",
      model: config.get("model") || "google/gemini-2.0-flash-exp:free",
      temperature: config.get("temperature") || 0.3,
      maxTokens: config.get("maxTokens") || 500,
    };
  }

  static async updateConfig(newConfig: Partial<AIConfig>): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.SECTION);
    await config.update("baseURL", newConfig.baseURL, true);
    await config.update("model", newConfig.model, true);
    await config.update("temperature", newConfig.temperature, true);
    await config.update("maxTokens", newConfig.maxTokens, true);
  }
}
