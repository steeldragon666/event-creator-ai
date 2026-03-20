import { ENV } from "./env";
import Anthropic from "@anthropic-ai/sdk";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured in .env");
  }

  const anthropic = new Anthropic({
    apiKey,
  });

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    maxTokens,
    max_tokens,
  } = params;

  // Extract system message
  const systemMessages = messages.filter(m => m.role === "system");
  const system = systemMessages.map(m => {
    return ensureArray(m.content)
      .map(part => typeof part === "string" ? part : part.type === "text" ? part.text : "")
      .join("\n");
  }).join("\n\n");

  const anthropicMessages: Anthropic.MessageParam[] = [];

  for (const msg of messages) {
    if (msg.role === "user" || msg.role === "assistant") {
      const contentParts = ensureArray(msg.content);
      let textContent = contentParts
        .map(part => typeof part === "string" ? part : part.type === "text" ? part.text : "")
        .join("\n");
        
      anthropicMessages.push({
        role: msg.role as "user" | "assistant",
        content: textContent,
      });
    }
  }

  let anthropicTools: Anthropic.Tool[] | undefined = undefined;
  let anthropicToolChoice: Anthropic.ToolChoice | undefined = undefined;

  const schema = outputSchema || output_schema || 
                 (responseFormat && 'json_schema' in responseFormat ? responseFormat.json_schema : undefined) ||
                 (response_format && 'json_schema' in response_format ? response_format.json_schema : undefined);

  if (schema) {
    anthropicTools = [
      {
        name: schema.name || "json_output",
        description: "Output format",
        input_schema: schema.schema as any,
      }
    ];
    anthropicToolChoice = { type: "tool", name: schema.name || "json_output" };
  } else if (tools && tools.length > 0) {
    anthropicTools = tools.map(t => ({
      name: t.function.name,
      description: t.function.description || "",
      input_schema: (t.function.parameters as any) || { type: "object", properties: {} }
    }));
  }

  const response = await anthropic.messages.create({
    model: "claude-3-haiku-20240307", // Fallback to Haiku for broader API key compatibility
    max_tokens: maxTokens || max_tokens || 8192,
    system: system ? system.trim() : undefined,
    messages: anthropicMessages,
    tools: anthropicTools,
    tool_choice: anthropicToolChoice,
  });

  let responseContent = "";
  
  if (schema) {
    const toolUse = response.content.find(c => c.type === "tool_use") as Anthropic.ToolUseBlock;
    if (toolUse) {
      responseContent = JSON.stringify(toolUse.input);
    } else {
      const textBlock = response.content.find(c => c.type === "text") as Anthropic.TextBlock;
      responseContent = textBlock?.text || "";
    }
  } else {
    const textBlock = response.content.find(c => c.type === "text") as Anthropic.TextBlock;
    responseContent = textBlock?.text || "";
  }

  return {
    id: response.id,
    created: Date.now(),
    model: response.model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: responseContent,
        },
        finish_reason: response.stop_reason === "end_turn" ? "stop" : 
                       response.stop_reason === "tool_use" ? "tool_calls" : "stop"
      }
    ]
  };
}
