export interface MeetingMinutes {
  executiveSummary: string;
  decisions: string[];
  actionItems: string[];
}

export class Exporter {
  static exportMarkdown(data: MeetingMinutes, transcript: string): Blob {
    let md = `# 🎙️ RecallOS Meeting Minutes\n\n`;
    
    md += `## 📋 Executive Summary\n${data.executiveSummary || 'No summary generated.'}\n\n`;
    
    md += `## ⚖️ Decisions Made\n`;
    if (data.decisions && data.decisions.length > 0) {
      data.decisions.forEach(d => md += `- ${d}\n`);
    } else {
      md += `- None recorded.\n`;
    }
    
    md += `\n## 🚀 Action Items\n`;
    if (data.actionItems && data.actionItems.length > 0) {
      data.actionItems.forEach(a => md += `- [ ] ${a}\n`);
    } else {
      md += `- None recorded.\n`;
    }
    
    md += `\n---\n## 📝 Full Transcript\n\n> ${transcript || 'No transcript generated.'}\n`;

    return new Blob([md], { type: 'text/markdown;charset=utf-8' });
  }

  static downloadFile(file: Blob, filename: string) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
