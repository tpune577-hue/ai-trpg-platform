import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger'
    children: React.ReactNode
}

export default function Button({
    variant = 'primary',
    className = '',
    children,
    ...props
}: ButtonProps) {
    const baseStyles = 'px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

    const variantStyles = {
        primary: 'bg-amber-500 hover:bg-amber-600 text-white',
        secondary: 'bg-slate-700 hover:bg-slate-600 text-white',
        danger: 'bg-red-500 hover:bg-red-600 text-white',
    }

    return (
        <button
            className={`${baseStyles} ${variantStyles[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    )
}
