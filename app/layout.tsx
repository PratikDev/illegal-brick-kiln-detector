import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const instrumentSansHeading = Instrument_Sans({subsets:['latin'],variable:'--font-heading'});

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Illegal Brick Kiln Detector",
	description: "Illegal Brick Kiln Detector",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, instrumentSansHeading.variable)}
		>
			<body className="flex min-h-full flex-col">
				{children}
				<Toaster position="top-right" />
			</body>
		</html>
	);
}
