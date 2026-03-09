"use client";

type ProjectBoardProps = {
    activeTab: "kirbai" | "factory";
};

export default function ProjectBoard({ activeTab }: ProjectBoardProps) {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold tracking-tight">Active Projects</h2>
                <span className="text-xs bg-surface px-2 py-1 rounded border border-border">
                    {activeTab === "kirbai" ? "KIRBAI" : "FACTORY"} ALERTS
                </span>
            </div>

            <div className="border border-dashed border-border flex flex-col items-center justify-center p-12 text-center text-neutral-500 text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-folder-open mb-3 opacity-50"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" /></svg>
                <p>No active projects available for {activeTab === "kirbai" ? "Kirbai" : "Factory"}.</p>
                <p className="text-xs mt-1">Awaiting system input.</p>
            </div>
        </div>
    );
}
