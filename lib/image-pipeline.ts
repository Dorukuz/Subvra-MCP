import sharp from "sharp";
import { APPLE_PRESETS, type ApplePreset } from "./apple-presets";
import path from "path";
import fs from "fs/promises";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";

const OUTPUT_DIR = path.join(process.cwd(), "public", "generated");
const execFileAsync = promisify(execFile);

const REAL_ESRGAN_BIN = process.env.REAL_ESRGAN_BIN || "realesrgan-ncnn-vulkan";
const REAL_ESRGAN_MODEL = process.env.REAL_ESRGAN_MODEL || "realesr-general-x4v3";
const REAL_ESRGAN_SCALE = "4";

async function upscaleWithRealEsrgan(imageBuffer: Buffer): Promise<Buffer> {
  if (process.env.REAL_ESRGAN_ENABLED !== "true") {
    return imageBuffer;
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "subvra-esrgan-"));
  const inputPath = path.join(tmpDir, "input.png");
  const outputPath = path.join(tmpDir, "output.png");

  try {
    await sharp(imageBuffer).png().toFile(inputPath);

    await execFileAsync(
      REAL_ESRGAN_BIN,
      [
        "-i",
        inputPath,
        "-o",
        outputPath,
        "-n",
        REAL_ESRGAN_MODEL,
        "-s",
        REAL_ESRGAN_SCALE,
        "-f",
        "png",
      ],
      { timeout: 90_000 }
    );

    return await fs.readFile(outputPath);
  } catch (error) {
    // Fail open so generation still succeeds if Real-ESRGAN isn't installed/configured yet.
    console.warn("[image-pipeline] Real-ESRGAN unavailable, using original buffer:", error);
    return imageBuffer;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Scale AI output to exact App Store pixels without geometric distortion.
 * Uses cover fit to avoid stretching while keeping exact output resolution.
 */
export async function resizeToExportDimensions(
  imageBuffer: Buffer,
  preset: Pick<ApplePreset, "width" | "height">
): Promise<Buffer> {
  const source = await upscaleWithRealEsrgan(imageBuffer);
  return sharp(source)
    .rotate()
    .trim({ threshold: 8 })
    .resize(preset.width, preset.height, {
      fit: "cover",
      position: "attention",
      kernel: sharp.kernel.lanczos3,
    })
    .sharpen(0.6)
    .png()
    .toBuffer();
}

/** Fetch remote OpenAI image URL or decode a data: URL into a buffer. */
export async function downloadImageBuffer(url: string): Promise<Buffer> {
  if (url.startsWith("data:")) {
    const comma = url.indexOf(",");
    if (comma === -1) throw new Error("Invalid data URL");
    const meta = url.slice(5, comma);
    if (!meta.includes("base64")) throw new Error("Expected base64 data URL");
    return Buffer.from(url.slice(comma + 1), "base64");
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download image (${res.status})`);
  }
  return Buffer.from(await res.arrayBuffer());
}

export async function ensureOutputDir(): Promise<void> {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

export async function processScreenshot(
  imageBuffer: Buffer,
  presetId: string,
  jobId: string
): Promise<string> {
  const preset = APPLE_PRESETS[presetId];
  if (!preset) {
    throw new Error(`Unknown preset: ${presetId}`);
  }

  await ensureOutputDir();

  const filename = `${jobId}_${presetId}.png`;
  const outputPath = path.join(OUTPUT_DIR, filename);

  const raster = await resizeToExportDimensions(imageBuffer, preset);
  await sharp(raster).png({ quality: 100 }).toFile(outputPath);

  return `/generated/${filename}`;
}

export async function processWithDeviceFrame(
  imageBuffer: Buffer,
  preset: ApplePreset,
  jobId: string
): Promise<string> {
  await ensureOutputDir();

  const filename = `${jobId}_${preset.id}_framed.png`;
  const outputPath = path.join(OUTPUT_DIR, filename);

  const framePath = path.join(
    process.cwd(),
    "public",
    "templates",
    `${preset.id}_frame.png`
  );

  let hasFrame = false;
  try {
    await fs.access(framePath);
    hasFrame = true;
  } catch {
    // No frame template available, proceed without
  }

  const resized = await resizeToExportDimensions(imageBuffer, preset);

  if (hasFrame) {
    const frame = await fs.readFile(framePath);
    await sharp(resized)
      .composite([{ input: frame, gravity: "center" }])
      .png({ quality: 100 })
      .toFile(outputPath);
  } else {
    await sharp(resized).png({ quality: 100 }).toFile(outputPath);
  }

  return `/generated/${filename}`;
}
