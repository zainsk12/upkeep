import {
  Zap,
  Droplets,
  Sparkles,
  Hammer,
  Wind,
  Paintbrush2,
  Bug,
} from "lucide-react";

/**
 * Single source of truth for all services used across
 * LandingPage, ServicesPage, and MyBookingsPage.
 */
const SERVICES = [
  {
    id: "electrical",
    name: "Electrical",
    icon: Zap,
    description:
      "Safe, certified electrical repairs, installations, and wiring solutions for your home or office.",
    color: "text-amber-500",
    bg: "bg-amber-50",
    border: "border-amber-100",
  },
  {
    id: "plumbing",
    name: "Plumbing",
    icon: Droplets,
    description:
      "Leak fixes, pipe repairs, drain cleaning, and full plumbing installations — done right.",
    color: "text-blue-500",
    bg: "bg-blue-50",
    border: "border-blue-100",
  },
  {
    id: "cleaning",
    name: "Cleaning",
    icon: Sparkles,
    description:
      "Deep home cleaning, sanitisation, and regular upkeep services tailored to your schedule.",
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
  },
  {
    id: "carpentry",
    name: "Carpentry",
    icon: Hammer,
    description:
      "Custom furniture assembly, door and window repairs, and woodwork crafted with precision.",
    color: "text-orange-500",
    bg: "bg-orange-50",
    border: "border-orange-100",
  },
  {
    id: "ac-service",
    name: "AC Service",
    icon: Wind,
    description:
      "AC installation, deep cleaning, gas refill, and annual maintenance to keep you cool.",
    color: "text-sky-500",
    bg: "bg-sky-50",
    border: "border-sky-100",
  },
  {
    id: "painting",
    name: "Painting",
    icon: Paintbrush2,
    description:
      "Interior and exterior painting with premium paints and expert finishing — no mess left behind.",
    color: "text-violet-500",
    bg: "bg-violet-50",
    border: "border-violet-100",
  },
  {
    id: "pest-control",
    name: "Pest Control",
    icon: Bug,
    description:
      "Professional pest control services detect, eliminate, and prevent household pests to ensure a safe, sanitary, and bug-free environment.",
    color: "text-lime-600",
    bg: "bg-lime-50",
    border: "border-lime-100",
  },
];

export default SERVICES;