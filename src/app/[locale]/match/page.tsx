import { Metadata } from "next";
import MatchClient from "./MatchClient";

export const metadata: Metadata = {
  title: "AI Tool Match - AgentToolHub",
  description: "Find the best AI agent tools matched to your needs",
};

export default function MatchPage() {
  return <MatchClient />;
}
