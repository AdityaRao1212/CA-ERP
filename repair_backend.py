from pathlib import Path
import json

root = Path('d:/Freelancing/Falana')
package_json = root / 'package.json'
package_data = {
    'name': 'falana-backend',
    'version': '1.0.0',
    'private': True,
    'main': 'backend/server.js',
    'scripts': {
        'start': 'node backend/server.js'
    },
    'dependencies': {
        'express': '^4.18.2',
        'sqlite3': '^5.1.6'
    }
}
package_json.write_text(json.dumps(package_data, indent=2) + '\n', encoding='utf-8')
for pkg in ['express', 'sqlite3']:
    path = root / 'node_modules' / pkg
    if path.exists():
        if path.is_dir():
            import shutil
            shutil.rmtree(path)
        else:
            path.unlink()
print('Wrote package.json and removed root node_modules/express and sqlite3 if present.')
