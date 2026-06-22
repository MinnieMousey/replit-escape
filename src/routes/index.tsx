import { createFileRoute } from "@tanstack/react-router";
import Login from "@/pages/Login";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AIS Duty Simulator" },
      { name: "description", content: "Aeronautical Information Services duty simulator — practice shifts, flight plans, NOTAMs, METARs and more." },
    ],
  }),
  component: Login,
});
