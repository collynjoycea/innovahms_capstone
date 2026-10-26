with open('app.py', 'rb') as f:
    content = f.read()
text = content.decode('utf-8', errors='replace')
lines = text.split('\n')

print('=== GET rooms (9411-9485) ===')
for i in range(9410, 9486):
    print(f'{i+1}: {lines[i]}')

print()
print('=== ADD room (9486-9551) ===')
for i in range(9485, 9552):
    print(f'{i+1}: {lines[i]}')

print()
print('=== UPDATE room (9552-9614) ===')
for i in range(9551, 9615):
    print(f'{i+1}: {lines[i]}')
