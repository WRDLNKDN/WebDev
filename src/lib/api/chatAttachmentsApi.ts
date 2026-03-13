import { messageFromApiResponse } from '../utils/errors';
import { authedFetch } from './authFetch';
import { API_BASE, parseJsonResponse } from './feedsApiCore';

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

  const res = await authedFetch(
    url,
    {
      method: 'POST',
      body: formData,
    },
    {
      accessToken: params.accessToken ?? null,
      includeJsonContentType: false,
      credentials: API_BASE ? 'omit' : 'include',
    },
  );

  if (!res.ok) {
    let body: { error?: string; message?: string } = {};
    try {
      body = await parseJsonResponse<{ error?: string; message?: string }>(
        res,
        url,
      );
    } catch (e) {
      if (e instanceof Error && e.message.includes('returned HTML')) throw e;
    }
    throw new Error(
      messageFromApiResponse(res.status, body.error, body.message),
    );
  }

  const payload = await parseJsonResponse<{
    data?: ProcessedChatAttachment;
  }>(res, url);
  if (!payload.data?.path || !payload.data?.mime) {
    throw new Error('GIF processing failed');
  }
  return payload.data;
}
