from flask import Flask

from routes.compare import compare_bp
from routes.templates import templates_bp

def create_app():
    """
    App factory function.
    """

    app = Flask(__name__)

    app.register_blueprint(templates_bp, url_prefix="/templates")
    app.register_blueprint(compare_bp, url_prefix="")

    @app.get("/health")
    def health():
        return {"status": "ok"}
    
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
    