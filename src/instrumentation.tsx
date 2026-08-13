import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Dialog } from "@radix-ui/react-dialog";
import { ChevronDown, ExternalLink } from "lucide-react";
import React, { useEffect, useState } from "react";

type SyncError = {
  error: string;
  stack: string;
  filename: string;
  lineno: number;
  colno: number;
};

type AsyncError = {
  error: string;
  stack: string;
};

type GenericError = SyncError | AsyncError;

async function reportErrorToVly(errorData: {
  error: string;
  stackTrace?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
}) {
  const appId = import.meta.env.VITE_VLY_APP_ID;
  const monitoringUrl = import.meta.env.VITE_VLY_MONITORING_URL;

  if (!appId || !monitoringUrl) {
    return;
  }

  try {
    await fetch(monitoringUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...errorData,
        url: window.location.href,
        projectSemanticIdentifier: appId,
      }),
    });
  } catch (error) {
    console.error("Failed to report error to Vly:", error);
  }
}

function ErrorDialog({
  error,
  setError,
}: {
  error: GenericError;
  setError: (error: GenericError | null) => void;
}) {
  const errorText =
    error.stack || error.error || "Unknown runtime error";

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) {
          setError(null);
        }
      }}
    >
      <DialogContent className="bg-red-700 text-white max-w-4xl">
        <DialogHeader>
          <DialogTitle>Runtime Error</DialogTitle>
        </DialogHeader>

        <div>
          A runtime error occurred. Open the Vly editor to automatically
          debug the error.
        </div>

        <div className="mt-4">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <div className="flex items-center font-bold cursor-pointer">
                See error details
                <ChevronDown className="ml-1" />
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent className="max-w-[460px]">
              <div className="mt-2 p-3 bg-neutral-800 rounded text-white text-sm overflow-x-auto max-h-60 max-w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <pre className="whitespace-pre-wrap break-words">
                  {errorText}
                </pre>

                {"filename" in error && error.filename && (
                  <div className="mt-3 border-t border-neutral-600 pt-2">
                    <div>
                      <strong>File:</strong> {error.filename}
                    </div>

                    <div>
                      <strong>Line:</strong> {error.lineno}
                    </div>

                    <div>
                      <strong>Column:</strong> {error.colno}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <DialogFooter>
          <a
            href={`https://vly.ai/project/${import.meta.env.VITE_VLY_APP_ID}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button>
              <ExternalLink className="mr-2" />
              Open editor
            </Button>
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ErrorBoundaryState = {
  hasError: boolean;
  error: GenericError | null;
};

class ErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
  },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error: {
        error: error.message || "Unknown runtime error",
        stack: error.stack || "",
      },
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const stack =
      info.componentStack ||
      error.stack ||
      "";

    console.error("React Runtime Error:", error);
    console.error("Component Stack:", info.componentStack);

    reportErrorToVly({
      error: error.message || "Unknown runtime error",
      stackTrace: stack,
    });

    this.setState({
      hasError: true,
      error: {
        error: error.message || "Unknown runtime error",
        stack,
      },
    });
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <ErrorDialog
          error={this.state.error}
          setError={() => {
            this.setState({
              hasError: false,
              error: null,
            });
          }}
        />
      );
    }

    return this.props.children;
  }
}

export function InstrumentationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [error, setError] = useState<GenericError | null>(null);

  useEffect(() => {
    const handleError = async (event: ErrorEvent) => {
      try {
        console.error("Global Runtime Error:", event);

        /*
         * Ignore resource loading errors.
         *
         * For example:
         * <script>
         * <img>
         * <link>
         *
         * failed to load should NOT be treated as a
         * JavaScript runtime error.
         */
        if (
          event.target &&
          event.target !== window &&
          event.target instanceof Element
        ) {
          console.warn(
            "Ignoring resource loading error:",
            event.target
          );
          return;
        }

        const message =
          event.message ||
          event.error?.message ||
          "Unknown runtime error";

        const stack =
          event.error?.stack ||
          "";

        const errorData: SyncError = {
          error: message,
          stack,
          filename: event.filename || "",
          lineno: event.lineno || 0,
          colno: event.colno || 0,
        };

        setError(errorData);

        await reportErrorToVly({
          error: message,
          stackTrace: stack,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        });
      } catch (error) {
        console.error(
          "Error in handleError:",
          error
        );
      }
    };

    const handleRejection = async (
      event: PromiseRejectionEvent
    ) => {
      try {
        console.error(
          "Unhandled Promise Rejection:",
          event.reason
        );

        let message = "Unhandled Promise Rejection";
        let stack = "";

        if (event.reason instanceof Error) {
          message =
            event.reason.message ||
            message;

          stack =
            event.reason.stack ||
            "";
        } else if (
          typeof event.reason === "string"
        ) {
          message = event.reason;
        } else if (
          event.reason &&
          typeof event.reason === "object"
        ) {
          message =
            event.reason.message ||
            JSON.stringify(event.reason);

          stack =
            event.reason.stack ||
            "";
        }

        const errorData: AsyncError = {
          error: message,
          stack,
        };

        setError(errorData);

        await reportErrorToVly({
          error: message,
          stackTrace: stack,
        });
      } catch (error) {
        console.error(
          "Error in handleRejection:",
          error
        );
      }
    };

    window.addEventListener(
      "error",
      handleError
    );

    window.addEventListener(
      "unhandledrejection",
      handleRejection
    );

    return () => {
      window.removeEventListener(
        "error",
        handleError
      );

      window.removeEventListener(
        "unhandledrejection",
        handleRejection
      );
    };
  }, []);

  return (
    <>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>

      {error && (
        <ErrorDialog
          error={error}
          setError={setError}
        />
      )}
    </>
  );
}
