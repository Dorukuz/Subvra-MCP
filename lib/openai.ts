import OpenAI, { toFile } from "openai";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

/** Sizes accepted by GPT Image models (not legacy 1024x1792 / 1792x1024). */
export type GptImageSize =
  | "1024x1024"
  | "1024x1536"
  | "1536x1024"
  | "auto";

/** Image model id (default `gpt-image-2`). Override with `OPENAI_IMAGE_MODEL`. */
export function getOpenAIImageModel(): string {
  return "gpt-image-2";
}

/**
 * Model for reference-based layout adaptation (`images.edit`).
 * Defaults to `gpt-image-1` (supported for edits in the API). Override with `OPENAI_IMAGE_EDIT_MODEL`.
 */
export function getOpenAIImageEditModel(): string {
  return process.env.OPENAI_IMAGE_EDIT_MODEL?.trim() || "gpt-image-1";
}

export async function generateImage(
  prompt: string,
  size: GptImageSize = "1024x1536"
): Promise<{ url: string; revisedPrompt?: string }> {
  const openai = getOpenAIClient();
  const model = getOpenAIImageModel();
  const response = await openai.images.generate({
    // API supports gpt-image-2; `openai` package `ImageModel` union may lag.
    model: model as unknown as OpenAI.Images.ImageModel,
    prompt,
    n: 1,
    size,
    quality: "high",
  });

  const data = response.data?.[0];
  if (!data) {
    throw new Error("No image data returned from OpenAI");
  }

  const url = data.url ?? (data.b64_json ? `data:image/png;base64,${data.b64_json}` : undefined);
  if (!url) {
    throw new Error("No image URL or base64 data returned from OpenAI");
  }

  return {
    url,
    revisedPrompt: data.revised_prompt ?? undefined,
  };
}

/**
 * Adapt an existing screenshot PNG to a new aspect ratio / composition while staying visually aligned
 * with the reference (same app, colors, hierarchy). Uses the Images Edit API.
 */
export async function adaptScreenshotFromReference(
  sourcePng: Buffer,
  prompt: string,
  size: GptImageSize
): Promise<{ url: string }> {
  const openai = getOpenAIClient();
  const model = getOpenAIImageEditModel();
  const file = await toFile(sourcePng, "reference.png", { type: "image/png" });

  const sizeParam = size === "auto" ? "1024x1536" : size;

  const response = await openai.images.edit({
    model: model as unknown as OpenAI.Images.ImageModel,
    image: file,
    prompt,
    size: sizeParam,
    quality: "high",
    input_fidelity: "high",
  });

  const data = response.data?.[0];
  if (!data) {
    throw new Error("No image data returned from OpenAI (edit)");
  }

  const url =
    data.url ?? (data.b64_json ? `data:image/png;base64,${data.b64_json}` : undefined);
  if (!url) {
    throw new Error("No image URL or base64 data returned from OpenAI (edit)");
  }

  return { url };
}

export default getOpenAIClient;
