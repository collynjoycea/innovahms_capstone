with open('app.py', 'rb') as f:
    content = f.read()
text = content.decode('utf-8', errors='replace')
lines = text.split('\n')

print('=== _build_owner_analytics_payload (7548-7770) ===')
for i in range(7547, 7770):
    print(f'{i+1}: {lines[i]}')
