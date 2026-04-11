"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Server,
  Lock,
  User,
  Save,
  Loader2,
  Send,
  CheckCircle2,
  AlertCircle,
  Shield,
  ArrowLeft,
  Eye,
  EyeOff,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
}

export default function SmtpSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [hasExistingSettings, setHasExistingSettings] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [config, setConfig] = useState<SmtpConfig>({
    host: "",
    port: 587,
    secure: false,
    user: "",
    pass: "",
    fromEmail: "",
    fromName: "FeatureFlow",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/smtp");
      if (res.status === 403) {
        router.push("/dashboard");
        toast.error("Access denied");
        return;
      }
      const data = await res.json();
      if (data.settings) {
        setConfig(data.settings);
        setHasExistingSettings(true);
      }
    } catch {
      toast.error("Failed to load SMTP settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config.host || !config.user || !config.fromEmail) {
      toast.error("Please fill in Host, Username, and From Email");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("SMTP settings saved!");
        setHasExistingSettings(true);
        if (data.settings) setConfig(data.settings);
      } else {
        toast.error(data.error || "Failed to save settings");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/smtp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testEmail: testEmail || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult({ success: true, message: data.message });
        toast.success(data.message);
      } else {
        setTestResult({ success: false, message: data.error });
        toast.error(data.error);
      }
    } catch {
      setTestResult({ success: false, message: "Connection test failed" });
      toast.error("Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/admin")}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
          <Mail className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">SMTP Settings</h1>
          <p className="text-muted-foreground text-sm">
            Configure email delivery for password resets and login links
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="p-6 rounded-2xl border border-border bg-surface shadow-sm flex gap-3">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium mb-1">SMTP is required for:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Sending password reset links to users</li>
            <li>Sending magic login links to customers</li>
            <li>Email notifications (future)</li>
          </ul>
        </div>
      </div>

      {/* Settings Form */}
      <div className="p-6 rounded-2xl border border-border bg-surface shadow-sm">
        <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
          <Server className="w-5 h-5 text-primary" />
          Server Configuration
        </h2>

        <div className="space-y-5">
          {/* Host & Port */}
          <div className="grid grid-cols-[1fr,120px] gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                SMTP Host <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={config.host}
                onChange={(e) => setConfig({ ...config, host: e.target.value })}
                placeholder="smtp.gmail.com"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Port</label>
              <input
                type="number"
                value={config.port}
                onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) || 587 })}
                placeholder="587"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
          </div>

          {/* Secure toggle */}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.secure}
                onChange={(e) => setConfig({ ...config, secure: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
            </label>
            <div>
              <span className="text-sm font-medium">Use SSL/TLS</span>
              <p className="text-xs text-muted-foreground">Enable for port 465, disable for 587 (STARTTLS)</p>
            </div>
          </div>

          {/* Credentials */}
          <div className="pt-4 border-t border-border">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4 text-muted-foreground" />
              Authentication
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Username <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={config.user}
                    onChange={(e) => setConfig({ ...config, user: e.target.value })}
                    placeholder="your@email.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Password {!hasExistingSettings && <span className="text-danger">*</span>}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={config.pass}
                    onChange={(e) => setConfig({ ...config, pass: e.target.value })}
                    placeholder={hasExistingSettings ? "Leave unchanged" : "App password / SMTP password"}
                    className="w-full pl-10 pr-12 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  For Gmail, use an App Password from Google Account settings
                </p>
              </div>
            </div>
          </div>

          {/* From settings */}
          <div className="pt-4 border-t border-border">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              Sender Details
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  From Email <span className="text-danger">*</span>
                </label>
                <input
                  type="email"
                  value={config.fromEmail}
                  onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })}
                  placeholder="noreply@yourapp.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">From Name</label>
                <input
                  type="text"
                  value={config.fromName}
                  onChange={(e) => setConfig({ ...config, fromName: e.target.value })}
                  placeholder="FeatureFlow"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-sm transition-all duration-200 hover:shadow-lg hover:shadow-primary/25 active:scale-95 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </div>

      {/* Test Connection */}
      <div className="p-6 rounded-2xl border border-border bg-surface shadow-sm">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Send className="w-5 h-5 text-primary" />
          Test Connection
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Verify your SMTP settings are working. Optionally send a test email.
        </p>

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1.5">Test email address (optional)</label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          <button
            onClick={handleTest}
            disabled={testing || !hasExistingSettings}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-surface hover:bg-muted/50 text-sm font-semibold transition-all disabled:opacity-50"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {testing ? "Testing..." : "Test"}
          </button>
        </div>

        {!hasExistingSettings && (
          <p className="text-xs text-muted-foreground mt-2">
            Save your settings first before testing the connection.
          </p>
        )}

        {testResult && (
          <div className={`mt-4 p-4 rounded-xl flex items-start gap-3 ${testResult.success
            ? "bg-success/10 border border-success/20"
            : "bg-danger/10 border border-danger/20"
            }`}>
            {testResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            )}
            <div>
              <p className={`text-sm font-medium ${testResult.success ? "text-success" : "text-danger"
                }`}>
                {testResult.success ? "Success" : "Failed"}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">{testResult.message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Common SMTP Presets */}
      <div className="p-6 rounded-2xl border border-border bg-surface shadow-sm">
        <h2 className="text-lg font-bold mb-4">Common Providers</h2>
        <div className="grid md:grid-cols-3 gap-3">
          {[
            { name: "Gmail", host: "smtp.gmail.com", port: 587, secure: false },
            { name: "Outlook", host: "smtp-mail.outlook.com", port: 587, secure: false },
            { name: "Yahoo", host: "smtp.mail.yahoo.com", port: 465, secure: true },
            { name: "SendGrid", host: "smtp.sendgrid.net", port: 587, secure: false },
            { name: "Mailgun", host: "smtp.mailgun.org", port: 587, secure: false },
            { name: "Zoho", host: "smtp.zoho.com", port: 465, secure: true },
          ].map((preset) => (
            <button
              key={preset.name}
              onClick={() =>
                setConfig({
                  ...config,
                  host: preset.host,
                  port: preset.port,
                  secure: preset.secure,
                })
              }
              className="p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
            >
              <p className="text-sm font-semibold">{preset.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {preset.host}:{preset.port}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
