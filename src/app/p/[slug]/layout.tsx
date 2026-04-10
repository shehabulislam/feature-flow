import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Map, FileText, Zap } from "lucide-react";
import PublicHeaderActions from "@/components/PublicHeaderActions";

export default async function PublicProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const project = await prisma.project.findUnique({
    where: { slug },
    select: {
      name: true,
      slug: true,
      primaryColor: true,
      description: true,
      logoUrl: true,
      customCss: true,
      hideAppName: true,
    },
  });

  if (!project) notFound();

  const navItems = [
    { href: `/p/${slug}/feedback`, icon: MessageSquare, label: "Feedback" },
    { href: `/p/${slug}/roadmap`, icon: Map, label: "Roadmap" },
    { href: `/p/${slug}/changelog`, icon: FileText, label: "Changelog" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {project.customCss && (
        <style dangerouslySetInnerHTML={{ __html: project.customCss }} />
      )}
      {/* Public header */}
      <header className="border-b border-border bg-surface/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {project.logoUrl ? (
              <img src={project.logoUrl} alt={project.name} className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: project.primaryColor }}
              >
                <Zap className="w-4 h-4 text-white" />
              </div>
            )}
            {/* Item 9: only show name if hideAppName is false */}
            {!project.hideAppName && (
              <span className="text-lg font-bold">{project.name}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              ))}
            </nav>
            <PublicHeaderActions />
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      {/* Powered by */}
      <footer className="py-6 text-center border-t border-border">
        <Link
          href="/"
          className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          Powered by FeatureFlow
        </Link>
      </footer>
    </div>
  );
}
