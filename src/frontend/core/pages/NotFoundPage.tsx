import { Link } from "react-router";
import { Button } from "@/core/components/ui/button";
import { Card, CardContent } from "@/core/components/ui/card";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <Card className="w-full max-w-sm border-border/60 bg-card text-center">
        <CardContent className="flex flex-col items-center gap-6 pt-8 pb-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-bold text-foreground">404</h1>
            <p className="text-sm text-muted-foreground">
              This page does not exist in any known realm.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/">Return Home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
