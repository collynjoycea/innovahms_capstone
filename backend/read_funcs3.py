with open('app.py', 'rb') as f:
    content = f.read()
text = content.decode('utf-8', errors='replace')
lines = text.split('\n')

# Print lines 7652-7660 to see exact text
for i in range(7651, 7660):
    print(repr(lines[i]))
