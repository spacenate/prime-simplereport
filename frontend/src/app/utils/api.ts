interface JsonObject {
  [key: string]: any;
}

const JSON_CONTENT = "application/json";
export const headers = {
  "Content-Type": JSON_CONTENT,
  Accept: JSON_CONTENT,
};

/**
 * Helper function to handle paths with or with out leading slash
 * example:
 * joinAbsoluteUrlPath("a/b", "/c/d/", "/e", "f/g", "h") -> "/a/b/c/d/e/f/g/h"
 */
function joinAbsoluteUrlPath(...args: string[]) {
  return (
    "/" + args.map((pathPart) => pathPart.replace(/(^\/|\/$)/g, "")).join("/")
  );
}

class FetchClient {
  basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  getURL = (path: string) => {
    if (!process.env.REACT_APP_BACKEND_URL) {
      throw Error("process.env.REACT_APP_BACKEND_URL is falsy");
    }
    return new URL(
      joinAbsoluteUrlPath(this.basePath, path),
      process.env.REACT_APP_BACKEND_URL
    ).href;
  };

  getOptions = (body: JsonObject | null): RequestInit => {
    return {
      method: "POST",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    };
  };

  request = async (path: string, body: JsonObject | null) => {
    const res = await fetch(this.getURL(path), this.getOptions(body));
    if (!res.ok) {
      throw res;
    }
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.indexOf(JSON_CONTENT) !== -1) {
      try {
        return await res.json();
      } catch {
        throw new Error("Invalid JSON response");
      }
    } else {
      return "success";
    }
  };
}

export default FetchClient;