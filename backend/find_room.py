with open('app.py', 'rb') as f:
    content = f.read()
text = content.decode('utf-8', errors='replace')
lines = text.split('\n')

for i, l in enumerate(lines, 1):
    if 'def owner_add_room' in l or 'def owner_update_room' in l or 'weekend_rate' in l or 'weekday_rate' in l or 'discount_percent' in l or 'discount' in l.lower() and 'room' in l.lower():
        print(i, l[:120])
