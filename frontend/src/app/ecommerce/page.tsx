import type { Metadata } from "next";
import EcommercePreview from "@/components/ecommerce/ecommerce-preview";

export const metadata: Metadata = {
  title: "Gainvera | E-commerce development preview",
  description: "Explore store workspaces and workflow inputs with clearly labelled development fixtures.",
};

export default function EcommercePage() {
  return <EcommercePreview />;
}
