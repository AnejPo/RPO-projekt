from flask import Flask
from flask_cors import CORS
from flask_bcrypt import Bcrypt

from routes.compare import compare_bp
from routes.templates import templates_bp
from routes.auth import auth_bp

def create_app():
    """
    App factory function.
    """

    app = Flask(__name__)
    
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
    app.run(host="127.0.0.1", port=5000,debug=True)
    