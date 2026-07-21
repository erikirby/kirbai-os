"use client";

import { Loader2 } from "lucide-react";
import React from "react";

interface StatusButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    loading?: boolean;
    loadingText?: string;
    icon?: React.ReactNode;
    variant?: "primary" | "secondary" | "ghost";
}

export default function StatusButton({ 
    loading, 
    loadingText, 
    icon, 
    children, 
    disabled, 
    className = "", 
    variant = "primary",
    ...props 
}: StatusButtonProps) {
    const variantClass = {
        primary: "btn-primary",
        secondary: "btn-secondary",
        ghost: "btn-ghost",
    }[variant];

    return (
        <button
            {...props}
            disabled={loading || disabled}
            className={`${variantClass} ${className}`}
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
