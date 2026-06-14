type PruneAttempt = () => boolean;

function isQuotaExceededError(error: unknown) {
  return error instanceof DOMException && (
    error.name === "QuotaExceededError" ||
    error.name === "NS_ERROR_DOM_QUOTA_REACHED"
  );
}

export function safeSetLocalStorage(key: string, value: string, pruneAttempt?: PruneAttempt) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (isQuotaExceededError(error) && pruneAttempt?.()) {
      try {
        window.localStorage.setItem(key, value);
        return true;
      } catch (retryError) {
        console.warn("[storage] quota write failed after prune", key, retryError);
        return false;
      }
    }

    console.warn("[storage] write failed", key, error);
    return false;
  }
}

export function safeRemoveLocalStorage(key: string) {
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn("[storage] remove failed", key, error);
    return false;
  }
}
