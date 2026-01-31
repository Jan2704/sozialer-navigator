import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "../../lib/utils"

interface ProCardProps extends React.HTMLAttributes<HTMLDivElement> {
    as?: React.ElementType
    hoverEffect?: boolean
    gradient?: boolean
}

const ProCard = React.forwardRef<HTMLDivElement, ProCardProps>(
    ({ className, children, as: Component = "div", hoverEffect = true, gradient = false, ...props }, ref) => {

        const MotionComponent = motion(Component as any)

        return (
            <MotionComponent
                ref={ref}
                initial={false}
                className={cn(
                    "relative overflow-hidden rounded-[2rem] bg-white border border-slate-100",
                    "shadow-[0_20px_40px_-10px_rgba(0,0,0,0.08)]",
                    "transition-all duration-500 ease-out",
                    hoverEffect && "hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.12)] hover:-translate-y-1",
                    gradient && "bg-gradient-to-br from-white to-slate-50/50",
                    className
                )}
                whileHover={hoverEffect ? { scale: 1.005 } : undefined}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                {...props}
            >
                {children}
            </MotionComponent>
        )
    }
)
ProCard.displayName = "ProCard"

export { ProCard }
