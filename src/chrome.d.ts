declare namespace chrome {
  namespace action {
    function setIcon(details: { path: string | Record<number, string> }): Promise<void>;
  }

  namespace runtime {
    const lastError: { message?: string } | undefined;

    function sendMessage<TResponse = unknown>(
      message: unknown,
      responseCallback?: (response: TResponse) => void
    ): void;

    namespace onMessage {
      function addListener(
        callback: (
          message: unknown,
          sender: unknown,
          sendResponse: (response?: unknown) => void
        ) => boolean | void
      ): void;
    }
  }

  namespace i18n {
    function getMessage(messageName: string, substitutions?: string | string[]): string;
    function getUILanguage(): string;
  }

  namespace storage {
    type StorageChange = {
      oldValue?: unknown;
      newValue?: unknown;
    };

    const local: {
      get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
    };

    namespace onChanged {
      function addListener(
        callback: (changes: Record<string, StorageChange>, areaName: string) => void
      ): void;
    }
  }
}
