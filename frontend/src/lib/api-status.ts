type Listener = (error: string | null) => void;

let apiError: string | null = null;
const listeners = new Set<Listener>();

export function setApiError(message: string | null) {
  apiError = message;
  listeners.forEach((listener) => listener(apiError));
}

export function clearApiError() {
  setApiError(null);
}

export function getApiError() {
  return apiError;
}

export function subscribeApiError(listener: Listener) {
  listeners.add(listener);
  listener(apiError);
  return () => {
    listeners.delete(listener);
  };
}
