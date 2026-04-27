import TemplateApp from './_template';
import AiNewsTweetApp from './ai-news-tweet';
import ChatApp from './chat';

export function getAppComponent(appId: string) {
  switch (appId) {
    case 'chat':
      return ChatApp;
    case 'ai-news-tweet':
      return AiNewsTweetApp;
    case '_template':
      return TemplateApp;
    default:
      return null;
  }
}

// Wrapper component that renders the appropriate app based on appId
// This avoids the "component created during render" lint error
export function AppRenderer({ appId, isPopout: _isPopout }: { appId: string; isPopout?: boolean }) {
  switch (appId) {
    case 'chat':
      return <ChatApp />;
    case 'ai-news-tweet':
      return <AiNewsTweetApp />;
    case '_template':
      return <TemplateApp />;
    default:
      return null;
  }
}
