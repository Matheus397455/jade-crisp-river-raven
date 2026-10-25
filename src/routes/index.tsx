import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import siteBody from "../site-body.html?raw";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    setHtml(siteBody);
  }, []);

  useEffect(() => {
    if (!html) return;
    const s = document.createElement("script");
    s.src = "/site.js";
    s.async = false;
    document.body.appendChild(s);
    return () => {
      s.remove();
    };
  }, [html]);

  if (!html) return <div id="gordao" />;
  return <div id="gordao" dangerouslySetInnerHTML={{ __html: html }} />;
}
