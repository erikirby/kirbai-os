"use client";

import { Loader2 } from "lucide-react";
import React from "react";

interface StatusButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    loading?: boolean;
    loadingText?: string;
    icon?: React.ReactNode;
}

export default function StatusButton({ 
    loading, 
    loadingText, 
    icon, 
    children, 
    disabled, 
    className = "", 
    ...props 
}: StatusButtonProps) {
    return (
        <button
            {...props}
            disabled={loading || disabled}
            className={`${className} flex items-center justify-center gap-2 transition-all disabled:opacity-50`}
        >
            {loading ? (
                <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {loadingText && <span>{loadingText}</span>}
                </>
            ) : (
                <>
                    {icon}
                    {children}
                </>
            )}
        </button>
    );
}
