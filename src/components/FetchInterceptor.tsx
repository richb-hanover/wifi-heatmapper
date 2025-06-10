"use client";

import { useEffect } from "react";

export function FetchInterceptor() {
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      // console.log(`FETCH called: ${JSON.stringify(args)}`);
      // console.log(`window.location.hostname: ${window.location.hostname}`);

      const url = args[0] instanceof Request ? args[0].url : args[0];
      const stack = new Error().stack;

      console.log("fetch() called with:", url);
      console.log("Call stack:\n", stack);
      try {
        if (url == "") {
          console.log(`Got empty URL in FetchInterceptor`);
          return "";
        }
        const response = await originalFetch(...args);
        return response;
      } catch (err) {
        // console.log(`FETCH error: ${JSON.stringify(args)} ${err}`);
        // throw err;
        console.error("fetch error:", err, "for URL:", url);
        throw err;
      }
    };
  }, []);

  return null; // No UI
}
