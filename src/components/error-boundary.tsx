"use client";

import { Component, type ReactNode } from "react";
import { recordClientError } from "@/lib/client-errors";

type Props = { children: ReactNode };
type State = { failed: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(): void {
    recordClientError(window.localStorage);
  }

  render() {
    if (this.state.failed) return <HabitsErrorFallback />;
    return this.props.children;
  }
}

export function HabitsErrorFallback() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-serif text-4xl tracking-tight">Habits hit a problem</h1>
      <p className="mt-3 text-sm" role="alert">
        This page could not finish loading. Saved habits on this device were not cleared.
      </p>
      <button
        type="button"
        className="mt-4 h-10 w-fit rounded-md bg-[var(--green)] px-4 text-sm text-[var(--sheet)]"
        onClick={() => window.location.reload()}
      >
        Reload
      </button>
    </main>
  );
}
