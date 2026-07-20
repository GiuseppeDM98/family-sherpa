import { env } from "@/lib/env";

export type DownloadedTelegramFile = {
  buffer: Buffer;
  mimeType: string;
  fileName?: string;
};

type TelegramGetFileResponse = {
  ok: boolean;
  description?: string;
  result?: { file_id: string; file_path?: string; file_size?: number };
};

const EXTENSION_MIME_TYPES: Record<string, string> = {
  oga: "audio/ogg",
  ogg: "audio/ogg",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  pdf: "application/pdf",
  webp: "image/webp",
};

function inferMimeTypeFromPath(filePath: string): string {
  const extension = filePath.split(".").pop()?.toLowerCase();
  return (extension && EXTENSION_MIME_TYPES[extension]) || "application/octet-stream";
}

/**
 * Downloads a Telegram file via the Bot API's two-step dance: `getFile`
 * resolves a `file_id` to a `file_path`, then the file itself is fetched
 * from the file host.
 */
export async function downloadTelegramFile(fileId: string): Promise<DownloadedTelegramFile> {
  const getFileUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`;
  const getFileRes = await fetch(getFileUrl);
  const getFileJson = (await getFileRes.json()) as TelegramGetFileResponse;

  if (!getFileJson.ok || !getFileJson.result?.file_path) {
    throw new Error(
      `Telegram getFile failed for file_id ${fileId}: ${getFileJson.description ?? getFileRes.statusText}`,
    );
  }

  const filePath = getFileJson.result.file_path;
  const fileRes = await fetch(`https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${filePath}`);
  if (!fileRes.ok) {
    throw new Error(`Failed to download Telegram file ${filePath}: ${fileRes.status}`);
  }

  const buffer = Buffer.from(await fileRes.arrayBuffer());
  const fileName = filePath.split("/").pop();

  return { buffer, mimeType: inferMimeTypeFromPath(filePath), fileName };
}
