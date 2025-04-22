import OpenAI from "openai";
import { getCurrentBranchWorkflow } from "./git";

export async function generateCommitMessage(diff: string): Promise<string> {
  const apiKey = process.env.AI_API_KEY;
  const baseURL = process.env.AI_URL;
  const model = process.env.AI_MODEL;

  if (!apiKey || !baseURL || !model) {
    throw new Error("API key, URL, or model not found in .env file");
  }

  const openai = new OpenAI({ baseURL, apiKey });
  const workflow = await getCurrentBranchWorkflow();

  const response = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `Generate RU/EN conventional commit message from these changes.
Strict format:
${workflow ? "<type>(<workflow>): <subject>" : "<type>: <subject>"}

Rules:
1. type: feat|fix|docs|style|refactor|test|chore|perf|build|ci|revert
2. workflow: detected from branch (${workflow || "skip if empty"})
3. subject: clear, concise, imperative mood, lowercase, no period
4. Max 50 characters for subject

Examples:
- feat(auth): add email validation
- fix(profile): correct avatar scaling
- chore: update eslint config

Git diff (truncated to 3000 chars):\n\n${diff.slice(0, 3000)}`,
      },
    ],
    model,
    temperature: 0.3,
    max_tokens: 300,
  });

  return response?.choices[0]?.message?.content?.trim() || "chore: update";
}
