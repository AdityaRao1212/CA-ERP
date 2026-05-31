from pathlib import Path

paths = [
    Path('d:/Freelancing/Falana/package.json'),
    Path('d:/Freelancing/Falana/node_modules/express/lib/express.js'),
    Path('d:/Freelancing/Falana/frontend/node_modules/react-scripts/scripts/start.js'),
]
for p in paths:
    print('---')
    print(p)
    print('exists', p.exists())
    if p.exists():
        data = p.read_bytes()
        print('size', len(data))
        print('head', data[:32])
        print('head decoded', data[:120].decode('utf-8', errors='replace'))
