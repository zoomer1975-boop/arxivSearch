import nodemailer from 'nodemailer'

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

interface PaperAlert {
  title: string
  authors: string[]
  arxivId: string
  matchedKeywords: string[]
}

export async function sendEmailAlert(
  toEmail: string,
  name: string,
  papers: PaperAlert[]
): Promise<void> {
  const transporter = createTransporter()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const paperHtml = papers
    .map(
      p => `
    <div style="margin-bottom:20px;padding:16px;border:1px solid #e5e7eb;border-radius:8px;">
      <a href="${siteUrl}/paper/${p.arxivId}"
         style="font-weight:bold;color:#2563eb;text-decoration:none;font-size:15px;">
        ${escapeHtml(p.title)}
      </a>
      <p style="color:#6b7280;font-size:13px;margin:6px 0 4px;">
        ${escapeHtml(p.authors.slice(0, 3).join(', '))}
      </p>
      <p style="font-size:12px;color:#9ca3af;margin:0;">
        Keywords: ${escapeHtml(p.matchedKeywords.join(', '))}
      </p>
    </div>
  `
    )
    .join('')

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <h2 style="color:#111827;">Hi ${escapeHtml(name)},</h2>
      <p style="color:#374151;">
        We found <strong>${papers.length} new paper(s)</strong> matching your interests today:
      </p>
      ${paperHtml}
      <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;" />
      <p style="font-size:12px;color:#9ca3af;">
        Manage your alerts at
        <a href="${siteUrl}/mypage" style="color:#2563eb;">${siteUrl}/mypage</a>
      </p>
    </div>
  `

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: toEmail,
    subject: `arXiv Search: ${papers.length} new paper(s) for you`,
    html,
  })
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
