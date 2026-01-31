import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "../../lib/utils"
import { AlertCircle } from "lucide-react"

interface ProInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string
    error?: string
    helperText?: string
}

const ProInput = React.forwardRef<HTMLInputElement, ProInputProps>(
    ({ className, label, error, helperText, id, ...props }, ref) => {
        const inputId = id || React.useId()
        const [isFocused, setIsFocused] = React.useState(false)
        const [hasValue, setHasValue] = React.useState(!!props.value || !!props.defaultValue)

        const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
            setIsFocused(true)
            props.onFocus?.(e)
        }

        const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            setIsFocused(false)
            setHasValue(!!e.target.value)
            props.onBlur?.(e)
        }

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setHasValue(!!e.target.value)
            props.onChange?.(e)
        }

        const isActive = isFocused || hasValue

        return (
            <div className="w-full space-y-1">
                <div className="relative">
                    <motion.label
                        htmlFor={inputId}
                        className={cn(
                            "absolute left-4 pointer-events-none transition-all duration-200 ease-out origin-left",
                            isActive ? "top-3 text-[10px] font-bold uppercase tracking-widest text-brand-blue" : "top-4 text-sm font-medium text-slate-500",
                            error && isActive && "text-red-500",
                            error && !isActive && "text-red-500/80"
                        )}
                        animate={{
                            y: isActive ? -2 : 0,
                            scale: isActive ? 1 : 1
                        }}
                    >
                        {label}
                    </motion.label>
                    <input
                        id={inputId}
                        ref={ref}
                        className={cn(
                            "flex w-full rounded-2xl border-2 bg-slate-50 px-4 pt-6 pb-2 text-sm font-medium shadow-sm transition-all duration-200",
                            "border-transparent hover:bg-slate-100",
                            "focus-visible:outline-none focus-visible:ring-0 focus-visible:bg-white focus-visible:border-brand-blue",
                            error && "border-red-200 bg-red-50 focus-visible:border-red-500 text-red-900",
                            className
                        )}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        onChange={handleChange}
                        aria-invalid={!!error}
                        {...props}
                    />
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="absolute right-4 top-4 text-red-500"
                            >
                                <AlertCircle className="h-5 w-5" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                {error ? (
                    <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs font-medium text-red-500 px-4"
                    >
                        {error}
                    </motion.p>
                ) : helperText ? (
                    <p className="text-xs text-slate-500 px-4">{helperText}</p>
                ) : null}
            </div>
        )
    }
)
ProInput.displayName = "ProInput"

export { ProInput }
