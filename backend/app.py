from flask import Flask
from flask_cors import CORS
from flask_bcrypt import Bcrypt
import os

from routes.compare import compare_bp
from routes.templates import templates_bp
from routes.auth import auth_bp

def create_app():
    """
    App factory function.
    """
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

    app = Flask(
    __name__,
    static_folder=os.path.join(BASE_DIR, "assets"),
    static_url_path=""
    )
    
    # Konfiguracija
    app.config['SECRET_KEY'] = 'your-secret-key-change-this-in-production'
    
    # Inicializacija razširitev
    CORS(app, supports_credentials=True)
    bcrypt = Bcrypt(app)

    # Registracija blueprintov
    app.register_blueprint(templates_bp, url_prefix="/templates")
    app.register_blueprint(compare_bp, url_prefix="")
    app.register_blueprint(auth_bp, url_prefix="/auth")

    @app.get("/health")
    def health():
        return {"status": "ok"}
    
    @app.route("/create-mock-user-data")
    def create_mock_data_route():
        from database.mocks import generate_mock_data
        generate_mock_data()
        return {"status": "mock data created"}
    
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=8000, debug=True, use_reloader=False)
    