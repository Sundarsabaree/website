import React from "react";
import { Link } from "react-router-dom";
import {
  Zap,
  ArrowRight,
  Users,
  TrendingUp,
  CalendarClock,
  BarChart3,
  ShieldCheck,
  Lock,
  KeyRound,
  Mail,
  Phone,
  MapPin,
  ShieldQuestion,
  Briefcase,
  Target,
} from "lucide-react";
import { Button } from "../components/ui/Button.js";

const FEATURES = [
  {
    icon: Users,
    title: "Customer Management",
    description:
      "Keep every customer record, contact, and interaction organized in one searchable workspace.",
  },
  {
    icon: Target,
    title: "Lead Pipeline",
    description:
      "Track leads from first contact to close with stage-based boards built for fast follow-up.",
  },
  {
    icon: TrendingUp,
    title: "Deal Tracking",
    description:
      "Visualize every deal's progress, value, and probability so nothing slips through the cracks.",
  },
  {
    icon: CalendarClock,
    title: "Tasks & Calendar",
    description:
      "Plan meetings, assign tasks, and stay on schedule with a shared team calendar.",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    description:
      "Turn raw activity into clear dashboards and exportable reports for better decisions.",
  },
  {
    icon: Zap,
    title: "Real-Time Notifications",
    description:
      "Get notified the moment a customer, deal, or task needs your attention.",
  },
];

const ROLES = [
  {
    icon: ShieldCheck,
    name: "Admin",
    description:
      "Full control of the workspace — manage every employee, customer, deal, and system setting.",
  },
  {
    icon: Briefcase,
    name: "Manager",
    description:
      "Oversee team performance, assign work, and track pipeline and reporting across the team.",
  },
  {
    icon: Users,
    name: "Sales Executive",
    description:
      "Manage assigned leads, customers, and deals, and stay on top of daily tasks and meetings.",
  },
];

const SECURITY_POINTS = [
  {
    icon: Lock,
    title: "Encrypted Sessions",
    description:
      "Authentication tokens are issued and refreshed securely for every session.",
  },
  {
    icon: KeyRound,
    title: "Role-Based Access",
    description:
      "Every account is scoped to an Admin, Manager, or Sales Executive role, so people only see what they need.",
  },
  {
    icon: ShieldQuestion,
    title: "Audited Activity",
    description:
      "Key actions across customers, deals, and tasks are tracked for accountability.",
  },
];

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 overflow-x-hidden">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      {/* Nav */}
      <header className="relative z-10 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-glow-primary">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-heading text-lg font-bold tracking-tight">
              Smart CRM
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#solutions" className="hover:text-white transition-colors">
              Solutions
            </a>
            <a href="#security" className="hover:text-white transition-colors">
              Security
            </a>
            <a href="#contact" className="hover:text-white transition-colors">
              Contact
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button
                variant="primary"
                size="sm"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-24 text-center">
        <h1 className="font-heading text-4xl md:text-6xl font-bold tracking-tight leading-tight">
          Run your sales team on
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">
            Smart CRM
          </span>
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-slate-400 text-lg">
          Customers, leads, deals, tasks, and reporting in a single, fast
          workspace built for Admins, Managers, and Sales Executives.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link to="/register">
            <Button
              variant="primary"
              size="lg"
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              Get Started
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="lg">
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="relative z-10 max-w-7xl mx-auto px-6 py-20"
      >
        <div className="text-center mb-14">
          <h2 className="font-heading text-3xl md:text-4xl font-bold">
            Features
          </h2>
          <p className="mt-3 text-slate-400">
            Everything your team needs to sell, in one place.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 hover:border-slate-700 transition-colors"
            >
              <div className="w-11 h-11 rounded-lg bg-blue-600/15 flex items-center justify-center mb-4">
                <feature.icon className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="font-heading text-lg font-semibold mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Solutions / Roles */}
      <section
        id="solutions"
        className="relative z-10 max-w-7xl mx-auto px-6 py-20"
      >
        <div className="text-center mb-14">
          <h2 className="font-heading text-3xl md:text-4xl font-bold">
            Solutions for every role
          </h2>
          <p className="mt-3 text-slate-400">
            Smart CRM adapts to three focused roles across your organization.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ROLES.map((role) => (
            <div
              key={role.name}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-center"
            >
              <div className="w-12 h-12 rounded-lg bg-cyan-500/15 flex items-center justify-center mx-auto mb-4">
                <role.icon className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="font-heading text-lg font-semibold mb-2">
                {role.name}
              </h3>
              <p className="text-sm text-slate-400">{role.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Security */}
      <section
        id="security"
        className="relative z-10 max-w-7xl mx-auto px-6 py-20"
      >
        <div className="text-center mb-14">
          <h2 className="font-heading text-3xl md:text-4xl font-bold">
            Security
          </h2>
          <p className="mt-3 text-slate-400">
            Built with access control and accountability in mind.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SECURITY_POINTS.map((point) => (
            <div
              key={point.title}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-6"
            >
              <div className="w-11 h-11 rounded-lg bg-emerald-600/15 flex items-center justify-center mb-4">
                <point.icon className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="font-heading text-lg font-semibold mb-2">
                {point.title}
              </h3>
              <p className="text-sm text-slate-400">{point.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section
        id="contact"
        className="relative z-10 max-w-7xl mx-auto px-6 py-20"
      >
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <h2 className="font-heading text-2xl font-bold">Contact</h2>
            <p className="mt-3 text-sm text-slate-400">
              Have questions about Smart CRM? Reach out to our team.
            </p>
          </div>
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <div className="text-sm font-medium">Email</div>
                <div className="text-sm text-slate-400">
                  support@smartcrm.app
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <div className="text-sm font-medium">Phone</div>
                <div className="text-sm text-slate-400">+1 (555) 010-2024</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <div className="text-sm font-medium">Office</div>
                <div className="text-sm text-slate-400">Remote-first team</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-500" />
            <span>Smart CRM</span>
          </div>
          <span>
            &copy; {new Date().getFullYear()} Smart CRM. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
