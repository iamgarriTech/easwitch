import { createRequire } from "node:module";
import { defineConfig } from "vitepress";

const { version } = createRequire(import.meta.url)("../../package.json") as { version: string };

export default defineConfig({
  title: "EASwitch",
  description: "Use multiple Expo/EAS accounts on one machine, without logging in and out.",
  base: "/easwitch/",
  cleanUrls: true,
  lastUpdated: true,
  // docs/demo holds the recording script for the README GIF, not pages.
  srcExclude: ["demo/**"],
  head: [["link", { rel: "icon", href: "/easwitch/favicon.svg", type: "image/svg+xml" }]],

  themeConfig: {
    logo: "/favicon.svg",
    nav: [
      { text: "Guide", link: "/guide/getting-started", activeMatch: "/guide/" },
      { text: "Reference", link: "/reference/commands", activeMatch: "/reference/" },
      { text: "FAQ", link: "/faq" },
      {
        text: `v${version}`,
        items: [
          { text: "Changelog", link: "https://github.com/iamgarriTech/easwitch/blob/main/CHANGELOG.md" },
          { text: "npm", link: "https://www.npmjs.com/package/easwitch" },
          { text: "Contributing", link: "https://github.com/iamgarriTech/easwitch/blob/main/CONTRIBUTING.md" },
        ],
      },
    ],

    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Getting started", link: "/guide/getting-started" },
          { text: "Example: working at Acme", link: "/guide/example-workflow" },
          { text: "Linking projects", link: "/guide/linking-projects" },
          { text: "Use plain eas (shell hook)", link: "/guide/shell-hook" },
          { text: "How it works", link: "/guide/how-it-works" },
          { text: "Scripts and AI agents", link: "/guide/scripts-and-agents" },
        ],
      },
      {
        text: "Reference",
        items: [
          { text: "Commands", link: "/reference/commands" },
          { text: "Environment and files", link: "/reference/environment" },
        ],
      },
      { text: "FAQ", link: "/faq" },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/iamgarriTech/easwitch" },
      { icon: "npm", link: "https://www.npmjs.com/package/easwitch" },
    ],

    search: { provider: "local" },

    editLink: {
      pattern: "https://github.com/iamgarriTech/easwitch/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },

    footer: {
      message: "Released under the MIT License. Not affiliated with Expo.",
      copyright: "EASwitch contributors",
    },
  },
});
