import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "PASTE_YOUR_NEW_GEMINI_KEY_HERE";
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

interface RawIssue {
  layerName: string;
  type: "contrast" | "alt-text" | "touch-target" | "font-size";
  details: string;
  severity: "critical" | "warning";
}

interface ExplainedIssue extends RawIssue {
  explanation: string;
}

window.onmessage = async (event) => {
  const msg = event.data.pluginMessage;
  if (msg.type === "error") { showError(msg.message); return; }
  if (msg.type === "raw-issues") {
    const issues: RawIssue[] = msg.issues;
    if (issues.length === 0) { showNoIssues(); return; }
    showLoading(issues.length);
    const explained = await explainIssues(issues);
    showResults(explained);
  }
};

async function explainIssues(issues: RawIssue[]): Promise<ExplainedIssue[]> {
  const results: ExplainedIssue[] = [];
  for (const issue of issues) {
    try {
      const prompt = `You are a friendly accessibility expert helping a product designer understand a UI issue.

Issue type: ${issue.type}
Layer name: "${issue.layerName}"
Technical detail: ${issue.details}

Write exactly 2 sentences:
1. What the problem is and who it affects
2. A specific, actionable fix

Be direct and friendly. No jargon. No bullet points. Just 2 plain sentences.`;

      const result = await model.generateContent(prompt);
      results.push({ ...issue, explanation: result.response.text().trim() });
    } catch (e) {
      results.push({ ...issue, explanation: "Could not generate explanation. Check your API key." });
    }
  }
  return results;
}

document.getElementById("run-btn")?.addEventListener("click", () => {
  parent.postMessage({ pluginMessage: { type: "run-audit" } }, "*");
  showScanning();
});

function showScanning() {
  document.getElementById("content")!.innerHTML = `
    <div class="state-message"><div class="spinner"></div><p>Scanning layers...</p></div>`;
}

function showLoading(count: number) {
  document.getElementById("content")!.innerHTML = `
    <div class="state-message"><div class="spinner"></div>
    <p>Found ${count} issue${count !== 1 ? "s" : ""}.<br/>Getting explanations...</p></div>`;
}

function showError(message: string) {
  document.getElementById("content")!.innerHTML =
    `<div class="state-message error"><p>${message}</p></div>`;
}

function showNoIssues() {
  document.getElementById("content")!.innerHTML =
    `<div class="state-message success"><p>✓ No issues found in this frame.</p></div>`;
}

function showResults(issues: ExplainedIssue[]) {
  const critical = issues.filter((i) => i.severity === "critical");
  const warnings = issues.filter((i) => i.severity === "warning");
  let html = `<div class="summary">${issues.length} issue${issues.length !== 1 ? "s" : ""} found</div>`;
  if (critical.length > 0) html += `<div class="section-label">Critical</div>` + critical.map(renderIssue).join("");
  if (warnings.length > 0) html += `<div class="section-label">Warnings</div>` + warnings.map(renderIssue).join("");
  document.getElementById("content")!.innerHTML = html;
}

function renderIssue(issue: ExplainedIssue): string {
  const typeLabels: Record<string, string> = {
    contrast: "Low Contrast",
    "alt-text": "Missing Alt Text",
    "touch-target": "Touch Target",
    "font-size": "Font Size",
  };
  return `
  <div class="issue-card ${issue.severity}">
    <div class="issue-header">
      <span class="badge ${issue.severity}">${typeLabels[issue.type]}</span>
      <span class="layer-name">${issue.layerName}</span>
    </div>
    <p class="explanation">${issue.explanation}</p>
    <p class="technical">${issue.details}</p>
  </div>`;
}