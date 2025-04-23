import OpenAI from "openai";
import { getChangedFlowFiles } from "./git";

interface FileContext {
  flowFiles: string[];
  otherFiles: string[];
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface ApiError {
  message: string;
  type?: string;
  code?: number;
}

interface ApiErrorResponse {
  error: ApiError;
}

type ApiResponse<T> = ChatCompletionResponse | ApiErrorResponse;

function isApiError<T>(response: ApiResponse<T>): response is ApiErrorResponse {
  return "error" in response && !!response.error;
}

function buildPrompt({ diff, fileList }: { diff: string; fileList: string[] }) {
  return `Generate conventional commit message using this process:
      1. Analyze file paths to determine workflow context
      2. Create short workflow name (1-2 word) based on path structure
      3. Follow commit format: <type>(<workflow>): <subject>
  Strict format: 
  <type>(<workflow>): <subject>

  File changes:
  ${formatFileList(fileList)}

  Rules:
  1. type: ${[
    "feat",
    "fix",
    "docs",
    "style",
    "refactor",
    "test",
    "chore",
    "perf",
    "build",
    "ci",
    "revert",
  ].join("|")}
  2. workflow: 
      - optional
      - max 1-2 words
      - max 10 chars
      - rely on the fsd architecture
      - lowercase only
  3. subject: 
      - Imperative mood: "add" not "added", "fix" not "fixed"
      - Lowercase, no period
      - Max 50 chars

  Examples:     
    File changes:
      • src/flows/user/profile/avatar.ts
      • src/flows/user/settings/controller.ts
    return
      fix(user): change types avatar

    File changes:
      • src/shared/utils/helpers.js
    return
      feat(utils): add new helper
  
  Current changes (truncated):
  \`\`\`
  ${diff.slice(0, 3000)}
  \`\`\``;
}

function formatFileList(files: string[]): string {
  return files
    .map((f) => `• ${f}`)
    .slice(0, 15) // Ограничиваем количество файлов для промпта
    .join("\n");
}

export async function generateCommitMessage(diff: string): Promise<string> {
  const apiKey = process.env.AI_API_KEY;
  const baseURL = process.env.AI_URL;
  const model = process.env.AI_MODEL;

  if (!apiKey || !baseURL || !model) {
    throw new Error("API key, URL, or model not found in .env file");
  }

  const openai = new OpenAI({ baseURL, apiKey });
  const fileList = await getChangedFlowFiles(diff);

  const prompt = buildPrompt({ diff, fileList });

  const response = (await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: prompt,
      },
    ],
    model,
    temperature: 0.3,
    max_tokens: 300,
  })) as unknown as ApiResponse<ChatCompletionResponse>;

  // Проверка на ошибку
  if (isApiError(response)) {
    throw new Error(response.error.message);
  }

  return response?.choices?.[0]?.message?.content?.trim() || "chore: update";
}
