import { Suspense } from "react";
import ToolsClient from "../[locale]/tools/ToolsClient";

export default function ToolsPage() {
  return (
    <Suspense>
      <ToolsClient />
    </Suspense>
  );
}
