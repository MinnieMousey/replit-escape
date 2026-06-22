import { createFileRoute } from "@tanstack/react-router";
import Report from "@/pages/Report";

export const Route = createFileRoute("/report")({
  head: () => ({ meta: [{ title: "Report — AIS Duty Simulator" }] }),
  component: Report,
});
