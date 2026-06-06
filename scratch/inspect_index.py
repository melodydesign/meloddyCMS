import sys; sys.stdout.reconfigure(encoding='utf-8')
with open(r'C:\Users\9\Desktop\meloddyCMS\public\index.html', 'r', encoding='utf-8') as f:
    content = f.read()
if 'Telegram' in content:
    print('Found Telegram')
if 'Мгновенный' in content:
    print('Found Мгновенный')
print(f'Feature cards: {content.count("feature-card")}')
print(f'FAQ items: {content.count("faq-item")}')
