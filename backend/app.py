from flask import Flask
from flask_cors import CORS

from routes.compare import compare_bp
from routes.templates import templates_bp

def create_app():
    """
    App factory function.
    """

    app = Flask(__name__)

    CORS(app)

    app.register_blueprint(templates_bp, url_prefix="/templates")
    app.register_blueprint(compare_bp, url_prefix="")

    @app.get("/health")
    def health():
        return {"status": "ok"}
    
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="127.0.0.1", port=5000,debug=True)
    