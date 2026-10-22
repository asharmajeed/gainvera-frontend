import type { Metadata } from "next";
import AccountWorkspace from "@/components/ecommerce/account-workspace";
export const metadata: Metadata = { title: "Gainvera | Account workspaces", description: "Sign in to manage your store workflows." };
export default function AccountPage() { return <AccountWorkspace />; }
