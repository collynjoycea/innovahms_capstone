with open('app.py', 'rb') as f:
    content = f.read()
text = content.decode('utf-8', errors='replace')
lines = text.split('\n')

for i, l in enumerate(lines, 1):
    if "route('/api/owner/rooms" in l or "def owner_rooms" in l or "def owner_add_room" in l or "def owner_update_room" in l or "def owner_delete_room" in l:
        print(i, l[:120])
