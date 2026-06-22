import { createFileRoute } from "@tanstack/react-router";
import Practice from "@/pages/Practice";

export const Route = createFileRoute("/practice")({
  head: () => ({ meta: [{ title: "Practice — AIS Duty Simulator" }] }),
  component: Practice,
});
