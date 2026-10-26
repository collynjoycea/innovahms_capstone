with open('app.py', 'rb') as f:
    content = f.read()
text = content.decode('utf-8', errors='replace')
lines = text.split('\n')

# Print _build_forecast_payload (7244 to 7350)
print('=== _build_forecast_payload (7244-7350) ===')
for i in range(7243, 7351):
    print(f'{i+1}: {lines[i]}')

print()
print('=== _default_owner_period_labels (7351-7410) ===')
for i in range(7350, 7410):
    print(f'{i+1}: {lines[i]}')
