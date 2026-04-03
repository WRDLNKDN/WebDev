import { API_BASE, requestAuthedJson } from './feedsApiCore';

export type ProcessedChatAttachment = {
  path: string;
  mime: string;
  size: number;
};

export async function processChatGifUpload(params: {
  file: File;
  accessToken?: string | null;
}): Promise<ProcessedChatAttachment> {
  const url = `${API_BASE}/api/chat/attachments/process-gif`;
  const formData = new FormData();
  formData.append('file', params.file);

  const payload = await requestAuthedJson<{
    data?: ProcessedChatAttachment;
  }>(
    url,
    {
      method: 'POST',
      body: formData,
    },
    {
      accessToken: params.accessToken ?? null,
      includeJsonContentType: false,
    },
  );
  if (!payload.data?.path || !payload.data?.mime) {
    throw new Error('GIF processing failed');
  }
  return payload.data;
}
