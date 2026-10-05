import type { ReactNode, ComponentProps, HTMLAttributes } from "react"
import type { LucideIcon } from "lucide-react"
export type Page = "login" | "overview" | "report" | "analysis" | "detail" | "issues" | "admin" | "manage" | "design" | "notices" | "services" | "events" | "lost" | "analytics" | "activity" | "campus-ai" | "scholarships" | "department" | "profile"
export function Icon({
  as: C,
  size = 20,
  className = "",
}: {
  as: LucideIcon
  size?: number
  className?: string
}) {
  return (
    <C size={size} strokeWidth={1.5} className={className} aria-hidden="true" />
  )
}
export function Button({
  children,
  icon,
  variant = "primary",
  onClick,
  disabled = false,
  className = "",
  type = "button",
}: {
  children: ReactNode
  icon?: LucideIcon
  variant?: "primary" | "secondary" | "ghost" | "danger"
  onClick?: () => void
  disabled?: boolean
  className?: string
  type?: "button" | "submit"
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`btn btn-${variant} ${className}`}
    >
      {icon && <Icon as={icon} size={17} />}
      {children}
    </button>
  )
}
export function Badge({
  children,
  tone = "neutral",
  icon,
}: {
  children: ReactNode
  tone?: "neutral" | "critical" | "warning" | "success" | "blue" | "violet"
  icon?: LucideIcon
}) {
  return (
    <span className={`badge badge-${tone}`}>
      {icon && <Icon as={icon} size={13} />}
      {children}
    </span>
  )
}
export function Card({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return <section className={`card ${className}`}>{children}</section>
}
export function SectionTitle({
  title,
  aside,
}: {
  title: string
  aside?: ReactNode
}) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {aside}
    </div>
  )
}

// The app's semantic form and typography primitives keep new screens on the same control layer.
export function Action(props: ComponentProps<"button">) {
  return <button type="button" {...props} />
}
export function TextField(props: ComponentProps<"input">) {
  return <input {...props} />
}
export function SelectField(props: ComponentProps<"select">) {
  return <select {...props} />
}
export function TextAreaField(props: ComponentProps<"textarea">) {
  return <textarea {...props} />
}
export function Heading({
  level,
  ...props
}: HTMLAttributes<HTMLHeadingElement> & { level: 1 | 2 | 3 }) {
  const Tag = `h${level}` as "h1" | "h2" | "h3"
  return <Tag {...props} />
}
