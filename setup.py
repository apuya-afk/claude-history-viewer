from setuptools import setup

setup(
    name="claude-history-viewer",
    version="1.0.0",
    description="Browse and backup Claude Code conversation history",
    py_modules=["server"],
    entry_points={
        "console_scripts": [
            "claude-history=server:main",
        ],
    },
    python_requires=">=3.8",
)
