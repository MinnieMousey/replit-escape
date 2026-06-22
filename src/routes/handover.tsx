import { createFileRoute } from "@tanstack/react-router";
import Handover from "@/pages/Handover";

export const Route = createFileRoute("/handover")({
  head: () => ({ meta: [{ title: "Handover — AIS Duty Simulator" }] }),
  component: Handover,
});
