import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://audiohub.tools";

  const routes = [
    "",
    "/converter",
    "/pitch-shifter",
    "/waveform-generator",
    "/bpm-key-detector",
    "/silence-remover",
    "/normalizer",
    "/spatial-8d",
    "/stereo-widener",
    "/vocal-remover", // <-- Просто добавляете новую строку
    "/pricing",       // <-- И для страницы тарифов
    "/privacy",
    "/terms",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: route === "" ? 1.0 : 0.8,
  }));
}