import OpenAI from "openai";
import { getWorkflowFromBranch } from "./git";

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

export async function generateCommitMessage(diff: string): Promise<string> {
  const apiKey = process.env.AI_API_KEY;
  const baseURL = process.env.AI_URL;
  const model = process.env.AI_MODEL;

  if (!apiKey || !baseURL || !model) {
    throw new Error("API key, URL, or model not found in .env file");
  }

  const openai = new OpenAI({ baseURL, apiKey });
  const workflow = await getWorkflowFromBranch();

  const response = (await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `Generate conventional commit message from these changes.
  Strict format: 
  ${workflow ? `<type>(${workflow}): <subject>` : `<type>: <subject>`}
  
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
  2. workflow: "${workflow}" (use exactly as provided)
  3. subject: 
     - Imperative mood: "add" not "added", "fix" not "fixed"
     - Lowercase, no period
     - Max 50 chars
     - In Russian or English
  
  Examples${workflow ? ` (with ${workflow} workflow):` : ":"}
  ${
    workflow
      ? `
  - feat(${workflow}): добавить валидацию email
  - fix(${workflow}): исправить ошибку загрузки аватара`
      : `
  - feat: добавить новый лейаут
  - fix: исправить тип данных`
  }
  
  Current changes (truncated):
  \`\`\`
  ${diff.slice(0, 3000)}
  \`\`\``,
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
