import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CLIENT_ERROR_MESSAGE, recordClientError } from "../src/lib/client-errors";
import { CONTENT_SECURITY_POLICY, contentSecurityPolicy } from "../src/lib/csp";
import { publicPath } from "../src/lib/public-path";
import { HabitsErrorFallback } from "../src/components/error-boundary";

describe("publicPath", () => {
  it("keeps an empty base for a user site and local dev", () => {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
    expect(publicPath("/flags.json")).toBe("/flags.json");
  });

  it("prefixes a project-page base without a trailing slash", () => {
    process.env.NEXT_PUBLIC_BASE_PATH = "/habits/";
    expect(publicPath("/flags.json")).toBe("/habits/flags.json");
    delete process.env.NEXT_PUBLIC_BASE_PATH;
  });
});

describe("client error log", () => {
  it("stores a generic message and drops a hostile previous log", () => {
    const memory = new Map<string, string>();
    memory.set("habit-tracker:errors", JSON.stringify([{ message: "secret stack", at: "x" }]));
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
    };
    recordClientError(storage, new Date("2026-10-10T12:00:00.000Z"));
    const saved = memory.get("habit-tracker:errors") ?? "";
    expect(saved).toContain(CLIENT_ERROR_MESSAGE);
    expect(saved).not.toContain("secret stack");
    expect(saved).not.toContain("Error:");
  });
});

describe("content security policy", () => {
  it("allows the Next inline bootstrap and blocks eval and objects", () => {
    expect(CONTENT_SECURITY_POLICY).toContain("script-src 'self' 'unsafe-inline'");
    expect(CONTENT_SECURITY_POLICY).not.toContain("unsafe-eval");
    expect(CONTENT_SECURITY_POLICY).not.toContain("frame-ancestors");
    expect(CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
  });

  it("allows eval only while the local dev server is running", () => {
    expect(contentSecurityPolicy("development")).toContain("'unsafe-eval'");
    expect(contentSecurityPolicy("production")).not.toContain("unsafe-eval");
  });
});

describe("HabitsErrorFallback", () => {
  it("shows a reload path and no stack trace", () => {
    const html = renderToStaticMarkup(createElement(HabitsErrorFallback));
    expect(html).toContain("Saved habits on this device were not cleared.");
    expect(html).toContain("Reload");
    expect(html).not.toContain("stack");
  });
});
