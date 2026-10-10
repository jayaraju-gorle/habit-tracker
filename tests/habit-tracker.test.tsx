import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HabitTracker } from "../src/components/habit-tracker";

describe("HabitTracker first render", () => {
  it("omits the local date so the server and browser markup match", () => {
    const html = renderToStaticMarkup(createElement(HabitTracker));

    expect(html).toContain("Loading habits");
    expect(html).not.toMatch(/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/);
  });
});
