import { Suspense } from "react";
import type { Metadata } from "next";
import CompareClient from "./CompareClient";

export const metadata: Metadata = {
  title: "Compare Tools",
  description: "Compare AI agent tools side by side — MCP Servers, Skills, and Rules.",
};

export default function ComparePage() {
  return (
    <Suspense>
      <CompareClient />
    </Suspense>
  );
}
