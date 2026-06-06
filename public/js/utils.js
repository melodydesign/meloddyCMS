The following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.
1: function getCsrfToken() {
2:     return document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1] || '';
3: }
4: 
5: async function apiFetch(url, options = {}) {
6:     const csrfToken = getCsrfToken();
7:     const headers = {
8:         'X-CSRF-Token': csrfToken,
9:         ...options.headers
10:     };
11:     if (!(options.body instanceof FormData) && options.body && typeof options.body === 'object') {
12:         headers['Content-Type'] = 'application/json';
13:         options.body = JSON.stringify(options.body);
14:     }
15:     const res = await fetch(url, { ...options, headers });
16:     if (res.status === 401) {
17:         window.location.href = '/login.html';
18:         return res;
19:     }
20:     return res;
21: }
22: 
23: function initCustomSelect(selectEl) {
24:     if (!selectEl) return;
25:     
26:     const existingWrapper = selectEl.parentNode.querySelector('.custom-select-wrapper');
27:     if (existingWrapper) {
28:         existingWrapper.remove();
29:     }
30: 
31:     selectEl.style.display = 'none';
32:     
33:     const wrapper = document.createElement('div');
34:     wrapper.className = 'custom-select-wrapper';
35:     wrapper.style.width = selectEl.style.width || 'auto';
36:     
37:     const trigger = document.createElement('div');
38:     trigger.className = 'custom-select-trigger';
39:     trigger.innerHTML = '<span>' + (selectEl.options[selectEl.selectedIndex]?.text || '') + '</span>';
40:     
41:     const optionsContainer = document.createElement('div');
42:     optionsC
<truncated 6839 bytes>
ям</li>
162:                 </ul>
163:             </div>
164:             <p style="color: var(--text-main);">Мы планируем запуск платных тарифов ориентировочно <strong>в начале 2027 года</strong>. Они будут включать расширенные лимиты, приоритетную поддержку и новые инструменты.</p>
165:             <p style="color: var(--text-main); padding: 10px; background: rgba(108, 92, 231, 0.1); border-radius: var(--radius-sm); border-left: 3px solid var(--primary);">
166:                 Если вам требуется больше 5 сайтов, пишите в Telegram: <a href="https://t.me/Anastasia21ss" target="_blank" style="color: var(--primary); text-decoration: none; font-weight: 600;">@Anastasia21ss</a>
167:             </p>
168:             <button class="btn" style="width: 100%; margin-top: 10px;" onclick="this.closest('.modal-overlay').remove()">Понятно, спасибо</button>
169:         </div>
170:     `;
171:     
172:     overlay.appendChild(content);
173:     document.body.appendChild(overlay);
174:     
175:     overlay.addEventListener('click', (ev) => {
176:         if (ev.target === overlay) overlay.remove();
177:     });
178: };
179: 
180: // Global logout handler
181: document.addEventListener('DOMContentLoaded', () => {
182:     const logoutBtn = document.getElementById('logoutBtn');
183:     if (logoutBtn) {
184:         logoutBtn.addEventListener('click', async (e) => {
185:             e.preventDefault();
186:             try {
187:                 await fetch('/api/logout', { 
188:                     method: 'POST', 
189:                     headers: { 'X-CSRF-Token': getCsrfToken() } 
190:                 });
191:             } catch(e) {}
192:             window.location.href = '/login.html';
193:         });
194:     }
195: });
196: 
The above content shows the entire, complete file contents of the requested file.
