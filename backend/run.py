import os
from app import create_app

env_name = os.environ.get('FLASK_ENV', 'development')
app = create_app(env_name)

if __name__ == '__main__':
    host = app.config.get('HOST', '127.0.0.1')
    port = app.config.get('PORT', 5000)
    debug = app.config.get('DEBUG', True)
    
    print(f"[*] Starting ABAC Enterprise Engine Backend on http://{host}:{port}")
    print(f"[*] Environment: {env_name}")
    print(f"[*] Health endpoint: http://{host}:{port}/api/health")
    app.run(host=host, port=port, debug=debug)
