import * as React from "react"
import { motion, type HTMLMotionProps } from "framer-motion"
import { cn } from "../../lib/utils"
import { Loader2 } from "lucide-react"

interface ProButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "ghost" | "outline"
    size?: "sm" | "md" | "lg"
    isLoading?: boolean
    leftIcon?: React.ReactNode
    rightIcon?: React.ReactNode
}

const ProButton = React.forwardRef<HTMLButtonElement, ProButtonProps>(
    ({ className, variant = "primary", size = "md", isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {

        const variants = {
            primary: "bg-brand-blue text-white shadow-lg shadow-brand-blue/20 hover:shadow-brand-blue/30 hover:bg-brand-blue/90",
            secondary: "bg-brand-slate text-white shadow-lg shadow-brand-slate/20 hover:shadow-brand-slate/30 hover:bg-brand-slate/90",
            ghost: "bg-transparent text-slate-600 hover:bg-slate-50 hover:text-brand-slate",
            outline: "bg-transparent border-2 border-slate-200 text-slate-700 hover:border-brand-slate hover:text-brand-slate"
        }

        const sizes = {
            sm: "h-9 px-4 text-xs rounded-full",
            md: "h-12 px-6 text-sm rounded-full",
            lg: "h-14 px-8 text-base rounded-full"
        }

        return (
            <motion.button
                ref={ref}
                whileTap={{ scale: 0.98 }}
                whileHover={{ scale: 1.02 }}
                className={cn(
                    "inline-flex items-center justify-center font-bold tracking-wide transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2",
                    "disabled:pointer-events-none disabled:opacity-50",
                    variants[variant],
                    sizes[size],
                    className
                )}
                disabled={disabled || isLoading}
                {...props as HTMLMotionProps<"button">}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
                {children}
                {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
            </motion.button>
        )
    }
)
ProButton.displayName = "ProButton"

export { ProButton }
