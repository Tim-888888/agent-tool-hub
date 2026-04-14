import type { Metadata } from "next";
import NewsletterClient from "./NewsletterClient";

export const metadata: Metadata = {
  title: "Newsletter Management",
};

export default function NewsletterPage() {
  return <NewsletterClient />;
}
