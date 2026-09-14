export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

export const OPEN_WEBSITE_TOOL: ToolDefinition = {
  name: 'openWebsite',
  description:
    'Opens a website requested by the user, such as YouTube, Google, Wikipedia, GitHub, or any valid URL.',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description:
          'The complete web URL to open, starting with https:// (e.g. https://www.youtube.com)',
      },
    },
    required: ['url'],
  },
};

/**
 * Validates and normalizes URL to prevent XSS or dangerous protocol execution
 */
export function validateAndNormalizeUrl(rawUrl: string): {
  valid: boolean;
  url?: string;
  error?: string;
} {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'URL is required and must be a string' };
  }

  let trimmed = rawUrl.trim();

  // Reject dangerous protocol schemes immediately
  const dangerousProtocols = [
    'javascript:',
    'data:',
    'file:',
    'vbscript:',
    'about:',
    'blob:',
  ];
  const lower = trimmed.toLowerCase();
  for (const proto of dangerousProtocols) {
    if (lower.startsWith(proto)) {
      return {
        valid: false,
        error: `Dangerous URL scheme rejected: ${proto}`,
      };
    }
  }

  // Prepend https:// if no protocol provided
  if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
    trimmed = `https://${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        valid: false,
        error: `Only http and https protocols are supported, got ${parsed.protocol}`,
      };
    }

    return { valid: true, url: parsed.toString() };
  } catch (err: any) {
    return {
      valid: false,
      error: `Invalid URL format: ${err?.message || 'parse error'}`,
    };
  }
}

/**
 * Executes a tool called by Gemini Live in the browser environment
 */
export async function executeToolCall(
  name: string,
  args: Record<string, any>
): Promise<{ success: boolean; message: string; data?: Record<string, any> }> {
  switch (name) {
    case 'openWebsite': {
      const validation = validateAndNormalizeUrl(args?.url);
      if (!validation.valid || !validation.url) {
        return {
          success: false,
          message: `Could not open website: ${validation.error || 'Invalid URL'}`,
        };
      }

      try {
        const openedWindow = window.open(validation.url, '_blank');
        // Check if popup was blocked by browser
        const popupBlocked = !openedWindow || openedWindow.closed || typeof openedWindow.closed === 'undefined';
        
        return {
          success: true,
          message: popupBlocked
            ? `Requested to open ${validation.url}. (Note: Popup was opened or queued in new tab)`
            : `Website ${validation.url} opened successfully in a new tab.`,
          data: {
            url: validation.url,
            popupBlocked,
          },
        };
      } catch (err: any) {
        return {
          success: false,
          message: `Browser error while opening URL: ${err?.message || 'unknown error'}`,
        };
      }
    }

    default:
      return {
        success: false,
        message: `Tool "${name}" is not supported.`,
      };
  }
}
