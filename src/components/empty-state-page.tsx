import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function EmptyStatePage({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-4 py-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-muted-foreground font-normal">
            In arrivo…
          </CardTitle>
        </CardHeader>
        {children ? <CardContent>{children}</CardContent> : null}
      </Card>
    </div>
  );
}
