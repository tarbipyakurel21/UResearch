import type { Metadata } from "next";
import { JsonVisualizer } from "@/components/json-visualizer/JsonVisualizer";

export const metadata: Metadata = {
    title: "Visualize JSON · UResearch",
    description: "Explore JSON files as interactive charts, tables, trees, and formatted data.",
};

export default function VisualizePage() {
    return <JsonVisualizer />;
}
