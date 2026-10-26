with open('app.py', 'rb') as f:
    content = f.read()
text = content.decode('utf-8', errors='replace')
lines = text.split('\n')
print('Lines:', len(lines))
for i, l in enumerate(lines, 1):
    if 'def _build_forecast' in l or 'def _build_owner_analytics' in l or 'def _default_owner_period' in l:
        print(i, l[:120])
