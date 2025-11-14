export function formatEmailBody(body: string, isHtml: boolean): string {
  if (isHtml) {
    return sanitizeAndFormatHtml(body);
  } else {
    return convertPlainTextToHtml(body);
  }
}

function sanitizeAndFormatHtml(html: string): string {
  let sanitized = html;

  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');

  sanitized = sanitized.replace(/<img([^>]*)>/gi, (match, attributes) => {
    if (!attributes.match(/style\s*=/i)) {
      return `<img${attributes} style="max-width: 100%; height: auto; display: block; margin: 1rem 0;">`;
    } else {
      const styleAttr = attributes.replace(
        /style\s*=\s*["']([^"']*)["']/i,
        (m: string, styles: string) => {
          const hasMaxWidth = /max-width/i.test(styles);
          const hasHeight = /height/i.test(styles);
          const newStyles = `${styles}${hasMaxWidth ? '' : '; max-width: 100%'}${hasHeight ? '' : '; height: auto'}; display: block; margin: 1rem 0;`;
          return `style="${newStyles}"`;
        }
      );
      return `<img${styleAttr}>`;
    }
  });

  sanitized = sanitized.replace(/<a\s+([^>]*href=["'][^"']*["'][^>]*)>/gi, (match, attributes) => {
    if (!attributes.match(/target\s*=/i)) {
      return `<a ${attributes} target="_blank" rel="noopener noreferrer">`;
    }
    return match;
  });

  const wrapper = `<div class="email-content-wrapper">${sanitized}</div>`;
  return wrapper;
}

function convertPlainTextToHtml(text: string): string {
  let html = text;

  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  html = html.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: #1B99CF; text-decoration: underline;">$1</a>');

  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;
  html = html.replace(emailRegex, '<a href="mailto:$1" style="color: #1B99CF; text-decoration: underline;">$1</a>');

  const paragraphs = html.split(/\n\s*\n/);
  html = paragraphs
    .map(para => {
      const lines = para.split('\n').join('<br>');
      return `<p style="margin-bottom: 1rem; line-height: 1.6;">${lines}</p>`;
    })
    .join('');

  const wrapper = `<div class="email-content-wrapper" style="white-space: pre-wrap; word-wrap: break-word;">${html}</div>`;
  return wrapper;
}

export function detectEmailFormat(body: string): 'html' | 'plain' {
  const htmlTagRegex = /<\/?[a-z][\s\S]*>/i;
  return htmlTagRegex.test(body) ? 'html' : 'plain';
}
