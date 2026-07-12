/** Copy plain text to the system clipboard. */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy copy */
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/** Open the default mail client with subject + body prefilled. */
export function openMailWithReport(subject: string, body: string): void {
  const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = url;
}

/** Open the device SMS / messages app with body prefilled. */
export function openSmsWithReport(body: string): void {
  const url = `sms:?&body=${encodeURIComponent(body)}`;
  window.location.href = url;
}
