import { Metadata } from "next";
import CollectionDetailClient from "./CollectionDetailClient";

export const metadata: Metadata = {
  title: "Collection - AgentToolHub",
  description: "Curated collections of AI agent tools",
};

export default function CollectionDetailPage() {
  return <CollectionDetailClient />;
}
