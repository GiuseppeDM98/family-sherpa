import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CredentialsSignInForm } from "./credentials-form";

export default function SignInPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Accedi</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <CredentialsSignInForm />

        <p className="text-muted-foreground text-center text-sm">
          Non hai un account?{" "}
          <Link href="/signup" className="text-primary hover:underline">
            Registrati
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
