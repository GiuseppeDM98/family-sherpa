import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignUpForm } from "./signup-form";

export default function SignUpPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Crea un account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SignUpForm />
        <p className="text-muted-foreground text-center text-sm">
          Hai già un account?{" "}
          <Link href="/signin" className="text-primary hover:underline">
            Accedi
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
