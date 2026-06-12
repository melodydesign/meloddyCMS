import paramiko
import os

files_to_upload = [
    ('public/index.html', 'meloddy-cms/public/index.html'),
    ('public/dashboard.html', 'meloddy-cms/public/dashboard.html'),
    ('public/css/style.css', 'meloddy-cms/public/css/style.css'),
    ('public/js/dashboard_v2.js', 'meloddy-cms/public/js/dashboard_v2.js'),
    ('public/js/dashboard.js', 'meloddy-cms/public/js/dashboard.js'),
    ('public/js/theme.js', 'meloddy-cms/public/js/theme.js'),
    ('public/settings.html', 'meloddy-cms/public/settings.html'),
    ('public/file-manager.html', 'meloddy-cms/public/file-manager.html'),
    ('public/docs.html', 'meloddy-cms/public/docs.html'),
    ('public/kb.html', 'meloddy-cms/public/kb.html'),
    ('public/privacy.html', 'meloddy-cms/public/privacy.html'),
    ('public/terms.html', 'meloddy-cms/public/terms.html'),
    ('public/offer.html', 'meloddy-cms/public/offer.html'),
    ('public/admin.html', 'meloddy-cms/public/admin.html'),
    ('public/login.html', 'meloddy-cms/public/login.html'),
    ('public/js/login.js', 'meloddy-cms/public/js/login.js'),
    ('src/routes/auth.js', 'meloddy-cms/src/routes/auth.js'),
    ('public/visual-editor.html', 'meloddy-cms/public/visual-editor.html'),
    ('public/css/landing.css', 'meloddy-cms/public/css/landing.css'),
    ('public/js/file-manager.js', 'meloddy-cms/public/js/file-manager.js'),
    ('public/js/visual-editor.js', 'meloddy-cms/public/js/visual-editor.js'),
    ('src/utils/db.js', 'meloddy-cms/src/utils/db.js'),
    ('src/routes/sites.js', 'meloddy-cms/src/routes/sites.js'),
    ('src/routes/commerce.js', 'meloddy-cms/src/routes/commerce.js'),
    ('server.js', 'meloddy-cms/server.js'),
    ('public/commerce.html', 'meloddy-cms/public/commerce.html'),
    ('public/js/commerce.js', 'meloddy-cms/public/js/commerce.js'),
    ('public/js/client-cart.js', 'meloddy-cms/public/js/client-cart.js'),
    ('site/shop/script.js', 'meloddy-cms/site/shop/script.js'),
    ('site/shop/index.html', 'meloddy-cms/site/shop/index.html'),
    ('site/shop/style.css', 'meloddy-cms/site/shop/style.css'),
    ('site/shop/hero-sneaker.png', 'meloddy-cms/site/shop/hero-sneaker.png')
]

host = '195.209.214.15'
user = 'ubuntuuser'
pwd = '82euCWba18UM'

print("Connecting to SSH...")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=pwd)

print("Opening SFTP...")
sftp = client.open_sftp()

for local_path, remote_path in files_to_upload:
    local_full = os.path.join(os.getcwd(), local_path)
    print(f"Uploading {local_path} -> {remote_path}...")
    sftp.put(local_full, remote_path)

sftp.close()

import sys

def safe_print(text):
    text = text.replace('\u2713', '[OK]')
    encoding = sys.stdout.encoding or 'utf-8'
    encoded = text.encode(encoding, errors='replace')
    print(encoded.decode(encoding))

print("Restarting PM2...")
stdin, stdout, stderr = client.exec_command('cd meloddy-cms && pm2 restart all')
safe_print(stdout.read().decode('utf-8', errors='replace'))
safe_print(stderr.read().decode('utf-8', errors='replace'))

client.close()
print("Deploy successful!")

