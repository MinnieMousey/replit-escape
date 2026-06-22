import { createFileRoute } from "@tanstack/react-router";
import Shift from "@/pages/Shift";

export const Route = createFileRoute("/shift")({
  head: () => ({ meta: [{ title: "Shift — AIS Duty Simulator" }] }),
  component: Shift,
});
