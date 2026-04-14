import { Metadata } from "next";
import AdminCollectionsClient from "./AdminCollectionsClient";

export const metadata: Metadata = {
  title: "Collections Admin - AgentToolHub",
};

export default function AdminCollectionsPage() {
  return <AdminCollectionsClient />;
}
