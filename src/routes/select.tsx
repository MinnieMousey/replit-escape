import { createFileRoute } from "@tanstack/react-router";
import ShiftSelect from "@/pages/ShiftSelect";

export const Route = createFileRoute("/select")({
  head: () => ({ meta: [{ title: "Select Shift — AIS Duty Simulator" }] }),
  component: ShiftSelect,
});
