import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('Invites')
@Controller()
export class InvitesController {
  constructor(private readonly authService: AuthService) {}

  @Get('invite/:token')
  @ApiOperation({ summary: 'Render SSR invite registration page' })
  async getInvitePage(
    @Param('token') token: string,
    @Res() res: Response,
  ) {
    let html: string;
    try {
      const invite = await this.authService.getInvite(token);
      html = renderInviteForm(token, invite.role, invite.orgName, invite.expiresAt, null);
    } catch (err) {
      const message = extractErrorMessage(err) ?? 'This invite link is invalid or has expired.';
      html = renderErrorPage(message);
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(HttpStatus.OK).send(html);
  }

  @Post('invite/:token/register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redeem invite link and create account' })
  async redeemInvite(
    @Param('token') token: string,
    @Body() body: { name: string; email: string; password: string },
  ) {
    return this.authService.redeemInvite(token, body.name, body.email, body.password);
  }
}

function extractErrorMessage(err: any): string | null {
  // RpcException wraps the original HTTP exception
  const response = err?.error?.response ?? err?.response;
  if (typeof response === 'string') return response;
  if (typeof response?.message === 'string') return response.message;
  if (typeof err?.message === 'string') return err.message;
  return null;
}

function renderInviteForm(token: string, role: string, orgName: string, expiresAt: Date, errorMsg: string | null): string {
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  const expiry = new Date(expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Create Account — ExamPortal</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .card { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.1), 0 1px 2px rgba(0,0,0,.06); max-width: 420px; width: 100%; padding: 2rem; }
    .header { text-align: center; margin-bottom: 1.5rem; }
    .app-name { font-size: 1.5rem; font-weight: 700; color: #1f2937; }
    .invite-badge { display: inline-flex; align-items: center; gap: .5rem; margin-top: .75rem; padding: .375rem .75rem; background: #ede9fe; border-radius: 9999px; font-size: .875rem; color: #5b21b6; font-weight: 500; }
    .org-line { margin-top: .5rem; font-size: .875rem; color: #6b7280; }
    .expiry-line { margin-top: .25rem; font-size: .75rem; color: #9ca3af; }
    .form-group { margin-bottom: 1rem; }
    label { display: block; font-size: .875rem; font-weight: 500; color: #374151; margin-bottom: .375rem; }
    input { width: 100%; padding: .5rem .75rem; border: 1px solid #d1d5db; border-radius: 8px; font-size: .875rem; color: #111827; outline: none; transition: border-color .15s, box-shadow .15s; }
    input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.15); }
    .btn { width: 100%; padding: .625rem 1rem; background: #6366f1; color: #fff; border: none; border-radius: 8px; font-size: .875rem; font-weight: 600; cursor: pointer; transition: background .15s; margin-top: .5rem; }
    .btn:hover { background: #4f46e5; }
    .btn:disabled { opacity: .6; cursor: not-allowed; }
    .error-box { padding: .75rem; background: #fef2f2; border-radius: 8px; color: #b91c1c; font-size: .875rem; margin-bottom: 1rem; }
    .success-box { text-align: center; padding: 2rem 1rem; }
    .success-box h2 { font-size: 1.25rem; font-weight: 700; color: #065f46; margin-bottom: .5rem; }
    .success-box p { font-size: .875rem; color: #6b7280; }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="app-name">ExamPortal</div>
      <div class="invite-badge">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        Invited as ${roleLabel}
      </div>
      <div class="org-line">Organisation: <strong>${escapeHtml(orgName)}</strong></div>
      <div class="expiry-line">Link expires ${expiry}</div>
    </div>

    <div id="form-section">
      ${errorMsg ? `<div class="error-box">${escapeHtml(errorMsg)}</div>` : ''}
      <div id="api-error" class="error-box hidden"></div>

      <form id="reg-form">
        <div class="form-group">
          <label for="name">Full Name</label>
          <input id="name" type="text" placeholder="Jane Doe" required autocomplete="name" />
        </div>
        <div class="form-group">
          <label for="email">Email Address</label>
          <input id="email" type="email" placeholder="jane@example.com" required autocomplete="email" />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input id="password" type="password" placeholder="Min. 8 characters" required minlength="8" autocomplete="new-password" />
        </div>
        <button type="submit" class="btn" id="submit-btn">Create Account</button>
      </form>
    </div>

    <div id="success-section" class="success-box hidden">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 1rem;display:block"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <h2>Account created!</h2>
      <p>Open the ExamPortal app and sign in with your email and password.</p>
    </div>
  </div>

  <script>
    document.getElementById('reg-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = document.getElementById('submit-btn');
      const errBox = document.getElementById('api-error');
      btn.disabled = true;
      btn.textContent = 'Creating account…';
      errBox.classList.add('hidden');
      errBox.textContent = '';

      const payload = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
      };

      try {
        const res = await fetch('/invite/${token}/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          document.getElementById('form-section').classList.add('hidden');
          document.getElementById('success-section').classList.remove('hidden');
        } else {
          const data = await res.json().catch(() => ({}));
          const msg = (data.message && (Array.isArray(data.message) ? data.message.join(', ') : data.message)) || 'Registration failed. Please try again.';
          errBox.textContent = msg;
          errBox.classList.remove('hidden');
          btn.disabled = false;
          btn.textContent = 'Create Account';
        }
      } catch {
        errBox.textContent = 'Network error. Please try again.';
        errBox.classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = 'Create Account';
      }
    });
  </script>
</body>
</html>`;
}

function renderErrorPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invalid Invite — ExamPortal</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .card { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.1); max-width: 420px; width: 100%; padding: 2rem; text-align: center; }
    .app-name { font-size: 1.5rem; font-weight: 700; color: #1f2937; margin-bottom: 1.5rem; }
    .icon { color: #dc2626; margin-bottom: 1rem; }
    h2 { font-size: 1.125rem; font-weight: 600; color: #111827; margin-bottom: .5rem; }
    p { font-size: .875rem; color: #6b7280; }
  </style>
</head>
<body>
  <div class="card">
    <div class="app-name">ExamPortal</div>
    <div class="icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:0 auto"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    </div>
    <h2>Invite Unavailable</h2>
    <p>${escapeHtml(message)}</p>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
