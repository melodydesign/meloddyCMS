import paramiko
import os

files_to_upload = [
    ('public/index.html', 'meloddy-cms/public/index.html'),
    ('public/dashboard.html', 'meloddy-cms/public/dashboard.html'),
    ('public/css/style.css', 'meloddy-cms/public/css/style.css'),
    ('public/js/dashboard_v2.js', 'meloddy-cms/public/js/dashboard_v2.js'),
    ('public/js/theme.js', 'meloddy-cms/public/js/theme.js'),
    ('public/settings.html', 'meloddy-cms/public/settings.html'),
    ('public/file-manager.html', 'meloddy-cms/public/file-manager.html'),
    ('public/docs.html', 'meloddy-cms/public/docs.html'),
    ('public/admin.html', 'meloddy-cms/public/admin.html')
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

