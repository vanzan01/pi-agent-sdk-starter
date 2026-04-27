export type SDKTextContentBlock = {
  type: 'text';
  text: string;
};

export type SDKUserMessage = {
  type?: 'user';
  message: {
    role: 'user';
    content: SDKTextContentBlock[];
  };
  parent_tool_use_id?: string | null;
  session_id?: string;
};

export type SDKUserMessageContent = SDKUserMessage['message'];
