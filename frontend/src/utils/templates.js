// L2gether Universal Language Starter Templates for Shift + ! Template Picker

export const TEMPLATES = {
  html: [
    {
      id: 'html-boilerplate',
      name: 'HTML5 Boilerplate',
      category: 'Basic',
      description: 'Standard modern HTML5 document structure with viewport meta tag and CSS link.',
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <h1>Hello, L2gether!</h1>
  <script src="script.js"></script>
</body>
</html>`
    },
    {
      id: 'html-all-in-one',
      name: 'All-In-One Webpage (HTML + CSS + JS in Single File)',
      category: 'Single File (Neat & Self-Contained)',
      description: 'Complete modern webpage with embedded <style> and <script> tags. Perfectly aligned with responsive navbar, hero, cards, and counter.',
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>All-in-One Web App</title>
  <style>
    :root {
      --bg: #0B0D12;
      --card: #161B26;
      --text: #F4F6FB;
      --text-muted: #A2A9B8;
      --primary: #7C6CFF;
      --primary-hover: #9688FF;
      --accent: #36D6C5;
      --border: #293142;
      --radius: 12px;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* Navigation */
    header {
      background-color: rgba(22, 27, 38, 0.8);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .nav-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 1rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .logo {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .logo span {
      color: var(--primary);
    }

    nav ul {
      list-style: none;
      display: flex;
      gap: 1.5rem;
      align-items: center;
    }

    nav a {
      color: var(--text-muted);
      text-decoration: none;
      font-size: 0.95rem;
      transition: color 0.2s ease;
    }

    nav a:hover {
      color: var(--text);
    }

    /* Main Container */
    main {
      flex: 1;
      max-width: 1000px;
      width: 100%;
      margin: 0 auto;
      padding: 3rem 1.5rem;
    }

    /* Hero Section */
    .hero {
      text-align: center;
      padding: 2.5rem 1rem 4rem;
    }

    .badge {
      display: inline-block;
      padding: 0.35rem 0.85rem;
      background: rgba(124, 108, 255, 0.15);
      color: var(--primary);
      border: 1px solid rgba(124, 108, 255, 0.3);
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 1.25rem;
    }

    .hero h1 {
      font-size: clamp(2rem, 5vw, 3.25rem);
      font-weight: 800;
      line-height: 1.2;
      margin-bottom: 1rem;
      background: linear-gradient(135deg, #FFFFFF 0%, #A2A9B8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .hero p {
      font-size: 1.15rem;
      color: var(--text-muted);
      max-width: 600px;
      margin: 0 auto 2rem;
    }

    .actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn {
      padding: 0.75rem 1.75rem;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-primary {
      background: var(--primary);
      color: #fff;
    }

    .btn-primary:hover {
      background: var(--primary-hover);
      transform: translateY(-2px);
    }

    .btn-secondary {
      background: var(--card);
      color: var(--text);
      border: 1px solid var(--border);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    /* Cards Grid */
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-top: 2rem;
    }

    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.75rem;
      transition: transform 0.2s ease, border-color 0.2s ease;
    }

    .card:hover {
      transform: translateY(-3px);
      border-color: var(--primary);
    }

    .card h3 {
      font-size: 1.25rem;
      margin-bottom: 0.5rem;
      color: var(--text);
    }

    .card p {
      color: var(--text-muted);
      font-size: 0.95rem;
    }

    /* Footer */
    footer {
      border-top: 1px solid var(--border);
      padding: 2rem 1.5rem;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.9rem;
      margin-top: auto;
    }
  </style>
</head>
<body>
  <header>
    <div class="nav-container">
      <div class="logo">⚡ <span>All-In-One</span></div>
      <nav>
        <ul>
          <li><a href="#hero">Home</a></li>
          <li><a href="#features">Features</a></li>
        </ul>
      </nav>
    </div>
  </header>

  <main>
    <section id="hero" class="hero">
      <div class="badge">Single-File Architecture</div>
      <h1>HTML, CSS & JS in One Place</h1>
      <p>Clean alignment, modern styling, and zero external file requirements.</p>
      <div class="actions">
        <button id="counter-btn" class="btn btn-primary">Clicks: <span id="count">0</span></button>
        <button id="theme-btn" class="btn btn-secondary">Toggle Accent</button>
      </div>
    </section>

    <section id="features" class="grid">
      <div class="card">
        <h3>🎨 Embedded Styling</h3>
        <p>CSS is scoped inside &lt;style&gt; tags with CSS custom properties and responsive flex/grid layouts.</p>
      </div>
      <div class="card">
        <h3>⚡ Interactive Scripts</h3>
        <p>JavaScript sits right inside &lt;script&gt; with full DOM access and instant reactivity in Live Preview.</p>
      </div>
      <div class="card">
        <h3>📱 Responsive & Neat</h3>
        <p>Aligned using modern CSS box-sizing and responsive container rules for mobile, tablet, and desktop.</p>
      </div>
    </section>
  </main>

  <footer>
    <p>&copy; 2026 L2gether Workspace • Self-contained index.html</p>
  </footer>

  <script>
    let clicks = 0;
    const counterBtn = document.getElementById('counter-btn');
    const countSpan = document.getElementById('count');
    const themeBtn = document.getElementById('theme-btn');

    if (counterBtn && countSpan) {
      counterBtn.addEventListener('click', () => {
        clicks++;
        countSpan.textContent = clicks;
      });
    }

    if (themeBtn) {
      let active = false;
      themeBtn.addEventListener('click', () => {
        active = !active;
        document.documentElement.style.setProperty('--primary', active ? '#36D6C5' : '#7C6CFF');
        document.documentElement.style.setProperty('--primary-hover', active ? '#53EAD9' : '#9688FF');
      });
    }
  </script>
</body>
</html>`
    },
    {
      id: 'html-simple-page',
      name: 'Simple Webpage Layout',
      category: 'Beginner Example',
      description: 'Clean semantic layout with header, navigation, main section, and footer.',
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Simple Webpage</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 0;
      line-height: 1.6;
      background: #0B0D12;
      color: #F4F6FB;
    }
    header {
      background: #161B26;
      border-bottom: 1px solid #293142;
      padding: 1rem 2rem;
    }
    nav {
      max-width: 900px;
      margin: 0 auto;
      font-weight: 700;
      color: #7C6CFF;
    }
    main {
      max-width: 900px;
      margin: 2rem auto;
      padding: 0 1rem;
    }
    section {
      background: #161B26;
      border: 1px solid #293142;
      border-radius: 12px;
      padding: 2rem;
    }
    h2 {
      color: #7C6CFF;
      margin-top: 0;
    }
    footer {
      max-width: 900px;
      margin: 2rem auto;
      padding: 0 1rem;
      color: #A2A9B8;
      font-size: 0.9rem;
      text-align: center;
    }
  </style>
</head>
<body>
  <header>
    <nav>
      <span>L2gether</span>
    </nav>
  </header>
  <main>
    <section>
      <h2>Welcome</h2>
      <p>Start collaborating in real-time right here in your browser.</p>
    </section>
  </main>
  <footer>
    <p>&copy; 2026 L2gether Workspace</p>
  </footer>
</body>
</html>`
    }
  ],

  css: [
    {
      id: 'css-reset',
      name: 'Modern CSS Reset & Box Sizing',
      category: 'Basic',
      description: 'Standard universal box-sizing reset with sensible font and layout defaults.',
      content: `*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #333;
  background-color: #f4f4f4;
  padding: 2rem;
}`
    },
    {
      id: 'css-responsive-starter',
      name: 'Responsive Flexbox & Grid Starter',
      category: 'Advanced Starter',
      description: 'Responsive container with modern CSS grid cards and flex layout.',
      content: `:root {
  --primary: #7C6CFF;
  --bg-card: #161B26;
  --text: #F4F6FB;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.card {
  background: var(--bg-card);
  color: var(--text);
  border-radius: 12px;
  padding: 1.5rem;
}`
    }
  ],

  javascript: [
    {
      id: 'js-basic-script',
      name: 'Basic Script with Event Listener',
      category: 'Basic',
      description: 'DOM content loaded listener with interactive click counter.',
      content: `document.addEventListener('DOMContentLoaded', () => {
  console.log('Script loaded successfully in L2gether!');

  let count = 0;
  const button = document.querySelector('button');
  
  if (button) {
    button.addEventListener('click', () => {
      count++;
      console.log(\`Clicked \${count} times\`);
    });
  }
});`
    },
    {
      id: 'js-module-starter',
      name: 'ES Module with Async Fetch',
      category: 'Advanced Starter',
      description: 'Modern ES Module with async/await error handling and data fetching.',
      content: `export async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Fetch error:', error.message);
    throw error;
  }
}`
    }
  ],

  react: [
    {
      id: 'react-functional-component',
      name: 'Functional Component with Hooks',
      category: 'Basic',
      description: 'Standard modern React functional component with useState and useEffect.',
      content: `import React, { useState, useEffect } from 'react';

export default function MyComponent({ title = 'Hello L2gether' }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = \`Count: \${count}\`;
  }, [count]);

  return (
    <div className="component-card">
      <h2>{title}</h2>
      <p>Current count: {count}</p>
      <button onClick={() => setCount(prev => prev + 1)}>
        Increment
      </button>
    </div>
  );
}`
    },
    {
      id: 'react-component-props',
      name: 'Component with Typed Props',
      category: 'Beginner Example',
      description: 'Reusable UI card component accepting title, subtitle, and action handler.',
      content: `import React from 'react';

export function ActionCard({ title, description, onAction, actionLabel = 'Click me' }) {
  return (
    <div style={{ padding: '1.5rem', border: '1px solid #293142', borderRadius: '12px' }}>
      <h3>{title}</h3>
      <p style={{ color: '#A2A9B8', margin: '0.5rem 0 1rem' }}>{description}</p>
      <button onClick={onAction} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
        {actionLabel}
      </button>
    </div>
  );
}`
    }
  ],

  typescript: [
    {
      id: 'ts-typed-function',
      name: 'Typed Interface & Function',
      category: 'Basic',
      description: 'TypeScript interface declaration with typed function return and generics.',
      content: `interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: 'owner' | 'participant' | 'guest';
  createdAt: Date;
}

export function formatGreeting(user: UserProfile): string {
  return \`Welcome \${user.username} (\${user.role})!\`;
}

const sampleUser: UserProfile = {
  id: 'usr_123',
  username: 'AlexDev',
  email: 'alex@example.com',
  role: 'owner',
  createdAt: new Date()
};

console.log(formatGreeting(sampleUser));`
    }
  ],

  python: [
    {
      id: 'py-main-function',
      name: 'Main Function & Entry Point',
      category: 'Basic',
      description: 'Standard Python script structure with main() and __name__ == "__main__".',
      content: `import sys

def main():
    print("Welcome to L2gether Python Environment!")
    print(f"Python Version: {sys.version.split()[0]}")
    
    # Example calculation
    numbers = [1, 2, 3, 4, 5]
    squares = [n ** 2 for n in numbers]
    print(f"Squares of {numbers} => {squares}")

if __name__ == "__main__":
    main()`
    },
    {
      id: 'py-class-example',
      name: 'Class & Object Oriented Example',
      category: 'Beginner Example',
      description: 'Python class with constructor, methods, and representation.',
      content: `class WorkspaceParticipant:
    def __init__(self, name: str, role: str = "guest"):
        self.name = name
        self.role = role
        
    def describe(self) -> str:
        return f"{self.name} is participating as '{self.role}'."

if __name__ == "__main__":
    p1 = WorkspaceParticipant("Jordan", "developer")
    print(p1.describe())`
    }
  ],

  c: [
    {
      id: 'c-standard-starter',
      name: 'Standard C Program',
      category: 'Basic',
      description: 'Standard C program with stdio.h, command line arguments, and return code.',
      content: `#include <stdio.h>

int main(int argc, char *argv[]) {
    printf("Hello from L2gether C environment!\\n");
    
    int a = 10;
    int b = 25;
    printf("Sum of %d and %d is: %d\\n", a, b, a + b);
    
    return 0;
}`
    }
  ],

  java: [
    {
      id: 'java-main-starter',
      name: 'Standard Java Class & Main',
      category: 'Basic',
      description: 'Standard Java class declaration with public static void main.',
      content: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from L2gether Java Workspace!");
        
        int x = 42;
        System.out.println("The answer is: " + x);
    }
}`
    }
  ],

  csharp: [
    {
      id: 'cs-console-starter',
      name: 'C# Console Starter',
      category: 'Basic',
      description: 'C# Program with static void Main entry point.',
      content: `using System;

namespace L2getherWorkspace
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("Hello from L2gether C# Starter!");
        }
    }
}`
    }
  ],

  php: [
    {
      id: 'php-basic-starter',
      name: 'PHP Starter Script',
      category: 'Basic',
      description: 'Standard PHP file with opening tag and array iteration.',
      content: `<?php
echo "Hello from L2gether PHP Workspace!\\n";

$features = ['Real-time Chat', 'Code Execution', 'WebRTC Audio'];
foreach ($features as $f) {
    echo "- " . $f . "\\n";
}
?>`
    }
  ],

  sql: [
    {
      id: 'sql-query-example',
      name: 'SQL Table & Queries',
      category: 'Basic',
      description: 'DDL table definition and sample SELECT with join.',
      content: `-- Create table
CREATE TABLE participants (
    id SERIAL PRIMARY KEY,
    display_name VARCHAR(64) NOT NULL,
    role VARCHAR(16) DEFAULT 'guest',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Query participants
SELECT id, display_name, role, joined_at
FROM participants
WHERE role = 'owner'
ORDER BY joined_at DESC;`
    }
  ],

  bash: [
    {
      id: 'bash-script-starter',
      name: 'Bash Shell Script',
      category: 'Basic',
      description: 'Bash script with shebang, variables, and loop.',
      content: `#!/usr/bin/env bash
set -euo pipefail

echo "L2gether Automation Script"
echo "Current Date: $(date)"

for item in "Build" "Test" "Deploy"; do
    echo "Executing phase: $item..."
done`
    }
  ],

  go: [
    {
      id: 'go-main-starter',
      name: 'Go Package Main',
      category: 'Basic',
      description: 'Go main package with fmt.Println.',
      content: `package main

import "fmt"

func main() {
    fmt.Println("Hello from L2gether Go Workspace!")
}`
    }
  ],

  rust: [
    {
      id: 'rust-main-starter',
      name: 'Rust fn main',
      category: 'Basic',
      description: 'Standard Rust executable entry point.',
      content: `fn main() {
    println!("Hello from L2gether Rust Workspace!");
    let sum: i32 = (1..=10).sum();
    println!("Sum from 1 to 10 is: {}", sum);
}`
    }
  ],

  json: [
    {
      id: 'json-config-starter',
      name: 'Valid JSON Configuration Object',
      category: 'Basic',
      description: 'Clean formatted JSON key-value starter.',
      content: `{
  "name": "l2gether-project",
  "version": "1.0.0",
  "private": true,
  "settings": {
    "theme": "dark",
    "autosave": true,
    "tabSize": 2
  }
}`
    }
  ],

  markdown: [
    {
      id: 'md-readme-starter',
      name: 'Project README Structure',
      category: 'Basic',
      description: 'Formatted markdown document with badges, headings, and code blocks.',
      content: `# Project Title

> One link. Everything together.

## Overview
Brief description of this temporary collaborative workspace.

## Features
- Real-time collaborative code editor
- Instant audio room
- Shared file repository
- Live web preview

## Getting Started
Click **Run Code** to execute this workspace.`
    }
  ]
};

export function getTemplatesForLanguage(lang) {
  if (!lang) return TEMPLATES.html;
  const l = lang.toLowerCase();

  if (l.includes('html') || l.includes('htm')) return TEMPLATES.html;
  if (l.includes('css')) return TEMPLATES.css;
  if (l.includes('jsx') || l.includes('react')) return TEMPLATES.react;
  if (l.includes('typescript') || l.includes('ts') || l.includes('tsx')) return TEMPLATES.typescript;
  if (l.includes('javascript') || l.includes('js')) return TEMPLATES.javascript;
  if (l.includes('python') || l.includes('py')) return TEMPLATES.python;
  if (l === 'c' || l.includes('cpp') || l.includes('c++')) return TEMPLATES.c;
  if (l.includes('java')) return TEMPLATES.java;
  if (l.includes('csharp') || l.includes('c#') || l.includes('cs')) return TEMPLATES.csharp;
  if (l.includes('php')) return TEMPLATES.php;
  if (l.includes('sql')) return TEMPLATES.sql;
  if (l.includes('bash') || l.includes('sh')) return TEMPLATES.bash;
  if (l.includes('go')) return TEMPLATES.go;
  if (l.includes('rust') || l.includes('rs')) return TEMPLATES.rust;
  if (l.includes('json')) return TEMPLATES.json;
  if (l.includes('markdown') || l.includes('md')) return TEMPLATES.markdown;

  // Fallback: return array of all templates
  return Object.values(TEMPLATES).flat();
}

export function detectLanguageFromPath(filePath) {
  if (!filePath) return 'javascript';
  const ext = filePath.split('.').pop().toLowerCase();
  const map = {
    html: 'html',
    htm: 'html',
    css: 'css',
    js: 'javascript',
    jsx: 'react',
    ts: 'typescript',
    tsx: 'react',
    py: 'python',
    c: 'c',
    cpp: 'c',
    cc: 'c',
    cxx: 'c',
    h: 'c',
    hpp: 'c',
    java: 'java',
    cs: 'csharp',
    php: 'php',
    sql: 'sql',
    sh: 'bash',
    bash: 'bash',
    go: 'go',
    rs: 'rust',
    json: 'json',
    md: 'markdown'
  };
  return map[ext] || 'javascript';
}

export default { TEMPLATES, getTemplatesForLanguage, detectLanguageFromPath };
