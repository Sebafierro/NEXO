import { cn } from "cn";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Action =
  | { label: string; onClick: () => void; href?: never }
  | { label: string; href: string; onClick?: never };

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: Action;
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-12 px-4", className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      {description ? <p className="mt-2 text-sm text-muted-foreground max-w-sm">{description}</p> : null}
      {action ? (
        <div className="mt-6">
          {action.href ? (
            <Button asChild>
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button onClick={action.onClick}>{action.label}</Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
