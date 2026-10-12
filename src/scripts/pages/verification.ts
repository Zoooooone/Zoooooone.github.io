import { onPage } from '@/scripts/core/lifecycle';

// Same scheme as the old site: the SHA-256 of the entered password is compared with this hash, and on a
// match a blogger_visit cookie is set so the author's own visits are not counted as page views.
const PASSWORD_HASH = 'd5a71d4f65f0c41f6c4a87574910392fb0fb293e6e09cfaf130be42efc60b3b9';

onPage(() => {
  const badge = document.getElementById('badge');
  const text = document.getElementById('badge-text');
  const btn = document.getElementById('verify-btn');
  if (!badge || !text || !btn) return;

  const isBlogger = () => document.cookie.split('; ').some((c) => c.startsWith('blogger_visit='));
  const paint = () => {
    const ok = isBlogger();
    badge.dataset.state = ok ? 'ok' : 'no';
    text.textContent = ok ? 'VERIFIED · 已验证' : 'NOT VERIFIED · 未验证';
  };
  paint();

  const onClick = async () => {
    const input = prompt('Please enter the password: ');
    if (input === null) return;
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
    const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    if (hex === PASSWORD_HASH) {
      document.cookie = 'blogger_visit=true; max-age=31536000; path=/';
      paint();
    } else {
      alert('Password is incorrect');
    }
  };
  btn.addEventListener('click', onClick);
  return () => btn.removeEventListener('click', onClick);
});
