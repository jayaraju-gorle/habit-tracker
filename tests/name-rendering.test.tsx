import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HabitName } from "../src/components/habit-name";

describe("HabitName", () => {
  it("renders a habit name as text, not markup", () => {
    const name = '<img src=x onerror="alert(1)">';
    const html = renderToStaticMarkup(createElement(HabitName, { id: "habit-read", name }));

    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(html).not.toContain("<img");
    expect(html).toContain('for="habit-habit-read"');
  });
});
